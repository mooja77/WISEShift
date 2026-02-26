/**
 * One-time migration script: hash existing plaintext access codes.
 *
 * Run after the ethics-audit-trail migration:
 *   npx tsx prisma/migrate-access-codes.ts
 *
 * For each Organisation and DashboardAccess row that has a plaintext accessCode
 * (no accessCodeHash set), this script:
 *   1. Computes SHA-256 index + bcrypt hash
 *   2. Updates the row: accessCode → SHA-256 hex, accessCodeHash → bcrypt
 */

import { PrismaClient } from '@prisma/client';
import { hashAccessCode } from '../src/utils/hashing.js';

const prisma = new PrismaClient();

async function migrateOrganisations() {
  const orgs = await prisma.organisation.findMany({
    where: { accessCodeHash: null },
  });

  console.log(`Found ${orgs.length} organisations with plaintext access codes`);

  for (const org of orgs) {
    const { sha256Index, bcryptHash } = await hashAccessCode(org.accessCode);
    await prisma.organisation.update({
      where: { id: org.id },
      data: {
        accessCode: sha256Index,
        accessCodeHash: bcryptHash,
      },
    });
    console.log(`  Migrated org: ${org.name} (${org.id})`);
  }
}

async function migrateDashboardAccess() {
  const dashboards = await prisma.dashboardAccess.findMany({
    where: { accessCodeHash: null },
  });

  console.log(`Found ${dashboards.length} dashboard access codes with plaintext codes`);

  for (const da of dashboards) {
    const { sha256Index, bcryptHash } = await hashAccessCode(da.accessCode);
    await prisma.dashboardAccess.update({
      where: { id: da.id },
      data: {
        accessCode: sha256Index,
        accessCodeHash: bcryptHash,
      },
    });
    console.log(`  Migrated dashboard: ${da.name} (${da.id})`);
  }
}

async function main() {
  console.log('Starting access code migration...\n');

  await migrateOrganisations();
  console.log('');
  await migrateDashboardAccess();

  console.log('\nMigration complete.');
}

main()
  .catch((e) => {
    console.error('Migration failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
