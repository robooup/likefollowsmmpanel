import crypto from 'node:crypto';
import { invalidateTenantRouting, platformDb } from '@/lib/tenant/registry';
import { audit } from './audit';
import { BILLING_MONTHS } from './plans';
import { provisionPanel } from './provisioning';
import { createUddoktaPayCharge, PaymentError, verifyUddoktaPayPayment } from './uddoktapay';

export function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  const day = result.getDate();
  result.setMonth(result.getMonth() + months);
  if (result.getDate() < day) result.setDate(0); // e.g. 31 Jan + 1 month -> last day of Feb
  return result;
}

function invoiceNumber(): string {
  const now = new Date();
  const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  return `TC-${stamp}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
}

export function isValidMonths(months: number): boolean {
  return (BILLING_MONTHS as readonly number[]).includes(months);
}

export async function createInvoice(input: {
  userId: number;
  panelId: number;
  planId: number;
  months: number;
  type: 'new' | 'renewal';
}) {
  if (!isValidMonths(input.months)) throw new PaymentError('Invalid billing period.');
  const db = platformDb();
  const plan = await db.saasPlan.findUnique({ where: { id: input.planId } });
  if (!plan) throw new PaymentError('Plan not found.');
  // One open invoice per panel: replace an older unpaid one instead of piling up.
  await db.saasInvoice.updateMany({
    where: { panelId: input.panelId, status: 'unpaid' },
    data: { status: 'cancelled' },
  });
  return db.saasInvoice.create({
    data: {
      number: invoiceNumber(),
      userId: input.userId,
      panelId: input.panelId,
      planId: plan.id,
      type: input.type,
      months: input.months,
      amount: plan.priceMonthly * input.months,
      currency: plan.currency,
    },
  });
}

/** Returns the gateway checkout URL for an unpaid invoice owned by `userId`. */
export async function startInvoicePayment(invoiceId: number, userId: number, origin: string): Promise<string> {
  const invoice = await platformDb().saasInvoice.findFirst({
    where: { id: invoiceId, userId },
    include: { user: true },
  });
  if (!invoice) throw new PaymentError('Invoice not found.');
  if (invoice.status !== 'unpaid') throw new PaymentError('This invoice is not payable.');
  if (!/^https?:\/\//.test(origin)) throw new PaymentError('Cannot determine site address.');
  return createUddoktaPayCharge({
    fullName: invoice.user.name,
    email: invoice.user.email,
    amount: invoice.amount,
    invoiceNumber: invoice.number,
    redirectUrl: `${origin}/portal/invoices/${invoice.id}/return`,
    cancelUrl: `${origin}/portal/invoices/${invoice.id}`,
    webhookUrl: `${origin}/api/saas/payment/webhook`,
  });
}

type Settlement = {
  gatewayInvoiceId?: string | null;
  paymentMethod?: string | null;
  transactionId?: string | null;
  actor?: string;
  actorId?: number | null;
};

/**
 * Marks an invoice paid exactly once and applies it: a new panel gets created,
 * a renewal extends the expiry date. Safe against double delivery (redirect +
 * webhook arriving together).
 */
export async function settleInvoice(invoiceId: number, info: Settlement = {}): Promise<'settled' | 'already'> {
  const db = platformDb();
  const claimed = await db.saasInvoice.updateMany({
    where: { id: invoiceId, status: 'unpaid' },
    data: {
      status: 'paid',
      paidAt: new Date(),
      gatewayInvoiceId: info.gatewayInvoiceId ?? undefined,
      paymentMethod: info.paymentMethod ?? undefined,
      transactionId: info.transactionId ?? undefined,
    },
  });
  if (claimed.count !== 1) return 'already';

  const invoice = await db.saasInvoice.findUniqueOrThrow({ where: { id: invoiceId }, include: { panel: true } });
  await audit({
    actorId: info.actorId ?? null,
    actor: info.actor ?? 'gateway',
    action: 'invoice.paid',
    target: `invoice:${invoice.number}`,
    meta: { amount: invoice.amount, gatewayInvoiceId: info.gatewayInvoiceId ?? null },
  });

  const panel = invoice.panel;
  if (!panel || panel.status === 'terminated') return 'settled';

  const now = new Date();
  const base = panel.expiresAt && panel.expiresAt > now ? panel.expiresAt : now;
  const expiresAt = addMonths(base, invoice.months);
  const wasLapsed = panel.status === 'expired' || (panel.status === 'suspended' && panel.statusReason === 'expired');

  await db.saasPanel.update({
    where: { id: panel.id },
    data: {
      expiresAt,
      planId: invoice.planId,
      ...(wasLapsed ? { status: 'active', statusReason: null } : {}),
    },
  });
  invalidateTenantRouting();

  if (!panel.provisionedAt) {
    try {
      await provisionPanel(panel.id);
    } catch {
      // Recorded on the panel as status "failed"; the super admin can retry.
    }
  }
  return 'settled';
}

/**
 * Confirms a payment with the gateway and settles the matching invoice.
 * `expectedInvoiceId` (from the customer's return URL) must match if given.
 */
export async function confirmGatewayPayment(
  gatewayInvoiceId: string,
  expectedInvoiceId?: number
): Promise<{ status: 'paid' | 'pending' | 'failed'; invoiceId?: number }> {
  const db = platformDb();
  const used = await db.saasInvoice.findUnique({ where: { gatewayInvoiceId } });
  if (used) {
    if (expectedInvoiceId && used.id !== expectedInvoiceId) return { status: 'failed' };
    return { status: used.status === 'paid' ? 'paid' : 'failed', invoiceId: used.id };
  }

  const payment = await verifyUddoktaPayPayment(gatewayInvoiceId);
  if (!payment.invoiceNumber) return { status: 'failed' };
  const invoice = await db.saasInvoice.findUnique({ where: { number: payment.invoiceNumber } });
  if (!invoice) return { status: 'failed' };
  if (expectedInvoiceId && invoice.id !== expectedInvoiceId) return { status: 'failed', invoiceId: invoice.id };
  if (invoice.status === 'paid') return { status: 'paid', invoiceId: invoice.id };
  if (!payment.completed) {
    return { status: payment.status === 'PENDING' ? 'pending' : 'failed', invoiceId: invoice.id };
  }
  if (payment.amount + 0.001 < invoice.amount) {
    await audit({
      action: 'invoice.underpaid',
      target: `invoice:${invoice.number}`,
      meta: { paid: payment.amount, due: invoice.amount, gatewayInvoiceId },
    });
    return { status: 'failed', invoiceId: invoice.id };
  }
  if (invoice.status !== 'unpaid') {
    // Paid for an invoice we had cancelled (customer used an old payment link).
    await db.saasInvoice.updateMany({ where: { id: invoice.id, status: 'cancelled' }, data: { status: 'unpaid' } });
  }
  await settleInvoice(invoice.id, {
    gatewayInvoiceId,
    paymentMethod: payment.paymentMethod,
    transactionId: payment.transactionId,
  });
  return { status: 'paid', invoiceId: invoice.id };
}
