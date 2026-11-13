import { getSaasSettings } from './settings';

export class PaymentError extends Error {}

function endpoint(baseUrl: string, path: string): string {
  let base = baseUrl.trim().replace(/\/+$/, '');
  base = base.replace(/\/(checkout-v2|verify-payment)$/, '');
  if (!/\/api$/.test(base)) base += '/api';
  return `${base}/${path}`;
}

async function config() {
  const settings = await getSaasSettings();
  if (!settings.uddoktapayApiKey || !settings.uddoktapayBaseUrl) {
    throw new PaymentError('Online payment is not configured yet. Please contact support.');
  }
  if (!/^https:\/\//i.test(settings.uddoktapayBaseUrl)) {
    throw new PaymentError('Payment gateway URL must start with https://');
  }
  return settings;
}

export async function createUddoktaPayCharge(input: {
  fullName: string;
  email: string;
  amount: number;
  invoiceNumber: string;
  redirectUrl: string;
  cancelUrl: string;
  webhookUrl: string;
}): Promise<string> {
  const settings = await config();
  let data: any;
  try {
    const response = await fetch(endpoint(settings.uddoktapayBaseUrl, 'checkout-v2'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'RT-UDDOKTAPAY-API-KEY': settings.uddoktapayApiKey,
      },
      body: JSON.stringify({
        full_name: input.fullName,
        email: input.email,
        amount: String(input.amount),
        metadata: { invoice_number: input.invoiceNumber },
        redirect_url: input.redirectUrl,
        return_type: 'GET',
        cancel_url: input.cancelUrl,
        webhook_url: input.webhookUrl,
      }),
      signal: AbortSignal.timeout(30_000),
      cache: 'no-store',
    });
    data = await response.json();
  } catch (error) {
    console.error('UddoktaPay checkout failed:', error);
    throw new PaymentError('Could not reach the payment gateway. Please try again.');
  }
  const paymentUrl = typeof data?.payment_url === 'string' ? data.payment_url : '';
  if (!/^https:\/\//i.test(paymentUrl)) {
    console.error('UddoktaPay checkout rejected:', data);
    throw new PaymentError(typeof data?.message === 'string' ? data.message : 'The payment gateway rejected the request.');
  }
  return paymentUrl;
}

export type VerifiedPayment = {
  gatewayInvoiceId: string;
  status: string;
  completed: boolean;
  amount: number;
  invoiceNumber: string | null;
  paymentMethod: string | null;
  transactionId: string | null;
};

/** Asks the gateway itself about a payment. Never trust redirect/webhook bodies. */
export async function verifyUddoktaPayPayment(gatewayInvoiceId: string): Promise<VerifiedPayment> {
  if (!/^[A-Za-z0-9_-]{6,80}$/.test(gatewayInvoiceId)) throw new PaymentError('Invalid payment reference.');
  const settings = await config();
  let data: any;
  try {
    const response = await fetch(endpoint(settings.uddoktapayBaseUrl, 'verify-payment'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'RT-UDDOKTAPAY-API-KEY': settings.uddoktapayApiKey,
      },
      body: JSON.stringify({ invoice_id: gatewayInvoiceId }),
      signal: AbortSignal.timeout(30_000),
      cache: 'no-store',
    });
    data = await response.json();
  } catch (error) {
    console.error('UddoktaPay verify failed:', error);
    throw new PaymentError('Could not verify the payment right now. Please try again shortly.');
  }
  const status = String(data?.status || '').toUpperCase();
  let metadata = data?.metadata;
  if (typeof metadata === 'string') {
    try {
      metadata = JSON.parse(metadata);
    } catch {
      metadata = null;
    }
  }
  return {
    gatewayInvoiceId,
    status,
    completed: status === 'COMPLETED',
    amount: parseFloat(String(data?.amount ?? '0')) || 0,
    invoiceNumber: typeof metadata?.invoice_number === 'string' ? metadata.invoice_number : null,
    paymentMethod: data?.payment_method ? String(data.payment_method) : null,
    transactionId: data?.transaction_id ? String(data.transaction_id) : null,
  };
}
