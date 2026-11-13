// Applies the current Prisma schema to every database of the install:
// the panel template, the platform database and each panel database.
//   npm run saas:migrate
// Destructive changes are refused (no --accept-data-loss), so a failed run
// leaves data untouched and tells you which database needs attention.
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { spawnSync } from 'node:child_process';

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

function push(label: string, url: string): boolean {
  process.stdout.write(`- ${label} ... `);
  const result = spawnSync('npx', ['prisma', 'db', 'push', '--skip-generate'], {
    env: { ...process.env, DATABASE_URL: url },
    encoding: 'utf8',
  });
  if (result.status === 0) {
    console.log('ok');
    return true;
  }
  console.log('FAILED');
  console.error((result.stdout || '') + (result.stderr || ''));
  return false;
}

async function main() {
  const platformUrl = env('PLATFORM_DATABASE_URL');
  const tenantUrl = env('TENANT_DATABASE_URL');
  if (!tenantUrl.includes('{db}')) throw new Error('TENANT_DATABASE_URL must contain {db}');
  const template = process.env.TENANT_TEMPLATE_DB || 'tc_panel_template';

  const prisma = new PrismaClient({ datasources: { db: { url: platformUrl } } });
  let panels: { id: number; dbName: string | null }[] = [];
  try {
    panels = await prisma.saasPanel.findMany({ where: { dbName: { not: null } }, select: { id: true, dbName: true }, orderBy: { id: 'asc' } });
  } catch {
    console.log('(platform tables not created yet — first run)');
  } finally {
    await prisma.$disconnect();
  }

  let failed = 0;
  if (!push(`template (${template})`, tenantUrl.replace('{db}', template))) failed += 1;
  if (!push('platform', platformUrl)) failed += 1;
  for (const panel of panels) {
    if (!/^[a-z][a-z0-9_]{2,62}$/.test(panel.dbName!)) continue;
    if (!push(`panel #${panel.id} (${panel.dbName})`, tenantUrl.replace('{db}', panel.dbName!))) failed += 1;
  }
  console.log(failed ? `\n${failed} database(s) failed.` : '\nAll databases are up to date.');
  process.exit(failed ? 1 : 0);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
