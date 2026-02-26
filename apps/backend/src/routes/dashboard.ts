import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { DOMAINS, getMaturityLevel, K_ANONYMITY_THRESHOLD } from '@wiseshift/shared';
import type { DashboardInsight } from '@wiseshift/shared';
import { validate, dashboardAuthSchema } from '../middleware/validation.js';
import { AppError } from '../middleware/errorHandler.js';
import { extractWordFrequencies } from '../utils/wordFrequency.js';
import { sha256, verifyAccessCode } from '../utils/hashing.js';
import { mean, standardDeviation, pearsonCorrelation } from '../utils/statistics.js';

export const dashboardRoutes = Router();

// POST /api/dashboard/auth — Authenticate dashboard access
dashboardRoutes.post('/auth', validate(dashboardAuthSchema), async (req, res, next) => {
  try {
    const { accessCode } = req.body;

    // Try SHA-256 hashed lookup first
    const sha256Index = sha256(accessCode);
    let access = await prisma.dashboardAccess.findUnique({
      where: { accessCode: sha256Index },
    });

    if (access && access.accessCodeHash) {
      const valid = await verifyAccessCode(accessCode, access.accessCodeHash);
      if (!valid) {
        throw new AppError('Invalid dashboard access code', 401);
      }
    } else if (!access) {
      // Fallback: plaintext lookup for un-migrated codes
      access = await prisma.dashboardAccess.findUnique({
        where: { accessCode },
      });
      if (!access) {
        throw new AppError('Invalid dashboard access code', 401);
      }
    }

    if (new Date() > access.expiresAt) {
      throw new AppError('Access code has expired', 401);
    }

    res.json({
      success: true,
      data: {
        token: accessCode, // Return the original code as token
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

    // Sector breakdown with k-anonymity
    // Suppress categories with fewer than K entries to prevent re-identification
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

// GET /api/dashboard/insights — Dynamic data-driven insights engine
dashboardRoutes.get('/insights', async (_req, res, next) => {
  try {
    const assessments = await prisma.assessment.findMany({
      where: { status: 'completed' },
      include: {
        domainScores: true,
        organisation: true,
      },
      orderBy: { completedAt: 'desc' },
    });

    if (assessments.length === 0) {
      return res.json({ success: true, data: [] });
    }

    const insights: DashboardInsight[] = [];
    const domainKeys = DOMAINS.map(d => d.key);
    const domainName = (key: string) => DOMAINS.find(d => d.key === key)?.name || key;
    const round2 = (v: number) => Math.round(v * 100) / 100;

    // ── Collect per-domain score arrays ──
    const domainScoreArrays: Record<string, number[]> = {};
    for (const dk of domainKeys) {
      domainScoreArrays[dk] = [];
    }
    for (const a of assessments) {
      for (const ds of a.domainScores) {
        if (ds.score > 0 && domainScoreArrays[ds.domainKey]) {
          domainScoreArrays[ds.domainKey].push(ds.score);
        }
      }
    }

    // ── Domain averages ──
    const domainAvgs: { key: string; avg: number }[] = [];
    for (const dk of domainKeys) {
      const scores = domainScoreArrays[dk];
      if (scores.length > 0) {
        domainAvgs.push({ key: dk, avg: round2(mean(scores)) });
      }
    }
    const sortedAsc = [...domainAvgs].sort((a, b) => a.avg - b.avg);
    const sortedDesc = [...domainAvgs].sort((a, b) => b.avg - a.avg);

    // ── (a) Strongest domain ──
    if (sortedDesc.length > 0) {
      const top = sortedDesc[0];
      insights.push({
        type: 'strength',
        title: `Strongest domain: ${domainName(top.key)}`,
        description: `Across all assessed WISEs, ${domainName(top.key)} has the highest average score of ${top.avg}/5.`,
        domainKey: top.key,
        value: top.avg,
        severity: 'positive',
      });
    }

    // ── (b) Weakest domain ──
    if (sortedAsc.length > 0 && sortedAsc[0].key !== sortedDesc[0]?.key) {
      const bottom = sortedAsc[0];
      insights.push({
        type: 'weakness',
        title: `Area for development: ${domainName(bottom.key)}`,
        description: `${domainName(bottom.key)} has the lowest average score of ${bottom.avg}/5, indicating a sector-wide area for improvement.`,
        domainKey: bottom.key,
        value: bottom.avg,
        severity: 'warning',
      });
    }

    // ── (c) Sector-level strengths / weaknesses ──
    const sectorAssessments: Record<string, typeof assessments> = {};
    for (const a of assessments) {
      const sector = a.organisation.sector || 'Unknown';
      if (!sectorAssessments[sector]) sectorAssessments[sector] = [];
      sectorAssessments[sector].push(a);
    }

    for (const [sector, sectorGroup] of Object.entries(sectorAssessments)) {
      if (sector === 'Unknown' || sectorGroup.length < K_ANONYMITY_THRESHOLD) continue;

      const sectorDomainAvgs: { key: string; avg: number }[] = [];
      for (const dk of domainKeys) {
        const scores: number[] = [];
        for (const a of sectorGroup) {
          const ds = a.domainScores.find(d => d.domainKey === dk);
          if (ds && ds.score > 0) scores.push(ds.score);
        }
        if (scores.length > 0) {
          sectorDomainAvgs.push({ key: dk, avg: round2(mean(scores)) });
        }
      }

      if (sectorDomainAvgs.length < 2) continue;

      const sectorSorted = [...sectorDomainAvgs].sort((a, b) => b.avg - a.avg);
      const strongest = sectorSorted[0];
      const weakest = sectorSorted[sectorSorted.length - 1];

      insights.push({
        type: 'strength',
        title: `${sector}: ${domainName(strongest.key)} is strong`,
        description: `In ${sector}, ${domainName(strongest.key)} scores highest (${strongest.avg}/5) across ${sectorGroup.length} organisations.`,
        domainKey: strongest.key,
        value: strongest.avg,
        severity: 'positive',
        evidence: `Based on ${sectorGroup.length} completed assessments in this sector.`,
      });

      if (weakest.key !== strongest.key) {
        insights.push({
          type: 'weakness',
          title: `${sector}: ${domainName(weakest.key)} scores lowest`,
          description: `${sector} organisations score lowest on ${domainName(weakest.key)} (${weakest.avg}/5).`,
          domainKey: weakest.key,
          value: weakest.avg,
          severity: 'warning',
          evidence: `Based on ${sectorGroup.length} completed assessments in this sector.`,
        });
      }
    }

    // ── (d) Outlier detection — high variability domains ──
    for (const dk of domainKeys) {
      const scores = domainScoreArrays[dk];
      if (scores.length < K_ANONYMITY_THRESHOLD) continue;

      const sd = round2(standardDeviation(scores));
      if (sd > 1.0) {
        const avg = round2(mean(scores));
        insights.push({
          type: 'outlier',
          title: `High variability in ${domainName(dk)}`,
          description: `${domainName(dk)} shows high variability (SD=${sd}) — organisations range widely from emerging to leading levels.`,
          domainKey: dk,
          value: avg,
          severity: 'warning',
          evidence: `Standard deviation of ${sd} across ${scores.length} assessments (mean ${avg}/5).`,
        });
      }
    }

    // ── (e) Correlation patterns — strongest positive correlation ──
    if (assessments.length >= K_ANONYMITY_THRESHOLD && domainAvgs.length >= 2) {
      // Build aligned score arrays per assessment
      const assessmentDomainMaps = assessments.map(a => {
        const map: Record<string, number> = {};
        for (const ds of a.domainScores) {
          if (ds.score > 0) map[ds.domainKey] = ds.score;
        }
        return map;
      });

      let bestR = 0;
      let bestPair: [string, string] = ['', ''];

      const activeDomains = domainAvgs.map(d => d.key);
      for (let i = 0; i < activeDomains.length; i++) {
        for (let j = i + 1; j < activeDomains.length; j++) {
          const dk1 = activeDomains[i];
          const dk2 = activeDomains[j];
          const x: number[] = [];
          const y: number[] = [];
          for (const m of assessmentDomainMaps) {
            if (m[dk1] !== undefined && m[dk2] !== undefined) {
              x.push(m[dk1]);
              y.push(m[dk2]);
            }
          }
          if (x.length >= K_ANONYMITY_THRESHOLD) {
            const r = pearsonCorrelation(x, y);
            if (r > bestR) {
              bestR = r;
              bestPair = [dk1, dk2];
            }
          }
        }
      }

      if (bestR > 0.6 && bestPair[0]) {
        const rRounded = round2(bestR);
        insights.push({
          type: 'pattern',
          title: `Strong link: ${domainName(bestPair[0])} & ${domainName(bestPair[1])}`,
          description: `Strong positive relationship between ${domainName(bestPair[0])} and ${domainName(bestPair[1])} (r=${rRounded}) — organisations strong in one tend to excel in the other.`,
          severity: 'info',
          evidence: `Pearson correlation of ${rRounded} across ${assessments.length} assessments.`,
        });
      }
    }

    // ── (f) Trend detection — recent quarter vs overall ──
    const now = new Date();
    const threeMonthsAgo = new Date(now);
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const recentAssessments = assessments.filter(
      a => a.completedAt && a.completedAt >= threeMonthsAgo,
    );

    if (recentAssessments.length >= K_ANONYMITY_THRESHOLD) {
      for (const dk of domainKeys) {
        const overallScores = domainScoreArrays[dk];
        if (overallScores.length < K_ANONYMITY_THRESHOLD) continue;

        const recentScores: number[] = [];
        for (const a of recentAssessments) {
          const ds = a.domainScores.find(d => d.domainKey === dk);
          if (ds && ds.score > 0) recentScores.push(ds.score);
        }

        if (recentScores.length < K_ANONYMITY_THRESHOLD) continue;

        const overallAvg = mean(overallScores);
        const recentAvg = mean(recentScores);
        const delta = round2(recentAvg - overallAvg);

        if (Math.abs(delta) > 0.5) {
          const direction = delta > 0 ? 'improving' : 'declining';
          const sign = delta > 0 ? '+' : '';
          insights.push({
            type: 'trend',
            title: `${domainName(dk)}: ${direction} trend`,
            description: `Recent assessments show ${direction} scores in ${domainName(dk)} (${sign}${delta} vs overall average).`,
            domainKey: dk,
            value: round2(recentAvg),
            severity: delta > 0 ? 'positive' : 'warning',
            evidence: `Recent quarter average: ${round2(recentAvg)}/5 vs overall: ${round2(overallAvg)}/5 (${recentScores.length} recent assessments).`,
          });
        }
      }
    }

    // ── (g) Dynamic recommendations — based on actual data ──
    if (sortedAsc.length > 0) {
      const weakest = sortedAsc[0];
      insights.push({
        type: 'recommendation',
        title: `Focus on ${domainName(weakest.key)}`,
        description: `With the lowest average score of ${weakest.avg}/5, ${domainName(weakest.key)} represents the greatest opportunity for sector-wide improvement. Consider targeted capacity building and knowledge sharing in this area.`,
        domainKey: weakest.key,
        value: weakest.avg,
        severity: 'info',
      });
    }

    // Recommend investigating high-variability domains for best practices
    const highVariabilityDomains = domainKeys.filter(dk => {
      const scores = domainScoreArrays[dk];
      return scores.length >= K_ANONYMITY_THRESHOLD && standardDeviation(scores) > 1.0;
    });

    if (highVariabilityDomains.length > 0) {
      const names = highVariabilityDomains.map(dk => domainName(dk));
      insights.push({
        type: 'recommendation',
        title: 'Investigate best practices in variable domains',
        description: `${names.join(', ')} ${names.length === 1 ? 'shows' : 'show'} high variability — some organisations are excelling while others lag behind. Identifying and sharing best practices from top performers could lift the sector.`,
        severity: 'info',
        evidence: `${highVariabilityDomains.length} domain${highVariabilityDomains.length > 1 ? 's' : ''} with standard deviation > 1.0.`,
      });
    }

    // ── Sort by importance and limit to 8 insights ──
    const typePriority: Record<DashboardInsight['type'], number> = {
      outlier: 0,
      trend: 1,
      strength: 2,
      weakness: 3,
      pattern: 4,
      recommendation: 5,
    };

    insights.sort((a, b) => typePriority[a.type] - typePriority[b.type]);
    const limitedInsights = insights.slice(0, 8);

    res.json({ success: true, data: limitedInsights });
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
