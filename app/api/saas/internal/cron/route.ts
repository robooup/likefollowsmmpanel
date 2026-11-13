import crypto from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { runMaintenance } from '@/lib/saas/cron';

// Called by the server's scheduler (loopback only, see proxy.ts).
export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET || '';
  const sent = Buffer.from(req.headers.get('x-cron-secret') || '');
  const expected = Buffer.from(secret);
  if (secret.length < 16 || sent.length !== expected.length || !crypto.timingSafeEqual(sent, expected)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    return NextResponse.json({ success: true, result: await runMaintenance() });
  } catch (error) {
    console.error('Maintenance run failed:', error);
    return NextResponse.json({ error: 'Maintenance failed' }, { status: 500 });
  }
}
