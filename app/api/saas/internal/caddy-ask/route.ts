import { NextRequest, NextResponse } from 'next/server';
import { isCertificateAllowed } from '@/lib/saas/domains';
import { normalizeHost } from '@/lib/tenant/context';

// Caddy's on-demand TLS "ask" endpoint (loopback only, see proxy.ts): a
// certificate is issued only for domains that belong to a panel.
export async function GET(req: NextRequest) {
  const host = normalizeHost(req.nextUrl.searchParams.get('domain'));
  if (!host) return new NextResponse('missing domain', { status: 400 });
  try {
    return (await isCertificateAllowed(host))
      ? new NextResponse('ok', { status: 200 })
      : new NextResponse('unknown domain', { status: 403 });
  } catch (error) {
    console.error('caddy-ask failed:', error);
    return new NextResponse('error', { status: 503 });
  }
}
