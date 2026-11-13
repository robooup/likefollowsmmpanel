import { NextRequest } from 'next/server';
import { GET as authGET, POST as authPOST } from '@/auth';
import { baseUrlSync } from '@/lib/tenant/url';

// Next.js builds request URLs from the address it listens on (localhost:3000),
// and Auth.js derives every URL it returns from the request URL — including
// the JSON `{ url }` of sign-in/sign-out that the browser then navigates to.
// Hand Auth.js the request under the public origin of the panel instead.
function withPublicOrigin(request: NextRequest): NextRequest {
  const origin = baseUrlSync();
  if (!origin) return request;
  const current = new URL(request.url);
  const target = new URL(current.pathname + current.search, origin);
  if (target.href === current.href) return request;
  return new NextRequest(target, request);
}

export function GET(request: NextRequest) {
  return authGET(withPublicOrigin(request));
}

export function POST(request: NextRequest) {
  return authPOST(withPublicOrigin(request));
}
