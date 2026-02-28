import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { clearCurrencyCache, USD_DEFAULT } from '@/lib/currency-utils';
import { NextResponse } from 'next/server';

const defaultCurrencySettings = {
  defaultCurrency: 'USD',
  displayDecimals: 2,
  currencyPosition: 'left',
  thousandsSeparator: ',',
  decimalSeparator: '.',
  updatedAt: new Date(),
};

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let currencySettings = await db.currencySettings.findFirst();
    if (!currencySettings) {
      currencySettings = await db.currencySettings.create({
        data: defaultCurrencySettings
      });
    }

    const currenciesFromDb = await db.currencies.findMany({
      orderBy: { code: 'asc' }
    });

    const dbCurrencies = currenciesFromDb
      .filter(c => c.code !== 'USD')
      .map(c => ({ ...c, rate: Number(c.rate) }));

    const formattedCurrencies = [USD_DEFAULT, ...dbCurrencies];

    return NextResponse.json({
      success: true,
      currencySettings: {
        defaultCurrency: currencySettings.defaultCurrency,
        displayDecimals: currencySettings.displayDecimals,
        currencyPosition: currencySettings.currencyPosition,
        thousandsSeparator: currencySettings.thousandsSeparator,
        decimalSeparator: currencySettings.decimalSeparator,
      },
      currencies: formattedCurrencies
    });

  } catch (error) {
    console.error('Error loading currency settings:', error);
    return NextResponse.json(
      { error: 'Failed to load currency settings' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { currencySettings, currencies } = await request.json();

    if (currencySettings) {
      try {
        await db.currencySettings.upsert({
          where: { id: 1 },
          update: {
            ...currencySettings,
            updatedAt: new Date()
          },
          create: { 
            id: 1, 
            ...currencySettings,
            updatedAt: new Date()
          }
        });
      } catch (settingsError) {
        console.error('Error saving currency settings:', settingsError);
        throw new Error(`Failed to save currency settings: ${settingsError instanceof Error ? settingsError.message : String(settingsError)}`);
      }
    }

    if (currencies && Array.isArray(currencies)) {
      for (const currency of currencies) {
        if (!currency.code || typeof currency.code !== 'string') {
          throw new Error(`Invalid currency code: ${currency.code}`);
        }
        if (!currency.name || typeof currency.name !== 'string') {
          throw new Error(`Invalid currency name for ${currency.code}`);
        }
        if (!currency.symbol || typeof currency.symbol !== 'string') {
          throw new Error(`Invalid currency symbol for ${currency.code}`);
        }
        if (currency.rate === undefined || currency.rate === null) {
          throw new Error(`Invalid currency rate for ${currency.code}`);
        }
      }

      const existingCurrencies = await db.currencies.findMany({
        select: { code: true }
      });

      const existingCodes = existingCurrencies.map(c => c.code);
      const newCodes = currencies.map(c => c.code);

      const codesToDelete = existingCodes.filter(code => !newCodes.includes(code) && code !== 'USD');

      for (const codeToDelete of codesToDelete) {
        await db.currencies.delete({
          where: { code: codeToDelete }
        });
      }

      for (const currency of currencies) {
        if (currency.code === 'USD') continue;

        const rateValue = typeof currency.rate === 'number' 
          ? currency.rate 
          : parseFloat(String(currency.rate)) || 1;

        if (isNaN(rateValue) || rateValue <= 0) {
          throw new Error(`Invalid rate value for ${currency.code}: ${currency.rate}`);
        }

        try {
          await db.currencies.upsert({
            where: { code: currency.code },
            update: {
              name: currency.name,
              symbol: currency.symbol,
              rate: rateValue,
              enabled: currency.enabled,
              updatedAt: new Date()
            },
            create: {
              code: currency.code,
              name: currency.name,
              symbol: currency.symbol,
              rate: rateValue,
              enabled: currency.enabled,
              updatedAt: new Date()
            }
          });
        } catch (dbError) {
          console.error(`Error upserting currency ${currency.code}:`, dbError);
          throw new Error(`Failed to save currency ${currency.code}: ${dbError instanceof Error ? dbError.message : String(dbError)}`);
        }
      }
    }

    clearCurrencyCache();
    revalidatePath('/', 'layout');

    return NextResponse.json({
      success: true,
      message: 'Currency settings saved successfully'
    });

  } catch (error) {
    console.error('Error saving currency settings:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorDetails = error instanceof Error ? error.stack : String(error);
    console.error('Error details:', errorDetails);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to save currency settings',
        message: errorMessage,
        details: process.env.NODE_ENV === 'development' ? errorDetails : undefined
      },
      { status: 500 }
    );
  }
}
