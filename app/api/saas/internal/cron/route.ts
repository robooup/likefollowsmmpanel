import crypto from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { runMaintenance, runOrderSync } from '@/lib/saas/cron';

// Called by the server's scheduler (loopback only, see proxy.ts).
export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET || '';
  const sent = Buffer.from(req.headers.get('x-cron-secret') || '');
  const expected = Buffer.from(secret);
  if (secret.length < 16 || sent.length !== expected.length || !crypto.timingSafeEqual(sent, expected)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    // ?job=orders refreshes order statuses for all panels; default is housekeeping.
    const job = req.nextUrl.searchParams.get('job');
    const result = job === 'orders' ? await runOrderSync() : await runMaintenance();
    return NextResponse.json({ success: true, job: job === 'orders' ? 'orders' : 'maintenance', result });
  } catch (error) {
    console.error('Maintenance run failed:', error);
    return NextResponse.json({ error: 'Maintenance failed' }, { status: 500 });
  }
}

export const maxDuration = 300;
