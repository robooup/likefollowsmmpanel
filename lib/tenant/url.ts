// Isomorphic: no Node imports. Replaces the old single-site NEXT_PUBLIC_APP_URL.

/**
 * Origin of the site being served right now (scheme://host[:port]).
 * Browser: the page origin. Server: the origin of the current request, or the
 * panel's primary domain inside background jobs. Empty string if unknown.
 */
export function baseUrlSync(): string {
  if (typeof window !== 'undefined') return window.location.origin;
  const store = (globalThis as any).__tcTenancy?.als?.getStore() as { origin?: string } | undefined;
  return store?.origin || '';
}
