import { db } from '@/lib/db';
import { USD_DEFAULT } from '@/lib/currency-utils';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const enabledFromDb = await db.currencies.findMany({
      where: { enabled: true },
      orderBy: { code: 'asc' }
    });

    const dbCurrencies = enabledFromDb
      .filter(c => c.code !== 'USD')
      .map(c => ({ ...c, rate: Number(c.rate) }));

    const currencies = [USD_DEFAULT, ...dbCurrencies];

    return NextResponse.json({
      success: true,
      currencies
    });
  } catch (error) {
    console.error('Error loading enabled currencies:', error);
    return NextResponse.json({
      success: true,
      currencies: [USD_DEFAULT]
    });
  }
}
