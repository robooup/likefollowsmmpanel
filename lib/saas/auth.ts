import bcrypt from 'bcryptjs';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { platformDb } from '@/lib/tenant/registry';
import { saasCookieName, SAAS_SESSION_MAX_AGE, signSaasSession, verifySaasSession } from './session';

export type SaasUserInfo = {
  id: number;
  email: string;
  name: string;
  role: 'customer' | 'admin';
};

/** The signed-in TopupCraft user, re-checked against the database on every call. */
export async function getSaasUser(): Promise<SaasUserInfo | null> {
  const store = await cookies();
  const session = await verifySaasSession(store.get(saasCookieName())?.value);
  if (!session) return null;
  const user = await platformDb().saasUser.findUnique({
    where: { id: session.userId },
    select: { id: true, email: true, name: true, role: true, status: true, sessionVersion: true },
  });
  if (!user || user.status !== 'active' || user.sessionVersion !== session.version) return null;
  return { id: user.id, email: user.email, name: user.name, role: user.role === 'admin' ? 'admin' : 'customer' };
}

export async function requireSaasUser(): Promise<SaasUserInfo> {
  const user = await getSaasUser();
  if (!user) redirect('/login');
  return user;
}

export async function requireSaasAdmin(): Promise<SaasUserInfo> {
  const user = await getSaasUser();
  if (!user) redirect('/login');
  if (user.role !== 'admin') redirect('/portal');
  return user;
}

export async function startSaasSession(user: { id: number; role: string; sessionVersion: number }): Promise<void> {
  const token = await signSaasSession({
    userId: user.id,
    role: user.role === 'admin' ? 'admin' : 'customer',
    version: user.sessionVersion,
  });
  const store = await cookies();
  store.set(saasCookieName(), token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SAAS_SESSION_MAX_AGE,
  });
}

export async function endSaasSession(): Promise<void> {
  const store = await cookies();
  store.set(saasCookieName(), '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function clientIp(): Promise<string> {
  const h = await headers();
  return (h.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';
}

// --- small in-memory throttle for login / signup / payment attempts ---------
const attempts = new Map<string, { count: number; reset: number }>();

export function throttle(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  if (attempts.size > 50_000) attempts.clear();
  const entry = attempts.get(key);
  if (!entry || entry.reset < now) {
    attempts.set(key, { count: 1, reset: now + windowMs });
    return true;
  }
  entry.count += 1;
  return entry.count <= limit;
}

export function clearThrottle(key: string): void {
  attempts.delete(key);
}
