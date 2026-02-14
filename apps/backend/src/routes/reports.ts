import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { DOMAINS, getMaturityLevel } from '@wiseshift/shared';
import { calculateDomainScore, calculateOverallScore, identifyStrengths, identifyWeaknesses } from '../utils/scoring.js';
import { AppError } from '../middleware/errorHandler.js';
import { getRetentionExpiresAt } from '../middleware/dataRetention.js';

export const reportRoutes = Router();

// GET /api/assessments/:id/export/json — Export assessment data as downloadable JSON
reportRoutes.get('/:id/export/json', async (req, res, next) => {
  try {
    const { id } = req.params;

    const assessment = await prisma.assessment.findUnique({
      where: { id },
      include: {
        organisation: true,
        responses: true,
        domainScores: true,
        actionPlans: true,
      },
    });

    if (!assessment) {
      throw new AppError('Assessment not found', 404);
    }

    const retentionExpiresAt = getRetentionExpiresAt(
      assessment.updatedAt,
      assessment.status
    );

    const exportData = {
      exportedAt: new Date().toISOString(),
      retentionExpiresAt: retentionExpiresAt.toISOString(),
      organisation: {
        name: assessment.organisation.name,
        country: assessment.organisation.country,
        region: assessment.organisation.region,
        sector: assessment.organisation.sector,
        size: assessment.organisation.size,
        legalStructure: assessment.organisation.legalStructure,
      },
      assessment: {
        id: assessment.id,
        status: assessment.status,
        overallScore: assessment.overallScore,
        completedAt: assessment.completedAt?.toISOString() || null,
        createdAt: assessment.createdAt.toISOString(),
        updatedAt: assessment.updatedAt.toISOString(),
      },
      responses: assessment.responses.map(r => ({
        domainKey: r.domainKey,
        questionId: r.questionId,
        questionType: r.questionType,
        numericValue: r.numericValue,
        textValue: r.textValue,
        tags: r.tags ? JSON.parse(r.tags) : null,
      })),
      domainScores: assessment.domainScores.map(ds => ({
        domainKey: ds.domainKey,
        score: ds.score,
        maturityLevel: ds.maturityLevel,
      })),
      actionPlans: assessment.actionPlans.map(ap => ({
        domainKey: ap.domainKey,
        domainName: ap.domainName,
        priority: ap.priority,
        recommendation: ap.recommendation,
        description: ap.description,
        effort: ap.effort,
        impact: ap.impact,
        timeframe: ap.timeframe,
        currentLevel: ap.currentLevel,
        targetLevel: ap.targetLevel,
      })),
    };

    const filename = `wiseshift-assessment-${id}.json`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/json');
    res.json(exportData);
  } catch (err) {
    next(err);
  }
});

// GET /api/assessments/:id/export/csv — Export assessment data as CSV
// Flat format: one row per response with domain, question, numeric value, text value
reportRoutes.get('/:id/export/csv', async (req, res, next) => {
  try {
    const { id } = req.params;

    const assessment = await prisma.assessment.findUnique({
      where: { id },
      include: {
        organisation: true,
        responses: true,
        domainScores: true,
      },
    });

    if (!assessment) {
      throw new AppError('Assessment not found', 404);
    }

    // Build CSV header
    const headers = [
      'Organisation',
      'Assessment ID',
      'Status',
      'Overall Score',
      'Domain',
      'Domain Name',
      'Question ID',
      'Question Type',
      'Question Text',
      'Numeric Value',
      'Text Value',
      'Domain Score',
      'Domain Maturity Level',
    ];

    // Helper to escape CSV values
    function escapeCsv(value: string | number | null | undefined): string {
      if (value === null || value === undefined) return '';
      const str = String(value);
      if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    }

    const rows: string[] = [headers.map(escapeCsv).join(',')];

    for (const response of assessment.responses) {
      const domain = DOMAINS.find(d => d.key === response.domainKey);
      const question = domain?.questions.find(q => q.id === response.questionId);
      const domainScore = assessment.domainScores.find(
        ds => ds.domainKey === response.domainKey
      );

      const row = [
        escapeCsv(assessment.organisation.name),
        escapeCsv(assessment.id),
        escapeCsv(assessment.status),
        escapeCsv(assessment.overallScore),
        escapeCsv(response.domainKey),
        escapeCsv(domain?.name),
        escapeCsv(response.questionId),
        escapeCsv(response.questionType),
        escapeCsv(question?.text),
        escapeCsv(response.numericValue),
        escapeCsv(response.textValue),
        escapeCsv(domainScore?.score),
        escapeCsv(domainScore?.maturityLevel),
      ];

      rows.push(row.join(','));
    }

    const csvContent = rows.join('\r\n');
    const filename = `wiseshift-assessment-${id}.csv`;

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.send(csvContent);
  } catch (err) {
    next(err);
  }
});

// GET /api/assessments/:id/report/pdf — Generate PDF report data
// (Returns JSON data that frontend renders as PDF)
reportRoutes.get('/:id/report/pdf', async (req, res, next) => {
  try {
    const { id } = req.params;

    const assessment = await prisma.assessment.findUnique({
      where: { id },
      include: {
        organisation: true,
        responses: true,
        domainScores: true,
        actionPlans: true,
      },
    });

    if (!assessment) {
      throw new AppError('Assessment not found', 404);
    }

    // Build domain results
    const domainResults = DOMAINS.map(domain => {
      const ds = assessment.domainScores.find(s => s.domainKey === domain.key);
      const responses = assessment.responses.filter(r => r.domainKey === domain.key);

      return {
        domainKey: domain.key,
        domainName: domain.name,
        score: ds?.score || 0,
        maturityLevel: ds?.maturityLevel || 'Not assessed',
        quantitativeResponses: responses
          .filter(r => r.questionType !== 'narrative' && r.numericValue != null)
          .map(r => ({
            questionId: r.questionId,
            questionText: domain.questions.find(q => q.id === r.questionId)?.text || '',
            value: r.numericValue!,
          })),
        qualitativeResponses: responses
          .filter(r => r.questionType === 'narrative' && r.textValue)
          .map(r => ({
            questionId: r.questionId,
            questionText: domain.questions.find(q => q.id === r.questionId)?.text || '',
            text: r.textValue!,
          })),
      };
    });

    const scoredDomains = assessment.domainScores
      .filter(d => d.score > 0)
      .map(d => ({
        domainKey: d.domainKey,
        domainName: DOMAINS.find(dom => dom.key === d.domainKey)?.name || '',
        score: d.score,
        maturityLevel: d.maturityLevel,
      }));

    const reportData = {
      organisation: {
        name: assessment.organisation.name,
        sector: assessment.organisation.sector,
        country: assessment.organisation.country,
        region: assessment.organisation.region,
        size: assessment.organisation.size,
        legalStructure: assessment.organisation.legalStructure,
      },
      assessment: {
        id: assessment.id,
        status: assessment.status,
        overallScore: assessment.overallScore || 0,
        overallMaturityLevel: getMaturityLevel(assessment.overallScore || 0).name,
        completedAt: assessment.completedAt?.toISOString(),
        createdAt: assessment.createdAt.toISOString(),
      },
      domainResults,
      strengths: identifyStrengths(scoredDomains),
      weaknesses: identifyWeaknesses(scoredDomains),
      actionPlans: assessment.actionPlans,
    };

    res.json({ success: true, data: reportData });
  } catch (err) {
    next(err);
  }
});
