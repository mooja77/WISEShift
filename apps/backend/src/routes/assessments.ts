import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { validate, createAssessmentSchema, updateResponsesSchema } from '../middleware/validation.js';
import { validateAccessCode } from '../middleware/accessCode.js';
import { generateAccessCode } from '../utils/accessCode.js';
import { AppError } from '../middleware/errorHandler.js';
import { getRetentionExpiresAt } from '../middleware/dataRetention.js';
import { getSectorModule } from '@wiseshift/shared';

export const assessmentRoutes = Router();

// POST /api/assessments — Create new assessment
assessmentRoutes.post('/', validate(createAssessmentSchema), async (req, res, next) => {
  try {
    const { organisation: orgData } = req.body;
    const accessCode = generateAccessCode();

    const organisation = await prisma.organisation.create({
      data: {
        name: orgData.name,
        accessCode,
        country: orgData.country,
        region: orgData.region,
        sector: orgData.sector,
        size: orgData.size,
        legalStructure: orgData.legalStructure,
      },
    });

    const assessment = await prisma.assessment.create({
      data: {
        organisationId: organisation.id,
        status: 'in_progress',
      },
      include: { organisation: true },
    });

    res.status(201).json({
      success: true,
      data: { assessment, accessCode, accessCodeShown: true },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/assessments/resume/:accessCode — Resume assessment
assessmentRoutes.get('/resume/:accessCode', validateAccessCode, async (req, res, next) => {
  try {
    const organisation = (req as any).organisation;

    const assessment = await prisma.assessment.findFirst({
      where: { organisationId: organisation.id },
      orderBy: { createdAt: 'desc' },
      include: {
        organisation: true,
        responses: true,
        domainScores: true,
      },
    });

    if (!assessment) {
      throw new AppError('No assessment found', 404);
    }

    const retentionExpiresAt = getRetentionExpiresAt(
      assessment.updatedAt,
      assessment.status
    );

    res.json({
      success: true,
      data: {
        assessment,
        responses: assessment.responses,
        retentionExpiresAt: retentionExpiresAt.toISOString(),
      },
    });
  } catch (err) {
    next(err);
  }
});

// PUT /api/assessments/:id — Update assessment
assessmentRoutes.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const assessment = await prisma.assessment.update({
      where: { id },
      data: { status },
      include: { organisation: true },
    });

    res.json({ success: true, data: assessment });
  } catch (err) {
    next(err);
  }
});

// PUT /api/assessments/:id/responses — Bulk upsert responses (auto-save)
assessmentRoutes.put('/:id/responses', validate(updateResponsesSchema), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { responses } = req.body;

    // Verify assessment exists
    const assessment = await prisma.assessment.findUnique({ where: { id } });
    if (!assessment) {
      throw new AppError('Assessment not found', 404);
    }

    // Upsert each response
    const upserted = await Promise.all(
      responses.map((resp: any) =>
        prisma.response.upsert({
          where: {
            assessmentId_questionId: {
              assessmentId: id,
              questionId: resp.questionId,
            },
          },
          update: {
            numericValue: resp.numericValue,
            textValue: resp.textValue,
            tags: resp.tags ? JSON.stringify(resp.tags) : undefined,
            claimedBy: resp.claimedBy ?? undefined,
          },
          create: {
            assessmentId: id,
            domainKey: resp.domainKey,
            questionId: resp.questionId,
            questionType: resp.questionType,
            numericValue: resp.numericValue,
            textValue: resp.textValue,
            tags: resp.tags ? JSON.stringify(resp.tags) : null,
            claimedBy: resp.claimedBy ?? null,
          },
        })
      )
    );

    // Update assessment timestamp
    await prisma.assessment.update({
      where: { id },
      data: { updatedAt: new Date() },
    });

    res.json({ success: true, data: upserted });
  } catch (err) {
    next(err);
  }
});

