import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { SEED_BENCHMARKS, getDefaultBenchmark, getBenchmarkBySector, DOMAINS } from '@wiseshift/shared';
import { AppError } from '../middleware/errorHandler.js';

export const benchmarkRoutes = Router();

// GET /api/benchmarks — Get all benchmarks
benchmarkRoutes.get('/', async (_req, res, next) => {
  try {
    // Try database first, fall back to seed data
    const dbBenchmarks = await prisma.benchmark.findMany();

    if (dbBenchmarks.length > 0) {
      const benchmarks = dbBenchmarks.map(b => ({
        sector: b.sector,
        sampleSize: b.sampleSize,
        domainAverages: JSON.parse(b.domainAverages),
        domainPercentiles: JSON.parse(b.domainPercentiles),
        overallAverage: b.overallAverage,
      }));
      return res.json({ success: true, data: benchmarks });
    }

    res.json({ success: true, data: SEED_BENCHMARKS });
  } catch (err) {
    next(err);
  }
});

// GET /api/benchmarks/:sector — Get benchmark for sector
benchmarkRoutes.get('/:sector', async (req, res, next) => {
  try {
    const { sector } = req.params;
    const decodedSector = decodeURIComponent(sector);

    // Try database first
    const dbBenchmark = await prisma.benchmark.findUnique({
      where: { sector: decodedSector },
    });

    if (dbBenchmark) {
      return res.json({
        success: true,
        data: {
          sector: dbBenchmark.sector,
          sampleSize: dbBenchmark.sampleSize,
          domainAverages: JSON.parse(dbBenchmark.domainAverages),
          domainPercentiles: JSON.parse(dbBenchmark.domainPercentiles),
          overallAverage: dbBenchmark.overallAverage,
        },
      });
    }

    // Fall back to seed data
    const benchmark = getBenchmarkBySector(decodedSector) || getDefaultBenchmark();
    res.json({ success: true, data: benchmark });
  } catch (err) {
    next(err);
  }
});
