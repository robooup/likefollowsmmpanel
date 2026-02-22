import { isPaymentGatewaySandbox } from '@/lib/payment-gateway-config';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const sandbox = await isPaymentGatewaySandbox();
    return NextResponse.json({ sandbox });
  } catch (error) {
    console.error('Error checking payment gateway sandbox mode:', error);
    return NextResponse.json({ sandbox: false });
  }
}
