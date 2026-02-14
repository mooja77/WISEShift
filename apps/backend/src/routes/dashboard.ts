import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { DOMAINS, getMaturityLevel } from '@wiseshift/shared';
import { validate, dashboardAuthSchema } from '../middleware/validation.js';
import { generateDashboardCode } from '../utils/accessCode.js';
import { AppError } from '../middleware/errorHandler.js';
import { extractWordFrequencies } from '../utils/wordFrequency.js';

export const dashboardRoutes = Router();

// POST /api/dashboard/auth — Authenticate dashboard access
dashboardRoutes.post('/auth', validate(dashboardAuthSchema), async (req, res, next) => {
  try {
    const { accessCode } = req.body;

    const access = await prisma.dashboardAccess.findUnique({
      where: { accessCode },
    });

    if (!access) {
      throw new AppError('Invalid dashboard access code', 401);
    }

    if (new Date() > access.expiresAt) {
      throw new AppError('Access code has expired', 401);
    }

    res.json({
      success: true,
      data: {
        token: accessCode, // Simple token (just reuse the code)
        expiresAt: access.expiresAt.toISOString(),
        name: access.name,
        role: access.role,
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/dashboard/overview — Aggregate dashboard data
dashboardRoutes.get('/overview', async (req, res, next) => {
  try {
    const assessments = await prisma.assessment.findMany({
      where: { status: 'completed' },
      include: {
        organisation: true,
        domainScores: true,
      },
      orderBy: { completedAt: 'desc' },
    });

    const totalAssessments = await prisma.assessment.count();
    const completedAssessments = assessments.length;

    // Calculate averages
    const domainAverages: Record<string, number> = {};
    const domainCounts: Record<string, number> = {};

    for (const assessment of assessments) {
      for (const ds of assessment.domainScores) {
        if (ds.score > 0) {
          domainAverages[ds.domainKey] = (domainAverages[ds.domainKey] || 0) + ds.score;
          domainCounts[ds.domainKey] = (domainCounts[ds.domainKey] || 0) + 1;
        }
      }
    }

    for (const key of Object.keys(domainAverages)) {
      domainAverages[key] = Math.round((domainAverages[key] / domainCounts[key]) * 100) / 100;
    }

    // Overall average
    const overallScores = assessments
      .filter(a => a.overallScore != null && a.overallScore > 0)
      .map(a => a.overallScore!);
    const averageOverallScore = overallScores.length > 0
      ? Math.round((overallScores.reduce((a, b) => a + b, 0) / overallScores.length) * 100) / 100
      : 0;

    // Maturity distribution
    const maturityDistribution: Record<string, number> = {};
    for (const assessment of assessments) {
      if (assessment.overallScore) {
        const level = getMaturityLevel(assessment.overallScore).name;
        maturityDistribution[level] = (maturityDistribution[level] || 0) + 1;
      }
    }

    // Sector breakdown with k-anonymity (k=5)
    // Suppress categories with fewer than 5 entries to prevent re-identification
    const K_ANONYMITY_THRESHOLD = 5;
    const rawSectorBreakdown: Record<string, number> = {};
    for (const assessment of assessments) {
      const sector = assessment.organisation.sector || 'Unknown';
      rawSectorBreakdown[sector] = (rawSectorBreakdown[sector] || 0) + 1;
    }

    const sectorBreakdown: Record<string, number> = {};
    let smallSectorTotal = 0;
    for (const [sector, count] of Object.entries(rawSectorBreakdown)) {
      if (count >= K_ANONYMITY_THRESHOLD) {
        sectorBreakdown[sector] = count;
      } else {
        smallSectorTotal += count;
      }
    }
    if (smallSectorTotal > 0) {
      sectorBreakdown['Other / Small Sectors'] = smallSectorTotal;
    }

    // Recent assessments (anonymised names)
    // Suppress individual entries if total completed assessments < k-anonymity threshold
    // to prevent re-identification from small sample sizes
    const recentAssessments = completedAssessments >= K_ANONYMITY_THRESHOLD
      ? assessments.slice(0, 10).map((a, i) => ({
          id: a.id,
          organisationName: `Organisation ${i + 1}`,
          overallScore: a.overallScore || 0,
          completedAt: a.completedAt?.toISOString() || '',
        }))
      : [];

    res.json({
      success: true,
      data: {
        totalAssessments,
        completedAssessments,
        averageOverallScore,
        domainAverages,
        maturityDistribution,
        sectorBreakdown,
        recentAssessments,
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/dashboard/insights — Generate insights
dashboardRoutes.get('/insights', async (_req, res, next) => {
  try {
    const assessments = await prisma.assessment.findMany({
      where: { status: 'completed' },
      include: { domainScores: true },
    });

    if (assessments.length === 0) {
      return res.json({ success: true, data: [] });
    }

    // Calculate domain averages
    const domainTotals: Record<string, { sum: number; count: number }> = {};
    for (const a of assessments) {
      for (const ds of a.domainScores) {
        if (ds.score > 0) {
          if (!domainTotals[ds.domainKey]) domainTotals[ds.domainKey] = { sum: 0, count: 0 };
          domainTotals[ds.domainKey].sum += ds.score;
          domainTotals[ds.domainKey].count += 1;
        }
      }
    }

    const domainAverages = Object.entries(domainTotals).map(([key, { sum, count }]) => ({
      domainKey: key,
      domainName: DOMAINS.find(d => d.key === key)?.name || key,
      average: Math.round((sum / count) * 100) / 100,
    }));

    const sorted = [...domainAverages].sort((a, b) => a.average - b.average);
    const insights: any[] = [];

    // Top strengths
    const topDomains = [...domainAverages].sort((a, b) => b.average - a.average);
    if (topDomains.length > 0) {
      insights.push({
        type: 'strength',
        title: `Strongest domain: ${topDomains[0].domainName}`,
        description: `Across all assessed WISEs, ${topDomains[0].domainName} has the highest average score of ${topDomains[0].average}/5.`,
        domainKey: topDomains[0].domainKey,
        value: topDomains[0].average,
      });
    }

    // Top weaknesses
    if (sorted.length > 0) {
      insights.push({
        type: 'weakness',
        title: `Area for development: ${sorted[0].domainName}`,
        description: `${sorted[0].domainName} has the lowest average score of ${sorted[0].average}/5, indicating a sector-wide area for improvement.`,
        domainKey: sorted[0].domainKey,
        value: sorted[0].average,
      });
    }

    // Recommendation
    insights.push({
      type: 'recommendation',
      title: 'Focus on impact measurement',
      description: 'Across the sector, impact measurement and data collection remain areas where most WISEs can improve, particularly in systematic data use for continuous improvement.',
      domainKey: 'impact-measurement',
    });

    res.json({ success: true, data: insights });
  } catch (err) {
    next(err);
  }
});

// GET /api/dashboard/word-frequencies — Aggregate word frequencies across all completed assessments
dashboardRoutes.get('/word-frequencies', async (_req, res, next) => {
  try {
    const responses = await prisma.response.findMany({
      where: {
        questionType: 'narrative',
        textValue: { not: null },
        assessment: { status: 'completed' },
      },
      select: { textValue: true },
    });

    const texts = responses.map((r) => r.textValue!).filter(Boolean);
    const frequencies = extractWordFrequencies(texts);

    res.json({ success: true, data: frequencies });
  } catch (err) {
    next(err);
  }
});

// POST /api/dashboard/compare — Compare 2-3 assessments side-by-side
dashboardRoutes.post('/compare', async (req, res, next) => {
  try {
    const { assessmentIds } = req.body;

    if (
      !Array.isArray(assessmentIds) ||
      assessmentIds.length < 2 ||
      assessmentIds.length > 3
    ) {
      throw new AppError('Provide 2 or 3 assessment IDs', 400);
    }

    const assessments = await prisma.assessment.findMany({
      where: { id: { in: assessmentIds }, status: 'completed' },
      include: {
        organisation: true,
        domainScores: true,
        responses: {
          where: { questionType: 'narrative', textValue: { not: null } },
        },
      },
    });

    if (assessments.length !== assessmentIds.length) {
      throw new AppError('One or more assessments not found or incomplete', 404);
    }

    const comparison = assessments.map((a, idx) => ({
      label: `Organisation ${idx + 1}`,
      assessmentId: a.id,
      overallScore: a.overallScore || 0,
      domainScores: DOMAINS.map((d) => {
        const ds = a.domainScores.find((s) => s.domainKey === d.key);
        return {
          domainKey: d.key,
          domainName: d.name,
          score: ds?.score || 0,
          maturityLevel: ds?.maturityLevel || 'Not assessed',
        };
      }),
      qualitativeResponses: DOMAINS.map((d) => ({
        domainKey: d.key,
        domainName: d.name,
        narratives: a.responses
          .filter((r) => r.domainKey === d.key)
          .map((r) => ({
            questionText:
              d.questions.find((q) => q.id === r.questionId)?.text || '',
            text: r.textValue || '',
          })),
      })).filter((d) => d.narratives.length > 0),
    }));

    res.json({ success: true, data: comparison });
  } catch (err) {
    next(err);
  }
});
