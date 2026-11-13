import { platformDb } from '@/lib/tenant/registry';

export type SaasSettings = {
  uddoktapayApiKey: string;
  /** e.g. https://pay.example.com/api */
  uddoktapayBaseUrl: string;
  supportEmail: string;
  graceDays: number;
};

const DEFAULTS: SaasSettings = {
  uddoktapayApiKey: '',
  uddoktapayBaseUrl: '',
  supportEmail: '',
  graceDays: 3,
};

let cache: { value: SaasSettings; at: number } | null = null;

export async function getSaasSettings(fresh = false): Promise<SaasSettings> {
  if (!fresh && cache && Date.now() - cache.at < 30_000) return cache.value;
  const rows = await platformDb().saasSetting.findMany();
  const value: SaasSettings = { ...DEFAULTS };
  for (const row of rows) {
    if (row.key === 'graceDays') value.graceDays = Math.max(0, parseInt(row.value, 10) || 0);
    else if (row.key in value) (value as any)[row.key] = row.value;
  }
  cache = { value, at: Date.now() };
  return value;
}

export async function saveSaasSettings(patch: Partial<SaasSettings>): Promise<void> {
  const db = platformDb();
  for (const [key, raw] of Object.entries(patch)) {
    if (!(key in DEFAULTS) || raw === undefined) continue;
    const value = String(raw);
    await db.saasSetting.upsert({ where: { key }, create: { key, value }, update: { value } });
  }
  cache = null;
}
