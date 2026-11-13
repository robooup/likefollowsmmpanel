'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { getBaseUrl } from '@/lib/tenant/current';
import { invalidateTenantRouting, platformDb } from '@/lib/tenant/registry';
import { audit } from './audit';
import {
  clearThrottle,
  clientIp,
  endSaasSession,
  getSaasUser,
  hashPassword,
  startSaasSession,
  throttle,
  verifyPassword,
} from './auth';
import { addMonths, createInvoice, isValidMonths, settleInvoice, startInvoicePayment } from './billing';
import {
  addCustomDomain,
  changeSubdomain,
  DomainError,
  normalizeSubdomain,
  removeDomain,
  setPrimaryDomain,
  subdomainHost,
  verifyDomain,
} from './domains';
import { destroyPanelData, provisionPanel } from './provisioning';
import { saveSaasSettings } from './settings';
import { PaymentError } from './uddoktapay';

export type ActionState = { error?: string; success?: string } | null;

const emailSchema = z.string().trim().toLowerCase().email('Enter a valid email address.').max(190);
const passwordSchema = z.string().min(8, 'Password must be at least 8 characters.').max(200);

function fail(error: unknown, fallback = 'Something went wrong. Please try again.'): ActionState {
  if (error instanceof DomainError || error instanceof PaymentError) return { error: error.message };
  if (error instanceof z.ZodError) return { error: error.issues[0]?.message || fallback };
  console.error('Action failed:', error);
  return { error: fallback };
}

async function sessionUser() {
  const user = await getSaasUser();
  if (!user) redirect('/login');
  return user;
}

async function adminUser() {
  const user = await sessionUser();
  if (user.role !== 'admin') redirect('/portal');
  return user;
}

function intField(formData: FormData, name: string): number {
  const value = Number(formData.get(name));
  if (!Number.isInteger(value) || value <= 0) throw new z.ZodError([{ code: 'custom', message: 'Invalid request.', path: [name] }]);
  return value;
}

function safeNext(value: FormDataEntryValue | null, fallback: string): string {
  const next = typeof value === 'string' ? value : '';
  return /^\/(portal|admin)(\/[\w\-/]*)?$/.test(next) ? next : fallback;
}

// ---------------------------------------------------------------- accounts --

export async function registerAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  let target = '/portal';
  try {
    const ip = await clientIp();
    if (!throttle(`register:${ip}`, 5, 60 * 60_000)) return { error: 'Too many sign-ups from your network. Try again later.' };
    const data = z
      .object({
        name: z.string().trim().min(2, 'Enter your name.').max(80),
        email: emailSchema,
        password: passwordSchema,
      })
      .parse({ name: formData.get('name'), email: formData.get('email'), password: formData.get('password') });

    const db = platformDb();
    if (await db.saasUser.findUnique({ where: { email: data.email } })) {
      return { error: 'An account with this email already exists. Please log in.' };
    }
    const user = await db.saasUser.create({
      data: { name: data.name, email: data.email, passwordHash: await hashPassword(data.password), lastLoginAt: new Date() },
    });
    await startSaasSession(user);
    await audit({ actorId: user.id, action: 'user.registered', ip });
    const plan = String(formData.get('plan') || '');
    target = /^[a-z0-9-]{2,30}$/.test(plan) ? `/portal/order?plan=${plan}` : '/portal/order';
  } catch (error) {
    return fail(error);
  }
  redirect(target);
}

export async function loginAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  let target = '/portal';
  try {
    const email = emailSchema.parse(formData.get('email'));
    const password = String(formData.get('password') || '');
    const ip = await clientIp();
    const key = `login:${ip}:${email}`;
    if (!throttle(key, 8, 15 * 60_000) || !throttle(`login-ip:${ip}`, 40, 15 * 60_000)) {
      return { error: 'Too many attempts. Please wait 15 minutes and try again.' };
    }
    const user = await platformDb().saasUser.findUnique({ where: { email } });
    // Compare against a dummy hash when the user does not exist (same timing).
    const hash = user?.passwordHash || '$2b$12$PFzDECxsqcJyTH1TUGkKLuNoL7XaXkYOHOBLJaZFKOUPQvyuzuEQe';
    const ok = await verifyPassword(password, hash);
    if (!user || !ok) return { error: 'Incorrect email or password.' };
    if (user.status !== 'active') return { error: 'This account has been blocked. Please contact support.' };
    clearThrottle(key);
    await platformDb().saasUser.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    await startSaasSession(user);
    target = safeNext(formData.get('next'), user.role === 'admin' ? '/admin' : '/portal');
    if (user.role !== 'admin' && target.startsWith('/admin')) target = '/portal';
  } catch (error) {
    return fail(error);
  }
  redirect(target);
}