// GET /api/assessments/:id/responses — Get all responses
assessmentRoutes.get('/:id/responses', async (req, res, next) => {
  try {
    const { id } = req.params;
    const responses = await prisma.response.findMany({
      where: { assessmentId: id },
    });

    res.json({ success: true, data: responses });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/assessments/:id — Delete assessment and all related data (GDPR right to erasure)
assessmentRoutes.delete('/:id', validateAccessCode, async (req, res, next) => {
  try {
    const { id } = req.params;
    const organisation = (req as any).organisation;

    // Verify the assessment belongs to this organisation
    const assessment = await prisma.assessment.findFirst({
      where: { id, organisationId: organisation.id },
    });

    if (!assessment) {
      throw new AppError('Assessment not found or access denied', 404);
    }

    // Delete assessment (cascading deletes handle responses, domainScores, actionPlans)
    await prisma.assessment.delete({ where: { id } });

    // If the organisation has no remaining assessments, delete the organisation too
    const remainingAssessments = await prisma.assessment.count({
      where: { organisationId: organisation.id },
    });

    if (remainingAssessments === 0) {
      await prisma.organisation.delete({ where: { id: organisation.id } });
    }

    res.json({
      success: true,
      message: 'Assessment and all related data have been permanently deleted.',
    });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/assessments/:id/data — Anonymise assessment data (GDPR, keep aggregate scores)
assessmentRoutes.delete('/:id/data', validateAccessCode, async (req, res, next) => {
  try {
    const { id } = req.params;
    const organisation = (req as any).organisation;

    // Verify the assessment belongs to this organisation
    const assessment = await prisma.assessment.findFirst({
      where: { id, organisationId: organisation.id },
    });

    if (!assessment) {
      throw new AppError('Assessment not found or access denied', 404);
    }

    // Anonymise organisation name
    await prisma.organisation.update({
      where: { id: organisation.id },
      data: { name: 'Anonymised Organisation' },
    });

    // Clear narrative text responses but keep numeric scores for aggregate benchmarking
    await prisma.response.updateMany({
      where: {
        assessmentId: id,
        questionType: 'narrative',
      },
      data: {
        textValue: null,
        tags: null,
      },
    });

    res.json({
      success: true,
      message: 'Assessment data has been anonymised. Numeric scores retained for aggregate benchmarking.',
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/assessments/:id/collaborators — Add a collaborator
assessmentRoutes.post('/:id/collaborators', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, email, domains } = req.body;

    if (!name || !domains || !Array.isArray(domains) || domains.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Name and at least one domain are required',
      });
    }

    const assessment = await prisma.assessment.findUnique({ where: { id } });
    if (!assessment) {
      throw new AppError('Assessment not found', 404);
    }

    const existing = assessment.collaborators
      ? JSON.parse(assessment.collaborators)
      : [];

    existing.push({ name, email: email || undefined, domains });

    await prisma.assessment.update({
      where: { id },
      data: { collaborators: JSON.stringify(existing) },
    });

    res.status(201).json({ success: true, data: existing });
  } catch (err) {
    next(err);
  }
});

// GET /api/assessments/:id/collaborators — Get collaborators
assessmentRoutes.get('/:id/collaborators', async (req, res, next) => {
  try {
    const { id } = req.params;
    const assessment = await prisma.assessment.findUnique({ where: { id } });
    if (!assessment) {
      throw new AppError('Assessment not found', 404);
    }

    const collaborators = assessment.collaborators
      ? JSON.parse(assessment.collaborators)
      : [];

    res.json({ success: true, data: collaborators });
  } catch (err) {
    next(err);
  }
});

// GET /api/assessments/:id/status — Live working status
assessmentRoutes.get('/:id/status', async (req, res, next) => {
  try {
    const { id } = req.params;
    const responses = await prisma.response.findMany({
      where: { assessmentId: id, claimedBy: { not: null } },
      select: { domainKey: true, claimedBy: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
    });

    res.json({ success: true, data: responses });
  } catch (err) {
    next(err);
  }
});

// POST /api/assessments/:id/complete — Complete assessment
assessmentRoutes.post('/:id/complete', async (req, res, next) => {
  try {
    const { id } = req.params;

    const assessment = await prisma.assessment.findUnique({
      where: { id },
      include: { responses: true },
    });

    if (!assessment) {
      throw new AppError('Assessment not found', 404);
    }

    // Import scoring utilities
    const { calculateDomainScore, calculateOverallScore, calculateSectorScore } = await import('../utils/scoring.js');
    const { DOMAINS } = await import('@wiseshift/shared');

    // Calculate domain scores
    const domainScores = DOMAINS.map(domain =>
      calculateDomainScore(domain.key, assessment.responses)
    ).filter((s): s is NonNullable<typeof s> => s !== null);

    const overallScore = calculateOverallScore(domainScores);

    // Save domain scores (upsert to avoid duplicates)
    await Promise.all(
      domainScores.map(ds =>
        prisma.domainScore.upsert({
          where: {
            assessmentId_domainKey: {
              assessmentId: id,
              domainKey: ds.domainKey,
            },
          },
          update: {
            score: ds.score,
            maturityLevel: ds.maturityLevel,
          },
          create: {
            assessmentId: id,
            domainKey: ds.domainKey,
            score: ds.score,
            maturityLevel: ds.maturityLevel,
          },
        })
      )
    );

    // Calculate and save sector score if applicable
    const org = await prisma.organisation.findUnique({ where: { id: assessment.organisationId } });
    if (org?.sector) {
      const sectorModule = getSectorModule(org.sector);
      if (sectorModule) {
        const sectorScore = calculateSectorScore(sectorModule, assessment.responses);
        if (sectorScore) {
          await prisma.sectorScore.upsert({
            where: {
              assessmentId_sectorKey: { assessmentId: id, sectorKey: sectorScore.sectorKey },
            },
            update: { score: sectorScore.score },
            create: {
              assessmentId: id,
              sectorKey: sectorScore.sectorKey,
              score: sectorScore.score,
            },
          });
        }
      }
    }

    // Update assessment
    const updated = await prisma.assessment.update({
      where: { id },
      data: {
        status: 'completed',
        overallScore,
        completedAt: new Date(),
      },
      include: {
        organisation: true,
        responses: true,
        domainScores: true,
        sectorScores: true,
      },
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

// GET /api/assessments/:id/sector-questions — Get applicable sector module
assessmentRoutes.get('/:id/sector-questions', async (req, res, next) => {
  try {
    const { id } = req.params;

    const assessment = await prisma.assessment.findUnique({
      where: { id },
      include: { organisation: true },
    });

    if (!assessment) {
      throw new AppError('Assessment not found', 404);
    }

    const sector = assessment.organisation.sector;
    if (!sector) {
      return res.json({ success: true, data: null });
    }

    const sectorModule = getSectorModule(sector);
    if (!sectorModule) {
      return res.json({ success: true, data: null });
    }

    res.json({ success: true, data: sectorModule });
  } catch (err) {
    next(err);
  }
});
