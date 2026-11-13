import { NextRequest, NextResponse } from 'next/server';
import { probeAnswer } from '@/lib/saas/domains';

// Reached as /.well-known/tc-domain-check on ANY host that points at this
// server. Domain verification requests it through the customer's domain and
// checks the keyed answer, proving the domain really resolves to us.
export async function GET(req: NextRequest) {
  const nonce = req.nextUrl.searchParams.get('nonce') || '';
  if (!/^[a-f0-9]{32}$/.test(nonce)) return new NextResponse('bad request', { status: 400 });
  return new NextResponse(probeAnswer(nonce), {
    headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' },
  });
}
