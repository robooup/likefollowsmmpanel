import type { Metadata } from 'next';
import Link from 'next/link';
import { EmptyState, PageTitle, StatusBadge, formatDate } from '@/components/saas/ui';
import { requireSaasUser } from '@/lib/saas/auth';
import { formatMoney } from '@/lib/saas/plans';
import { platformDb } from '@/lib/tenant/registry';

export const metadata: Metadata = { title: 'Invoices' };

export default async function InvoicesPage() {
  const user = await requireSaasUser();
  const invoices = await platformDb().saasInvoice.findMany({
    where: { userId: user.id },
    orderBy: { id: 'desc' },
    take: 200,
    include: { panel: { select: { name: true } }, plan: { select: { name: true } } },
  });
  return (
    <>
      <PageTitle title="Invoices" subtitle="Your payment history and anything still due." />
      {invoices.length === 0 ? (
        <EmptyState title="No invoices yet" text="Invoices appear here when you order or renew a panel." />
      ) : (
        <div className="tc-card overflow-x-auto">
          <table className="tc-table w-full">
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Panel</th>
                <th>For</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Date</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice) => (
                <tr key={invoice.id}>
                  <td className="font-medium text-slate-900">{invoice.number}</td>
                  <td>{invoice.panel?.name || '—'}</td>
                  <td>
                    {invoice.plan.name} · {invoice.months} mo
                  </td>
                  <td>{formatMoney(invoice.amount, invoice.currency)}</td>
                  <td><StatusBadge status={invoice.status} /></td>
                  <td>{formatDate(invoice.paidAt || invoice.createdAt)}</td>
                  <td className="text-right">
                    <Link href={`/portal/invoices/${invoice.id}`} className="font-semibold text-emerald-700 hover:underline">
                      {invoice.status === 'unpaid' ? 'Pay now' : 'View'}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
