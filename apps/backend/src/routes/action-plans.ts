import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { DOMAINS, RECOMMENDATION_TEMPLATES, getMaturityLevel } from '@wiseshift/shared';
import { AppError } from '../middleware/errorHandler.js';

export const actionPlanRoutes = Router();

// GET /api/assessments/:id/action-plan — Get action plan
actionPlanRoutes.get('/:id/action-plan', async (req, res, next) => {
  try {
    const { id } = req.params;

    const assessment = await prisma.assessment.findUnique({
      where: { id },
      include: { organisation: true, actionPlans: true },
    });

    if (!assessment) {
      throw new AppError('Assessment not found', 404);
    }

    if (assessment.actionPlans.length > 0) {
      return res.json({
        success: true,
        data: {
          assessmentId: id,
          organisationName: assessment.organisation.name,
          generatedAt: assessment.actionPlans[0].createdAt.toISOString(),
          items: assessment.actionPlans,
        },
      });
    }

    res.json({
      success: true,
      data: {
        assessmentId: id,
        organisationName: assessment.organisation.name,
        generatedAt: new Date().toISOString(),
        items: [],
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/assessments/:id/action-plan/generate — Generate action plan
actionPlanRoutes.post('/:id/action-plan/generate', async (req, res, next) => {
  try {
    const { id } = req.params;

    const assessment = await prisma.assessment.findUnique({
      where: { id },
      include: {
        organisation: true,
        domainScores: true,
      },
    });

    if (!assessment) {
      throw new AppError('Assessment not found', 404);
    }

    if (assessment.domainScores.length === 0) {
      throw new AppError('Assessment must be scored before generating action plan', 400);
    }

    // Delete existing action plans
    await prisma.actionPlan.deleteMany({ where: { assessmentId: id } });

    // Generate recommendations based on scores
    const items: any[] = [];

    // Sort domains by score ascending (lowest first = highest priority)
    const sortedScores = [...assessment.domainScores].sort((a, b) => a.score - b.score);

    for (const ds of sortedScores) {
      const domain = DOMAINS.find(d => d.key === ds.domainKey);
      if (!domain || ds.score === 0) continue;

      const currentLevel = ds.maturityLevel;

      // Find matching recommendation templates
      const templates = RECOMMENDATION_TEMPLATES.filter(
        t => t.domainKey === ds.domainKey && t.currentLevel === currentLevel
      );

      for (const template of templates) {
        // Priority based on score: lower scores get higher priority
        const priority = ds.score < 2 ? 'high' : ds.score < 3 ? 'medium' : 'low';

        items.push({
          assessmentId: id,
          domainKey: ds.domainKey,
          domainName: domain.name,
          priority,
          recommendation: template.recommendation,
          description: template.description,
          effort: template.effort,
          impact: template.impact,
          timeframe: template.timeframe,
          currentLevel: template.currentLevel,
          targetLevel: template.targetLevel,
        });
      }
    }

    // Save action plans
    if (items.length > 0) {
      await prisma.actionPlan.createMany({ data: items });
    }

    const savedPlans = await prisma.actionPlan.findMany({
      where: { assessmentId: id },
    });

    res.json({
      success: true,
      data: {
        assessmentId: id,
        organisationName: assessment.organisation.name,
        generatedAt: new Date().toISOString(),
        items: savedPlans,
      },
    });
  } catch (err) {
    next(err);
  }
});
