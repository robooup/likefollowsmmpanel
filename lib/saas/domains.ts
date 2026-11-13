import crypto from 'node:crypto';
import { platformHosts, platformRootDomain, platformSecret } from '@/lib/tenant/config';
import { invalidateTenantRouting, platformDb } from '@/lib/tenant/registry';

export class DomainError extends Error {}

const RESERVED = new Set([
  'www', 'admin', 'administrator', 'api', 'app', 'apps', 'mail', 'email', 'smtp', 'imap', 'pop', 'ftp', 'pay',
  'payment', 'payments', 'billing', 'panel', 'panels', 'portal', 'support', 'help', 'ns', 'ns1', 'ns2', 'ns3',
  'ns4', 'cdn', 'static', 'assets', 'status', 'blog', 'docs', 'dashboard', 'login', 'register', 'signup', 'auth',
  'account', 'accounts', 'secure', 'ssl', 'test', 'dev', 'staging', 'demo', 'root', 'system', 'internal', 'topupcraft',
  'official', 'webmail', 'cpanel', 'whm', 'autodiscover', 'mx', 'vpn',
]);

/** "My Shop" -> validated subdomain label, or throws DomainError. */
export function normalizeSubdomain(input: string): string {
  const label = String(input || '').trim().toLowerCase();
  if (!/^[a-z0-9](?:[a-z0-9-]{1,30})[a-z0-9]$/.test(label) || label.includes('--')) {
    throw new DomainError('Subdomain must be 3-32 characters: letters, numbers and single hyphens only.');
  }
  if (RESERVED.has(label)) throw new DomainError('This subdomain is reserved. Please choose another one.');
  return label;
}

export function subdomainHost(label: string): string {
  return `${label}.${platformRootDomain()}`;
}

/** Validates a customer-owned domain like "panel.example.com". */
export function normalizeCustomDomain(input: string): string {
  let host = String(input || '').trim().toLowerCase();
  host = host.replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/\.$/, '');
  if (host.startsWith('www.')) host = host.slice(4);
  if (host.length < 4 || host.length > 253) throw new DomainError('Enter a valid domain name, e.g. example.com');
  const labels = host.split('.');
  if (labels.length < 2) throw new DomainError('Enter a valid domain name, e.g. example.com');
  for (const label of labels) {
    if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label)) {
      throw new DomainError('Enter a valid domain name, e.g. example.com');
    }
  }
  if (/^\d+$/.test(labels[labels.length - 1])) throw new DomainError('IP addresses cannot be used as a domain.');
  const root = platformRootDomain();
  if (host === root || host.endsWith(`.${root}`) || platformHosts().includes(host)) {
    throw new DomainError(`Domains under ${root} cannot be added as a custom domain.`);
  }
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal')) {
    throw new DomainError('Enter a public domain name.');
  }
  return host;
}

// --- verification: does the domain actually reach this server? --------------

export function probeAnswer(nonce: string): string {
  return crypto.createHmac('sha256', platformSecret()).update(`domain-probe:${nonce}`).digest('hex');
}

async function probe(host: string): Promise<{ ok: true } | { ok: false; reason: string }> {
  const nonce = crypto.randomBytes(16).toString('hex');
  const port = process.env.DOMAIN_PROBE_PORT ? `:${process.env.DOMAIN_PROBE_PORT}` : '';
  const url = `http://${host}${port}/.well-known/tc-domain-check?nonce=${nonce}`;
  try {
    const response = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(25_000), cache: 'no-store' });
    const text = (await response.text()).trim();
    if (response.ok && text === probeAnswer(nonce)) return { ok: true };
    return { ok: false, reason: 'The domain is reachable but does not point to our server yet.' };
  } catch (error: any) {
    const code = error?.cause?.code || error?.code || '';
    if (code === 'ENOTFOUND' || code === 'EAI_AGAIN') {
      return { ok: false, reason: 'No DNS record found for this domain yet.' };
    }
    if (code === 'ESSRFBLOCKED') return { ok: false, reason: 'The domain does not point to a public server.' };
    return { ok: false, reason: 'Could not reach the domain. DNS changes can take a while to spread.' };
  }
}

async function ownedPanel(panelId: number, ownerId: number | null) {
  const panel = await platformDb().saasPanel.findFirst({
    where: ownerId == null ? { id: panelId } : { id: panelId, ownerId },
    include: { plan: true, domains: true },
  });
  if (!panel) throw new DomainError('Panel not found.');
  return panel;
}

