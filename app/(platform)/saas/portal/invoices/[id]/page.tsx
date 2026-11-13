import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ActionForm } from '@/components/saas/forms';
import { Card, PageTitle, StatusBadge, formatDate } from '@/components/saas/ui';
import { payInvoiceAction } from '@/lib/saas/actions';
import { requireSaasUser } from '@/lib/saas/auth';
import { formatMoney } from '@/lib/saas/plans';
import { getSaasSettings } from '@/lib/saas/settings';
import { platformDb } from '@/lib/tenant/registry';

export const metadata: Metadata = { title: 'Invoice' };

export default async function InvoicePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ payment?: string }>;
}) {
  const user = await requireSaasUser();
  const { id } = await params;
  const { payment } = await searchParams;
  const invoiceId = Number(id);
  if (!Number.isInteger(invoiceId)) notFound();
  const invoice = await platformDb().saasInvoice.findFirst({
    where: { id: invoiceId, userId: user.id },
    include: { panel: { include: { domains: { where: { isPrimary: true } } } }, plan: true },
  });
  if (!invoice) notFound();
  const settings = await getSaasSettings();
  const gatewayReady = !!(settings.uddoktapayApiKey && settings.uddoktapayBaseUrl);

  return (
    <>
      <PageTitle title={`Invoice ${invoice.number}`} subtitle={`Created ${formatDate(invoice.createdAt)}`} />

      {payment === 'pending' && (
        <div className="mb-6 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
          Your payment is still being confirmed by the gateway. This page updates as soon as it is — refresh in a minute.
        </div>
      )}
      {payment === 'failed' && invoice.status !== 'paid' && (
        <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          We could not confirm that payment. If money was deducted, contact support with your transaction ID.
        </div>
      )}
      {invoice.status === 'paid' && (
        <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          Payment received — thank you!{' '}
          {invoice.panel && (
            <Link href={`/portal/panels/${invoice.panel.id}`} className="font-semibold underline">Go to your panel</Link>
          )}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card title="Details" className="lg:col-span-2">
          <table className="w-full text-sm">
            <tbody className="divide-y divide-slate-100">
              <tr>
                <td className="py-3 text-slate-500">Panel</td>
                <td className="py-3 text-right font-medium text-slate-900">
                  {invoice.panel?.name || '—'}
                  {invoice.panel?.domains[0] && <span className="block text-xs font-normal text-slate-500">{invoice.panel.domains[0].host}</span>}
                </td>
              </tr>
              <tr>
                <td className="py-3 text-slate-500">Description</td>
                <td className="py-3 text-right font-medium text-slate-900">
                  {invoice.plan.name} plan · {invoice.months} month{invoice.months > 1 ? 's' : ''} ({invoice.type === 'new' ? 'new panel' : 'renewal'})
                </td>
              </tr>
              <tr>
                <td className="py-3 text-slate-500">Status</td>
                <td className="py-3 text-right"><StatusBadge status={invoice.status} /></td>
              </tr>
              {invoice.paidAt && (
                <tr>
                  <td className="py-3 text-slate-500">Paid on</td>
                  <td className="py-3 text-right font-medium text-slate-900">
                    {formatDate(invoice.paidAt)}
                    {invoice.paymentMethod && <span className="block text-xs font-normal text-slate-500">via {invoice.paymentMethod}{invoice.transactionId ? ` · ${invoice.transactionId}` : ''}</span>}
                  </td>
                </tr>
              )}
              <tr>
                <td className="py-3 text-base font-semibold text-slate-900">Total</td>
                <td className="py-3 text-right text-xl font-bold text-slate-900">{formatMoney(invoice.amount, invoice.currency)}</td>
              </tr>
            </tbody>
          </table>
        </Card>

        <Card title="Payment">
          {invoice.status === 'unpaid' ? (
            gatewayReady ? (
              <>
                <ActionForm action={payInvoiceAction} submitLabel={`Pay ${formatMoney(invoice.amount, invoice.currency)}`} pendingLabel="Opening payment…" buttonClass="tc-btn-primary w-full">
                  <input type="hidden" name="invoiceId" value={invoice.id} />
                </ActionForm>
                <p className="mt-3 text-xs leading-5 text-slate-500">You will be taken to our secure payment page (bKash, Nagad, Rocket and more), then brought back here.</p>
              </>
            ) : (
              <p className="text-sm text-slate-600">
                Online payment is not available yet. Please contact support{settings.supportEmail ? ` at ${settings.supportEmail}` : ''} to pay this invoice.
              </p>
            )
          ) : invoice.status === 'paid' ? (
            <p className="text-sm text-slate-600">This invoice has been paid in full.</p>
          ) : (
            <p className="text-sm text-slate-600">This invoice was cancelled. Create a new one from your panel page if needed.</p>
          )}
        </Card>
      </div>
    </>
  );
}
