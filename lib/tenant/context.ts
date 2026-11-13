import { AsyncLocalStorage } from 'node:async_hooks';
import type { PrismaClient } from '@prisma/client';

export type TenantInfo = {
  id: number;
  name: string;
  dbName: string;
  status: string;
  expiresAt: Date | null;
  primaryHost: string | null;
};

export type TenantStore = {
  /** Normalised request host (lowercase, no port). */
  host?: string;
  proto?: string;
  /** scheme://host[:port] exactly as the visitor addressed us. */
  origin?: string;
  /** Set once the host has been resolved, or directly for background jobs. */
  tenantId?: number | null;
  /** Background jobs may touch panels that are suspended/expired. */
  allowInactive?: boolean;
};

type Tenancy = {
  als: AsyncLocalStorage<TenantStore>;
  hostCache: Map<string, { tenant: TenantInfo | null; exp: number }>;
  idCache: Map<number, { tenant: TenantInfo | null; exp: number }>;
  clients: Map<number, { client: PrismaClient; dbName: string; lastUsed: number }>;
  platform?: PrismaClient;
  sweeper?: NodeJS.Timeout;
};

// Shared through globalThis because server.js (plain Node) and the bundled
// Next.js server code must see the very same AsyncLocalStorage instance.
const g = globalThis as any;
if (!g.__tcTenancy) g.__tcTenancy = {};
const tenancy = g.__tcTenancy as Tenancy;
tenancy.als ??= new AsyncLocalStorage<TenantStore>();
tenancy.hostCache ??= new Map();
tenancy.idCache ??= new Map();
tenancy.clients ??= new Map();

export { tenancy };

export function getTenantStore(): TenantStore | undefined {
  return tenancy.als.getStore();
}

export function normalizeHost(raw: string | null | undefined): string {
  if (!raw) return '';
  let host = raw.split(',')[0].trim().toLowerCase();
  if (host.startsWith('[')) {
    const end = host.indexOf(']');
    return end > 0 ? host.slice(0, end + 1) : host;
  }
  const colon = host.lastIndexOf(':');
  if (colon > -1) host = host.slice(0, colon);
  if (host.endsWith('.')) host = host.slice(0, -1);
  return host;
}

/** Run `fn` for one specific panel (cron jobs, provisioning, admin tools). */
export function runWithTenant<T>(
  tenantId: number,
  fn: () => Promise<T>,
  opts: { allowInactive?: boolean } = {}
): Promise<T> {
  return tenancy.als.run({ tenantId, allowInactive: opts.allowInactive }, fn);
}

/** Run `fn` as if it was a request for `host`. */
export function runWithHost<T>(host: string, proto: string, fn: () => T): T {
  return tenancy.als.run({ host: normalizeHost(host), proto, origin: `${proto}://${host.toLowerCase()}` }, fn);
}

export class TenantError extends Error {
  code: 'NO_CONTEXT' | 'NOT_FOUND' | 'INACTIVE';
  constructor(code: TenantError['code'], message: string) {
    super(message);
    this.name = 'TenantError';
    this.code = code;
  }
}
