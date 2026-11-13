import { PrismaClient } from '@prisma/client';
import { assertSafeDbName, tenantDatabaseUrl, tenantDbName, tenantTemplateDbName } from '@/lib/tenant/config';
import { dropTenantClient, invalidateTenantRouting, platformDb } from '@/lib/tenant/registry';
import { audit } from './audit';

/**
 * Creates everything a paid panel needs: its own database (cloned from the
 * template database, which already has the schema and default email
 * templates), the first admin account and basic site settings. Safe to call
 * again: finished steps are skipped.
 */
export async function provisionPanel(panelId: number): Promise<void> {
  const db = platformDb();
  const panel = await db.saasPanel.findUnique({ where: { id: panelId }, include: { domains: true } });
  if (!panel) throw new Error(`Panel ${panelId} not found`);
  if (panel.status === 'terminated') throw new Error('Panel is terminated');
  if (panel.status === 'active' && panel.dbName && panel.provisionedAt) return;

  await db.saasPanel.update({ where: { id: panelId }, data: { status: 'provisioning', statusReason: null } });

  try {
    const dbName = panel.dbName || tenantDbName(panel.id);
    assertSafeDbName(dbName);

    const exists = await db.$queryRaw<{ n: number }[]>`SELECT 1 AS n FROM pg_database WHERE datname = ${dbName}`;
    if (exists.length === 0) {
      // Identifiers cannot be bound as parameters; both names are validated
      // against a strict pattern and never contain user input.
      await db.$executeRawUnsafe(`CREATE DATABASE "${dbName}" TEMPLATE "${tenantTemplateDbName()}"`);
    }

    const client = new PrismaClient({ log: ['error'], datasources: { db: { url: tenantDatabaseUrl(dbName) } } });
    try {
      const adminCount = await client.users.count({ where: { role: 'admin' } });
      if (adminCount === 0) {
        if (!panel.adminPasswordHash) throw new Error('Missing admin password for new panel');
        await client.users.create({
          data: {
            username: panel.adminUsername,
            name: panel.name,
            email: panel.adminEmail,
            password: panel.adminPasswordHash,
            role: 'admin',
            status: 'active',
            emailVerified: new Date(),
            language: 'en',
            timezone: 'Asia/Dhaka',
          },
        });
      }
      if ((await client.generalSettings.count()) === 0) {
        await client.generalSettings.create({
          data: { siteTitle: panel.name, metaSiteTitle: panel.name, adminEmail: panel.adminEmail },
        });
      }
    } finally {
      await client.$disconnect().catch(() => {});
    }

    const hasPrimary = panel.domains.some((d) => d.isPrimary && d.status === 'active');
    const subdomain = panel.domains.find((d) => d.type === 'subdomain');
    await db.$transaction([
      db.saasPanel.update({
        where: { id: panelId },
        data: { dbName, status: 'active', statusReason: null, provisionedAt: new Date(), adminPasswordHash: null },
      }),
      ...(subdomain
        ? [
            db.saasPanelDomain.update({
              where: { id: subdomain.id },
              data: { status: 'active', verifiedAt: new Date(), isPrimary: hasPrimary ? subdomain.isPrimary : true },
            }),
          ]
        : []),
    ]);
    invalidateTenantRouting();
    await audit({ action: 'panel.provisioned', target: `panel:${panelId}`, meta: { dbName } });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Provisioning panel ${panelId} failed:`, error);
    await db.saasPanel.update({
      where: { id: panelId },
      data: { status: 'failed', statusReason: message.slice(0, 500) },
    });
    await audit({ action: 'panel.provision_failed', target: `panel:${panelId}`, meta: { message } });
    throw error;
  }
}

/** Permanently deletes a terminated panel's database. Super admin only. */
export async function destroyPanelData(panelId: number): Promise<void> {
  const db = platformDb();
  const panel = await db.saasPanel.findUnique({ where: { id: panelId } });
  if (!panel) throw new Error('Panel not found');
  if (panel.status !== 'terminated') throw new Error('Terminate the panel before deleting its data');
  if (panel.dbName) {
    const dbName = assertSafeDbName(panel.dbName);
    if (dbName === tenantTemplateDbName()) throw new Error('Refusing to drop the template database');
    await dropTenantClient(panelId);
    await db.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${dbName}" WITH (FORCE)`);
  }
  await db.$transaction([
    db.saasPanelDomain.deleteMany({ where: { panelId } }),
    db.saasPanel.update({ where: { id: panelId }, data: { dbName: null, statusReason: 'Data deleted' } }),
  ]);
  invalidateTenantRouting();
  await audit({ action: 'panel.data_deleted', target: `panel:${panelId}` });
}
