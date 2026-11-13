// Central place for SaaS environment configuration (server only).

function list(value: string | undefined): string[] {
  return (value || '')
    .split(',')
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);
}

export function platformRootDomain(): string {
  return (process.env.PLATFORM_ROOT_DOMAIN || 'topupcraft.com').trim().toLowerCase();
}

/** Hosts that serve the TopupCraft site itself (landing, portal, super admin). */
export function platformHosts(): string[] {
  const configured = list(process.env.PLATFORM_HOSTS);
  if (configured.length) return configured;
  const root = platformRootDomain();
  return [root, `www.${root}`];
}

export function isPlatformHost(host: string): boolean {
  return platformHosts().includes(host);
}

/** Loopback hosts: only Caddy / cron on the same machine can use these. */
export function isInternalHost(host: string): boolean {
  return host === '127.0.0.1' || host === 'localhost' || host === '[::1]';
}

export function platformDatabaseUrl(): string {
  const url = process.env.PLATFORM_DATABASE_URL;
  if (!url) throw new Error('PLATFORM_DATABASE_URL is not set');
  return url;
}

const DB_NAME_RE = /^[a-z][a-z0-9_]{2,62}$/;

export function assertSafeDbName(name: string): string {
  if (!DB_NAME_RE.test(name)) throw new Error(`Unsafe database name: ${name}`);
  return name;
}

export function tenantDbName(panelId: number): string {
  const prefix = (process.env.TENANT_DB_PREFIX || 'tc_panel_').toLowerCase();
  return assertSafeDbName(`${prefix}${panelId}`);
}

export function tenantTemplateDbName(): string {
  return assertSafeDbName(process.env.TENANT_TEMPLATE_DB || 'tc_panel_template');
}

/** Connection URL for one panel database. TENANT_DATABASE_URL must contain `{db}`. */
export function tenantDatabaseUrl(dbName: string): string {
  const template = process.env.TENANT_DATABASE_URL;
  if (!template || !template.includes('{db}')) {
    throw new Error('TENANT_DATABASE_URL must be set and contain the {db} placeholder');
  }
  let url = template.replace('{db}', assertSafeDbName(dbName));
  if (!url.includes('connection_limit')) {
    const limit = process.env.TENANT_DB_POOL_SIZE || '3';
    const timeout = process.env.DATABASE_POOL_TIMEOUT || '10';
    url += `${url.includes('?') ? '&' : '?'}connection_limit=${limit}&pool_timeout=${timeout}`;
  }
  return url;
}

export function platformSecret(): string {
  const secret = process.env.PLATFORM_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('PLATFORM_SECRET must be set (at least 32 characters)');
  }
  return secret;
}

export function serverIp(): string {
  return (process.env.SERVER_IP || '').trim();
}