export async function logoutAction(): Promise<void> {
  await endSaasSession();
  redirect('/');
}

export async function changePasswordAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await sessionUser();
  try {
    const current = String(formData.get('current') || '');
    const next = passwordSchema.parse(formData.get('password'));
    const db = platformDb();
    const record = await db.saasUser.findUniqueOrThrow({ where: { id: user.id } });
    if (!(await verifyPassword(current, record.passwordHash))) return { error: 'Current password is incorrect.' };
    const updated = await db.saasUser.update({
      where: { id: user.id },
      data: { passwordHash: await hashPassword(next), sessionVersion: { increment: 1 } },
    });
    await startSaasSession(updated); // other devices are signed out
    await audit({ actorId: user.id, action: 'user.password_changed' });
    return { success: 'Password updated. Other devices have been signed out.' };
  } catch (error) {
    return fail(error);
  }
}

export async function updateProfileAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await sessionUser();
  try {
    const name = z.string().trim().min(2, 'Enter your name.').max(80).parse(formData.get('name'));
    await platformDb().saasUser.update({ where: { id: user.id }, data: { name } });
    revalidatePath('/saas/portal', 'layout');
    return { success: 'Profile updated.' };
  } catch (error) {
    return fail(error);
  }
}

// ------------------------------------------------------------------ orders --

export async function createOrderAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await sessionUser();
  let invoiceId: number;
  try {
    if (!throttle(`order:${user.id}`, 10, 60 * 60_000)) return { error: 'Too many orders in a short time. Try again later.' };
    const data = z
      .object({
        name: z.string().trim().min(2, 'Enter a panel name.').max(60),
        subdomain: z.string(),
        adminUsername: z
          .string()
          .trim()
          .toLowerCase()
          .regex(/^[a-z0-9_]{4,30}$/, 'Admin username: 4-30 characters, letters, numbers and underscore.'),
        adminPassword: passwordSchema,
      })
      .parse({
        name: formData.get('name'),
        subdomain: formData.get('subdomain'),
        adminUsername: formData.get('adminUsername'),
        adminPassword: formData.get('adminPassword'),
      });
    const planId = intField(formData, 'planId');
    const months = Number(formData.get('months'));
    if (!isValidMonths(months)) return { error: 'Choose a billing period.' };

    const db = platformDb();
    const plan = await db.saasPlan.findFirst({ where: { id: planId, isActive: true } });
    if (!plan) return { error: 'Choose a plan.' };
    const host = subdomainHost(normalizeSubdomain(data.subdomain));
    if (await db.saasPanelDomain.findUnique({ where: { host } })) {
      return { error: 'This subdomain is already taken. Please choose another one.' };
    }
    const open = await db.saasPanel.count({ where: { ownerId: user.id, status: 'pending_payment' } });
    if (open >= 3) return { error: 'You already have unpaid orders. Pay or wait for them to expire first.' };

    const adminPasswordHash = await hashPassword(data.adminPassword);
    let panel;
    try {
      panel = await db.saasPanel.create({
        data: {
          ownerId: user.id,
          planId: plan.id,
          name: data.name,
          adminEmail: user.email,
          adminUsername: data.adminUsername,
          adminPasswordHash,
          domains: { create: { host, type: 'subdomain', status: 'pending', isPrimary: true } },
        },
      });
    } catch (error: any) {
      if (error?.code === 'P2002') return { error: 'This subdomain was just taken. Please choose another one.' };
      throw error;
    }
    const invoice = await createInvoice({ userId: user.id, panelId: panel.id, planId: plan.id, months, type: 'new' });
    await audit({ actorId: user.id, action: 'panel.ordered', target: `panel:${panel.id}`, meta: { host, plan: plan.slug, months } });
    invoiceId = invoice.id;
  } catch (error) {
    return fail(error);
  }
  redirect(`/portal/invoices/${invoiceId}`);
}

