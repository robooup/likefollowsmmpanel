import { SignJWT, jwtVerify } from 'jose';
import { platformSecret } from '@/lib/tenant/config';

// Session for the TopupCraft site itself (customers + super admin). Completely
// separate from the NextAuth sessions used inside customer panels.

export const SAAS_SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

/**
 * In production the cookie uses the `__Host-` prefix: browsers then refuse to
 * let any subdomain (i.e. a customer panel on *.topupcraft.com) set or
 * overwrite it.
 */
export function saasCookieName(): string {
  return process.env.NODE_ENV === 'production' ? '__Host-tc_session' : 'tc_session';
}

export type SaasSession = {
  userId: number;
  role: 'customer' | 'admin';
  /** Must match SaasUser.sessionVersion; bumping it signs the user out everywhere. */
  version: number;
};

function key(): Uint8Array {
  return new TextEncoder().encode(`saas-session:${platformSecret()}`);
}

export async function signSaasSession(session: SaasSession): Promise<string> {
  return new SignJWT({ role: session.role, v: session.version })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(String(session.userId))
    .setAudience('topupcraft-platform')
    .setIssuedAt()
    .setExpirationTime(`${SAAS_SESSION_MAX_AGE}s`)
    .sign(key());
}

export async function verifySaasSession(token: string | undefined | null): Promise<SaasSession | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key(), {
      algorithms: ['HS256'],
      audience: 'topupcraft-platform',
    });
    const userId = Number(payload.sub);
    if (!Number.isInteger(userId) || userId <= 0) return null;
    const role = payload.role === 'admin' ? 'admin' : 'customer';
    return { userId, role, version: Number(payload.v) || 0 };
  } catch {
    return null;
  }
}
