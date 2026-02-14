import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { DOMAINS } from '@wiseshift/shared';
import { mean, standardDeviation, median, correlationMatrix } from '../utils/statistics.js';

export const researchApiRoutes = Router();

// Middleware: validate x-dashboard-code header
researchApiRoutes.use(async (req, res, next) => {
  const code = req.headers['x-dashboard-code'] as string;
  if (!code) {
    return res.status(401).json({ error: 'x-dashboard-code header is required' });
  }
  const access = await prisma.dashboardAccess.findUnique({ where: { accessCode: code } });
  if (!access || new Date() > access.expiresAt) {
    return res.status(403).json({ error: 'Invalid or expired dashboard code' });
  }
  next();
});

// GET /api/v1/research/assessments — list all completed assessments (anonymised)
researchApiRoutes.get('/assessments', async (_req, res, next) => {
  try {
    const assessments = await prisma.assessment.findMany({
      where: { status: 'completed' },
      include: {
        organisation: { select: { country: true, sector: true, size: true } },
        domainScores: true,
      },
    });

    const data = assessments.map((a, idx) => {
      const scores: Record<string, number> = {};
      for (const ds of a.domainScores) {
        scores[ds.domainKey] = ds.score;
      }
      return {
        id: `CASE_${String(idx + 1).padStart(3, '0')}`,
        country: a.organisation.country || null,
        sector: a.organisation.sector || null,
        size: a.organisation.size || null,
        overallScore: a.overallScore,
        domainScores: scores,
        completedAt: a.completedAt?.toISOString().slice(0, 10) || null,
      };
    });

    res.json({ count: data.length, data });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/research/statistics — descriptive statistics
researchApiRoutes.get('/statistics', async (_req, res, next) => {
  try {
    const assessments = await prisma.assessment.findMany({
      where: { status: 'completed' },
      include: { domainScores: true },
    });

    const domainKeys = DOMAINS.map(d => d.key);
    const domainVectors: Record<string, number[]> = {};
    for (const dk of domainKeys) domainVectors[dk] = [];

    for (const a of assessments) {
      for (const ds of a.domainScores) {
        if (domainVectors[ds.domainKey]) domainVectors[ds.domainKey].push(ds.score);
      }
    }

    const descriptive = domainKeys.map(dk => ({
      domain: dk,
      n: domainVectors[dk].length,
      mean: Math.round(mean(domainVectors[dk]) * 100) / 100,
      median: Math.round(median(domainVectors[dk]) * 100) / 100,
      sd: Math.round(standardDeviation(domainVectors[dk]) * 100) / 100,
      min: domainVectors[dk].length > 0 ? Math.min(...domainVectors[dk]) : 0,
      max: domainVectors[dk].length > 0 ? Math.max(...domainVectors[dk]) : 0,
    }));

    // Transform domainVectors (domain -> scores[]) into per-assessment records for correlation
    const assessmentScores: Record<string, number>[] = [];
    const n = assessments.length;
    for (let i = 0; i < n; i++) {
      const record: Record<string, number> = {};
      for (const dk of domainKeys) {
        record[dk] = domainVectors[dk][i] ?? 0;
      }
      assessmentScores.push(record);
    }
    const corrMatrix = correlationMatrix(assessmentScores, domainKeys);

    res.json({
      totalAssessments: assessments.length,
      descriptive,
      correlationMatrix: corrMatrix,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/research/domains — domain definitions
researchApiRoutes.get('/domains', (_req, res) => {
  res.json({
    count: DOMAINS.length,
    data: DOMAINS.map(d => ({
      key: d.key,
      name: d.name,
      description: d.description,
      questionCount: d.questions.length,
    })),
  });
});