export async function renewPanelAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await sessionUser();
  let invoiceId: number;
  try {
    const panelId = intField(formData, 'panelId');
    const months = Number(formData.get('months'));
    if (!isValidMonths(months)) return { error: 'Choose a billing period.' };
    const db = platformDb();
    const panel = await db.saasPanel.findFirst({ where: { id: panelId, ownerId: user.id } });
    if (!panel) return { error: 'Panel not found.' };
    if (panel.status === 'terminated') return { error: 'This panel has been terminated.' };
    let planId = panel.planId;
    const requested = Number(formData.get('planId'));
    if (Number.isInteger(requested) && requested > 0 && requested !== planId) {
      const plan = await db.saasPlan.findFirst({ where: { id: requested, isActive: true } });
      if (!plan) return { error: 'Plan not found.' };
      planId = plan.id;
    }
    const invoice = await createInvoice({
      userId: user.id,
      panelId: panel.id,
      planId,
      months,
      type: panel.provisionedAt ? 'renewal' : 'new',
    });
    invoiceId = invoice.id;
  } catch (error) {
    return fail(error);
  }
  redirect(`/portal/invoices/${invoiceId}`);
}

export async function payInvoiceAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await sessionUser();
  let url: string;
  try {
    if (!throttle(`pay:${user.id}`, 20, 10 * 60_000)) return { error: 'Too many payment attempts. Please wait a few minutes.' };
    url = await startInvoicePayment(intField(formData, 'invoiceId'), user.id, await getBaseUrl());
  } catch (error) {
    return fail(error);
  }
  redirect(url);
}

// ----------------------------------------------------------------- domains --

async function domainAction(
  formData: FormData,
  run: (panelId: number, ownerId: number | null) => Promise<ActionState>
): Promise<ActionState> {
  const user = await sessionUser();
  try {
    const panelId = intField(formData, 'panelId');
    const result = await run(panelId, user.role === 'admin' ? null : user.id);
    revalidatePath('/saas/portal', 'layout');
    revalidatePath('/saas/admin', 'layout');
    return result;
  } catch (error) {
    return fail(error);
  }
}

export async function addDomainAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return domainAction(formData, async (panelId, ownerId) => {
    const domain = await addCustomDomain(panelId, ownerId, String(formData.get('domain') || ''));
    return { success: `${domain.host} added. Point its DNS to us, then press Verify.` };
  });
}

export async function verifyDomainAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return domainAction(formData, async (panelId, ownerId) => {
    if (!throttle(`verify:${panelId}`, 20, 10 * 60_000)) return { error: 'Too many checks. Please wait a few minutes.' };
    const result = await verifyDomain(panelId, ownerId, intField(formData, 'domainId'));
    return result.ok ? { success: 'Domain verified and live. SSL is issued automatically on first visit.' } : { error: result.reason };
  });
}

export async function setPrimaryDomainAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return domainAction(formData, async (panelId, ownerId) => {
    await setPrimaryDomain(panelId, ownerId, intField(formData, 'domainId'));
    return { success: 'Primary domain updated.' };
  });
}

export async function removeDomainAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return domainAction(formData, async (panelId, ownerId) => {
    await removeDomain(panelId, ownerId, intField(formData, 'domainId'));
    return { success: 'Domain removed.' };
  });
}

export async function changeSubdomainAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return domainAction(formData, async (panelId, ownerId) => {
    const domain = await changeSubdomain(panelId, ownerId, String(formData.get('subdomain') || ''));
    return { success: `Subdomain changed to ${domain.host}.` };
  });
}

// ------------------------------------------------------------- super admin --

