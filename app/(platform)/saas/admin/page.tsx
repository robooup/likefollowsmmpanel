import Link from 'next/link';
import { Card, PageTitle, StatusBadge, formatDate } from '@/components/saas/ui';
import { requireSaasAdmin } from '@/lib/saas/auth';
import { formatMoney } from '@/lib/saas/plans';
import { getSaasSettings } from '@/lib/saas/settings';
import { platformDb } from '@/lib/tenant/registry';

export default async function AdminOverview() {
  await requireSaasAdmin();
  const db = platformDb();
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const soon = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const [byStatus, customers, revenueMonth, revenueAll, unpaid, expiring, recent, failed, settings] = await Promise.all([
    db.saasPanel.groupBy({ by: ['status'], _count: true }),
    db.saasUser.count({ where: { role: 'customer' } }),
    db.saasInvoice.aggregate({ where: { status: 'paid', paidAt: { gte: monthStart } }, _sum: { amount: true } }),
    db.saasInvoice.aggregate({ where: { status: 'paid' }, _sum: { amount: true } }),
    db.saasInvoice.count({ where: { status: 'unpaid' } }),
    db.saasPanel.findMany({
      where: { status: 'active', expiresAt: { lt: soon } },
      orderBy: { expiresAt: 'asc' },
      take: 8,
      include: { owner: { select: { email: true } } },
    }),
    db.saasInvoice.findMany({
      where: { status: 'paid' },
      orderBy: { paidAt: 'desc' },
      take: 8,
      include: { user: { select: { email: true } } },
    }),
    db.saasPanel.count({ where: { status: 'failed' } }),
    getSaasSettings(),
  ]);
  const count = (status: string) => byStatus.find((row) => row.status === status)?._count ?? 0;
  const stats: [string, string][] = [
    ['Active panels', String(count('active'))],
    ['Customers', String(customers)],
    ['Revenue this month', formatMoney(revenueMonth._sum.amount || 0)],
    ['Revenue all time', formatMoney(revenueAll._sum.amount || 0)],
    ['Unpaid invoices', String(unpaid)],
    ['Expired / suspended', `${count('expired')} / ${count('suspended')}`],
  ];

  return (
    <>
      <PageTitle title="Overview" subtitle="How the platform is doing right now." />

      {(!settings.uddoktapayApiKey || !settings.uddoktapayBaseUrl) && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Online payment is not set up yet, so customers cannot pay.{' '}
          <Link href="/admin/settings" className="font-semibold underline">Add your UddoktaPay details</Link>
        </div>
      )}
      {failed > 0 && (
        <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {failed} panel{failed > 1 ? 's' : ''} failed to be created after payment.{' '}
          <Link href="/admin/panels?status=failed" className="font-semibold underline">Review and retry</Link>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        {stats.map(([label, value]) => (
          <div key={label} className="tc-card p-5">
            <p className="text-sm text-slate-500">{label}</p>
            <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">{value}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card title="Expiring within 7 days">
          {expiring.length === 0 ? (
            <p className="text-sm text-slate-500">Nothing is due this week.</p>
          ) : (
            <ul className="divide-y divide-slate-100 text-sm">
              {expiring.map((panel) => (
                <li key={panel.id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                  <span className="min-w-0">
                    <Link href={`/admin/panels/${panel.id}`} className="font-medium text-slate-900 hover:underline">{panel.name}</Link>
                    <span className="block truncate text-xs text-slate-500">{panel.owner.email}</span>
                  </span>
                  <span className="whitespace-nowrap text-rose-600">{formatDate(panel.expiresAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="Latest payments">
          {recent.length === 0 ? (
            <p className="text-sm text-slate-500">No payments yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100 text-sm">
              {recent.map((invoice) => (
                <li key={invoice.id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                  <span className="min-w-0">
                    <span className="font-medium text-slate-900">{invoice.number}</span>
                    <span className="block truncate text-xs text-slate-500">{invoice.user.email}</span>
                  </span>
                  <span className="flex items-center gap-2 whitespace-nowrap">
                    {formatMoney(invoice.amount, invoice.currency)} <StatusBadge status={invoice.status} />
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
