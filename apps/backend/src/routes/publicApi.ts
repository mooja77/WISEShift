import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { DOMAINS } from '@wiseshift/shared';
import { sendFormatted } from '../utils/formatResponse.js';

export const publicApiRoutes = Router();

const K_ANONYMITY_THRESHOLD = 5;

// GET /api/v1/public/overview — High-level dataset summary
publicApiRoutes.get('/overview', async (req, res, next) => {
  try {
    const totalAssessments = await prisma.assessment.count({
      where: { status: 'completed' },
    });

    const organisations = await prisma.organisation.findMany({
      where: { assessments: { some: { status: 'completed' } } },
      select: { country: true, sector: true },
    });

    const countries = new Set(organisations.map(o => o.country).filter(Boolean));
    const sectors = new Set(organisations.map(o => o.sector).filter(Boolean));

    const dateRange = await prisma.assessment.aggregate({
      where: { status: 'completed' },
      _min: { completedAt: true },
      _max: { completedAt: true },
    });

    const overview = {
      totalCompletedAssessments: totalAssessments,
      countryCount: countries.size,
      sectorCount: sectors.size,
      dateRange: {
        earliest: dateRange._min.completedAt?.toISOString() || null,
        latest: dateRange._max.completedAt?.toISOString() || null,
      },
      domains: DOMAINS.map(d => ({ key: d.key, name: d.name })),
      apiVersion: 'v1',
    };

    res.json({ success: true, data: overview });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/public/statistics — Descriptive statistics per domain
publicApiRoutes.get('/statistics', async (req, res, next) => {
  try {
    const format = req.query.format as string | undefined;

    const domainScores = await prisma.domainScore.findMany({
      where: { score: { gt: 0 } },
      select: { domainKey: true, score: true },
    });

    // Group by domain
    const grouped: Record<string, number[]> = {};
    for (const ds of domainScores) {
      if (!grouped[ds.domainKey]) grouped[ds.domainKey] = [];
      grouped[ds.domainKey].push(ds.score);
    }

    const statistics = DOMAINS.map(domain => {
      const scores = grouped[domain.key] || [];
      if (scores.length < K_ANONYMITY_THRESHOLD) {
        return {
          domainKey: domain.key,
          domainName: domain.name,
          n: scores.length,
          suppressed: true,
          mean: null,
          median: null,
          sd: null,
          min: null,
          max: null,
        };
      }

      scores.sort((a, b) => a - b);
      const n = scores.length;
      const mean = scores.reduce((s, v) => s + v, 0) / n;
      const median = n % 2 === 0
        ? (scores[n / 2 - 1] + scores[n / 2]) / 2
        : scores[Math.floor(n / 2)];
      const variance = scores.reduce((s, v) => s + (v - mean) ** 2, 0) / (n - 1);
      const sd = Math.sqrt(variance);

      return {
        domainKey: domain.key,
        domainName: domain.name,
        n,
        suppressed: false,
        mean: Math.round(mean * 100) / 100,
        median: Math.round(median * 100) / 100,
        sd: Math.round(sd * 100) / 100,
        min: Math.round(scores[0] * 100) / 100,
        max: Math.round(scores[n - 1] * 100) / 100,
      };
    });

    sendFormatted(res, statistics, format, 'wiseshift-statistics');
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/public/benchmarks — Sector benchmark data
publicApiRoutes.get('/benchmarks', async (req, res, next) => {
  try {
    const format = req.query.format as string | undefined;

    const benchmarks = await prisma.benchmark.findMany({
      orderBy: { sector: 'asc' },
    });

    const data = benchmarks.map(b => ({
      sector: b.sector,
      sampleSize: b.sampleSize,
      overallAverage: b.overallAverage,
      domainAverages: JSON.parse(b.domainAverages),
    }));

    if (format === 'csv') {
      // Flatten for CSV
      const flat = data.map(b => {
        const row: Record<string, any> = {
          sector: b.sector,
          sampleSize: b.sampleSize,
          overallAverage: b.overallAverage,
        };
        for (const [key, val] of Object.entries(b.domainAverages as Record<string, number>)) {
          row[`domain_${key}`] = val;
        }
        return row;
      });
      sendFormatted(res, flat, format, 'wiseshift-benchmarks');
    } else {
      res.json({ success: true, data });
    }
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/public/assessments — Anonymised case-level scores (k-anonymised)
publicApiRoutes.get('/assessments', async (req, res, next) => {
  try {
    const format = req.query.format as string | undefined;

    const assessments = await prisma.assessment.findMany({
      where: { status: 'completed' },
      include: {
        organisation: { select: { country: true, sector: true, size: true } },
        domainScores: true,
      },
      orderBy: { completedAt: 'asc' },
    });

    if (assessments.length < K_ANONYMITY_THRESHOLD) {
      return res.json({
        success: true,
        data: [],
        message: `Suppressed: fewer than ${K_ANONYMITY_THRESHOLD} completed assessments.`,
      });
    }

    // Anonymise: replace IDs with sequential case codes
    const data = assessments.map((a, i) => {
      const domainScores: Record<string, number> = {};
      for (const ds of a.domainScores) {
        domainScores[ds.domainKey] = ds.score;
      }

      return {
        caseId: `CASE_${String(i + 1).padStart(3, '0')}`,
        country: a.organisation.country || 'Unknown',
        sector: a.organisation.sector || 'Unknown',
        size: a.organisation.size || 'Unknown',
        overallScore: a.overallScore || 0,
        completedAt: a.completedAt?.toISOString().split('T')[0] || '',
        ...domainScores,
      };
    });

    sendFormatted(res, data, format, 'wiseshift-assessments');
  } catch (err) {
    next(err);
  }
});
