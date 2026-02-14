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
