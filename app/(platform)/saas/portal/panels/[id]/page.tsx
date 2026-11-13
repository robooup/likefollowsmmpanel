import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { DomainManager } from '@/components/saas/domain-manager';
import { ActionForm } from '@/components/saas/forms';
import { Card, PageTitle, StatusBadge, daysLeft, formatDate } from '@/components/saas/ui';
import { renewPanelAction } from '@/lib/saas/actions';
import { requireSaasUser } from '@/lib/saas/auth';
import { BILLING_MONTHS, formatMoney, listActivePlans } from '@/lib/saas/plans';
import { platformRootDomain, serverIp } from '@/lib/tenant/config';
import { platformDb } from '@/lib/tenant/registry';

export const metadata: Metadata = { title: 'Manage panel' };

const STATUS_HELP: Record<string, string> = {
  pending_payment: 'Waiting for your first payment. The panel is created automatically once the invoice is paid.',
  provisioning: 'Your panel is being created. This normally takes less than a minute — refresh this page shortly.',
  failed: 'Something went wrong while creating your panel. Our team has been notified; please contact support.',
  expired: 'The paid period has ended and the panel is offline. Renew below to bring it back — your data is safe.',
  suspended: 'This panel has been suspended. Please contact support.',
  terminated: 'This panel has been terminated.',
};

export default async function PanelPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireSaasUser();
  const { id } = await params;
  const panelId = Number(id);
  if (!Number.isInteger(panelId)) notFound();
  const panel = await platformDb().saasPanel.findFirst({
    where: { id: panelId, ownerId: user.id },
    include: {
      plan: true,
      domains: { orderBy: [{ isPrimary: 'desc' }, { id: 'asc' }] },
      invoices: { orderBy: { id: 'desc' }, take: 10 },
    },
  });
  if (!panel) notFound();

  const plans = await listActivePlans();
  const primary = panel.domains.find((d) => d.isPrimary && d.status === 'active');
  const left = daysLeft(panel.expiresAt);
  const unpaid = panel.invoices.find((i) => i.status === 'unpaid');
  const terminated = panel.status === 'terminated';

  return (
    <>
      <PageTitle
        title={panel.name}
        subtitle={primary?.host || panel.domains[0]?.host}
        action={
          panel.status === 'active' && primary ? (
            <div className="flex gap-2">
              <a href={`https://${primary.host}`} target="_blank" rel="noopener noreferrer" className="tc-btn-ghost">Visit site ↗</a>
              <a href={`https://${primary.host}/admin`} target="_blank" rel="noopener noreferrer" className="tc-btn-primary">Open admin ↗</a>
            </div>
          ) : undefined
        }
      />

      {STATUS_HELP[panel.status] && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {STATUS_HELP[panel.status]}
          {unpaid && (
            <Link href={`/portal/invoices/${unpaid.id}`} className="ml-2 font-semibold underline">Pay invoice {unpaid.number}</Link>
          )}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card title="Overview">
            <dl className="grid gap-5 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-slate-500">Status</dt>
                <dd className="mt-1"><StatusBadge status={panel.status} /></dd>
              </div>
              <div>
                <dt className="text-slate-500">Plan</dt>
                <dd className="mt-1 font-medium text-slate-900">
                  {panel.plan.name} · {formatMoney(panel.plan.priceMonthly, panel.plan.currency)}/month
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Paid until</dt>
                <dd className={`mt-1 font-medium ${left != null && left <= 7 ? 'text-rose-600' : 'text-slate-900'}`}>
                  {formatDate(panel.expiresAt)}
                  {left != null && <span className="ml-1 text-xs font-normal text-slate-500">({left >= 0 ? `${left} days left` : 'overdue'})</span>}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Admin login</dt>
                <dd className="mt-1 font-medium text-slate-900">
                  {panel.adminUsername}
                  <span className="block text-xs font-normal text-slate-500">Use the password you chose when ordering. It can be reset from the panel’s sign-in page.</span>
                </dd>
              </div>
            </dl>
          </Card>

          <DomainManager
            panelId={panel.id}
            domains={panel.domains}
            rootDomain={platformRootDomain()}
            serverIp={serverIp()}
            maxCustomDomains={panel.plan.maxCustomDomains}
            locked={terminated}
          />
        </div>

        <div className="space-y-6">
          {!terminated && (
            <Card title={panel.provisionedAt ? 'Renew or change plan' : 'Create payment invoice'}>
              <ActionForm action={renewPanelAction} submitLabel="Create invoice" pendingLabel="Creating…" buttonClass="tc-btn-primary w-full">
                <input type="hidden" name="panelId" value={panel.id} />
                <div>
                  <label htmlFor="planId" className="tc-label">Plan</label>
                  <select id="planId" name="planId" defaultValue={panel.planId} className="tc-input">
                    {plans.map((plan) => (
                      <option key={plan.id} value={plan.id}>
                        {plan.name} — {formatMoney(plan.priceMonthly, plan.currency)}/month
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="months" className="tc-label">Period</label>
                  <select id="months" name="months" defaultValue={1} className="tc-input">
                    {BILLING_MONTHS.map((m) => (
                      <option key={m} value={m}>{m} month{m > 1 ? 's' : ''}</option>
                    ))}
                  </select>
                </div>
              </ActionForm>
              <p className="mt-3 text-xs text-slate-500">Time is added on top of your current paid period, so renewing early never loses days.</p>
            </Card>
          )}

          <Card title="Recent invoices">
            {panel.invoices.length === 0 ? (
              <p className="text-sm text-slate-500">No invoices yet.</p>
            ) : (
              <ul className="divide-y divide-slate-100 text-sm">
                {panel.invoices.map((invoice) => (
                  <li key={invoice.id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                    <Link href={`/portal/invoices/${invoice.id}`} className="font-medium text-slate-900 hover:underline">{invoice.number}</Link>
                    <span className="flex items-center gap-2">
                      <span className="text-slate-600">{formatMoney(invoice.amount, invoice.currency)}</span>
                      <StatusBadge status={invoice.status} />
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
