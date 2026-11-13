import type { Metadata } from 'next';
import Link from 'next/link';
import { ActionForm } from '@/components/saas/forms';
import { PageTitle, StatusBadge, formatDate } from '@/components/saas/ui';
import { adminInvoiceAction } from '@/lib/saas/actions';
import { requireSaasAdmin } from '@/lib/saas/auth';
import { formatMoney } from '@/lib/saas/plans';
import { platformDb } from '@/lib/tenant/registry';

export const metadata: Metadata = { title: 'Invoices' };

export default async function AdminInvoices({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireSaasAdmin();
  const { status } = await searchParams;
  const filter = ['paid', 'unpaid', 'cancelled'].includes(status || '') ? status : undefined;
  const invoices = await platformDb().saasInvoice.findMany({
    where: filter ? { status: filter } : {},
    orderBy: { id: 'desc' },
    take: 300,
    include: { user: { select: { email: true } }, panel: { select: { id: true, name: true } }, plan: { select: { name: true } } },
  });
  return (
    <>
      <PageTitle title="Invoices" subtitle={`${invoices.length} shown`} />
      <div className="mb-4 flex gap-2 text-sm">
        {[['', 'All'], ['unpaid', 'Unpaid'], ['paid', 'Paid'], ['cancelled', 'Cancelled']].map(([value, label]) => (
          <Link key={value} href={value ? `/admin/invoices?status=${value}` : '/admin/invoices'} className={(filter || '') === value ? 'tc-btn-dark px-3 py-1.5' : 'tc-btn-ghost px-3 py-1.5'}>
            {label}
          </Link>
        ))}
      </div>
      <div className="tc-card overflow-x-auto">
        <table className="tc-table w-full">
          <thead>
            <tr><th>Invoice</th><th>Customer</th><th>Panel</th><th>For</th><th>Amount</th><th>Status</th><th>Date</th><th /></tr>
          </thead>
          <tbody>
            {invoices.map((invoice) => (
              <tr key={invoice.id}>
                <td className="font-medium text-slate-900">{invoice.number}</td>
                <td>{invoice.user.email}</td>
                <td>{invoice.panel ? <Link href={`/admin/panels/${invoice.panel.id}`} className="hover:underline">{invoice.panel.name}</Link> : '—'}</td>
                <td>{invoice.plan.name} · {invoice.months} mo</td>
                <td>{formatMoney(invoice.amount, invoice.currency)}</td>
                <td><StatusBadge status={invoice.status} /></td>
                <td>{formatDate(invoice.paidAt || invoice.createdAt)}</td>
                <td className="text-right">
                  {invoice.status === 'unpaid' && (
                    <ActionForm action={adminInvoiceAction} submitLabel="Cancel" buttonClass="tc-btn-ghost px-3 py-1.5" className="" confirm={`Cancel invoice ${invoice.number}?`} inline>
                      <input type="hidden" name="invoiceId" value={invoice.id} />
                      <input type="hidden" name="op" value="cancel" />
                    </ActionForm>
                  )}
                </td>
              </tr>
            ))}
            {invoices.length === 0 && (
              <tr><td colSpan={8} className="py-10 text-center text-slate-500">No invoices.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