export async function adminPanelAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await adminUser();
  try {
    const panelId = intField(formData, 'panelId');
    const op = String(formData.get('op') || '');
    const db = platformDb();
    const panel = await db.saasPanel.findUnique({ where: { id: panelId } });
    if (!panel) return { error: 'Panel not found.' };
    let message = 'Done.';

    if (op === 'suspend') {
      if (panel.status !== 'active') return { error: 'Only active panels can be suspended.' };
      const reason = String(formData.get('reason') || '').trim().slice(0, 200) || 'Suspended by administrator';
      await db.saasPanel.update({ where: { id: panelId }, data: { status: 'suspended', statusReason: reason } });
      message = 'Panel suspended.';
    } else if (op === 'activate') {
      if (!panel.provisionedAt) return { error: 'This panel has not been created yet. Use "Create panel now".' };
      if (panel.status === 'terminated') return { error: 'Terminated panels cannot be reactivated.' };
      await db.saasPanel.update({ where: { id: panelId }, data: { status: 'active', statusReason: null } });
      message = 'Panel activated.';
    } else if (op === 'extend') {
      const days = Number(formData.get('days'));
      if (!Number.isInteger(days) || days < -3650 || days > 3650 || days === 0) return { error: 'Enter a number of days.' };
      const base = panel.expiresAt && panel.expiresAt > new Date() ? panel.expiresAt : new Date();
      await db.saasPanel.update({
        where: { id: panelId },
        data: { expiresAt: new Date(base.getTime() + days * 24 * 60 * 60 * 1000) },
      });
      message = `Expiry moved by ${days} day(s).`;
    } else if (op === 'provision') {
      if (!panel.expiresAt) {
        await db.saasPanel.update({ where: { id: panelId }, data: { expiresAt: addMonths(new Date(), 1) } });
      }
      await provisionPanel(panelId);
      message = 'Panel created.';
    } else if (op === 'terminate') {
      if (String(formData.get('confirm') || '') !== panel.name) return { error: 'Type the panel name exactly to confirm.' };
      await db.saasPanel.update({ where: { id: panelId }, data: { status: 'terminated', statusReason: 'Terminated by administrator' } });
      message = 'Panel terminated. Its data is kept until you delete it.';
    } else if (op === 'delete-data') {
      if (String(formData.get('confirm') || '') !== `DELETE ${panel.name}`) {
        return { error: `Type "DELETE ${panel.name}" exactly to confirm.` };
      }
      await destroyPanelData(panelId);
      message = 'Panel database deleted.';
    } else if (op === 'plan') {
      const plan = await db.saasPlan.findUnique({ where: { id: intField(formData, 'planId') } });
      if (!plan) return { error: 'Plan not found.' };
      await db.saasPanel.update({ where: { id: panelId }, data: { planId: plan.id } });
      message = `Plan changed to ${plan.name}.`;
    } else {
      return { error: 'Unknown action.' };
    }

    invalidateTenantRouting();
    await audit({ actorId: admin.id, actor: 'admin', action: `admin.panel.${op}`, target: `panel:${panelId}` });
    revalidatePath('/saas/admin', 'layout');
    return { success: message };
  } catch (error) {
    return fail(error, error instanceof Error ? error.message : undefined);
  }
}

export async function adminInvoiceAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await adminUser();
  try {
    const invoiceId = intField(formData, 'invoiceId');
    const op = String(formData.get('op') || '');
    const db = platformDb();
    if (op === 'mark-paid') {
      const note = String(formData.get('note') || '').trim().slice(0, 100);
      const result = await settleInvoice(invoiceId, {
        paymentMethod: 'manual',
        transactionId: note || null,
        actor: 'admin',
        actorId: admin.id,
      });
      revalidatePath('/saas/admin', 'layout');
      return result === 'settled' ? { success: 'Invoice marked as paid.' } : { error: 'Invoice is not unpaid.' };
    }
    if (op === 'cancel') {
      const result = await db.saasInvoice.updateMany({ where: { id: invoiceId, status: 'unpaid' }, data: { status: 'cancelled' } });
      revalidatePath('/saas/admin', 'layout');
      return result.count ? { success: 'Invoice cancelled.' } : { error: 'Invoice is not unpaid.' };
    }
    return { error: 'Unknown action.' };
  } catch (error) {
    return fail(error);
  }
}

