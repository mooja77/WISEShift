import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { DOMAINS, getMaturityLevel } from '@wiseshift/shared';
import { calculateDomainScore, calculateOverallScore, identifyStrengths, identifyWeaknesses } from '../utils/scoring.js';
import { AppError } from '../middleware/errorHandler.js';
import { extractWordFrequencies } from '../utils/wordFrequency.js';

export const resultsRoutes = Router();

// GET /api/assessments/:id/results — Get full results
resultsRoutes.get('/:id/results', async (req, res, next) => {
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

    // Calculate scores if not already done
    let domainScores = assessment.domainScores;
    let overallScore = assessment.overallScore;

    if (domainScores.length === 0) {
      const calculated = DOMAINS.map(d =>
        calculateDomainScore(d.key, assessment.responses)
      ).filter((s): s is NonNullable<typeof s> => s !== null);

      overallScore = calculateOverallScore(calculated);

      // Map to domain score format
      domainScores = calculated.map(c => ({
        id: '',
        assessmentId: id,
        domainKey: c.domainKey,
        score: c.score,
        maturityLevel: c.maturityLevel,
        createdAt: new Date(),
      }));
    }

    // Build domain score results with responses
    const domainScoreResults = DOMAINS.map(domain => {
      const ds = domainScores.find(s => s.domainKey === domain.key);
      const domainResponses = assessment.responses.filter(r => r.domainKey === domain.key);

      return {
        domainKey: domain.key,
        domainName: domain.name,
        score: ds?.score || 0,
        maturityLevel: ds?.maturityLevel || 'Not assessed',
        quantitativeResponses: domainResponses
          .filter(r => r.questionType !== 'narrative' && r.numericValue != null)
          .map(r => {
            const q = domain.questions.find(q => q.id === r.questionId);
            return {
              questionId: r.questionId,
              questionText: q?.text || '',
              questionType: r.questionType as 'likert' | 'maturity',
              value: r.numericValue!,
            };
          }),
        qualitativeResponses: domainResponses
          .filter(r => r.questionType === 'narrative' && r.textValue)
          .map(r => {
            const q = domain.questions.find(q => q.id === r.questionId);
            return {
              questionId: r.questionId,
              questionText: q?.text || '',
              text: r.textValue!,
              tags: r.tags ? JSON.parse(r.tags) : [],
            };
          }),
      };
    });

    const scoredDomains = domainScores
      .filter(d => d.score > 0)
      .map(d => ({ domainKey: d.domainKey, domainName: DOMAINS.find(dom => dom.key === d.domainKey)?.name || '', score: d.score, maturityLevel: d.maturityLevel }));

    // Build qualitative summary
    const qualitativeSummary = DOMAINS.map(domain => {
      const narratives = assessment.responses
        .filter(r => r.domainKey === domain.key && r.questionType === 'narrative' && r.textValue)
        .map(r => {
          const q = domain.questions.find(q => q.id === r.questionId);
          return {
            questionText: q?.text || '',
            text: r.textValue!,
            tags: r.tags ? JSON.parse(r.tags) : [],
          };
        });
      return {
        domainKey: domain.key,
        domainName: domain.name,
        narratives,
      };
    }).filter(s => s.narratives.length > 0);

    const results = {
      assessmentId: id,
      organisationName: assessment.organisation.name,
      overallScore: overallScore || 0,
      overallMaturityLevel: getMaturityLevel(overallScore || 0).name,
      domainScores: domainScoreResults,
      strengths: identifyStrengths(scoredDomains),
      weaknesses: identifyWeaknesses(scoredDomains),
      qualitativeSummary,
      completedAt: assessment.completedAt?.toISOString() || new Date().toISOString(),
    };

    res.json({ success: true, data: results });
  } catch (err) {
    next(err);
  }
});

// POST /api/assessments/:id/results/calculate — Recalculate results
resultsRoutes.post('/:id/results/calculate', async (req, res, next) => {
  try {
    const { id } = req.params;

    const assessment = await prisma.assessment.findUnique({
      where: { id },
      include: { responses: true },
    });

    if (!assessment) {
      throw new AppError('Assessment not found', 404);
    }

    const domainScores = DOMAINS.map(d =>
      calculateDomainScore(d.key, assessment.responses)
    ).filter((s): s is NonNullable<typeof s> => s !== null);

    const overallScore = calculateOverallScore(domainScores);

    // Save
    await Promise.all(
      domainScores.map(ds =>
        prisma.domainScore.upsert({
          where: {
            assessmentId_domainKey: {
              assessmentId: id,
              domainKey: ds.domainKey,
            },
          },
          update: { score: ds.score, maturityLevel: ds.maturityLevel },
          create: {
            assessmentId: id,
            domainKey: ds.domainKey,
            score: ds.score,
            maturityLevel: ds.maturityLevel,
          },
        })
      )
    );

    await prisma.assessment.update({
      where: { id },
      data: { overallScore },
    });

    res.json({ success: true, data: { overallScore, domainScores } });
  } catch (err) {
    next(err);
  }
});

// GET /api/assessments/:id/word-frequencies — Word frequencies for word cloud
resultsRoutes.get('/:id/word-frequencies', async (req, res, next) => {
  try {
    const { id } = req.params;

    const assessment = await prisma.assessment.findUnique({
      where: { id },
      include: { responses: true },
    });

    if (!assessment) {
      throw new AppError('Assessment not found', 404);
    }

    const narrativeTexts = assessment.responses
      .filter((r) => r.questionType === 'narrative' && r.textValue)
      .map((r) => r.textValue!);

    const frequencies = extractWordFrequencies(narrativeTexts);
    res.json({ success: true, data: frequencies });
  } catch (err) {
    next(err);
  }
});

