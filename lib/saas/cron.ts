import { runWithTenant } from '@/lib/tenant/context';
import { invalidateTenantRouting, platformDb } from '@/lib/tenant/registry';
import { audit } from './audit';
import { getSaasSettings } from './settings';

const DAY = 24 * 60 * 60 * 1000;

/** Housekeeping, run every few minutes by the server's scheduler. */
export async function runMaintenance(): Promise<Record<string, number>> {
  const db = platformDb();
  const settings = await getSaasSettings(true);
  const now = Date.now();

  // 1) Panels whose paid period (plus grace days) is over go offline.
  const cutoff = new Date(now - settings.graceDays * DAY);
  const lapsed = await db.saasPanel.findMany({
    where: { status: 'active', expiresAt: { lt: cutoff } },
    select: { id: true },
  });
  if (lapsed.length) {
    await db.saasPanel.updateMany({
      where: { id: { in: lapsed.map((p) => p.id) }, status: 'active' },
      data: { status: 'expired', statusReason: 'expired' },
    });
    invalidateTenantRouting();
    for (const panel of lapsed) await audit({ action: 'panel.expired', target: `panel:${panel.id}` });
  }

  // 2) Custom domains nobody verified within a week are released.
  const staleDomains = await db.saasPanelDomain.deleteMany({
    where: { type: 'custom', status: 'pending', createdAt: { lt: new Date(now - 7 * DAY) } },
  });

  // 3) Orders that were never paid are cleaned up after a week.
  const abandoned = await db.saasPanel.findMany({
    where: {
      status: 'pending_payment',
      createdAt: { lt: new Date(now - 7 * DAY) },
      invoices: { none: { status: 'paid' } },
    },
    select: { id: true },
  });
  if (abandoned.length) {
    const ids = abandoned.map((p) => p.id);
    await db.$transaction([
      db.saasInvoice.updateMany({ where: { panelId: { in: ids }, status: 'unpaid' }, data: { status: 'cancelled' } }),
      db.saasPanel.deleteMany({ where: { id: { in: ids }, status: 'pending_payment' } }),
    ]);
  }

  return { expired: lapsed.length, releasedDomains: staleDomains.count, abandonedOrders: abandoned.length };
}

let syncCursor = 0;
let syncRunning = false;

/**
 * Refreshes order statuses from the providers for every active panel, a few
 * panels per run within a time budget. The next run continues where this one
 * stopped, so all panels get their turn.
 */
export async function runOrderSync(budgetMs = 4 * 60_000): Promise<Record<string, number>> {
  if (syncRunning) return { skipped: 1 };
  syncRunning = true;
  const started = Date.now();
  let panelsDone = 0;
  let ordersSynced = 0;
  let failures = 0;
  try {
    const { runProviderSync } = await import('@/lib/utils/provider-sync');
    const panels = await platformDb().saasPanel.findMany({
      where: { status: 'active', dbName: { not: null } },
      orderBy: { id: 'asc' },
      select: { id: true, domains: { where: { isPrimary: true, status: 'active' }, select: { host: true }, take: 1 } },
    });
    const ordered = [...panels.filter((p) => p.id > syncCursor), ...panels.filter((p) => p.id <= syncCursor)];
    for (const panel of ordered) {
      if (Date.now() - started > budgetMs) break;
      const origin = panel.domains[0] ? `https://${panel.domains[0].host}` : undefined;
      try {
        const result = await runWithTenant(
          panel.id,
          () => runProviderSync({ syncAll: true, action: 'cron_sync', broadcast: false }),
          { origin }
        );
        ordersSynced += result.syncedCount || 0;
      } catch (error) {
        failures += 1;
        console.error(`Order sync failed for panel ${panel.id}:`, error instanceof Error ? error.message : error);
      }
      syncCursor = panel.id;
      panelsDone += 1;
    }
  } finally {
    syncRunning = false;
  }
  return { panels: panelsDone, ordersSynced, failures };
}
