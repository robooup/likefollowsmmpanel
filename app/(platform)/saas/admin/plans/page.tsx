import type { Metadata } from 'next';
import { ActionForm, Field } from '@/components/saas/forms';
import { Card, PageTitle } from '@/components/saas/ui';
import { adminSavePlanAction } from '@/lib/saas/actions';
import { requireSaasAdmin } from '@/lib/saas/auth';
import { ensureDefaultPlans, planFeatures } from '@/lib/saas/plans';
import { platformDb } from '@/lib/tenant/registry';

export const metadata: Metadata = { title: 'Plans' };

type PlanRow = {
  id?: number;
  name: string;
  slug: string;
  description: string;
  priceMonthly: number;
  maxCustomDomains: number;
  sortOrder: number;
  isPopular: boolean;
  isActive: boolean;
  features: unknown;
};

function PlanForm({ plan }: { plan: PlanRow }) {
  const key = plan.id ?? 'new';
  return (
    <ActionForm action={adminSavePlanAction} submitLabel={plan.id ? 'Save plan' : 'Add plan'}>
      {plan.id && <input type="hidden" name="planId" value={plan.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" name="name" id={`name-${key}`} defaultValue={plan.name} required />
        <Field label="Slug (used in links)" name="slug" id={`slug-${key}`} defaultValue={plan.slug} required />
        <Field label="Price per month (BDT)" name="priceMonthly" id={`price-${key}`} type="number" min={0} defaultValue={plan.priceMonthly} required />
        <Field label="Custom domains allowed" name="maxCustomDomains" id={`domains-${key}`} type="number" min={0} defaultValue={plan.maxCustomDomains} required />
        <Field label="Sort order" name="sortOrder" id={`sort-${key}`} type="number" min={0} defaultValue={plan.sortOrder} />
        <Field label="Short description" name="description" id={`desc-${key}`} defaultValue={plan.description} maxLength={200} />
      </div>
      <div>
        <label className="tc-label" htmlFor={`features-${key}`}>Features (one per line)</label>
        <textarea id={`features-${key}`} name="features" rows={6} className="tc-input" defaultValue={planFeatures(plan).join('\n')} />
      </div>
      <div className="flex flex-wrap gap-6 text-sm text-slate-700">
        <label className="flex items-center gap-2"><input type="checkbox" name="isActive" defaultChecked={plan.isActive} /> Available to order</label>
        <label className="flex items-center gap-2"><input type="checkbox" name="isPopular" defaultChecked={plan.isPopular} /> Highlight as “Most popular”</label>
      </div>
    </ActionForm>
  );
}

export default async function AdminPlans() {
  await requireSaasAdmin();
  await ensureDefaultPlans();
  const plans = await platformDb().saasPlan.findMany({ orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }], include: { _count: { select: { panels: true } } } });
  return (
    <>
      <PageTitle title="Plans" subtitle="Prices apply to new invoices. Existing invoices keep the price they were created with." />
      <div className="space-y-6">
        {plans.map((plan) => (
          <Card key={plan.id} title={`${plan.name} — ${plan._count.panels} panel${plan._count.panels === 1 ? '' : 's'}`}>
            <PlanForm plan={plan} />
          </Card>
        ))}
        <Card title="Add a new plan">
          <PlanForm plan={{ name: '', slug: '', description: '', priceMonthly: 0, maxCustomDomains: 1, sortOrder: plans.length + 1, isPopular: false, isActive: true, features: [] }} />
        </Card>
      </div>
    </>
  );
}
