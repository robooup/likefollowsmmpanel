import { getTenantStore, normalizeHost, TenantError, type TenantInfo, type TenantStore } from './context';
import { isTenantServing, resolveHost, resolveTenantById } from './registry';

async function hostFromNextRequest(): Promise<{ host: string; origin: string } | null> {
  try {
    const { headers } = await import('next/headers');
    const h = await headers();
    const rawHost = (h.get('x-forwarded-host') || h.get('host') || '').split(',')[0].trim().toLowerCase();
    const host = normalizeHost(rawHost);
    if (!host) return null;
    const proto = (h.get('x-forwarded-proto') || 'http').split(',')[0].trim() === 'https' ? 'https' : 'http';
    return { host, origin: `${proto}://${rawHost}` };
  } catch {
    return null; // not inside a request (build, scripts, timers)
  }
}

/**
 * The panel the current request (or background job) belongs to.
 * `store` may be a context captured earlier, when the work was queued.
 */
export async function requireTenant(store: TenantStore | undefined = getTenantStore()): Promise<TenantInfo> {
  let tenant: TenantInfo | null = null;
  let label = '';

  if (store?.tenantId != null) {
    tenant = await resolveTenantById(store.tenantId);
    label = `#${store.tenantId}`;
  } else {
    let host = store?.host;
    if (!host) host = (await hostFromNextRequest())?.host;
    if (!host) throw new TenantError('NO_CONTEXT', 'No panel context for this database call');
    tenant = await resolveHost(host);
    label = host;
    if (tenant && store) store.tenantId = tenant.id;
  }

  if (!tenant) throw new TenantError('NOT_FOUND', `No panel is configured for ${label}`);
  if (!store?.allowInactive && !isTenantServing(tenant)) {
    throw new TenantError('INACTIVE', `Panel ${label} is ${tenant.status}`);
  }
  return tenant;
}

/** Like requireTenant, but returns null instead of throwing. */
export async function currentTenant(): Promise<TenantInfo | null> {
  try {
    return await requireTenant();
  } catch (error) {
    if (error instanceof TenantError) return null;
    throw error;
  }
}

/** Origin (scheme + host) of the current request, e.g. https://panel.example.com */
export async function getBaseUrl(): Promise<string> {
  const store = getTenantStore();
  if (store?.origin) return store.origin;
  const req = await hostFromNextRequest();
  if (req) return req.origin;
  const tenant = await currentTenant();
  return tenant?.primaryHost ? `https://${tenant.primaryHost}` : '';
}
