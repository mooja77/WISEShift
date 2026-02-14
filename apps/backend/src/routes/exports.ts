import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { DOMAINS } from '@wiseshift/shared';
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
