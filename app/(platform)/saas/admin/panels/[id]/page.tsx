import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { DomainManager } from '@/components/saas/domain-manager';
import { ActionForm } from '@/components/saas/forms';
import { Card, PageTitle, StatusBadge, formatDate } from '@/components/saas/ui';
import { adminInvoiceAction, adminPanelAction } from '@/lib/saas/actions';
import { requireSaasAdmin } from '@/lib/saas/auth';
import { formatMoney } from '@/lib/saas/plans';
import { platformRootDomain, serverIp } from '@/lib/tenant/config';
import { platformDb } from '@/lib/tenant/registry';

export const metadata: Metadata = { title: 'Panel' };

export default async function AdminPanel({ params }: { params: Promise<{ id: string }> }) {
  await requireSaasAdmin();
  const { id } = await params;
  const panelId = Number(id);
  if (!Number.isInteger(panelId)) notFound();
  const db = platformDb();
  const [panel, plans] = await Promise.all([
    db.saasPanel.findUnique({
      where: { id: panelId },
      include: {
        owner: true,
        plan: true,
        domains: { orderBy: [{ isPrimary: 'desc' }, { id: 'asc' }] },
        invoices: { orderBy: { id: 'desc' }, take: 20 },
      },
    }),
    db.saasPlan.findMany({ orderBy: { sortOrder: 'asc' } }),
  ]);
  if (!panel) notFound();
  const hidden = <input type="hidden" name="panelId" value={panel.id} />;

  return (
    <>
      <PageTitle title={`#${panel.id} ${panel.name}`} subtitle={`Owner: ${panel.owner.name} <${panel.owner.email}>`} action={<Link href="/admin/panels" className="tc-btn-ghost">← All panels</Link>} />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card title="Details">
            <dl className="grid gap-5 text-sm sm:grid-cols-3">
              <div><dt className="text-slate-500">Status</dt><dd className="mt-1"><StatusBadge status={panel.status} /></dd></div>
              <div><dt className="text-slate-500">Plan</dt><dd className="mt-1 font-medium text-slate-900">{panel.plan.name}</dd></div>
              <div><dt className="text-slate-500">Paid until</dt><dd className="mt-1 font-medium text-slate-900">{formatDate(panel.expiresAt)}</dd></div>
              <div><dt className="text-slate-500">Database</dt><dd className="mt-1 font-mono text-xs text-slate-900">{panel.dbName || 'not created'}</dd></div>
              <div><dt className="text-slate-500">Panel admin user</dt><dd className="mt-1 font-medium text-slate-900">{panel.adminUsername}</dd></div>
              <div><dt className="text-slate-500">Created</dt><dd className="mt-1 font-medium text-slate-900">{formatDate(panel.createdAt)}</dd></div>
            </dl>
            {panel.statusReason && <p className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">Note: {panel.statusReason}</p>}
          </Card>

          <DomainManager
            panelId={panel.id}
            domains={panel.domains}
            rootDomain={platformRootDomain()}
            serverIp={serverIp()}
            maxCustomDomains={panel.plan.maxCustomDomains}
            locked={panel.status === 'terminated'}
          />

          <Card title="Invoices">
            {panel.invoices.length === 0 ? (
              <p className="text-sm text-slate-500">No invoices.</p>
            ) : (
              <ul className="divide-y divide-slate-100 text-sm">
                {panel.invoices.map((invoice) => (
                  <li key={invoice.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                    <span>
                      <span className="font-medium text-slate-900">{invoice.number}</span>
                      <span className="ml-2 text-slate-500">{invoice.months} mo · {formatMoney(invoice.amount, invoice.currency)}</span>
                      <span className="block text-xs text-slate-500">{formatDate(invoice.paidAt || invoice.createdAt)}{invoice.paymentMethod ? ` · ${invoice.paymentMethod}` : ''}{invoice.transactionId ? ` · ${invoice.transactionId}` : ''}</span>
                    </span>
                    <span className="flex items-center gap-2">
                      <StatusBadge status={invoice.status} />
                      {invoice.status === 'unpaid' && (
                        <ActionForm action={adminInvoiceAction} submitLabel="Mark paid" buttonClass="tc-btn-primary px-3 py-1.5" className="" confirm={`Mark ${invoice.number} as paid? This activates or extends the panel.`} inline>
                          <input type="hidden" name="invoiceId" value={invoice.id} />
                          <input type="hidden" name="op" value="mark-paid" />
                          <input name="note" placeholder="Txn ID / note" className="tc-input w-36 py-1.5" aria-label="Transaction note" />
                        </ActionForm>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Actions">
            <div className="space-y-5">
              {panel.status === 'active' && (
                <ActionForm action={adminPanelAction} submitLabel="Suspend panel" buttonClass="tc-btn-danger w-full" confirm="Suspend this panel? Its site goes offline immediately.">
                  {hidden}
                  <input type="hidden" name="op" value="suspend" />
                  <input name="reason" placeholder="Reason (shown in your notes)" className="tc-input" />
                </ActionForm>
              )}
              {(panel.status === 'suspended' || panel.status === 'expired') && (
                <ActionForm action={adminPanelAction} submitLabel="Activate panel" buttonClass="tc-btn-primary w-full">
                  {hidden}
                  <input type="hidden" name="op" value="activate" />
                </ActionForm>
              )}
              {!panel.provisionedAt && panel.status !== 'terminated' && (
                <ActionForm action={adminPanelAction} submitLabel="Create panel now" pendingLabel="Creating…" buttonClass="tc-btn-primary w-full" confirm="Create this panel now without waiting for payment?">
                  {hidden}
                  <input type="hidden" name="op" value="provision" />
                </ActionForm>
              )}
              {panel.status !== 'terminated' && (
                <>
                  <ActionForm action={adminPanelAction} submitLabel="Move expiry" buttonClass="tc-btn-ghost" inline>
                    {hidden}
                    <input type="hidden" name="op" value="extend" />
                    <input name="days" type="number" placeholder="Days (+/-)" required className="tc-input w-32" aria-label="Days to add" />
                  </ActionForm>
                  <ActionForm action={adminPanelAction} submitLabel="Change plan" buttonClass="tc-btn-ghost" inline>
                    {hidden}
                    <input type="hidden" name="op" value="plan" />
                    <select name="planId" defaultValue={panel.planId} className="tc-input w-40" aria-label="Plan">
                      {plans.map((plan) => (
                        <option key={plan.id} value={plan.id}>{plan.name}</option>
                      ))}
                    </select>
                  </ActionForm>
                </>
              )}
            </div>
          </Card>

          <Card title="Danger zone">
            {panel.status !== 'terminated' ? (
              <ActionForm action={adminPanelAction} submitLabel="Terminate panel" buttonClass="tc-btn-danger w-full">
                {hidden}
                <input type="hidden" name="op" value="terminate" />
                <p className="text-xs text-slate-500">Takes the panel offline for good. Data is kept until you delete it. Type the panel name to confirm.</p>
                <input name="confirm" placeholder={panel.name} className="tc-input" autoComplete="off" required />
              </ActionForm>
            ) : panel.dbName ? (
              <ActionForm action={adminPanelAction} submitLabel="Delete all panel data" buttonClass="tc-btn-danger w-full">
                {hidden}
                <input type="hidden" name="op" value="delete-data" />
                <p className="text-xs text-slate-500">Permanently deletes this panel’s database (customers, orders, settings). This cannot be undone. Type <strong>DELETE {panel.name}</strong> to confirm.</p>
                <input name="confirm" placeholder={`DELETE ${panel.name}`} className="tc-input" autoComplete="off" required />
              </ActionForm>
            ) : (
              <p className="text-sm text-slate-500">This panel is terminated and its data has been deleted.</p>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
