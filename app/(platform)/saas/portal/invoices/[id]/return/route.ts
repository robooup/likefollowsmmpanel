import { NextRequest, NextResponse } from 'next/server';
import { getSaasUser } from '@/lib/saas/auth';
import { confirmGatewayPayment } from '@/lib/saas/billing';
import { getBaseUrl } from '@/lib/tenant/current';
import { platformDb } from '@/lib/tenant/registry';

// The payment gateway sends the customer back here with ?invoice_id=<its id>.
// The payment is confirmed with the gateway (never from the URL alone).
export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const origin = await getBaseUrl();
  const { id } = await context.params;
  const invoiceId = Number(id);
  const user = await getSaasUser();
  if (!user) return NextResponse.redirect(`${origin}/login?next=/portal/invoices`);
  if (!Number.isInteger(invoiceId)) return NextResponse.redirect(`${origin}/portal/invoices`);

  const invoice = await platformDb().saasInvoice.findFirst({ where: { id: invoiceId, userId: user.id } });
  if (!invoice) return NextResponse.redirect(`${origin}/portal/invoices`);

  let outcome = 'failed';
  const gatewayInvoiceId = req.nextUrl.searchParams.get('invoice_id') || '';
  if (invoice.status === 'paid') {
    outcome = 'paid';
  } else if (gatewayInvoiceId) {
    try {
      outcome = (await confirmGatewayPayment(gatewayInvoiceId, invoice.id)).status;
    } catch (error) {
      console.error('Payment confirmation failed:', error);
      outcome = 'pending';
    }
  }
  return NextResponse.redirect(`${origin}/portal/invoices/${invoice.id}?payment=${outcome}`);
}
