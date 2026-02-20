import { NextResponse } from 'next/server';

const STATIC_NAMESERVERS = {
  ns1: 'ns1.likefollowsmmpanel.com',
  ns2: 'ns2.likefollowsmmpanel.com',
};

export async function GET() {
  return NextResponse.json({
    success: true,
    nameservers: STATIC_NAMESERVERS
  });
}

