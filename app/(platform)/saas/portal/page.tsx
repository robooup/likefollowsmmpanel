import Link from 'next/link';
import { EmptyState, PageTitle, StatusBadge, daysLeft, formatDate } from '@/components/saas/ui';
import { requireSaasUser } from '@/lib/saas/auth';
import { platformDb } from '@/lib/tenant/registry';

export default async function PortalHome() {
  const user = await requireSaasUser();
  const panels = await platformDb().saasPanel.findMany({
    where: { ownerId: user.id },
    orderBy: { createdAt: 'desc' },
    include: {
      plan: true,
      domains: { orderBy: [{ isPrimary: 'desc' }, { id: 'asc' }] },
      invoices: { where: { status: 'unpaid' }, orderBy: { id: 'desc' }, take: 1 },
    },
  });

  return (
    <>
      <PageTitle
        title="My panels"
        subtitle="Every panel you rent, with its address, status and renewal date."
        action={<Link href="/portal/order" className="tc-btn-primary">Order new panel</Link>}
      />
      {panels.length === 0 ? (
        <EmptyState
          title="You do not have a panel yet"
          text="Pick a plan, choose a name and your panel will be online within a minute of payment."
          action={<Link href="/portal/order" className="tc-btn-primary">Order my first panel</Link>}
        />
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {panels.map((panel) => {
            const primary = panel.domains.find((d) => d.isPrimary && d.status === 'active') || panel.domains[0];
            const left = daysLeft(panel.expiresAt);
            const unpaid = panel.invoices[0];
            return (
              <article key={panel.id} className="tc-card flex flex-col p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate text-lg font-semibold text-slate-900">{panel.name}</h2>
                    <p className="truncate text-sm text-slate-500">{primary?.host || 'No domain'}</p>
                  </div>
                  <StatusBadge status={panel.status} />
                </div>
                <dl className="mt-5 grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <dt className="text-slate-500">Plan</dt>
                    <dd className="font-medium text-slate-900">{panel.plan.name}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Renews / expires</dt>
                    <dd className={`font-medium ${left != null && left <= 7 ? 'text-rose-600' : 'text-slate-900'}`}>
                      {formatDate(panel.expiresAt)}
                      {left != null && panel.status === 'active' && (
                        <span className="ml-1 text-xs font-normal text-slate-500">
                          ({left >= 0 ? `${left} day${left === 1 ? '' : 's'} left` : 'overdue'})
                        </span>
                      )}
                    </dd>
                  </div>
                </dl>
                <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                  <Link href={`/portal/panels/${panel.id}`} className="tc-btn-dark">Manage</Link>
                  {panel.status === 'active' && primary && (
                    <a href={`https://${primary.host}/admin`} target="_blank" rel="noopener noreferrer" className="tc-btn-ghost">
                      Open admin ↗
                    </a>
                  )}
                  {unpaid && (
                    <Link href={`/portal/invoices/${unpaid.id}`} className="tc-btn-primary">Pay invoice</Link>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}
