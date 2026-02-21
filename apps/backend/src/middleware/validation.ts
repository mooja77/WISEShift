import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

export function validate(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: result.error.flatten().fieldErrors,
      });
    }
    req.body = result.data;
    next();
  };
}

// Validation schemas
export const createAssessmentSchema = z.object({
  organisation: z.object({
    name: z.string().min(1, 'Organisation name is required'),
    country: z.string().optional(),
    region: z.string().optional(),
    sector: z.string().optional(),
    size: z.string().optional(),
    legalStructure: z.string().optional(),
  }),
});

export const updateResponsesSchema = z.object({
  responses: z.array(z.object({
    domainKey: z.string().min(1),
    questionId: z.string().min(1),
    questionType: z.enum(['likert', 'maturity', 'narrative']),
    numericValue: z.number().min(1).max(5).optional(),
    textValue: z.string().optional(),
    tags: z.array(z.string()).optional(),
    claimedBy: z.string().optional(),
  })),
});

export const dashboardAuthSchema = z.object({
  accessCode: z.string().min(1, 'Access code is required'),
});

export const addCollaboratorSchema = z.object({
  name: z.string().min(1, 'Collaborator name is required'),
  email: z.string().email().optional().or(z.literal('')),
  domains: z.array(z.string().min(1)).min(1, 'At least one domain is required'),
});

// ─── Research Workspace Schemas ───

export const narrativeSearchSchema = z.object({
  search: z.string().optional(),
  domainKeys: z.array(z.string()).optional(),
  countries: z.array(z.string()).optional(),
  sectors: z.array(z.string()).optional(),
  sizes: z.array(z.string()).optional(),
  scoreMin: z.number().min(0).max(5).optional(),
  scoreMax: z.number().min(0).max(5).optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
});

export const createTagSchema = z.object({
  name: z.string().min(1, 'Tag name is required').max(100),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a valid hex colour'),
  description: z.string().max(500).optional(),
});

export const updateTagSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  description: z.string().max(500).optional(),
});

export const createHighlightSchema = z.object({
  responseId: z.string().min(1),
  tagId: z.string().min(1),
  startOffset: z.number().int().min(0),
  endOffset: z.number().int().min(1),
  highlightedText: z.string().min(1),
});

export const upsertNoteSchema = z.object({
  responseId: z.string().min(1),
  text: z.string().min(1).max(5000),
});

export const createQuotePinSchema = z.object({
  responseId: z.string().min(1),
  quoteText: z.string().min(1),
  contextNote: z.string().max(500).optional(),
});

export const reorderQuotesSchema = z.object({
  pinIds: z.array(z.string().min(1)).min(1),
});

// ─── Coding Canvas Schemas ───

export const createCanvasSchema = z.object({
  name: z.string().min(1, 'Canvas name is required').max(200),
  description: z.string().max(1000).optional(),
});

export const updateCanvasSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
});

export const createTranscriptSchema = z.object({
  title: z.string().min(1, 'Transcript title is required').max(200),
  content: z.string().min(1, 'Transcript content is required'),
});

export const updateTranscriptSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().min(1).optional(),
  caseId: z.string().nullable().optional(),
});

export const createCanvasQuestionSchema = z.object({
  text: z.string().min(1, 'Question text is required').max(1000),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
});

export const updateCanvasQuestionSchema = z.object({
  text: z.string().min(1).max(1000).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  parentQuestionId: z.string().nullable().optional(),
});

export const createCanvasMemoSchema = z.object({
  title: z.string().max(200).optional(),
  content: z.string().min(1, 'Memo content is required').max(5000),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
});

export const updateCanvasMemoSchema = z.object({
  title: z.string().max(200).optional(),
  content: z.string().min(1).max(5000).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
});

export const createCodingSchema = z.object({
  transcriptId: z.string().min(1),
  questionId: z.string().min(1),
  startOffset: z.number().int().min(0),
  endOffset: z.number().int().min(1),
  codedText: z.string().min(1),
  note: z.string().max(2000).optional(),
});

export const saveLayoutSchema = z.object({
  positions: z.array(z.object({
    nodeId: z.string().min(1),
    nodeType: z.string().min(1),
    x: z.number(),
    y: z.number(),
    width: z.number().optional(),
    height: z.number().optional(),
  })),
});

export const updateCodingSchema = z.object({
  annotation: z.string().max(5000).nullable().optional(),
});

export const createCaseSchema = z.object({
  name: z.string().min(1, 'Case name is required').max(200),
  attributes: z.record(z.string(), z.string()).optional(),
});

export const updateCaseSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  attributes: z.record(z.string(), z.string()).optional(),
});

export const createRelationSchema = z.object({
  fromType: z.enum(['case', 'question']),
  fromId: z.string().min(1),
  toType: z.enum(['case', 'question']),
  toId: z.string().min(1),
  label: z.string().min(1).max(200),
});

export const createComputedNodeSchema = z.object({
  nodeType: z.enum(['search', 'cooccurrence', 'matrix', 'stats', 'comparison', 'wordcloud', 'cluster']),
  label: z.string().min(1).max(200),
  config: z.record(z.string(), z.unknown()).optional(),
});

export const updateComputedNodeSchema = z.object({
  label: z.string().min(1).max(200).optional(),
  config: z.record(z.string(), z.unknown()).optional(),
});

export const autoCodeSchema = z.object({
  questionId: z.string().min(1),
  pattern: z.string().min(1).max(500),
  mode: z.enum(['keyword', 'regex']),
  transcriptIds: z.array(z.string().min(1)).optional(),
});

// ─── Admin Bulk Import Schemas ───

const importOrgSchema = z.object({
  name: z.string().min(1, 'Organisation name is required'),
  country: z.string().min(1, 'Country is required'),
  region: z.string().optional(),
  sector: z.string().optional(),
  size: z.string().optional(),
  legalStructure: z.string().optional(),
});

const importResponseSchema = z.object({
  questionId: z.string().min(1),
  numericValue: z.number().int().min(1).max(5).optional(),
  textValue: z.string().optional(),
});

const VALID_DOMAIN_KEYS = [
  'governance', 'social-mission', 'employment', 'culture', 'economic',
  'stakeholders', 'support', 'impact-measurement', 'environmental-sustainability',
] as const;

const domainScoresSchema = z.record(
  z.enum(VALID_DOMAIN_KEYS),
  z.number().min(0).max(5),
);

const bulkImportFullSchema = z.object({
  format: z.literal('full'),
  dryRun: z.boolean().optional().default(false),
  assessments: z.array(z.object({
    organisation: importOrgSchema,
    responses: z.array(importResponseSchema).min(1, 'At least one response is required'),
  })).min(1).max(500),
});

const bulkImportSimplifiedSchema = z.object({
  format: z.literal('simplified'),
  dryRun: z.boolean().optional().default(false),
  assessments: z.array(z.object({
    organisation: importOrgSchema,
    domainScores: domainScoresSchema,
  })).min(1).max(500),
});

export const bulkImportSchema = z.discriminatedUnion('format', [
  bulkImportFullSchema,
  bulkImportSimplifiedSchema,
]);
