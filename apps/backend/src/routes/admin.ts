import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma.js';
import { validate, bulkImportSchema } from '../middleware/validation.js';
import { generateAccessCode } from '../utils/accessCode.js';
import { calculateDomainScore, calculateOverallScore, calculateSectorScore } from '../utils/scoring.js';
import { DOMAINS, getMaturityLevel, getSectorModule } from '@wiseshift/shared';

export const adminRoutes = Router();

// ─── Question ID → Domain/Type lookup map ───
const QUESTION_MAP = new Map<string, { domainKey: string; questionType: string }>();
for (const domain of DOMAINS) {
  for (const q of domain.questions) {
    QUESTION_MAP.set(q.id, { domainKey: domain.key, questionType: q.type });
  }
}

// ─── Auth middleware ───
function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace('Bearer ', '');
  if (!process.env.ADMIN_SECRET || token !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ success: false, error: 'Invalid admin token' });
  }
  next();
}

adminRoutes.use(requireAdmin);

// ─── POST /import — Bulk import assessments ───
adminRoutes.post('/import', validate(bulkImportSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = req.body;
    const dryRun = body.dryRun ?? false;
    const assessments = body.assessments;

    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];
    const skippedOrgs: string[] = [];

    for (let i = 0; i < assessments.length; i++) {
      const entry = assessments[i];
      const orgData = entry.organisation;

      try {
        // Idempotency: skip if org with same name+country already exists
        const existing = await prisma.organisation.findFirst({
          where: { name: orgData.name, country: orgData.country },
        });
        if (existing) {
          skipped++;
          skippedOrgs.push(`${orgData.name} (${orgData.country}) — already exists`);
          continue;
        }

        if (dryRun) {
          // Validate but don't persist
          if (body.format === 'full') {
            for (const resp of entry.responses) {
              if (!QUESTION_MAP.has(resp.questionId)) {
                errors.push(`Assessment ${i}: unknown questionId "${resp.questionId}"`);
              }
            }
          }
          imported++;
          continue;
        }

        // Create organisation
        const organisation = await prisma.organisation.create({
          data: {
            name: orgData.name,
            accessCode: generateAccessCode(),
            country: orgData.country,
            region: orgData.region,
            sector: orgData.sector,
            size: orgData.size,
            legalStructure: orgData.legalStructure,
          },
        });

        // Create assessment
        const assessment = await prisma.assessment.create({
          data: {
            organisationId: organisation.id,
            status: 'completed',
            completedAt: new Date(),
          },
        });

        if (body.format === 'full') {
          // ── Full format: create responses, calculate scores ──
          const responseRecords = entry.responses.map((resp: any) => {
            const meta = QUESTION_MAP.get(resp.questionId);
            if (!meta) {
              errors.push(`Assessment ${i}: unknown questionId "${resp.questionId}"`);
              return null;
            }
            return {
              assessmentId: assessment.id,
              domainKey: meta.domainKey,
              questionId: resp.questionId,
              questionType: meta.questionType,
              numericValue: resp.numericValue ?? null,
              textValue: resp.textValue ?? null,
            };
          }).filter(Boolean);

          if (responseRecords.length > 0) {
            await prisma.response.createMany({ data: responseRecords });
          }

          // Fetch created responses for scoring
          const allResponses = await prisma.response.findMany({
            where: { assessmentId: assessment.id },
          });

          // Calculate domain scores
          const domainScores = DOMAINS.map(domain =>
            calculateDomainScore(domain.key, allResponses)
          ).filter((s): s is NonNullable<typeof s> => s !== null);

          // Save domain scores
          if (domainScores.length > 0) {
            await prisma.domainScore.createMany({
              data: domainScores.map(ds => ({
                assessmentId: assessment.id,
                domainKey: ds.domainKey,
                score: ds.score,
                maturityLevel: ds.maturityLevel,
              })),
            });
          }

          // Calculate and save sector score if applicable
          if (orgData.sector) {
            const sectorModule = getSectorModule(orgData.sector);
            if (sectorModule) {
              const sectorScore = calculateSectorScore(sectorModule, allResponses);
              if (sectorScore) {
                await prisma.sectorScore.create({
                  data: {
                    assessmentId: assessment.id,
                    sectorKey: sectorScore.sectorKey,
                    score: sectorScore.score,
                  },
                });
              }
            }
          }

          // Calculate and save overall score
          const overallScore = calculateOverallScore(domainScores);
          await prisma.assessment.update({
            where: { id: assessment.id },
            data: { overallScore },
          });

        } else {
          // ── Simplified format: create domain scores directly ──
          const domainEntries = Object.entries(entry.domainScores) as [string, number][];
          const domainScoreRecords = domainEntries.map(([domainKey, score]) => {
            const maturity = getMaturityLevel(score);
            return {
              assessmentId: assessment.id,
              domainKey,
              score,
              maturityLevel: maturity.name,
            };
          });

          if (domainScoreRecords.length > 0) {
            await prisma.domainScore.createMany({ data: domainScoreRecords });
          }

          // Calculate overall score as average
          const scores = domainEntries.map(([, s]) => s);
          const overallScore = scores.length > 0
            ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) / 100
            : 0;

          await prisma.assessment.update({
            where: { id: assessment.id },
            data: { overallScore },
          });
        }

        imported++;
      } catch (err: any) {
        errors.push(`Assessment ${i} (${orgData.name}): ${err.message}`);
      }
    }

    res.json({
      success: true,
      data: { imported, skipped, errors, skippedOrgs, dryRun },
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET /import/stats — Import statistics ───
adminRoutes.get('/import/stats', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const totalOrgs = await prisma.organisation.count();
    const totalAssessments = await prisma.assessment.count({
      where: { status: 'completed' },
    });

    // Breakdown by country
    const orgsByCountry = await prisma.organisation.groupBy({
      by: ['country'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    });

    // Breakdown by sector
    const orgsBySector = await prisma.organisation.groupBy({
      by: ['sector'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    });

    // Last import = most recent completed assessment
    const lastAssessment = await prisma.assessment.findFirst({
      where: { status: 'completed' },
      orderBy: { completedAt: 'desc' },
      select: { completedAt: true },
    });

    res.json({
      success: true,
      data: {
        totalOrgs,
        totalAssessments,
        byCountry: orgsByCountry.map(r => ({ country: r.country ?? 'Unknown', count: r._count.id })),
        bySector: orgsBySector.map(r => ({ sector: r.sector ?? 'Unknown', count: r._count.id })),
        lastImportAt: lastAssessment?.completedAt?.toISOString() ?? null,
      },
    });
  } catch (err) {
    next(err);
  }
});
