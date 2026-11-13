import { NextRequest, NextResponse } from 'next/server';
import { clientIp, throttle } from '@/lib/saas/auth';
import { DomainError, isSubdomainAvailable, normalizeSubdomain, subdomainHost } from '@/lib/saas/domains';

export async function GET(req: NextRequest) {
  if (!throttle(`subcheck:${await clientIp()}`, 60, 60_000)) {
    return NextResponse.json({ available: false, message: 'Too many checks, slow down.' }, { status: 429 });
  }
  try {
    const label = normalizeSubdomain(req.nextUrl.searchParams.get('name') || '');
    const available = await isSubdomainAvailable(label);
    return NextResponse.json({
      available,
      host: subdomainHost(label),
      message: available ? 'Available' : 'Already taken',
    });
  } catch (error) {
    if (error instanceof DomainError) return NextResponse.json({ available: false, message: error.message });
    return NextResponse.json({ available: false, message: 'Could not check right now.' }, { status: 500 });
  }
}