// GET /api/assessments/:id/comparison — Reassessment comparison
resultsRoutes.get('/:id/comparison', async (req, res, next) => {
  try {
    const { id } = req.params;

    const assessment = await prisma.assessment.findUnique({
      where: { id },
      include: { domainScores: true },
    });

    if (!assessment) {
      throw new AppError('Assessment not found', 404);
    }

    if (!assessment.previousAssessmentId) {
      return res.json({ success: true, data: null });
    }

    const previous = await prisma.assessment.findUnique({
      where: { id: assessment.previousAssessmentId },
      include: { domainScores: true },
    });

    if (!previous) {
      return res.json({ success: true, data: null });
    }

    const comparison = DOMAINS.map((domain) => {
      const currentScore = assessment.domainScores.find(
        (ds) => ds.domainKey === domain.key
      );
      const previousScore = previous.domainScores.find(
        (ds) => ds.domainKey === domain.key
      );

      const current = currentScore?.score || 0;
      const prev = previousScore?.score || 0;
      const delta = current - prev;

      return {
        domainKey: domain.key,
        domainName: domain.name,
        currentScore: current,
        previousScore: prev,
        delta: Math.round(delta * 100) / 100,
        direction: delta > 0.1 ? 'improved' as const : delta < -0.1 ? 'declined' as const : 'unchanged' as const,
      };
    });

    res.json({
      success: true,
      data: {
        currentAssessmentId: id,
        previousAssessmentId: assessment.previousAssessmentId,
        domains: comparison,
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/assessments/:id/reassess — Create a reassessment
resultsRoutes.post('/:id/reassess', async (req, res, next) => {
  try {
    const { id } = req.params;

    const currentAssessment = await prisma.assessment.findUnique({
      where: { id },
      include: { organisation: true },
    });

    if (!currentAssessment) {
      throw new AppError('Assessment not found', 404);
    }

    const newAssessment = await prisma.assessment.create({
      data: {
        organisationId: currentAssessment.organisationId,
        status: 'in_progress',
        previousAssessmentId: id,
      },
      include: { organisation: true },
    });

    res.status(201).json({
      success: true,
      data: {
        assessment: newAssessment,
        accessCode: currentAssessment.organisation.accessCode,
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/assessments/:id/interview-guide — Generate interview guide
resultsRoutes.get('/:id/interview-guide', async (req, res, next) => {
  try {
    const { id } = req.params;

    const assessment = await prisma.assessment.findUnique({
      where: { id },
      include: {
        responses: true,
        domainScores: true,
      },
    });

    if (!assessment) {
      throw new AppError('Assessment not found', 404);
    }

    const { generateInterviewGuide } = await import('../utils/interviewGuide.js');
    const questions = generateInterviewGuide(
      assessment.domainScores,
      assessment.responses
    );

    res.json({ success: true, data: questions });
  } catch (err) {
    next(err);
  }
});

// GET /api/assessments/:id/interview-guide/docx — Export interview guide as Word
resultsRoutes.get('/:id/interview-guide/docx', async (req, res, next) => {
  try {
    const { id } = req.params;

    const assessment = await prisma.assessment.findUnique({
      where: { id },
      include: {
        responses: true,
        domainScores: true,
        organisation: true,
      },
    });

    if (!assessment) {
      throw new AppError('Assessment not found', 404);
    }

    const { generateInterviewGuide } = await import('../utils/interviewGuide.js');
    const { Document, Packer, Paragraph, TextRun, HeadingLevel } = await import('docx');

    const questions = generateInterviewGuide(
      assessment.domainScores,
      assessment.responses
    );

    const paragraphs: any[] = [
      new Paragraph({
        text: 'Follow-Up Interview Guide',
        heading: HeadingLevel.TITLE,
        spacing: { after: 200 },
      }),
      new Paragraph({
        children: [
          new TextRun({ text: `Organisation: ${assessment.organisation.name}`, size: 24 }),
        ],
        spacing: { after: 200 },
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: `Generated: ${new Date().toISOString().split('T')[0]}`,
            size: 22,
            color: '666666',
          }),
        ],
        spacing: { after: 400 },
      }),
    ];

    // Group questions by domain
    const grouped = new Map<string, typeof questions>();
    for (const q of questions) {
      const existing = grouped.get(q.domainName) || [];
      existing.push(q);
      grouped.set(q.domainName, existing);
    }

    for (const [domainName, domainQuestions] of grouped) {
      paragraphs.push(
        new Paragraph({
          text: domainName,
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 300, after: 100 },
        })
      );

      for (const q of domainQuestions) {
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({ text: `[${q.type}] `, bold: true, color: q.type === 'strength' ? '16a34a' : q.type === 'development' ? 'd97706' : '2563eb' }),
              new TextRun({ text: q.question, bold: true }),
            ],
            spacing: { before: 150, after: 50 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: q.rationale, italics: true, color: '666666', size: 20 }),
            ],
            spacing: { after: 100 },
          })
        );
      }
    }

    const doc = new Document({ sections: [{ children: paragraphs }] });
    const buffer = await Packer.toBuffer(doc);
    const filename = `wiseshift-interview-guide-${id}.docx`;

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );
    res.send(Buffer.from(buffer));
  } catch (err) {
    next(err);
  }
});
