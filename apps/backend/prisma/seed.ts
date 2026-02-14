import { PrismaClient } from '@prisma/client';
import { SEED_BENCHMARKS } from '@wiseshift/shared';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Seed benchmarks
  for (const benchmark of SEED_BENCHMARKS) {
    await prisma.benchmark.upsert({
      where: { sector: benchmark.sector },
      update: {
        sampleSize: benchmark.sampleSize,
        domainAverages: JSON.stringify(benchmark.domainAverages),
        domainPercentiles: JSON.stringify(benchmark.domainPercentiles),
        overallAverage: benchmark.overallAverage,
      },
      create: {
        sector: benchmark.sector,
        sampleSize: benchmark.sampleSize,
        domainAverages: JSON.stringify(benchmark.domainAverages),
        domainPercentiles: JSON.stringify(benchmark.domainPercentiles),
        overallAverage: benchmark.overallAverage,
      },
    });
    console.log(`  Seeded benchmark: ${benchmark.sector}`);
  }

  // Create a demo dashboard access code
  await prisma.dashboardAccess.upsert({
    where: { accessCode: 'DASH-DEMO2025' },
    update: {},
    create: {
      accessCode: 'DASH-DEMO2025',
      name: 'Demo Policymaker',
      role: 'policymaker',
      expiresAt: new Date('2027-12-31'),
    },
  });
  console.log('  Seeded dashboard access: DASH-DEMO2025');

  // Create a research workspace demo access code
  await prisma.dashboardAccess.upsert({
    where: { accessCode: 'DASH-RESEARCH' },
    update: {},
    create: {
      accessCode: 'DASH-RESEARCH',
      name: 'Demo Researcher',
      role: 'researcher',
      expiresAt: new Date('2027-12-31'),
    },
  });
  console.log('  Seeded research access: DASH-RESEARCH');

  console.log('Seeding complete!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
