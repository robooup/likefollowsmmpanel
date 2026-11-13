import type { Metadata } from 'next';
import { PricingGrid } from '@/components/saas/pricing';
import { getSaasUser } from '@/lib/saas/auth';
import { listActivePlans } from '@/lib/saas/plans';

export const metadata: Metadata = { title: 'Pricing' };

export default async function PricingPage() {
  const [plans, user] = await Promise.all([listActivePlans(), getSaasUser()]);
  return (
    <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">Pricing</h1>
        <p className="mt-4 text-lg text-slate-600">
          One fixed monthly price per panel. Hosting, SSL, updates and backups are included in every plan.
        </p>
      </div>
      <div className="mt-14">
        <PricingGrid plans={plans} loggedIn={!!user} />
      </div>
      <p className="mt-10 text-center text-sm text-slate-500">
        Pay for 1, 3, 6 or 12 months at a time. You can change plan when you renew.
      </p>
    </section>
  );
}
