import { PrismaClient } from '@prisma/client';
import { platformDatabaseUrl, tenantDatabaseUrl } from './config';
import { tenancy, TenantError, type TenantInfo } from './context';

const HIT_TTL = 30_000;
const MISS_TTL = 10_000;
const CLIENT_IDLE_MS = 10 * 60_000;

/** Prisma client for the control-plane database (saas_* tables). */
export function platformDb(): PrismaClient {
  if (!tenancy.platform) {
    const base = platformDatabaseUrl();
    const url = base.includes('connection_limit')
      ? base
      : `${base}${base.includes('?') ? '&' : '?'}connection_limit=${process.env.PLATFORM_DB_POOL_SIZE || '5'}`;
    tenancy.platform = new PrismaClient({ log: ['error'], datasources: { db: { url } } });
  }
  return tenancy.platform;
}

function toInfo(panel: {
  id: number;
  name: string;
  dbName: string | null;
  status: string;
  expiresAt: Date | null;
  domains?: { host: string; isPrimary: boolean; status: string }[];
}): TenantInfo | null {
  if (!panel.dbName) return null;
  const active = (panel.domains || []).filter((d) => d.status === 'active');
  const primary = active.find((d) => d.isPrimary) || active[0];
  return {
    id: panel.id,
    name: panel.name,
    dbName: panel.dbName,
    status: panel.status,
    expiresAt: panel.expiresAt,
    primaryHost: primary?.host ?? null,
  };
}

const panelSelect = {
  id: true,
  name: true,
  dbName: true,
  status: true,
  expiresAt: true,
  domains: { select: { host: true, isPrimary: true, status: true } },
} as const;

/** Which panel does this host belong to? Only verified (active) domains count. */
export async function resolveHost(host: string): Promise<TenantInfo | null> {
  const now = Date.now();
  const hit = tenancy.hostCache.get(host);
  if (hit && hit.exp > now) return hit.tenant;

  const domain = await platformDb().saasPanelDomain.findUnique({
    where: { host },
    select: { status: true, panel: { select: panelSelect } },
  });
  const tenant = domain && domain.status === 'active' ? toInfo(domain.panel) : null;
  if (tenancy.hostCache.size > 20000) tenancy.hostCache.clear();
  tenancy.hostCache.set(host, { tenant, exp: now + (tenant ? HIT_TTL : MISS_TTL) });
  return tenant;
}

export async function resolveTenantById(id: number): Promise<TenantInfo | null> {
  const now = Date.now();
  const hit = tenancy.idCache.get(id);
  if (hit && hit.exp > now) return hit.tenant;
  const panel = await platformDb().saasPanel.findUnique({ where: { id }, select: panelSelect });
  const tenant = panel ? toInfo(panel) : null;
  tenancy.idCache.set(id, { tenant, exp: now + (tenant ? HIT_TTL : MISS_TTL) });
  return tenant;
}

/** Forget cached routing after a panel/domain change (this process only). */
export function invalidateTenantRouting(): void {
  tenancy.hostCache.clear();
  tenancy.idCache.clear();
}

export function isTenantServing(tenant: TenantInfo): boolean {
  return tenant.status === 'active';
}

function startSweeper() {
  if (tenancy.sweeper) return;
  tenancy.sweeper = setInterval(() => {
    const cutoff = Date.now() - CLIENT_IDLE_MS;
    for (const [id, entry] of tenancy.clients) {
      if (entry.lastUsed < cutoff) {
        tenancy.clients.delete(id);
        entry.client.$disconnect().catch(() => {});
      }
    }
  }, 60_000);
  tenancy.sweeper.unref?.();
}

/** Prisma client bound to one panel's own database. */
export function tenantClient(tenant: TenantInfo): PrismaClient {
  const existing = tenancy.clients.get(tenant.id);
  if (existing && existing.dbName === tenant.dbName) {
    existing.lastUsed = Date.now();
    return existing.client;
  }
  if (existing) {
    tenancy.clients.delete(tenant.id);
    existing.client.$disconnect().catch(() => {});
  }

  const max = parseInt(process.env.TENANT_MAX_CLIENTS || '40', 10);
  if (tenancy.clients.size >= max) {
    let oldestId: number | null = null;
    let oldest = Infinity;
    for (const [id, entry] of tenancy.clients) {
      if (entry.lastUsed < oldest) {
        oldest = entry.lastUsed;
        oldestId = id;
      }
    }
    if (oldestId != null) {
      const evicted = tenancy.clients.get(oldestId)!;
      tenancy.clients.delete(oldestId);
      // Let in-flight queries finish before closing the pool.
      setTimeout(() => evicted.client.$disconnect().catch(() => {}), 30_000).unref?.();
    }
  }

  const client = new PrismaClient({
    log: ['error'],
    datasources: { db: { url: tenantDatabaseUrl(tenant.dbName) } },
  });
  tenancy.clients.set(tenant.id, { client, dbName: tenant.dbName, lastUsed: Date.now() });
  startSweeper();
  return client;
}

export async function dropTenantClient(tenantId: number): Promise<void> {
  const entry = tenancy.clients.get(tenantId);
  if (entry) {
    tenancy.clients.delete(tenantId);
    await entry.client.$disconnect().catch(() => {});
  }
}

export { TenantError };