export async function adminSavePlanAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await adminUser();
  try {
    const data = z
      .object({
        name: z.string().trim().min(2).max(40),
        slug: z.string().trim().toLowerCase().regex(/^[a-z0-9-]{2,30}$/, 'Slug: lowercase letters, numbers, hyphens.'),
        description: z.string().trim().max(200),
        priceMonthly: z.coerce.number().int().min(0).max(10_000_000),
        maxCustomDomains: z.coerce.number().int().min(0).max(1000),
        sortOrder: z.coerce.number().int().min(0).max(1000),
        features: z.string().max(4000),
      })
      .parse({
        name: formData.get('name'),
        slug: formData.get('slug'),
        description: formData.get('description') || '',
        priceMonthly: formData.get('priceMonthly'),
        maxCustomDomains: formData.get('maxCustomDomains'),
        sortOrder: formData.get('sortOrder') || 0,
        features: formData.get('features') || '',
      });
    const payload = {
      name: data.name,
      slug: data.slug,
      description: data.description,
      priceMonthly: data.priceMonthly,
      maxCustomDomains: data.maxCustomDomains,
      sortOrder: data.sortOrder,
      features: data.features.split('\n').map((line) => line.trim()).filter(Boolean).slice(0, 20),
      isPopular: formData.get('isPopular') === 'on',
      isActive: formData.get('isActive') === 'on',
    };
    const db = platformDb();
    const id = Number(formData.get('planId'));
    const clash = await db.saasPlan.findUnique({ where: { slug: data.slug } });
    if (clash && clash.id !== id) return { error: 'Another plan already uses this slug.' };
    if (Number.isInteger(id) && id > 0) await db.saasPlan.update({ where: { id }, data: payload });
    else await db.saasPlan.create({ data: payload });
    await audit({ actorId: admin.id, actor: 'admin', action: 'admin.plan.saved', target: `plan:${data.slug}` });
    revalidatePath('/saas', 'layout');
    return { success: 'Plan saved.' };
  } catch (error) {
    return fail(error);
  }
}

export async function adminSaveSettingsAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await adminUser();
  try {
    const baseUrl = String(formData.get('uddoktapayBaseUrl') || '').trim();
    if (baseUrl && !/^https:\/\/[^\s]+$/i.test(baseUrl)) return { error: 'Gateway URL must start with https://' };
    const apiKey = String(formData.get('uddoktapayApiKey') || '').trim();
    const supportEmail = String(formData.get('supportEmail') || '').trim();
    if (supportEmail && !emailSchema.safeParse(supportEmail).success) return { error: 'Enter a valid support email.' };
    const graceDays = Number(formData.get('graceDays'));
    if (!Number.isInteger(graceDays) || graceDays < 0 || graceDays > 60) return { error: 'Grace days must be 0-60.' };
    await saveSaasSettings({
      uddoktapayBaseUrl: baseUrl,
      supportEmail,
      graceDays,
      // Leaving the key field empty keeps the stored key.
      ...(apiKey ? { uddoktapayApiKey: apiKey } : {}),
    });
    await audit({ actorId: admin.id, actor: 'admin', action: 'admin.settings.saved' });
    revalidatePath('/saas/admin', 'layout');
    return { success: 'Settings saved.' };
  } catch (error) {
    return fail(error);
  }
}

export async function adminCustomerAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await adminUser();
  try {
    const userId = intField(formData, 'userId');
    const op = String(formData.get('op') || '');
    if (userId === admin.id) return { error: 'You cannot change your own account here.' };
    const db = platformDb();
    if (op === 'block' || op === 'unblock') {
      await db.saasUser.update({
        where: { id: userId },
        data: { status: op === 'block' ? 'blocked' : 'active', sessionVersion: { increment: 1 } },
      });
      await audit({ actorId: admin.id, actor: 'admin', action: `admin.customer.${op}`, target: `user:${userId}` });
      revalidatePath('/saas/admin', 'layout');
      return { success: op === 'block' ? 'Customer blocked and signed out.' : 'Customer unblocked.' };
    }
    return { error: 'Unknown action.' };
  } catch (error) {
    return fail(error);
  }
}
