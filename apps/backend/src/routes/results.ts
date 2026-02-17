import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { DOMAINS, getMaturityLevel, POLICY_FRAMEWORKS, calculateFrameworkAlignment, getTopAlignedObjectives, getSectorModule, getSectorRecommendation } from '@wiseshift/shared';
import { calculateDomainScore, calculateOverallScore, identifyStrengths, identifyWeaknesses, calculateSectorScore } from '../utils/scoring.js';
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

// GET /api/assessments/:id/timeline — Get all assessment scores in the chain
resultsRoutes.get('/:id/timeline', async (req, res, next) => {
  try {
    const { id } = req.params;

    const assessment = await prisma.assessment.findUnique({
      where: { id },
      include: { organisation: true },
    });

    if (!assessment) {
      throw new AppError('Assessment not found', 404);
    }

    // Find all assessments for this organisation, ordered by creation date
    const allAssessments = await prisma.assessment.findMany({
      where: {
        organisationId: assessment.organisationId,
        status: 'completed',
        domainScores: { some: {} },
      },
      include: { domainScores: true },
      orderBy: { completedAt: 'asc' },
    });

    const timeline = allAssessments.map(a => {
      const domainScores: Record<string, number> = {};
      for (const ds of a.domainScores) {
        domainScores[ds.domainKey] = ds.score;
      }
      return {
        assessmentId: a.id,
        completedAt: (a.completedAt ?? a.createdAt).toISOString(),
        overallScore: a.overallScore ?? 0,
        domainScores,
      };
    });

    res.json({ success: true, data: timeline });
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

// GET /api/assessments/:id/exemplars — Get anonymised narrative exemplars from higher-scoring assessments
resultsRoutes.get('/:id/exemplars', async (req, res, next) => {
  try {
    const { id } = req.params;
    const domainKey = req.query.domainKey as string;

    if (!domainKey) {
      throw new AppError('domainKey query parameter is required', 400);
    }

    const assessment = await prisma.assessment.findUnique({
      where: { id },
      include: { domainScores: true },
    });

    if (!assessment) {
      throw new AppError('Assessment not found', 404);
    }

    const currentDomainScore = assessment.domainScores.find(ds => ds.domainKey === domainKey);
    const currentScore = currentDomainScore?.score ?? 0;

    // Find assessments scoring at least 1 maturity level (1 point) higher in this domain
    const higherScoringAssessments = await prisma.assessment.findMany({
      where: {
        id: { not: id },
        status: 'completed',
        domainScores: {
          some: {
            domainKey,
            score: { gte: currentScore + 1 },
          },
        },
      },
      include: {
        organisation: {
          select: { country: true, sector: true, size: true },
        },
        responses: {
          where: {
            domainKey,
            questionType: 'narrative',
            textValue: { not: '' },
          },
          select: { textValue: true },
        },
      },
      take: 10,
    });

    // Build anonymised exemplars
    const exemplars = higherScoringAssessments
      .flatMap(a => {
        const contextParts: string[] = [];
        if (a.organisation.size) contextParts.push(`${a.organisation.size} employees`);
        if (a.organisation.country) contextParts.push(a.organisation.country);
        if (a.organisation.sector) contextParts.push(a.organisation.sector);
        const context = contextParts.length > 0 ? contextParts.join(' · ') : 'European WISE';

        return a.responses
          .filter(r => r.textValue && r.textValue.length > 50)
          .map(r => ({
            context,
            text: r.textValue!,
          }));
      })
      .slice(0, 5); // Limit to 5 exemplars

    res.json({ success: true, data: exemplars });
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

// GET /api/assessments/:id/sector-results — Sector-specific scores and recommendations
resultsRoutes.get('/:id/sector-results', async (req, res, next) => {
  try {
    const { id } = req.params;

    const assessment = await prisma.assessment.findUnique({
      where: { id },
      include: {
        organisation: true,
        responses: true,
        sectorScores: true,
      },
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

    // Calculate or use existing sector score
    let sectorScore = assessment.sectorScores.find(s => s.sectorKey === sectorModule.key);
    let score = sectorScore?.score ?? 0;

    if (!sectorScore) {
      const calc = calculateSectorScore(sectorModule, assessment.responses);
      score = calc?.score ?? 0;
    }

    const recommendation = getSectorRecommendation(sectorModule.key, score);

    // Build per-question response data
    const questionResults = sectorModule.questions.map(q => {
      const resp = assessment.responses.find(r => r.questionId === q.id);
      return {
        questionId: q.id,
        questionText: q.text,
        questionType: q.type,
        value: q.type === 'narrative' ? resp?.textValue || null : resp?.numericValue ?? null,
        tags: q.tags || [],
      };
    });

    res.json({
      success: true,
      data: {
        sectorKey: sectorModule.key,
        sectorName: sectorModule.name,
        score,
        recommendation: recommendation || null,
        questions: questionResults,
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/assessments/:id/policy-alignment — EU Policy alignment mapping
resultsRoutes.get('/:id/policy-alignment', async (req, res, next) => {
  try {
    const { id } = req.params;

    const assessment = await prisma.assessment.findUnique({
      where: { id },
      include: { domainScores: true },
    });

    if (!assessment) {
      throw new AppError('Assessment not found', 404);
    }

    // Build domain scores map
    const domainScores: Record<string, number> = {};
    for (const ds of assessment.domainScores) {
      if (ds.score > 0) {
        domainScores[ds.domainKey] = ds.score;
      }
    }

    // Calculate alignment for each framework
    const frameworks = POLICY_FRAMEWORKS.map(fw => {
      const alignment = calculateFrameworkAlignment(fw, domainScores);
      return {
        key: fw.key,
        name: fw.name,
        shortName: fw.shortName,
        description: fw.description,
        url: fw.url,
        overallScore: alignment.overallScore,
        objectives: alignment.objectiveScores.map(obj => {
          const fullObj = fw.objectives.find(o => o.id === obj.id);
          return {
            id: obj.id,
            name: obj.name,
            description: fullObj?.description || '',
            score: obj.score,
            domainMappings: fullObj?.domainMappings || [],
          };
        }),
      };
    });

    const topAligned = getTopAlignedObjectives(domainScores, 5);

    res.json({
      success: true,
      data: {
        assessmentId: id,
        frameworks,
        topAligned,
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/assessments/:id/progress — Enhanced progress tracking with auto-narrative
resultsRoutes.get('/:id/progress', async (req, res, next) => {
  try {
    const { id } = req.params;

    const assessment = await prisma.assessment.findUnique({
      where: { id },
      include: { organisation: true, domainScores: true },
    });

    if (!assessment) {
      throw new AppError('Assessment not found', 404);
    }

    // Get all completed assessments for this org
    const allAssessments = await prisma.assessment.findMany({
      where: {
        organisationId: assessment.organisationId,
        status: 'completed',
        domainScores: { some: {} },
      },
      include: { domainScores: true },
      orderBy: { completedAt: 'asc' },
    });

    // Get domain goals
    const goals = await prisma.domainGoal.findMany({
      where: { organisationId: assessment.organisationId },
    });

    // Build timeline per domain
    const domainTimelines: Record<string, { date: string; score: number }[]> = {};
    for (const a of allAssessments) {
      const date = (a.completedAt ?? a.createdAt).toISOString();
      for (const ds of a.domainScores) {
        if (!domainTimelines[ds.domainKey]) domainTimelines[ds.domainKey] = [];
        domainTimelines[ds.domainKey].push({ date, score: ds.score });
      }
    }

    // Build progress narrative per domain
    const domainProgress = DOMAINS.map(domain => {
      const timeline = domainTimelines[domain.key] || [];
      const goal = goals.find(g => g.domainKey === domain.key);
      const latest = timeline[timeline.length - 1];
      const previous = timeline.length > 1 ? timeline[timeline.length - 2] : null;

      let trend: 'improved' | 'declined' | 'unchanged' | 'new' = 'new';
      let delta = 0;
      if (previous && latest) {
        delta = Math.round((latest.score - previous.score) * 100) / 100;
        trend = delta > 0.1 ? 'improved' : delta < -0.1 ? 'declined' : 'unchanged';
      }

      // Auto-narrative
      let narrative = '';
      if (timeline.length === 1) {
        narrative = `First assessment: scored ${latest?.score.toFixed(1) ?? 0}/5 in ${domain.name}.`;
      } else if (trend === 'improved') {
        narrative = `${domain.name} improved by ${delta.toFixed(1)} points since the previous assessment.`;
      } else if (trend === 'declined') {
        narrative = `${domain.name} declined by ${Math.abs(delta).toFixed(1)} points. Consider reviewing recent changes.`;
      } else {
        narrative = `${domain.name} score remained stable at ${latest?.score.toFixed(1) ?? 0}/5.`;
      }

      if (goal) {
        const gap = goal.targetScore - (latest?.score ?? 0);
        if (gap <= 0) {
          narrative += ` Target of ${goal.targetScore.toFixed(1)} has been achieved!`;
        } else {
          narrative += ` ${gap.toFixed(1)} points to reach target of ${goal.targetScore.toFixed(1)}.`;
        }
      }

      return {
        domainKey: domain.key,
        domainName: domain.name,
        color: domain.color,
        currentScore: latest?.score ?? 0,
        previousScore: previous?.score ?? null,
        delta,
        trend,
        goal: goal ? { targetScore: goal.targetScore, targetDate: goal.targetDate?.toISOString() || null, notes: goal.notes } : null,
        narrative,
        timeline,
      };
    });

    // Suggest reassessment if >6 months since last
    const lastCompleted = allAssessments[allAssessments.length - 1];
    const monthsSinceLast = lastCompleted
      ? (Date.now() - new Date(lastCompleted.completedAt ?? lastCompleted.createdAt).getTime()) / (1000 * 60 * 60 * 24 * 30)
      : 0;

    res.json({
      success: true,
      data: {
        assessmentId: id,
        organisationName: assessment.organisation.name,
        totalAssessments: allAssessments.length,
        firstAssessmentDate: allAssessments[0]?.completedAt?.toISOString() || null,
        lastAssessmentDate: lastCompleted?.completedAt?.toISOString() || null,
        suggestReassessment: monthsSinceLast > 6,
        monthsSinceLastAssessment: Math.round(monthsSinceLast),
        domainProgress,
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/assessments/:id/goals — Get domain goals
resultsRoutes.get('/:id/goals', async (req, res, next) => {
  try {
    const { id } = req.params;

    const assessment = await prisma.assessment.findUnique({
      where: { id },
      select: { organisationId: true },
    });

    if (!assessment) {
      throw new AppError('Assessment not found', 404);
    }

    const goals = await prisma.domainGoal.findMany({
      where: { organisationId: assessment.organisationId },
    });

    const goalsMap: Record<string, { targetScore: number; targetDate: string | null; notes: string | null }> = {};
    for (const g of goals) {
      goalsMap[g.domainKey] = {
        targetScore: g.targetScore,
        targetDate: g.targetDate?.toISOString() || null,
        notes: g.notes,
      };
    }

    res.json({ success: true, data: goalsMap });
  } catch (err) {
    next(err);
  }
});

// PUT /api/assessments/:id/goals — Set/update domain goals
resultsRoutes.put('/:id/goals', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { goals } = req.body;

    if (!goals || typeof goals !== 'object') {
      throw new AppError('goals object is required', 400);
    }

    const assessment = await prisma.assessment.findUnique({
      where: { id },
      select: { organisationId: true },
    });

    if (!assessment) {
      throw new AppError('Assessment not found', 404);
    }

    const upserted = await Promise.all(
      Object.entries(goals).map(([domainKey, goalData]: [string, any]) =>
        prisma.domainGoal.upsert({
          where: {
            organisationId_domainKey: {
              organisationId: assessment.organisationId,
              domainKey,
            },
          },
          update: {
            targetScore: goalData.targetScore,
            targetDate: goalData.targetDate ? new Date(goalData.targetDate) : null,
            notes: goalData.notes || null,
          },
          create: {
            organisationId: assessment.organisationId,
            domainKey,
            targetScore: goalData.targetScore,
            targetDate: goalData.targetDate ? new Date(goalData.targetDate) : null,
            notes: goalData.notes || null,
          },
        })
      )
    );

    res.json({ success: true, data: upserted });
  } catch (err) {
    next(err);
  }
});