/** ownerId null = super admin acting on any panel. */
export async function addCustomDomain(panelId: number, ownerId: number | null, input: string) {
  const host = normalizeCustomDomain(input);
  const panel = await ownedPanel(panelId, ownerId);
  if (panel.domains.some((d) => d.host === host)) throw new DomainError('This domain is already on your panel.');
  const customCount = panel.domains.filter((d) => d.type === 'custom').length;
  if (customCount >= panel.plan.maxCustomDomains) {
    throw new DomainError(
      `Your ${panel.plan.name} plan allows ${panel.plan.maxCustomDomains} custom domain(s). Remove one or upgrade your plan.`
    );
  }
  const db = platformDb();
  const existing = await db.saasPanelDomain.findUnique({ where: { host } });
  if (existing) {
    if (existing.status === 'active') throw new DomainError('This domain is already connected to another panel.');
    // An unverified claim never blocks the real owner of the domain.
    await db.saasPanelDomain.delete({ where: { id: existing.id } });
  }
  return db.saasPanelDomain.create({ data: { panelId, host, type: 'custom', status: 'pending' } });
}

export async function verifyDomain(panelId: number, ownerId: number | null, domainId: number) {
  const panel = await ownedPanel(panelId, ownerId);
  const domain = panel.domains.find((d) => d.id === domainId);
  if (!domain) throw new DomainError('Domain not found.');
  if (domain.status === 'active') return { ok: true as const };
  const result = await probe(domain.host);
  const db = platformDb();
  if (!result.ok) {
    await db.saasPanelDomain.update({
      where: { id: domain.id },
      data: { lastCheck: new Date(), lastError: result.reason },
    });
    return result;
  }
  const hasPrimary = panel.domains.some((d) => d.isPrimary && d.status === 'active');
  await db.saasPanelDomain.update({
    where: { id: domain.id },
    data: { status: 'active', verifiedAt: new Date(), lastCheck: new Date(), lastError: null, isPrimary: !hasPrimary },
  });
  invalidateTenantRouting();
  return { ok: true as const };
}

export async function setPrimaryDomain(panelId: number, ownerId: number | null, domainId: number) {
  const panel = await ownedPanel(panelId, ownerId);
  const domain = panel.domains.find((d) => d.id === domainId);
  if (!domain) throw new DomainError('Domain not found.');
  if (domain.status !== 'active') throw new DomainError('Verify the domain before making it primary.');
  const db = platformDb();
  await db.$transaction([
    db.saasPanelDomain.updateMany({ where: { panelId }, data: { isPrimary: false } }),
    db.saasPanelDomain.update({ where: { id: domain.id }, data: { isPrimary: true } }),
  ]);
  invalidateTenantRouting();
}

export async function removeDomain(panelId: number, ownerId: number | null, domainId: number) {
  const panel = await ownedPanel(panelId, ownerId);
  const domain = panel.domains.find((d) => d.id === domainId);
  if (!domain) throw new DomainError('Domain not found.');
  if (domain.type === 'subdomain') throw new DomainError('The free subdomain cannot be removed, but you can change it.');
  const db = platformDb();
  await db.saasPanelDomain.delete({ where: { id: domain.id } });
  if (domain.isPrimary) {
    const next = panel.domains.find((d) => d.id !== domain.id && d.status === 'active');
    if (next) await db.saasPanelDomain.update({ where: { id: next.id }, data: { isPrimary: true } });
  }
  invalidateTenantRouting();
}

export async function changeSubdomain(panelId: number, ownerId: number | null, input: string) {
  const host = subdomainHost(normalizeSubdomain(input));
  const panel = await ownedPanel(panelId, ownerId);
  const db = platformDb();
  const taken = await db.saasPanelDomain.findUnique({ where: { host } });
  if (taken && taken.panelId !== panelId) throw new DomainError('This subdomain is already taken.');
  if (taken) return taken;
  const current = panel.domains.find((d) => d.type === 'subdomain');
  const result = current
    ? await db.saasPanelDomain.update({ where: { id: current.id }, data: { host } })
    : await db.saasPanelDomain.create({
        data: { panelId, host, type: 'subdomain', status: panel.status === 'active' ? 'active' : 'pending' },
      });
  invalidateTenantRouting();
  return result;
}

export async function isSubdomainAvailable(label: string): Promise<boolean> {
  const existing = await platformDb().saasPanelDomain.findUnique({ where: { host: subdomainHost(label) } });
  return !existing;
}

/** Caddy asks this before issuing a certificate for a host name. */
export async function isCertificateAllowed(host: string): Promise<boolean> {
  if (platformHosts().includes(host)) return true;
  const select = { panel: { select: { status: true } } } as const;
  let domain = await platformDb().saasPanelDomain.findUnique({ where: { host }, select });
  if (!domain && host.startsWith('www.')) {
    domain = await platformDb().saasPanelDomain.findUnique({ where: { host: host.slice(4) }, select });
  }
  if (!domain) return false;
  return !['terminated', 'failed'].includes(domain.panel.status);
}
