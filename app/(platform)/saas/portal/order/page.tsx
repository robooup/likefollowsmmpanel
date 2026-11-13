import type { Metadata } from 'next';
import { OrderForm } from '@/components/saas/order-form';
import { PageTitle } from '@/components/saas/ui';
import { requireSaasUser } from '@/lib/saas/auth';
import { listActivePlans } from '@/lib/saas/plans';
import { platformRootDomain } from '@/lib/tenant/config';

export const metadata: Metadata = { title: 'Order a panel' };

export default async function OrderPage({ searchParams }: { searchParams: Promise<{ plan?: string }> }) {
  await requireSaasUser();
  const { plan } = await searchParams;
  const plans = await listActivePlans();
  return (
    <>
      <PageTitle title="Order a new panel" subtitle="Three quick steps. Your panel is online the moment your payment is confirmed." />
      <OrderForm
        plans={plans.map((p) => ({
          id: p.id,
          slug: p.slug,
          name: p.name,
          priceMonthly: p.priceMonthly,
          currency: p.currency,
          description: p.description,
          isPopular: p.isPopular,
        }))}
        rootDomain={platformRootDomain()}
        initialPlan={plan}
      />
    </>
  );
}
