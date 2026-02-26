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

export function validateQuery(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid query parameters',
        details: result.error.flatten().fieldErrors,
      });
    }
    req.query = result.data;
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
  assessmentId: z.string().optional(),
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
  parentId: z.string().optional(),
});

export const updateTagSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  description: z.string().max(500).optional(),
  parentId: z.string().nullable().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export const reorderTagsSchema = z.object({
  items: z.array(z.object({
    tagId: z.string().min(1),
    parentId: z.string().nullable(),
    sortOrder: z.number().int().min(0),
  })),
});

export const mergeTagsSchema = z.object({
  sourceTagIds: z.array(z.string().min(1)).min(2, 'Select at least 2 themes to combine'),
  targetName: z.string().min(1).max(100),
  targetColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  targetDescription: z.string().max(500).optional(),
});

export const splitTagSchema = z.object({
  sourceTagId: z.string().min(1),
  newTags: z.array(z.object({
    name: z.string().min(1).max(100),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
    highlightIds: z.array(z.string().min(1)).min(1),
  })).min(2, 'Split into at least 2 themes'),
});

export const inVivoCodingSchema = z.object({
  responseId: z.string().min(1),
  startOffset: z.number().int().min(0),
  endOffset: z.number().int().min(1),
  highlightedText: z.string().min(1).max(500),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  parentId: z.string().optional(),
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

// Boolean / Compound Query schemas
const queryNodeSchema: z.ZodSchema = z.lazy(() =>
  z.union([
    z.object({ tagId: z.string().min(1) }),
    z.object({
      operator: z.enum(['AND', 'OR', 'NOT']),
      operands: z.array(queryNodeSchema).min(1).max(10),
    }),
  ])
);

export const executeQuerySchema = z.object({
  query: queryNodeSchema,
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
});

export const saveQuerySchema = z.object({
  name: z.string().min(1).max(200),
  query: queryNodeSchema,
});

// Canvas schemas removed — now in standalone Canvas App

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

// ─── Query Parameter Schemas ───

const isoDateString = z.string().regex(/^\d{4}-\d{2}-\d{2}/, 'Must be an ISO date string').optional();
const paginationPage = z.coerce.number().int().min(1).default(1);
const paginationLimit = z.coerce.number().int().min(1).max(500).default(100);
const exportFormat = z.enum(['json', 'csv']).default('json');

export const exportFormatQuerySchema = z.object({
  format: z.enum(['csv', 'xlsx']).default('csv'),
}).passthrough();

export const caseStudyFormatQuerySchema = z.object({
  format: z.enum(['docx', 'json']).default('docx'),
}).passthrough();

export const auditLogQuerySchema = z.object({
  startDate: isoDateString,
  endDate: isoDateString,
  action: z.string().max(100).optional(),
  resource: z.string().max(100).optional(),
  actorType: z.string().max(50).optional(),
  actorId: z.string().max(100).optional(),
  page: paginationPage,
  limit: paginationLimit,
  format: exportFormat,
});

export const consentRecordsQuerySchema = z.object({
  subjectType: z.string().max(50).optional(),
  since: isoDateString,
  format: exportFormat,
});

export const researcherAccessQuerySchema = z.object({
  researcherId: z.string().max(100).optional(),
  startDate: isoDateString,
  endDate: isoDateString,
  page: paginationPage,
  limit: paginationLimit,
});

export const researcherListQuerySchema = z.object({
  accessLevel: z.enum(['public', 'registered', 'approved']).optional(),
  verified: z.enum(['true', 'false']).optional(),
});

export const publicFormatQuerySchema = z.object({
  format: z.enum(['json', 'csv']).optional(),
});

export const registryListQuerySchema = z.object({
  country: z.string().max(100).optional(),
  sector: z.string().max(100).optional(),
  maturityLevel: z.string().max(50).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const narrativesQuerySchema = z.object({
  ids: z.string().max(2000).optional(),
  assessmentId: z.string().max(100).optional(),
});

export const researcherQuerySchema = z.object({
  country: z.string().max(100).optional(),
  sector: z.string().max(100).optional(),
  size: z.string().max(50).optional(),
  minScore: z.coerce.number().min(0).max(5).optional(),
  maxScore: z.coerce.number().min(0).max(5).optional(),
  dateFrom: isoDateString,
  dateTo: isoDateString,
  domainKey: z.string().max(50).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
