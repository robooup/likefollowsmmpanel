// Isomorphic (safe to import from client components): no Node imports here.
// Gives module-level caches a key that is unique per panel, so one panel can
// never read another panel's cached settings.

type Store = { host?: string; tenantId?: number | null };
type Tenancy = {
  als?: { getStore(): Store | undefined };
  hostCache?: Map<string, { tenant: { id: number } | null; exp: number }>;
};

/**
 * Cache key for the panel serving the current request, or null when it cannot
 * be determined (callers must then skip caching).
 */
export function tenantCacheKey(): string | null {
  if (typeof window !== 'undefined') return 'browser';
  const tenancy = (globalThis as any).__tcTenancy as Tenancy | undefined;
  const store = tenancy?.als?.getStore();
  if (!store) return null;
  if (store.tenantId != null) return `t${store.tenantId}`;
  if (store.host) {
    const hit = tenancy?.hostCache?.get(store.host);
    if (hit?.tenant) return `t${hit.tenant.id}`;
  }
  return null;
}

/** A tiny per-panel TTL cache for module-level settings caches. */
export function createTenantCache<T>(ttlMs: number) {
  const entries = new Map<string, { value: T; at: number }>();
  return {
    get(): T | null {
      const key = tenantCacheKey();
      if (!key) return null;
      const hit = entries.get(key);
      if (!hit) return null;
      if (Date.now() - hit.at > ttlMs) {
        entries.delete(key);
        return null;
      }
      return hit.value;
    },
    /** Returns the value even when stale; null if nothing was ever cached. */
    peek(): T | null {
      const key = tenantCacheKey();
      return key ? entries.get(key)?.value ?? null : null;
    },
    set(value: T): void {
      const key = tenantCacheKey();
      if (!key) return;
      if (entries.size > 5000) entries.clear();
      entries.set(key, { value, at: Date.now() });
    },
    clear(): void {
      const key = tenantCacheKey();
      if (key) entries.delete(key);
    },
  };
}
