import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { DOMAINS, CASE_STUDY_SECTIONS, SECTOR_MODULES, POLICY_FRAMEWORKS, calculateFrameworkAlignment } from '@wiseshift/shared';
import { AppError } from '../middleware/errorHandler.js';
import * as XLSX from 'xlsx';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, BorderStyle } from 'docx';

export const exportsRoutes = Router();

// Helper to escape CSV values
function escapeCsv(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// GET /api/assessments/:id/export/qualitative?format=csv|xlsx
// Exports narrative responses only, formatted for NVivo or similar qualitative analysis tools
exportsRoutes.get('/:id/export/qualitative', async (req, res, next) => {
  try {
    const { id } = req.params;
    const format = (req.query.format as string) || 'csv';

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

    // Filter to narrative responses only
    const narrativeResponses = assessment.responses.filter(
      (r) => r.questionType === 'narrative' && r.textValue
    );

    // Build rows
    const rows = narrativeResponses.map((r) => {
      const domain = DOMAINS.find((d) => d.key === r.domainKey);
      const question = domain?.questions.find((q) => q.id === r.questionId);
      const domainScore = assessment.domainScores.find(
        (ds) => ds.domainKey === r.domainKey
      );

      return {
        'Organisation': assessment.organisation.name,
        'Country': assessment.organisation.country || '',
        'Sector': assessment.organisation.sector || '',
        'Domain': domain?.name || r.domainKey,
        'Question': question?.text || r.questionId,
        'Response': r.textValue || '',
        'Tags': r.tags ? JSON.parse(r.tags).join('; ') : '',
        'Domain Score': domainScore?.score?.toString() || '',
        'Maturity Level': domainScore?.maturityLevel || '',
        'Date': assessment.completedAt
          ? assessment.completedAt.toISOString().split('T')[0]
          : assessment.createdAt.toISOString().split('T')[0],
      };
    });

    if (format === 'xlsx') {
      const worksheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Qualitative Data');

      // Auto-width columns
      const colWidths = Object.keys(rows[0] || {}).map((key) => ({
        wch: Math.max(
          key.length,
          ...rows.map((r) => String((r as any)[key] || '').length)
        ),
      }));
      worksheet['!cols'] = colWidths;

      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      const filename = `wiseshift-qualitative-${id}.xlsx`;

      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.send(Buffer.from(buffer));
    } else {
      // CSV format
      const headers = Object.keys(rows[0] || {});
      const csvRows = [
        headers.map(escapeCsv).join(','),
        ...rows.map((row) =>
          headers.map((h) => escapeCsv((row as any)[h])).join(',')
        ),
      ];

      const csvContent = csvRows.join('\r\n');
      const filename = `wiseshift-qualitative-${id}.csv`;

      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.send(csvContent);
    }
  } catch (err) {
    next(err);
  }
});

// GET /api/assessments/:id/export/docx
// Exports assessment as a structured Word document
exportsRoutes.get('/:id/export/docx', async (req, res, next) => {
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

    const sections: Paragraph[] = [];

    // Title page
    sections.push(
      new Paragraph({
        text: 'WISEShift Self-Assessment Report',
        heading: HeadingLevel.TITLE,
        spacing: { after: 400 },
      }),
      new Paragraph({
        children: [
          new TextRun({ text: assessment.organisation.name, bold: true, size: 32 }),
        ],
        spacing: { after: 200 },
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: `Date: ${
              assessment.completedAt
                ? assessment.completedAt.toISOString().split('T')[0]
                : new Date().toISOString().split('T')[0]
            }`,
            size: 22,
            color: '666666',
          }),
        ],
        spacing: { after: 200 },
      })
    );

    // Metadata
    const metaFields = [
      { label: 'Country', value: assessment.organisation.country },
      { label: 'Sector', value: assessment.organisation.sector },
      { label: 'Size', value: assessment.organisation.size },
      { label: 'Legal Structure', value: assessment.organisation.legalStructure },
      { label: 'Overall Score', value: assessment.overallScore?.toFixed(1) },
    ].filter((f) => f.value);

    if (metaFields.length > 0) {
      sections.push(
        new Paragraph({
          text: 'Organisation Details',
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 },
        })
      );
      for (const field of metaFields) {
        sections.push(
          new Paragraph({
            children: [
              new TextRun({ text: `${field.label}: `, bold: true }),
              new TextRun({ text: field.value || '' }),
            ],
            spacing: { after: 100 },
          })
        );
      }
    }

    // Per-domain sections
    for (const domain of DOMAINS) {
      const domainResponses = assessment.responses.filter(
        (r) => r.domainKey === domain.key
      );
      if (domainResponses.length === 0) continue;

      const ds = assessment.domainScores.find(
        (s) => s.domainKey === domain.key
      );

      sections.push(
        new Paragraph({
          text: domain.name,
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 100 },
        })
      );

      if (ds) {
        sections.push(
          new Paragraph({
            children: [
              new TextRun({ text: `Score: ${ds.score.toFixed(1)}/5 — `, bold: true }),
              new TextRun({ text: ds.maturityLevel, italics: true }),
            ],
            spacing: { after: 200 },
          })
        );
      }

      for (const response of domainResponses) {
        const question = domain.questions.find((q) => q.id === response.questionId);
        if (!question) continue;

        sections.push(
          new Paragraph({
            children: [
              new TextRun({ text: question.text, bold: true, size: 22 }),
            ],
            spacing: { before: 200, after: 100 },
          })
        );

        if (response.questionType === 'narrative' && response.textValue) {
          sections.push(
            new Paragraph({
              text: response.textValue,
              spacing: { after: 100 },
            })
          );
        } else if (response.numericValue != null) {
          sections.push(
            new Paragraph({
              children: [
                new TextRun({ text: `Response: ${response.numericValue}/5` }),
              ],
              spacing: { after: 100 },
            })
          );
        }
      }
    }

    const doc = new Document({
      sections: [{ children: sections }],
    });

    const buffer = await Packer.toBuffer(doc);
    const filename = `wiseshift-report-${id}.docx`;

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

