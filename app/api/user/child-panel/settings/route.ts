import { NextResponse } from 'next/server';

const STATIC_NAMESERVERS = {
  ns1: '',
  ns2: '',
};

export async function GET() {
  return NextResponse.json({
    success: true,
    nameservers: STATIC_NAMESERVERS
  });
}

