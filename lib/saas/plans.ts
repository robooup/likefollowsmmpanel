import { platformDb } from '@/lib/tenant/registry';

export const BILLING_MONTHS = [1, 3, 6, 12] as const;

const DEFAULT_PLANS = [
  {
    slug: 'starter',
    name: 'Starter',
    description: 'Everything you need to launch your first SMM panel.',
    priceMonthly: 999,
    maxCustomDomains: 1,
    sortOrder: 1,
    isPopular: false,
    features: [
      'Fully hosted SMM panel',
      'Free subdomain + 1 custom domain',
      'Free SSL certificate',
      'Unlimited services & providers',
      'Your own payment gateway',
      'Email support',
    ],
  },
  {
    slug: 'growth',
    name: 'Growth',
    description: 'For panels that are growing and need more room.',
    priceMonthly: 1999,
    maxCustomDomains: 3,
    sortOrder: 2,
    isPopular: true,
    features: [
      'Everything in Starter',
      'Up to 3 custom domains',
      'Affiliate system & mass orders',
      'Customer API (v2) for resellers',
      'Daily backups',
      'Priority support',
    ],
  },
  {
    slug: 'pro',
    name: 'Pro',
    description: 'For established panels that want the full package.',
    priceMonthly: 3499,
    maxCustomDomains: 10,
    sortOrder: 3,
    isPopular: false,
    features: [
      'Everything in Growth',
      'Up to 10 custom domains',
      'Staff accounts with permissions',
      'Advanced analytics & reports',
      'Daily backups with 30-day history',
      'Dedicated support channel',
    ],
  },
];

let seeded = false;

/** Creates the three starter plans the first time the platform runs. */
export async function ensureDefaultPlans(): Promise<void> {
  if (seeded) return;
  const db = platformDb();
  if ((await db.saasPlan.count()) === 0) {
    await db.saasPlan.createMany({ data: DEFAULT_PLANS, skipDuplicates: true });
  }
  seeded = true;
}

export async function listActivePlans() {
  await ensureDefaultPlans();
  return platformDb().saasPlan.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] });
}

export function planFeatures(plan: { features: unknown }): string[] {
  return Array.isArray(plan.features) ? plan.features.filter((f): f is string => typeof f === 'string') : [];
}

export function formatMoney(amount: number, currency = 'BDT'): string {
  const symbol = currency === 'BDT' ? '৳' : `${currency} `;
  return `${symbol}${amount.toLocaleString('en-US')}`;
}