// ─── Case Study Export ───

// GET /api/assessments/:id/export/case-study?format=docx|json
// Pre-populates a structured case study template from assessment data
exportsRoutes.get('/:id/export/case-study', async (req, res, next) => {
  try {
    const { id } = req.params;
    const format = (req.query.format as string) || 'docx';

    const assessment = await prisma.assessment.findUnique({
      where: { id },
      include: {
        organisation: true,
        responses: true,
        domainScores: true,
        sectorScores: true,
        actionPlans: true,
      },
    });

    if (!assessment) {
      throw new AppError('Assessment not found', 404);
    }

    // Try to get the WISE profile for additional context
    const profile = await prisma.wISEProfile.findUnique({
      where: { organisationId: assessment.organisationId },
    });

    // Build domain score map (full info for display)
    const domainScoreMap: Record<string, { score: number; maturityLevel: string }> = {};
    // Flat score map for policy alignment calculation
    const flatScoreMap: Record<string, number> = {};
    for (const ds of assessment.domainScores) {
      domainScoreMap[ds.domainKey] = { score: ds.score, maturityLevel: ds.maturityLevel };
      flatScoreMap[ds.domainKey] = ds.score;
    }

    // Build narrative map (domainKey → array of {question, text})
    const narrativeMap: Record<string, { question: string; text: string }[]> = {};
    for (const r of assessment.responses) {
      if (r.questionType === 'narrative' && r.textValue) {
        const domain = DOMAINS.find(d => d.key === r.domainKey);
        const question = domain?.questions.find(q => q.id === r.questionId);
        if (!narrativeMap[r.domainKey]) narrativeMap[r.domainKey] = [];
        narrativeMap[r.domainKey].push({
          question: question?.text || r.questionId,
          text: r.textValue,
        });
      }
    }

    // Calculate policy alignment scores
    const policyAlignments: Record<string, { framework: string; score: number; level: string }> = {};
    for (const fw of POLICY_FRAMEWORKS) {
      const result = calculateFrameworkAlignment(fw, flatScoreMap);
      policyAlignments[fw.key] = {
        framework: fw.name,
        score: result.overallScore,
        level: result.overallScore >= 4 ? 'Strong' : result.overallScore >= 3 ? 'Good' : result.overallScore >= 2 ? 'Moderate' : 'Emerging',
      };
    }

    // Build structured case study data
    const caseStudy: Record<string, Record<string, string>> = {};

    for (const section of CASE_STUDY_SECTIONS) {
      caseStudy[section.key] = {};

      for (const prompt of section.prompts) {
        let value = '';

        if (prompt.dataSource) {
          const parts = prompt.dataSource.split('.');

          if (parts[0] === 'organisation') {
            value = (assessment.organisation as any)[parts[1]] || '';
          } else if (parts[0] === 'profile' && profile) {
            const raw = (profile as any)[parts[1]];
            if (Array.isArray(raw)) value = raw.join(', ');
            else if (typeof raw === 'string' && raw.startsWith('[')) {
              try { value = JSON.parse(raw).join(', '); } catch { value = raw; }
            } else {
              value = raw != null ? String(raw) : '';
            }
          } else if (parts[0] === 'domainScores' && parts[1]) {
            const ds = domainScoreMap[parts[1]];
            if (ds) value = `${ds.score.toFixed(1)}/5 — ${ds.maturityLevel}`;
          } else if (parts[0] === 'narratives' && parts[1]) {
            const narrs = narrativeMap[parts[1]];
            if (narrs && narrs.length > 0) {
              value = narrs.map(n => `Q: ${n.question}\nA: ${n.text}`).join('\n\n');
            }
          } else if (parts[0] === 'sectorScores') {
            const scores = assessment.sectorScores;
            if (scores.length > 0) {
              value = scores.map(s => `${s.sectorKey}: ${s.score.toFixed(1)}/5`).join(', ');
            }
          } else if (parts[0] === 'policyAlignment' && parts[1]) {
            const pa = policyAlignments[parts[1]];
            if (pa) value = `${pa.framework}: ${pa.score.toFixed(1)}/5 (${pa.level})`;
          }
        }

        caseStudy[section.key][prompt.key] = value;
      }
    }

    if (format === 'json') {
      const jsonData = {
        exportedAt: new Date().toISOString(),
        caseStudyTemplate: 'WISESHIFT Horizon Europe',
        organisation: assessment.organisation.name,
        assessmentId: assessment.id,
        completedAt: assessment.completedAt?.toISOString() || null,
        overallScore: assessment.overallScore,
        sections: CASE_STUDY_SECTIONS.map(section => ({
          key: section.key,
          title: section.title,
          description: section.description,
          supplementary: section.supplementary || false,
          data: caseStudy[section.key],
        })),
      };

      const filename = `wiseshift-case-study-${id}.json`;
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Type', 'application/json');
      return res.json(jsonData);
    }

    // DOCX format
    const docSections: Paragraph[] = [];

    // Title page
    docSections.push(
      new Paragraph({
        text: 'WISESHIFT Case Study Report',
        heading: HeadingLevel.TITLE,
        spacing: { after: 200 },
      }),
      new Paragraph({
        children: [
          new TextRun({ text: assessment.organisation.name, bold: true, size: 32 }),
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
        spacing: { after: 100 },
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: `Overall Assessment Score: ${assessment.overallScore != null ? assessment.overallScore.toFixed(1) + '/5' : 'N/A'}`,
            size: 22,
            color: '666666',
          }),
        ],
        spacing: { after: 400 },
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: 'This case study template is aligned with the WISESHIFT Horizon Europe project methodology (2025-2029). Sections marked [PRE-POPULATED] have been auto-filled from assessment data. Sections marked [RESEARCHER] require manual completion.',
            italics: true,
            size: 20,
            color: '888888',
          }),
        ],
        spacing: { after: 400 },
      })
    );

    // Sections
    for (const section of CASE_STUDY_SECTIONS) {
      const tag = section.supplementary ? '[RESEARCHER]' : '[PRE-POPULATED]';

      docSections.push(
        new Paragraph({
          text: `${section.title} ${tag}`,
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 100 },
        }),
        new Paragraph({
          children: [
            new TextRun({ text: section.description, italics: true, size: 20, color: '666666' }),
          ],
          spacing: { after: 200 },
        })
      );

      for (const prompt of section.prompts) {
        const value = caseStudy[section.key][prompt.key];

        docSections.push(
          new Paragraph({
            children: [
              new TextRun({ text: prompt.label, bold: true, size: 22 }),
            ],
            spacing: { before: 150, after: 50 },
          })
        );

        if (value) {
          // Split by newlines for multi-line content (narratives)
          const lines = value.split('\n');
          for (const line of lines) {
            docSections.push(
              new Paragraph({
                text: line,
                spacing: { after: 50 },
              })
            );
          }
        } else {
          docSections.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: `[${prompt.hint}]`,
                  italics: true,
                  color: '999999',
                  size: 20,
                }),
              ],
              spacing: { after: 50 },
            })
          );
        }
      }
    }

    const doc = new Document({
      sections: [{ children: docSections }],
    });

    const buffer = await Packer.toBuffer(doc);
    const filename = `wiseshift-case-study-${id}.docx`;

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
