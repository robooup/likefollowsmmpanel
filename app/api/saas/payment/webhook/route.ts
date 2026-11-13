import crypto from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { confirmGatewayPayment } from '@/lib/saas/billing';
import { getSaasSettings } from '@/lib/saas/settings';

function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

// UddoktaPay calls this after a payment. The body is only used as a hint: the
// payment is always re-checked with the gateway before an invoice is settled.
export async function POST(req: NextRequest) {
  try {
    const settings = await getSaasSettings();
    const sent = req.headers.get('rt-uddoktapay-api-key') || '';
    if (!settings.uddoktapayApiKey || !safeEqual(sent, settings.uddoktapayApiKey)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = await req.json().catch(() => null);
    const gatewayInvoiceId = typeof body?.invoice_id === 'string' ? body.invoice_id : '';
    if (!gatewayInvoiceId) return NextResponse.json({ error: 'Missing invoice_id' }, { status: 400 });
    const result = await confirmGatewayPayment(gatewayInvoiceId);
    return NextResponse.json({ success: true, status: result.status });
  } catch (error) {
    console.error('SaaS payment webhook error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
