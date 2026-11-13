import { baseUrlSync } from '@/lib/tenant/url';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

const SYNC_INTERVALS = {
  prices: 30 * 60 * 1000,
  services: 6 * 60 * 60 * 1000,
  status: 60 * 60 * 1000,
};

const syncSchedules = new Map();

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const syncSettings = {
      priceSyncEnabled: false,
      serviceSyncEnabled: false,
      statusSyncEnabled: false,
      priceSyncInterval: 30,
      serviceSyncInterval: 360,
      statusSyncInterval: 60,
      lastPriceSync: null,
      lastServiceSync: null,
      lastStatusSync: null
    };

    const activeSchedules = Array.from(syncSchedules.keys());

    return NextResponse.json({
      success: true,
      data: {
        settings: syncSettings,
        activeSchedules: activeSchedules,
        intervals: {
          prices: SYNC_INTERVALS.prices / 60000,
          services: SYNC_INTERVALS.services / 60000,
          status: SYNC_INTERVALS.status / 60000
        }
      },
      error: null
    });

  } catch (error) {
    console.error('Error getting auto-sync status:', error);
    return NextResponse.json(
      { error: 'Failed to get auto-sync status', success: false, data: null },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { 
      enablePriceSync = false,
      enableServiceSync = false,
      enableStatusSync = false,
      priceSyncInterval = 30,
      serviceSyncInterval = 360,
      statusSyncInterval = 60,
      profitMargin = 20
    } = await req.json();

    // Timers inside a web request do not survive restarts and would be shared
    // by every panel on this server. Order status sync for all panels is run
    // by the platform scheduler instead (see /api/saas/internal/cron).
    void profitMargin;

    return NextResponse.json({
      success: true,
      message: 'Auto-sync configuration updated successfully',
      data: {
        enablePriceSync,
        enableServiceSync,
        enableStatusSync,
        priceSyncInterval,
        serviceSyncInterval,
        statusSyncInterval,
        activeSchedules: Array.from(syncSchedules.keys())
      },
      error: null
    });

  } catch (error) {
    console.error('Error configuring auto-sync:', error);
    return NextResponse.json(
      {
        error: 'Failed to configure auto-sync: ' + (error instanceof Error ? error.message : 'Unknown error'),
        success: false,
        data: null
      },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let clearedCount = 0;
    for (const [key, intervalId] of syncSchedules) {
      clearInterval(intervalId);
      syncSchedules.delete(key);
      clearedCount++;
    }

    return NextResponse.json({
      success: true,
      message: `Stopped ${clearedCount} auto-sync schedule(s)`,
      data: {
        clearedSchedules: clearedCount
      },
      error: null
    });

  } catch (error) {
    console.error('Error stopping auto-sync:', error);
    return NextResponse.json(
      {
        error: 'Failed to stop auto-sync: ' + (error instanceof Error ? error.message : 'Unknown error'),
        success: false,
        data: null
      },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { syncType = 'all', profitMargin = 20 } = await req.json();

    console.log(`Manual sync triggered by ${session.user.email}: ${syncType}`);

    const result = await performSync(syncType, profitMargin);

    return NextResponse.json({
      success: true,
      message: `Manual sync ${syncType} completed`,
      data: result.data,
      error: null
    });

  } catch (error) {
    console.error('Error performing manual sync:', error);
    return NextResponse.json(
      {
        error: 'Failed to perform manual sync: ' + (error instanceof Error ? error.message : 'Unknown error'),
        success: false,
        data: null
      },
      { status: 500 }
    );
  }
}

async function performSync(syncType: string, profitMargin: number) {
  try {
    if (!baseUrlSync()) {
      throw new Error('NEXT_PUBLIC_APP_URL environment variable is required');
    }
    const response = await fetch(`${baseUrlSync()}/api/admin/providers/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        syncType,
        profitMargin
      })
    });

    const result = await response.json();
    
    if (result.success) {
      console.log(`Auto-sync ${syncType} completed:`, result.data.totals);
    } else {
      console.error(`Auto-sync ${syncType} failed:`, result.error);
    }

    return result;
  } catch (error) {
    console.error(`Auto-sync ${syncType} error:`, error);
    throw error;
  }
}
