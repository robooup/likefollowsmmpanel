'use client';

import { useMemo } from 'react';
import { useAppNameWithFallback } from '@/contexts/app-name-context';

// Placeholder used in static content (data/frontend/*) for the panel's own name.
export const APP_NAME_TOKEN = '{appName}';
const FALLBACK_NAME = 'SMM Panel';

/** Renders the current panel's name (General settings > Site title). */
export function AppName() {
  const { appName } = useAppNameWithFallback();
  return <>{appName || FALLBACK_NAME}</>;
}

function replaceToken<T>(value: T, name: string): T {
  if (typeof value === 'string') return value.split(APP_NAME_TOKEN).join(name) as T;
  if (Array.isArray(value)) return value.map((item) => replaceToken(item, name)) as T;
  // Only plain objects: leave React elements, components and class instances alone.
  if (value && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype && !('$$typeof' in value)) {
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) out[key] = replaceToken(item, name);
    return out as T;
  }
  return value;
}

/** Returns static content with every {appName} placeholder replaced by the panel's name. */
export function useBranded<T>(data: T): T {
  const { appName } = useAppNameWithFallback();
  return useMemo(() => replaceToken(data, appName || FALLBACK_NAME), [data, appName]);
}
