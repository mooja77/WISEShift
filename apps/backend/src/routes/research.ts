import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { DOMAINS, DEFAULT_RESEARCH_TAGS } from '@wiseshift/shared';
import { AppError } from '../middleware/errorHandler.js';
import {
  validate,
  narrativeSearchSchema,
  createTagSchema,
  updateTagSchema,
  createHighlightSchema,
  upsertNoteSchema,
  createQuotePinSchema,
  reorderQuotesSchema,
} from '../middleware/validation.js';
import { Document, Packer, Table, TableRow, TableCell, Paragraph, TextRun, WidthType, HeadingLevel } from 'docx';

export const researchRoutes = Router();

// Helper: format a raw value into readable text
function formatValue(val: string): string {
  // Replace underscores with spaces, capitalise first letter of each word
  return val
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

// Common ISO country codes → full names
const COUNTRY_NAMES: Record<string, string> = {
  FR: 'France', DE: 'Germany', ES: 'Spain', IT: 'Italy', PT: 'Portugal',
  BE: 'Belgium', NL: 'Netherlands', AT: 'Austria', IE: 'Ireland', SE: 'Sweden',
  FI: 'Finland', DK: 'Denmark', PL: 'Poland', CZ: 'Czechia', RO: 'Romania',
  BG: 'Bulgaria', HR: 'Croatia', GR: 'Greece', HU: 'Hungary', SK: 'Slovakia',
  SI: 'Slovenia', LT: 'Lithuania', LV: 'Latvia', EE: 'Estonia', CY: 'Cyprus',
  LU: 'Luxembourg', MT: 'Malta', UK: 'United Kingdom', AU: 'Australia',
  US: 'United States', CA: 'Canada', NZ: 'New Zealand',
};

// Helper: format size labels
function formatSize(size: string): string {
  const s = size.toLowerCase();
  if (s === 'micro' || s === '1-10') return '1-10';
  if (s === 'small' || s === '11-50') return '11-50';
  if (s === 'medium' || s === '51-200') return '51-200';
  if (s === 'large' || s === '201-500') return '201-500';
  if (s === 'very_large' || s === '500+') return '500+';
  return formatValue(size);
}

// Helper: build anonymised context string from organisation data
function anonymiseOrg(org: { size?: string | null; country?: string | null; legalStructure?: string | null; sector?: string | null }): string {
  const parts: string[] = [];
  if (org.size) parts.push(formatSize(org.size));
  if (org.country) {
    const upper = org.country.toUpperCase();
    parts.push(COUNTRY_NAMES[upper] || formatValue(org.country));
  }
  if (org.legalStructure) {
    // Short strings (<=5 chars) are likely acronyms — uppercase them
    const ls = org.legalStructure;
    parts.push(ls.length <= 5 ? ls.toUpperCase() : ls);
  }
  if (org.sector) parts.push(`in ${formatValue(org.sector)}`);
  return parts.length > 0 ? parts.join(' ') : 'Organisation';
}

// Legacy domain key mapping (old seeded data used full underscored names)
const LEGACY_DOMAIN_MAP: Record<string, string> = {
  governance_democracy: 'governance',
  social_mission_impact: 'social-mission',
  employment_pathways: 'employment',
  organisational_culture: 'culture',
  economic_sustainability: 'economic',
  stakeholder_engagement: 'stakeholders',
  support_infrastructure: 'support',
  impact_measurement_learning: 'impact-measurement',
};

// Helper: find domain by key (handles legacy underscore keys and hyphen variants)
function findDomain(key: string) {
  const mapped = LEGACY_DOMAIN_MAP[key];
  if (mapped) return DOMAINS.find(d => d.key === mapped);
  return DOMAINS.find(d => d.key === key) || DOMAINS.find(d => d.key === key.replace(/_/g, '-'));
}

// Helper: get domain name from key
function domainName(key: string): string {
  return findDomain(key)?.name || formatValue(key);
}

// Question ID prefix for each domain key
const DOMAIN_Q_PREFIX: Record<string, string> = {
  governance: 'gov', 'social-mission': 'sm', employment: 'emp',
  culture: 'cul', economic: 'eco', stakeholders: 'stk',
  support: 'sup', 'impact-measurement': 'im',
};

// Helper: get question text
function questionText(domainKey: string, questionId: string): string {
  const domain = findDomain(domainKey);
  if (!domain) return formatValue(questionId.replace(/_/g, ' '));
  // Try exact match first
  const exact = domain.questions.find(q => q.id === questionId);
  if (exact) return exact.text;
  // Legacy IDs like "social_mission_impact_q4" → extract qN suffix → map to "sm-q4"
  const qMatch = questionId.match(/_q(\d+)$/);
  if (qMatch) {
    const prefix = DOMAIN_Q_PREFIX[domain.key];
    if (prefix) {
      const mapped = domain.questions.find(q => q.id === `${prefix}-q${qMatch[1]}`);
      if (mapped) return mapped.text;
    }
  }
  return formatValue(questionId.replace(/_/g, ' '));
}

// Helper to escape CSV values
function escapeCsv(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// ═══════════════════════════════════════════════════════════════
// PHASE A: Narrative Explorer
// ═══════════════════════════════════════════════════════════════

// POST /api/research/narratives/search
researchRoutes.post('/narratives/search', validate(narrativeSearchSchema), async (req, res, next) => {
  try {
    const dashboardAccessId = (req as any).dashboardAccessId;
    const { search, domainKeys, countries, sectors, sizes, scoreMin, scoreMax, page, pageSize } = req.body;

    // Build where clause for responses
    const where: any = {
      questionType: 'narrative',
      textValue: { not: null },
      assessment: { status: 'completed' },
    };

    if (search) {
      where.textValue = { contains: search };
    }

    if (domainKeys && domainKeys.length > 0) {
      where.domainKey = { in: domainKeys };
    }

    if (countries && countries.length > 0) {
      where.assessment = { ...where.assessment, organisation: { ...((where.assessment as any)?.organisation || {}), country: { in: countries } } };
    }
    if (sectors && sectors.length > 0) {
      where.assessment = {
        ...where.assessment,
        organisation: { ...((where.assessment as any)?.organisation || {}), sector: { in: sectors } },
      };
    }
    if (sizes && sizes.length > 0) {
      where.assessment = {
        ...where.assessment,
        organisation: { ...((where.assessment as any)?.organisation || {}), size: { in: sizes } },
      };
    }

    // Build organisation filter incrementally
    const orgFilter: any = {};
    if (countries?.length) orgFilter.country = { in: countries };
    if (sectors?.length) orgFilter.sector = { in: sectors };
    if (sizes?.length) orgFilter.size = { in: sizes };

    const assessmentFilter: any = { status: 'completed' };
    if (Object.keys(orgFilter).length > 0) {
      assessmentFilter.organisation = orgFilter;
    }

    const responseWhere: any = {
      questionType: 'narrative',
      textValue: { not: null },
      assessment: assessmentFilter,
    };

    if (search) {
      responseWhere.textValue = { contains: search };
    }
    if (domainKeys?.length) {
      responseWhere.domainKey = { in: domainKeys };
    }

    // Score filter: need to check domainScores
    // We'll do this as a post-filter if scoreMin/scoreMax are set

    const total = await prisma.response.count({ where: responseWhere });

    const responses = await prisma.response.findMany({
      where: responseWhere,
      include: {
        assessment: {
          include: {
            organisation: true,
            domainScores: true,
          },
        },
      },
      skip: (page - 1) * pageSize,
      take: pageSize + 50, // fetch extra for score filtering
      orderBy: { createdAt: 'desc' },
    });

    // Get highlight/note counts for this researcher
    const responseIds = responses.map(r => r.id);
    const [highlightCounts, existingNotes] = await Promise.all([
      prisma.textHighlight.groupBy({
        by: ['responseId'],
        where: { dashboardAccessId, responseId: { in: responseIds } },
        _count: true,
      }),
      prisma.researchNote.findMany({
        where: { dashboardAccessId, responseId: { in: responseIds } },
        select: { responseId: true },
      }),
    ]);

    const highlightMap = new Map(highlightCounts.map(h => [h.responseId, h._count]));
    const noteSet = new Set(existingNotes.map(n => n.responseId));

    // Build results with score filtering
    let results = responses.map(r => {
      const canonicalKey = findDomain(r.domainKey)?.key;
      const ds = r.assessment.domainScores.find(s => s.domainKey === r.domainKey)
        || (canonicalKey ? r.assessment.domainScores.find(s => s.domainKey === canonicalKey) : undefined)
        || r.assessment.domainScores.find(s => s.domainKey === r.domainKey.replace(/_/g, '-'))
        || r.assessment.domainScores.find(s => s.domainKey === r.domainKey.replace(/-/g, '_'));
      const score = (ds && ds.score > 0) ? ds.score : null;
      return {
        responseId: r.id,
        questionText: questionText(r.domainKey, r.questionId),
        textValue: r.textValue || '',
        domainKey: r.domainKey,
        domainName: domainName(r.domainKey),
        domainScore: score,
        anonymisedContext: anonymiseOrg(r.assessment.organisation),
        highlightCount: highlightMap.get(r.id) || 0,
        noteExists: noteSet.has(r.id),
      };
    });

    // Apply score filter
    if (scoreMin !== undefined || scoreMax !== undefined) {
      results = results.filter(r => {
        if (r.domainScore === null) return false;
        if (scoreMin !== undefined && r.domainScore < scoreMin) return false;
        if (scoreMax !== undefined && r.domainScore > scoreMax) return false;
        return true;
      });
    }

    // Domain counts (for display) — normalise keys to canonical DOMAINS keys
    const domainCounts: Record<string, number> = {};
    const allForCounts = await prisma.response.findMany({
      where: responseWhere,
      select: { domainKey: true },
    });
    for (const r of allForCounts) {
      const canonical = findDomain(r.domainKey)?.key || r.domainKey;
      domainCounts[canonical] = (domainCounts[canonical] || 0) + 1;
    }

    // Trim to pageSize
    results = results.slice(0, pageSize);

    res.json({
      success: true,
      data: {
        results,
        total,
        page,
        pageSize,
        domainCounts,
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/research/narratives/filter-options
researchRoutes.get('/narratives/filter-options', async (_req, res, next) => {
  try {
    const orgs = await prisma.organisation.findMany({
      where: {
        assessments: { some: { status: 'completed' } },
      },
      select: { country: true, sector: true, size: true },
    });

    const countries = [...new Set(orgs.map(o => o.country).filter(Boolean))] as string[];
    const sectors = [...new Set(orgs.map(o => o.sector).filter(Boolean))] as string[];
    const sizes = [...new Set(orgs.map(o => o.size).filter(Boolean))] as string[];

    res.json({
      success: true,
      data: { countries: countries.sort(), sectors: sectors.sort(), sizes: sizes.sort() },
    });
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════════════════════════
// PHASE B: Tags, Highlights, Notes
// ═══════════════════════════════════════════════════════════════

// GET /api/research/tags
researchRoutes.get('/tags', async (req, res, next) => {
  try {
    const dashboardAccessId = (req as any).dashboardAccessId;
    const tags = await prisma.researchTag.findMany({
      where: { dashboardAccessId },
      orderBy: { createdAt: 'asc' },
    });
    res.json({ success: true, data: tags });
  } catch (err) {
    next(err);
  }
});

// POST /api/research/tags
researchRoutes.post('/tags', validate(createTagSchema), async (req, res, next) => {
  try {
    const dashboardAccessId = (req as any).dashboardAccessId;
    const { name, color, description } = req.body;

    const tag = await prisma.researchTag.create({
      data: { dashboardAccessId, name, color, description },
    });
    res.status(201).json({ success: true, data: tag });
  } catch (err: any) {
    if (err.code === 'P2002') {
      return next(new AppError('A tag with that name already exists', 409));
    }
    next(err);
  }
});

// PUT /api/research/tags/:id
researchRoutes.put('/tags/:id', validate(updateTagSchema), async (req, res, next) => {
  try {
    const dashboardAccessId = (req as any).dashboardAccessId;
    const { id } = req.params;
    const { name, color, description } = req.body;

    const existing = await prisma.researchTag.findFirst({
      where: { id, dashboardAccessId },
    });
    if (!existing) throw new AppError('Tag not found', 404);

    const tag = await prisma.researchTag.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(color !== undefined && { color }),
        ...(description !== undefined && { description }),
      },
    });
    res.json({ success: true, data: tag });
  } catch (err: any) {
    if (err.code === 'P2002') {
      return next(new AppError('A tag with that name already exists', 409));
    }
    next(err);
  }
});

// DELETE /api/research/tags/:id
researchRoutes.delete('/tags/:id', async (req, res, next) => {
  try {
    const dashboardAccessId = (req as any).dashboardAccessId;
    const { id } = req.params;

    const existing = await prisma.researchTag.findFirst({
      where: { id, dashboardAccessId },
    });
    if (!existing) throw new AppError('Tag not found', 404);

    await prisma.researchTag.delete({ where: { id } });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// POST /api/research/tags/seed-defaults
researchRoutes.post('/tags/seed-defaults', async (req, res, next) => {
  try {
    const dashboardAccessId = (req as any).dashboardAccessId;

    const created = [];
    for (const def of DEFAULT_RESEARCH_TAGS) {
      try {
        const tag = await prisma.researchTag.create({
          data: {
            dashboardAccessId,
            name: def.name,
            color: def.color,
            description: def.description,
            isDefault: true,
          },
        });
        created.push(tag);
      } catch (e: any) {
        // Skip duplicates (P2002)
        if (e.code !== 'P2002') throw e;
      }
    }

    res.status(201).json({ success: true, data: created });
  } catch (err) {
    next(err);
  }
});

// POST /api/research/highlights/batch — get highlights for multiple responses at once
researchRoutes.post('/highlights/batch', async (req, res, next) => {
  try {
    const dashboardAccessId = (req as any).dashboardAccessId;
    const { responseIds } = req.body;

    if (!Array.isArray(responseIds) || responseIds.length === 0) {
      return res.json({ success: true, data: {} });
    }

    const highlights = await prisma.textHighlight.findMany({
      where: { dashboardAccessId, responseId: { in: responseIds } },
      include: { tag: true },
      orderBy: { startOffset: 'asc' },
    });

    // Group by responseId
    const grouped: Record<string, typeof highlights> = {};
    for (const id of responseIds) {
      grouped[id] = [];
    }
    for (const h of highlights) {
      if (!grouped[h.responseId]) grouped[h.responseId] = [];
      grouped[h.responseId].push(h);
    }

    res.json({ success: true, data: grouped });
  } catch (err) {
    next(err);
  }
});

// GET /api/research/highlights/:responseId
researchRoutes.get('/highlights/:responseId', async (req, res, next) => {
  try {
    const dashboardAccessId = (req as any).dashboardAccessId;
    const { responseId } = req.params;

    const highlights = await prisma.textHighlight.findMany({
      where: { dashboardAccessId, responseId },
      include: { tag: true },
      orderBy: { startOffset: 'asc' },
    });
    res.json({ success: true, data: highlights });
  } catch (err) {
    next(err);
  }
});

// POST /api/research/highlights
researchRoutes.post('/highlights', validate(createHighlightSchema), async (req, res, next) => {
  try {
    const dashboardAccessId = (req as any).dashboardAccessId;
    const { responseId, tagId, startOffset, endOffset, highlightedText } = req.body;

    // Verify tag belongs to this researcher
    const tag = await prisma.researchTag.findFirst({
      where: { id: tagId, dashboardAccessId },
    });
    if (!tag) throw new AppError('Tag not found', 404);

    const highlight = await prisma.textHighlight.create({
      data: { dashboardAccessId, responseId, tagId, startOffset, endOffset, highlightedText },
      include: { tag: true },
    });
    res.status(201).json({ success: true, data: highlight });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/research/highlights/:id
researchRoutes.delete('/highlights/:id', async (req, res, next) => {
  try {
    const dashboardAccessId = (req as any).dashboardAccessId;
    const { id } = req.params;

    const existing = await prisma.textHighlight.findFirst({
      where: { id, dashboardAccessId },
    });
    if (!existing) throw new AppError('Highlight not found', 404);

    await prisma.textHighlight.delete({ where: { id } });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// GET /api/research/notes
researchRoutes.get('/notes', async (req, res, next) => {
  try {
    const dashboardAccessId = (req as any).dashboardAccessId;
    const notes = await prisma.researchNote.findMany({
      where: { dashboardAccessId },
      orderBy: { updatedAt: 'desc' },
    });
    res.json({ success: true, data: notes });
  } catch (err) {
    next(err);
  }
});

// GET /api/research/notes/:responseId
researchRoutes.get('/notes/:responseId', async (req, res, next) => {
  try {
    const dashboardAccessId = (req as any).dashboardAccessId;
    const { responseId } = req.params;

    const note = await prisma.researchNote.findUnique({
      where: { dashboardAccessId_responseId: { dashboardAccessId, responseId } },
    });
    res.json({ success: true, data: note });
  } catch (err) {
    next(err);
  }
});

// PUT /api/research/notes
researchRoutes.put('/notes', validate(upsertNoteSchema), async (req, res, next) => {
  try {
    const dashboardAccessId = (req as any).dashboardAccessId;
    const { responseId, text } = req.body;

    const note = await prisma.researchNote.upsert({
      where: { dashboardAccessId_responseId: { dashboardAccessId, responseId } },
      update: { text },
      create: { dashboardAccessId, responseId, text },
    });
    res.json({ success: true, data: note });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/research/notes/:responseId
researchRoutes.delete('/notes/:responseId', async (req, res, next) => {
  try {
    const dashboardAccessId = (req as any).dashboardAccessId;
    const { responseId } = req.params;

    await prisma.researchNote.deleteMany({
      where: { dashboardAccessId, responseId },
    });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════════════════════════
// PHASE C: Heatmap, Quotes, Export
// ═══════════════════════════════════════════════════════════════

// GET /api/research/heatmap
researchRoutes.get('/heatmap', async (req, res, next) => {
  try {
    const dashboardAccessId = (req as any).dashboardAccessId;

    const highlights = await prisma.textHighlight.findMany({
      where: { dashboardAccessId },
      include: {
        tag: true,
        response: { select: { domainKey: true } },
      },
    });

    const tags = await prisma.researchTag.findMany({
      where: { dashboardAccessId },
      select: { id: true, name: true, color: true },
    });

    // Count highlights per tag x domain
    const countMap = new Map<string, number>();
    for (const h of highlights) {
      const key = `${h.tagId}|${h.response.domainKey}`;
      countMap.set(key, (countMap.get(key) || 0) + 1);
    }

    let maxCount = 0;
    const cells = [];
    for (const tag of tags) {
      for (const domain of DOMAINS) {
        const count = countMap.get(`${tag.id}|${domain.key}`) || 0;
        if (count > maxCount) maxCount = count;
        cells.push({
          tagId: tag.id,
          tagName: tag.name,
          tagColor: tag.color,
          domainKey: domain.key,
          domainName: domain.name,
          count,
        });
      }
    }

    const domains = DOMAINS.map(d => ({ key: d.key, name: d.name }));

    res.json({
      success: true,
      data: { cells, tags, domains, maxCount },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/research/heatmap/drilldown?tagId=...&domainKey=...
researchRoutes.get('/heatmap/drilldown', async (req, res, next) => {
  try {
    const dashboardAccessId = (req as any).dashboardAccessId;
    const { tagId, domainKey } = req.query;

    if (!tagId || !domainKey) {
      throw new AppError('tagId and domainKey are required', 400);
    }

    const highlights = await prisma.textHighlight.findMany({
      where: {
        dashboardAccessId,
        tagId: tagId as string,
        response: { domainKey: domainKey as string },
      },
      include: {
        response: {
          include: {
            assessment: {
              include: {
                organisation: true,
                domainScores: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const results = highlights.map(h => {
      const ds = h.response.assessment.domainScores.find(s => s.domainKey === h.response.domainKey);
      return {
        highlightId: h.id,
        highlightedText: h.highlightedText,
        responseId: h.responseId,
        fullText: h.response.textValue || '',
        questionText: questionText(h.response.domainKey, h.response.questionId),
        anonymisedContext: anonymiseOrg(h.response.assessment.organisation),
        domainScore: ds?.score ?? null,
      };
    });

    res.json({ success: true, data: results });
  } catch (err) {
    next(err);
  }
});

// GET /api/research/quotes
researchRoutes.get('/quotes', async (req, res, next) => {
  try {
    const dashboardAccessId = (req as any).dashboardAccessId;

    const pins = await prisma.quotePin.findMany({
      where: { dashboardAccessId },
      include: {
        response: {
          include: {
            assessment: {
              include: {
                organisation: true,
                domainScores: true,
              },
            },
          },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });

    const data = pins.map(p => {
      const ds = p.response.assessment.domainScores.find(s => s.domainKey === p.response.domainKey);
      return {
        id: p.id,
        dashboardAccessId: p.dashboardAccessId,
        responseId: p.responseId,
        quoteText: p.quoteText,
        contextNote: p.contextNote,
        sortOrder: p.sortOrder,
        createdAt: p.createdAt.toISOString(),
        domainKey: p.response.domainKey,
        domainName: domainName(p.response.domainKey),
        domainScore: ds?.score ?? null,
        anonymisedContext: anonymiseOrg(p.response.assessment.organisation),
      };
    });

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

// POST /api/research/quotes
researchRoutes.post('/quotes', validate(createQuotePinSchema), async (req, res, next) => {
  try {
    const dashboardAccessId = (req as any).dashboardAccessId;
    const { responseId, quoteText, contextNote } = req.body;

    // Get max sortOrder
    const last = await prisma.quotePin.findFirst({
      where: { dashboardAccessId },
      orderBy: { sortOrder: 'desc' },
    });
    const sortOrder = (last?.sortOrder ?? -1) + 1;

    const pin = await prisma.quotePin.create({
      data: { dashboardAccessId, responseId, quoteText, contextNote, sortOrder },
    });
    res.status(201).json({ success: true, data: pin });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/research/quotes/:id
researchRoutes.delete('/quotes/:id', async (req, res, next) => {
  try {
    const dashboardAccessId = (req as any).dashboardAccessId;
    const { id } = req.params;

    const existing = await prisma.quotePin.findFirst({
      where: { id, dashboardAccessId },
    });
    if (!existing) throw new AppError('Quote pin not found', 404);

    await prisma.quotePin.delete({ where: { id } });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// PUT /api/research/quotes/reorder
researchRoutes.put('/quotes/reorder', validate(reorderQuotesSchema), async (req, res, next) => {
  try {
    const dashboardAccessId = (req as any).dashboardAccessId;
    const { pinIds } = req.body;

    // Update sortOrder for each pin
    await prisma.$transaction(
      pinIds.map((id: string, index: number) =>
        prisma.quotePin.updateMany({
          where: { id, dashboardAccessId },
          data: { sortOrder: index },
        })
      )
    );

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// GET /api/research/quotes/export/docx
researchRoutes.get('/quotes/export/docx', async (req, res, next) => {
  try {
    const dashboardAccessId = (req as any).dashboardAccessId;

    const pins = await prisma.quotePin.findMany({
      where: { dashboardAccessId },
      include: {
        response: {
          include: {
            assessment: {
              include: {
                organisation: true,
                domainScores: true,
              },
            },
          },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });

    if (pins.length === 0) {
      throw new AppError('No pinned quotes to export', 404);
    }

    // Build table rows
    const headerRow = new TableRow({
      children: ['Quote', 'Context', 'Domain', 'Score'].map(text =>
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text, bold: true })] })],
          width: { size: 25, type: WidthType.PERCENTAGE },
        })
      ),
    });

    const dataRows = pins.map(p => {
      const ds = p.response.assessment.domainScores.find(s => s.domainKey === p.response.domainKey);
      return new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ text: p.quoteText })], width: { size: 40, type: WidthType.PERCENTAGE } }),
          new TableCell({ children: [new Paragraph({ text: anonymiseOrg(p.response.assessment.organisation) })], width: { size: 25, type: WidthType.PERCENTAGE } }),
          new TableCell({ children: [new Paragraph({ text: domainName(p.response.domainKey) })], width: { size: 20, type: WidthType.PERCENTAGE } }),
          new TableCell({ children: [new Paragraph({ text: ds ? `${ds.score.toFixed(1)}/5` : 'N/A' })], width: { size: 15, type: WidthType.PERCENTAGE } }),
        ],
      });
    });

    const doc = new Document({
      sections: [{
        children: [
          new Paragraph({ text: 'Research Quotes', heading: HeadingLevel.TITLE, spacing: { after: 400 } }),
          new Paragraph({
            children: [new TextRun({ text: `Exported ${new Date().toISOString().split('T')[0]} — ${pins.length} quotes`, color: '666666', size: 20 })],
            spacing: { after: 300 },
          }),
          new Table({ rows: [headerRow, ...dataRows], width: { size: 100, type: WidthType.PERCENTAGE } }),
        ],
      }],
    });

    const buffer = await Packer.toBuffer(doc);
    res.setHeader('Content-Disposition', 'attachment; filename="research-quotes.docx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.send(Buffer.from(buffer));
  } catch (err) {
    next(err);
  }
});

// GET /api/research/export/codebook
researchRoutes.get('/export/codebook', async (req, res, next) => {
  try {
    const dashboardAccessId = (req as any).dashboardAccessId;

    const tags = await prisma.researchTag.findMany({
      where: { dashboardAccessId },
      include: {
        highlights: {
          include: {
            response: { select: { domainKey: true } },
          },
        },
      },
    });

    const rows = tags.map(tag => {
      const domainSet = new Set(tag.highlights.map(h => h.response.domainKey));
      const domainsUsed = [...domainSet].map(k => domainName(k)).join('; ');
      const exampleQuotes = tag.highlights
        .slice(0, 3)
        .map(h => h.highlightedText.substring(0, 100))
        .join(' | ');

      return {
        'Tag Name': tag.name,
        'Colour': tag.color,
        'Description': tag.description || '',
        'Highlight Count': tag.highlights.length,
        'Domains Where Used': domainsUsed,
        'Example Quotes': exampleQuotes,
      };
    });

    const headers = ['Tag Name', 'Colour', 'Description', 'Highlight Count', 'Domains Where Used', 'Example Quotes'];
    const csvLines = [
      headers.map(escapeCsv).join(','),
      ...rows.map(row => headers.map(h => escapeCsv((row as any)[h])).join(',')),
    ];

    res.setHeader('Content-Disposition', 'attachment; filename="research-codebook.csv"');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.send(csvLines.join('\r\n'));
  } catch (err) {
    next(err);
  }
});

// ─── Phase 4A: Cross-Case Comparison ───

// GET /api/research/assessments — List all completed assessments (anonymised)
researchRoutes.get('/assessments', async (req, res, next) => {
  try {
    const assessments = await prisma.assessment.findMany({
      where: {
        status: 'completed',
        domainScores: { some: {} },
      },
      include: {
        organisation: {
          select: { country: true, sector: true, size: true, legalStructure: true },
        },
        domainScores: true,
      },
      orderBy: { completedAt: 'desc' },
    });

    const data = assessments.map((a, idx) => {
      const domainScores: Record<string, { score: number; maturityLevel: string }> = {};
      for (const ds of a.domainScores) {
        domainScores[ds.domainKey] = { score: ds.score, maturityLevel: ds.maturityLevel };
      }

      return {
        assessmentId: a.id,
        label: `Case ${idx + 1}`,
        overallScore: a.overallScore ?? 0,
        completedAt: (a.completedAt ?? a.createdAt).toISOString(),
        country: a.organisation.country ?? 'Unknown',
        sector: a.organisation.sector ?? 'Unknown',
        size: a.organisation.size ?? 'Unknown',
        legalStructure: a.organisation.legalStructure ?? 'Unknown',
        domainScores,
      };
    });

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

// POST /api/research/compare — Compare 2-5 selected assessments
researchRoutes.post('/compare', async (req, res, next) => {
  try {
    const { assessmentIds } = req.body;
    if (!Array.isArray(assessmentIds) || assessmentIds.length < 2 || assessmentIds.length > 5) {
      throw new AppError('Select 2-5 assessments to compare', 400);
    }

    const assessments = await prisma.assessment.findMany({
      where: { id: { in: assessmentIds }, status: 'completed' },
      include: {
        organisation: {
          select: { country: true, sector: true, size: true },
        },
        domainScores: true,
        responses: {
          where: { questionType: 'narrative', textValue: { not: '' } },
          select: { domainKey: true, questionId: true, textValue: true },
        },
      },
    });

    const data = assessments.map((a, idx) => {
      const contextParts: string[] = [];
      if (a.organisation.size) contextParts.push(a.organisation.size);
      if (a.organisation.country) contextParts.push(a.organisation.country);
      if (a.organisation.sector) contextParts.push(a.organisation.sector);

      return {
        label: `Case ${idx + 1}`,
        assessmentId: a.id,
        context: contextParts.join(' · ') || 'European WISE',
        overallScore: a.overallScore ?? 0,
        domainScores: DOMAINS.map(d => {
          const ds = a.domainScores.find(s => s.domainKey === d.key);
          return {
            domainKey: d.key,
            domainName: d.name,
            score: ds?.score ?? 0,
            maturityLevel: ds?.maturityLevel ?? 'Not assessed',
          };
        }),
        qualitativeResponses: DOMAINS.map(d => ({
          domainKey: d.key,
          domainName: d.name,
          narratives: a.responses
            .filter(r => r.domainKey === d.key)
            .map(r => {
              const q = d.questions.find(q => q.id === r.questionId);
              return { questionText: q?.text ?? '', text: r.textValue ?? '' };
            }),
        })).filter(d => d.narratives.length > 0),
      };
    });

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

// ─── Phase 4B: Statistical Dashboard ───

import { mean, standardDeviation, median, correlationMatrix, histogram } from '../utils/statistics.js';
import { maximumVariation, extremeDeviant, typicalCases, purposiveSampling, generateMethodologyText } from '../utils/sampling.js';
import type { SamplingMethod } from '../utils/sampling.js';
import { calculateIRR } from '../utils/irr.js';

// GET /api/research/statistics — Descriptive stats, correlation matrix, distributions
researchRoutes.get('/statistics', async (req, res, next) => {
  try {
    const assessments = await prisma.assessment.findMany({
      where: { status: 'completed', domainScores: { some: {} } },
      include: { domainScores: true },
    });

    if (assessments.length === 0) {
      return res.json({ success: true, data: { totalAssessments: 0, domains: {}, correlations: {}, distributions: {} } });
    }

    const domainKeys = DOMAINS.map(d => d.key);

    // Per-domain descriptive statistics
    const domains: Record<string, { mean: number; median: number; stdDev: number; min: number; max: number; n: number }> = {};
    for (const dk of domainKeys) {
      const scores = assessments
        .map(a => a.domainScores.find(ds => ds.domainKey === dk)?.score)
        .filter((s): s is number => s != null);
      domains[dk] = {
        mean: Math.round(mean(scores) * 100) / 100,
        median: Math.round(median(scores) * 100) / 100,
        stdDev: Math.round(standardDeviation(scores) * 100) / 100,
        min: scores.length > 0 ? Math.min(...scores) : 0,
        max: scores.length > 0 ? Math.max(...scores) : 0,
        n: scores.length,
      };
    }

    // Correlation matrix
    const scoresByAssessment = assessments.map(a => {
      const row: Record<string, number> = {};
      for (const ds of a.domainScores) {
        row[ds.domainKey] = ds.score;
      }
      return row;
    });
    const correlations = correlationMatrix(scoresByAssessment, domainKeys);

    // Distributions per domain
    const distributions: Record<string, { binStart: number; binEnd: number; count: number }[]> = {};
    for (const dk of domainKeys) {
      const scores = assessments
        .map(a => a.domainScores.find(ds => ds.domainKey === dk)?.score)
        .filter((s): s is number => s != null);
      distributions[dk] = histogram(scores);
    }

    res.json({
      success: true,
      data: {
        totalAssessments: assessments.length,
        domains,
        correlations,
        distributions,
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/research/statistics/groups — Group comparison
researchRoutes.get('/statistics/groups', async (req, res, next) => {
  try {
    const groupBy = (req.query.groupBy as string) || 'sector';
    const domainKey = req.query.domainKey as string;

    const assessments = await prisma.assessment.findMany({
      where: { status: 'completed', domainScores: { some: {} } },
      include: {
        organisation: { select: { country: true, sector: true, size: true } },
        domainScores: true,
      },
    });

    // Group assessments
    const groups: Record<string, number[]> = {};
    for (const a of assessments) {
      const groupValue = (a.organisation as any)[groupBy] || 'Unknown';
      const score = domainKey
        ? a.domainScores.find(ds => ds.domainKey === domainKey)?.score
        : a.overallScore;
      if (score != null) {
        if (!groups[groupValue]) groups[groupValue] = [];
        groups[groupValue].push(score);
      }
    }

    const data = Object.entries(groups).map(([group, scores]) => ({
      group,
      mean: Math.round(mean(scores) * 100) / 100,
      median: Math.round(median(scores) * 100) / 100,
      stdDev: Math.round(standardDeviation(scores) * 100) / 100,
      n: scores.length,
    }));

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

// ─── Phase 5A: Sampling Assistant ───

// POST /api/research/sampling
researchRoutes.post('/sampling', async (req, res, next) => {
  try {
    const { method, count, criteria } = req.body as {
      method: SamplingMethod;
      count: number;
      criteria?: { country?: string; sector?: string; size?: string };
    };

    if (!method || !count || count < 1 || count > 20) {
      throw new AppError('Provide a method and count (1-20)', 400);
    }

    const assessments = await prisma.assessment.findMany({
      where: { status: 'completed', domainScores: { some: {} } },
      include: {
        organisation: { select: { country: true, sector: true, size: true } },
        domainScores: true,
      },
    });

    const domainKeys = DOMAINS.map(d => d.key);

    const cases = assessments.map((a, idx) => {
      const domainScores: Record<string, number> = {};
      for (const ds of a.domainScores) {
        domainScores[ds.domainKey] = ds.score;
      }
      const contextParts: string[] = [];
      if (a.organisation.size) contextParts.push(a.organisation.size);
      if (a.organisation.country) contextParts.push(a.organisation.country);
      if (a.organisation.sector) contextParts.push(a.organisation.sector);

      return {
        assessmentId: a.id,
        label: `Case ${idx + 1}`,
        overallScore: a.overallScore ?? 0,
        domainScores,
        context: contextParts.join(' · ') || 'European WISE',
      };
    });

    const fullCases = assessments.map(a => ({
      assessmentId: a.id,
      country: a.organisation.country ?? 'Unknown',
      sector: a.organisation.sector ?? 'Unknown',
      size: a.organisation.size ?? 'Unknown',
    }));

    let sampled;
    switch (method) {
      case 'maximum_variation':
        sampled = maximumVariation(cases, count, domainKeys);
        break;
      case 'extreme_deviant':
        sampled = extremeDeviant(cases, count);
        break;
      case 'typical':
        sampled = typicalCases(cases, count, domainKeys);
        break;
      case 'purposive':
        sampled = purposiveSampling(cases, count, criteria || {}, fullCases);
        break;
      default:
        throw new AppError('Invalid sampling method', 400);
    }

    const methodologyText = generateMethodologyText(method, sampled.length, cases.length);

    res.json({
      success: true,
      data: { cases: sampled, methodologyText, totalPool: cases.length },
    });
  } catch (err) {
    next(err);
  }
});

// ─── Phase 5B: Inter-Rater Reliability ───

// POST /api/research/irr
researchRoutes.post('/irr', async (req, res, next) => {
  try {
    const { otherDashboardCode } = req.body;
    const myCode = req.headers['x-dashboard-code'] as string;

    if (!otherDashboardCode || !myCode) {
      throw new AppError('Both researcher codes are required', 400);
    }

    const [myAccess, otherAccess] = await Promise.all([
      prisma.dashboardAccess.findUnique({ where: { accessCode: myCode } }),
      prisma.dashboardAccess.findUnique({ where: { accessCode: otherDashboardCode } }),
    ]);

    if (!myAccess || !otherAccess) {
      throw new AppError('One or both dashboard codes are invalid', 404);
    }

    const [myHighlights, otherHighlights] = await Promise.all([
      prisma.textHighlight.findMany({
        where: { dashboardAccessId: myAccess.id },
        include: { tag: true },
      }),
      prisma.textHighlight.findMany({
        where: { dashboardAccessId: otherAccess.id },
        include: { tag: true },
      }),
    ]);

    const myResponseIds = new Set(myHighlights.map(h => h.responseId));
    const otherResponseIds = new Set(otherHighlights.map(h => h.responseId));
    const sharedResponseIds = [...myResponseIds].filter(id => otherResponseIds.has(id));

    if (sharedResponseIds.length === 0) {
      return res.json({
        success: true,
        data: { overallKappa: 0, overallInterpretation: 'No shared responses', percentageAgreement: 0, totalSharedResponses: 0, perTag: [] },
      });
    }

    const myTagMap = new Map<string, Set<string>>();
    for (const h of myHighlights) {
      if (!myTagMap.has(h.responseId)) myTagMap.set(h.responseId, new Set());
      if (h.tag) myTagMap.get(h.responseId)!.add(h.tag.name);
    }

    const otherTagMap = new Map<string, Set<string>>();
    for (const h of otherHighlights) {
      if (!otherTagMap.has(h.responseId)) otherTagMap.set(h.responseId, new Set());
      if (h.tag) otherTagMap.get(h.responseId)!.add(h.tag.name);
    }

    const allMyTagNames = new Set<string>();
    const allOtherTagNames = new Set<string>();
    for (const tags of myTagMap.values()) tags.forEach(t => allMyTagNames.add(t));
    for (const tags of otherTagMap.values()) tags.forEach(t => allOtherTagNames.add(t));
    const commonTagNames = [...allMyTagNames].filter(t => allOtherTagNames.has(t));

    if (commonTagNames.length === 0) {
      return res.json({
        success: true,
        data: { overallKappa: 0, overallInterpretation: 'No common tags', percentageAgreement: 0, totalSharedResponses: sharedResponseIds.length, perTag: [] },
      });
    }

    const result = calculateIRR(sharedResponseIds, myTagMap, otherTagMap, commonTagNames);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// ════════════════════════════════════════════════════
// Phase 6A: Temporal / Panel Analysis
// ════════════════════════════════════════════════════

// GET /api/research/trends?granularity=quarter|month|year
researchRoutes.get('/trends', async (req, res, next) => {
  try {
    const granularity = (req.query.granularity as string) || 'quarter';
    const domainKeys = DOMAINS.map(d => d.key);

    const assessments = await prisma.assessment.findMany({
      where: { status: 'completed', completedAt: { not: null } },
      include: { domainScores: true },
      orderBy: { completedAt: 'asc' },
    });

    if (assessments.length === 0) {
      return res.json({ success: true, data: { periods: [], changes: [] } });
    }

    // Group by time period
    function periodKey(date: Date): string {
      const y = date.getFullYear();
      const m = date.getMonth();
      if (granularity === 'month') return `${y}-${String(m + 1).padStart(2, '0')}`;
      if (granularity === 'year') return `${y}`;
      return `${y}-Q${Math.floor(m / 3) + 1}`;
    }

    const buckets = new Map<string, { scores: Record<string, number[]>; count: number }>();

    for (const a of assessments) {
      if (!a.completedAt) continue;
      const pk = periodKey(new Date(a.completedAt));
      if (!buckets.has(pk)) {
        buckets.set(pk, { scores: Object.fromEntries(domainKeys.map(k => [k, []])), count: 0 });
      }
      const bucket = buckets.get(pk)!;
      bucket.count++;
      for (const ds of a.domainScores) {
        if (bucket.scores[ds.domainKey]) bucket.scores[ds.domainKey].push(ds.score);
      }
    }

    const periods = [...buckets.entries()].map(([period, bucket]) => {
      const means: Record<string, number> = {};
      for (const dk of domainKeys) {
        const vals = bucket.scores[dk];
        means[dk] = vals.length > 0
          ? Math.round((vals.reduce((s, v) => s + v, 0) / vals.length) * 100) / 100
          : 0;
      }
      return { period, count: bucket.count, means };
    });

    // Change detection: flag domains where mean shifted >0.5 between consecutive periods
    const changes: { period: string; domainKey: string; delta: number; direction: string }[] = [];
    for (let i = 1; i < periods.length; i++) {
      for (const dk of domainKeys) {
        const delta = periods[i].means[dk] - periods[i - 1].means[dk];
        if (Math.abs(delta) > 0.5) {
          changes.push({
            period: periods[i].period,
            domainKey: dk,
            delta: Math.round(delta * 100) / 100,
            direction: delta > 0 ? 'increase' : 'decrease',
          });
        }
      }
    }

    res.json({ success: true, data: { periods, changes } });
  } catch (err) {
    next(err);
  }
});

// ════════════════════════════════════════════════════
// Phase 6B: Publication-Ready Exports
// ════════════════════════════════════════════════════

// GET /api/research/export/dataset?format=csv|json
researchRoutes.get('/export/dataset', async (req, res, next) => {
  try {
    const format = (req.query.format as string) || 'csv';
    const assessments = await prisma.assessment.findMany({
      where: { status: 'completed' },
      include: {
        organisation: { select: { country: true, sector: true, size: true, legalStructure: true } },
        domainScores: true,
      },
    });

    const domainKeys = DOMAINS.map(d => d.key);
    const rows = assessments.map((a, idx) => {
      const row: Record<string, any> = {
        case_id: `CASE_${String(idx + 1).padStart(3, '0')}`,
        country: a.organisation.country || '',
        sector: a.organisation.sector || '',
        size: a.organisation.size || '',
        legal_structure: a.organisation.legalStructure || '',
        overall_score: a.overallScore ?? 0,
        completed_at: a.completedAt?.toISOString().slice(0, 10) || '',
      };
      for (const dk of domainKeys) {
        const ds = a.domainScores.find(d => d.domainKey === dk);
        row[`${dk}_score`] = ds?.score ?? '';
        row[`${dk}_maturity`] = ds?.maturityLevel ?? '';
      }
      return row;
    });

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename=wiseshift-dataset.json');
      return res.json({ success: true, data: rows });
    }

    // CSV
    const headers = Object.keys(rows[0] || {});
    const csvLines = [
      headers.join(','),
      ...rows.map(r => headers.map(h => {
        const val = String(r[h] ?? '');
        return val.includes(',') ? `"${val}"` : val;
      }).join(',')),
    ];
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=wiseshift-dataset.csv');
    res.send(csvLines.join('\n'));
  } catch (err) {
    next(err);
  }
});

// GET /api/research/export/data-dictionary
researchRoutes.get('/export/data-dictionary', async (_req, res, next) => {
  try {
    const domainKeys = DOMAINS.map(d => d.key);
    const entries: { variable: string; type: string; description: string; values: string }[] = [
      { variable: 'case_id', type: 'string', description: 'Anonymised case identifier', values: 'CASE_001, CASE_002, ...' },
      { variable: 'country', type: 'string', description: 'ISO country code of the WISE', values: 'FR, DE, IT, ES, ...' },
      { variable: 'sector', type: 'string', description: 'Primary sector of activity', values: 'recycling, care, food, ...' },
      { variable: 'size', type: 'string', description: 'Organisation size', values: 'micro, small, medium, large, very_large' },
      { variable: 'legal_structure', type: 'string', description: 'Legal form of the organisation', values: 'cooperative, association, social_enterprise, ...' },
      { variable: 'overall_score', type: 'float', description: 'Mean of all domain scores (0-5)', values: '0.00 - 5.00' },
      { variable: 'completed_at', type: 'date', description: 'Assessment completion date', values: 'YYYY-MM-DD' },
    ];
    for (const dk of domainKeys) {
      const domain = DOMAINS.find(d => d.key === dk);
      entries.push(
        { variable: `${dk}_score`, type: 'float', description: `${domain?.name || dk} domain score (0-5)`, values: '0.00 - 5.00' },
        { variable: `${dk}_maturity`, type: 'string', description: `${domain?.name || dk} maturity level`, values: 'Foundation, Developing, Established, Advanced, Leading' },
      );
    }
    res.json({ success: true, data: entries });
  } catch (err) {
    next(err);
  }
});

// GET /api/research/export/enhanced-codebook
researchRoutes.get('/export/enhanced-codebook', async (req, res, next) => {
  try {
    const dashboardCode = req.headers['x-dashboard-code'] as string;
    const access = await prisma.dashboardAccess.findUnique({ where: { accessCode: dashboardCode } });
    if (!access) throw new AppError('Invalid dashboard code', 401);

    const tags = await prisma.researchTag.findMany({
      where: { dashboardAccessId: access.id },
      include: {
        highlights: { take: 3, select: { highlightedText: true } },
      },
      orderBy: { name: 'asc' },
    });

    // Build DOCX
    const rows = tags.map(tag => {
      const examples = tag.highlights.map(h => h.highlightedText).join(' | ');
      return new TableRow({
        children: [
          new TableCell({ children: [new Paragraph(tag.name)], width: { size: 20, type: WidthType.PERCENTAGE } }),
          new TableCell({ children: [new Paragraph(tag.color)], width: { size: 10, type: WidthType.PERCENTAGE } }),
          new TableCell({ children: [new Paragraph(tag.description || 'No description')], width: { size: 35, type: WidthType.PERCENTAGE } }),
          new TableCell({ children: [new Paragraph(examples || 'No examples yet')], width: { size: 35, type: WidthType.PERCENTAGE } }),
        ],
      });
    });

    const doc = new Document({
      sections: [{
        children: [
          new Paragraph({ text: 'Enhanced Codebook', heading: HeadingLevel.HEADING_1 }),
          new Paragraph({
            children: [new TextRun({ text: `Generated: ${new Date().toISOString().slice(0, 10)} | Tags: ${tags.length}`, italics: true })],
          }),
          new Table({
            rows: [
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Tag Name', bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Colour', bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Description', bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Example Quotes', bold: true })] })] }),
                ],
              }),
              ...rows,
            ],
            width: { size: 100, type: WidthType.PERCENTAGE },
          }),
        ],
      }],
    });

    const buffer = await Packer.toBuffer(doc);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', 'attachment; filename=enhanced-codebook.docx');
    res.send(Buffer.from(buffer));
  } catch (err) {
    next(err);
  }
});

// GET /api/research/citation?format=apa|harvard|chicago
researchRoutes.get('/citation', async (req, res, next) => {
  try {
    const format = (req.query.format as string) || 'apa';
    const year = new Date().getFullYear();

    const count = await prisma.assessment.count({ where: { status: 'completed' } });
    const dataset = `[Dataset of ${count} completed WISE self-assessments]`;

    let citation = '';
    switch (format) {
      case 'apa':
        citation = `WISEShift. (${year}). WISE Self-Assessment Tool ${dataset}. WISEShift Platform. Retrieved from https://wiseshift-production.up.railway.app`;
        break;
      case 'harvard':
        citation = `WISEShift (${year}) WISE Self-Assessment Tool ${dataset}. Available at: https://wiseshift-production.up.railway.app (Accessed: ${new Date().toISOString().slice(0, 10)}).`;
        break;
      case 'chicago':
        citation = `WISEShift. "WISE Self-Assessment Tool." ${dataset}. ${year}. https://wiseshift-production.up.railway.app.`;
        break;
      default:
        citation = `WISEShift (${year}). WISE Self-Assessment Tool. ${dataset}.`;
    }

    res.json({ success: true, data: { format, citation } });
  } catch (err) {
    next(err);
  }
});

// ════════════════════════════════════════════════════
// Phase 6C: Annotation Layers
// ════════════════════════════════════════════════════

// GET /api/research/layers — list all layers for current researcher
researchRoutes.get('/layers', async (req, res, next) => {
  try {
    const dashboardCode = req.headers['x-dashboard-code'] as string;
    const access = await prisma.dashboardAccess.findUnique({ where: { accessCode: dashboardCode } });
    if (!access) throw new AppError('Invalid dashboard code', 401);

    const ownLayers = await prisma.codingLayer.findMany({
      where: { dashboardAccessId: access.id },
      include: {
        _count: { select: { highlights: true } },
        shares: { include: { sharedWith: { select: { name: true, accessCode: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Also fetch layers shared with me
    const sharedWithMe = await prisma.layerShare.findMany({
      where: { sharedWithId: access.id },
      include: {
        codingLayer: {
          include: {
            _count: { select: { highlights: true } },
            dashboardAccess: { select: { name: true } },
          },
        },
      },
    });

    res.json({
      success: true,
      data: {
        own: ownLayers.map(l => ({
          id: l.id,
          name: l.name,
          description: l.description,
          isActive: l.isActive,
          highlightCount: l._count.highlights,
          shares: l.shares.map(s => ({ id: s.id, name: s.sharedWith.name, permission: s.permission })),
          createdAt: l.createdAt,
        })),
        shared: sharedWithMe.map(s => ({
          id: s.codingLayer.id,
          name: s.codingLayer.name,
          ownerName: s.codingLayer.dashboardAccess.name,
          highlightCount: s.codingLayer._count.highlights,
          permission: s.permission,
        })),
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/research/layers — create a new layer
researchRoutes.post('/layers', async (req, res, next) => {
  try {
    const dashboardCode = req.headers['x-dashboard-code'] as string;
    const access = await prisma.dashboardAccess.findUnique({ where: { accessCode: dashboardCode } });
    if (!access) throw new AppError('Invalid dashboard code', 401);

    const { name, description } = req.body;
    if (!name || typeof name !== 'string') throw new AppError('Layer name is required', 400);

    const layer = await prisma.codingLayer.create({
      data: { dashboardAccessId: access.id, name: name.trim(), description: description || null },
    });

    res.json({ success: true, data: layer });
  } catch (err) {
    next(err);
  }
});

// PUT /api/research/layers/:id — update layer
researchRoutes.put('/layers/:id', async (req, res, next) => {
  try {
    const { name, description } = req.body;
    const layer = await prisma.codingLayer.update({
      where: { id: req.params.id },
      data: { ...(name && { name }), ...(description !== undefined && { description }) },
    });
    res.json({ success: true, data: layer });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/research/layers/:id
researchRoutes.delete('/layers/:id', async (req, res, next) => {
  try {
    await prisma.codingLayer.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// PUT /api/research/layers/:id/activate — set active layer
researchRoutes.put('/layers/:id/activate', async (req, res, next) => {
  try {
    const dashboardCode = req.headers['x-dashboard-code'] as string;
    const access = await prisma.dashboardAccess.findUnique({ where: { accessCode: dashboardCode } });
    if (!access) throw new AppError('Invalid dashboard code', 401);

    // Deactivate all layers first
    await prisma.codingLayer.updateMany({
      where: { dashboardAccessId: access.id },
      data: { isActive: false },
    });

    // Activate the requested layer
    const layer = await prisma.codingLayer.update({
      where: { id: req.params.id },
      data: { isActive: true },
    });

    res.json({ success: true, data: layer });
  } catch (err) {
    next(err);
  }
});

// POST /api/research/layers/:id/highlights — add highlight to layer
researchRoutes.post('/layers/:id/highlights', async (req, res, next) => {
  try {
    const { responseId, tagId, startOffset, endOffset, highlightedText } = req.body;
    const highlight = await prisma.layerHighlight.create({
      data: {
        codingLayerId: req.params.id,
        responseId,
        tagId,
        startOffset,
        endOffset,
        highlightedText,
      },
      include: { tag: true },
    });
    res.json({ success: true, data: highlight });
  } catch (err) {
    next(err);
  }
});

// GET /api/research/layers/:id/highlights — get highlights for a layer
researchRoutes.get('/layers/:id/highlights', async (req, res, next) => {
  try {
    const highlights = await prisma.layerHighlight.findMany({
      where: { codingLayerId: req.params.id },
      include: { tag: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: highlights });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/research/layers/:layerId/highlights/:highlightId
researchRoutes.delete('/layers/:layerId/highlights/:highlightId', async (req, res, next) => {
  try {
    await prisma.layerHighlight.delete({ where: { id: req.params.highlightId } });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// POST /api/research/layers/:id/share — share layer with another researcher
researchRoutes.post('/layers/:id/share', async (req, res, next) => {
  try {
    const { dashboardCode, permission } = req.body;
    if (!dashboardCode) throw new AppError('Dashboard code is required', 400);

    const target = await prisma.dashboardAccess.findUnique({ where: { accessCode: dashboardCode } });
    if (!target) throw new AppError('Dashboard code not found', 404);

    const share = await prisma.layerShare.create({
      data: {
        codingLayerId: req.params.id,
        sharedWithId: target.id,
        permission: permission || 'read',
      },
    });
    res.json({ success: true, data: share });
  } catch (err) {
    next(err);
  }
});

// POST /api/research/layers/compare — compare two layers using IRR
researchRoutes.post('/layers/compare', async (req, res, next) => {
  try {
    const { layerId1, layerId2 } = req.body;
    if (!layerId1 || !layerId2) throw new AppError('Two layer IDs are required', 400);

    const [highlights1, highlights2] = await Promise.all([
      prisma.layerHighlight.findMany({ where: { codingLayerId: layerId1 }, include: { tag: true } }),
      prisma.layerHighlight.findMany({ where: { codingLayerId: layerId2 }, include: { tag: true } }),
    ]);

    const responseIds1 = new Set(highlights1.map(h => h.responseId));
    const responseIds2 = new Set(highlights2.map(h => h.responseId));
    const sharedResponseIds = [...responseIds1].filter(id => responseIds2.has(id));

    if (sharedResponseIds.length === 0) {
      return res.json({
        success: true,
        data: { overallKappa: 0, overallInterpretation: 'No shared responses', percentageAgreement: 0, totalSharedResponses: 0, perTag: [] },
      });
    }

    const tagMap1 = new Map<string, Set<string>>();
    for (const h of highlights1) {
      if (!tagMap1.has(h.responseId)) tagMap1.set(h.responseId, new Set());
      if (h.tag) tagMap1.get(h.responseId)!.add(h.tag.name);
    }

    const tagMap2 = new Map<string, Set<string>>();
    for (const h of highlights2) {
      if (!tagMap2.has(h.responseId)) tagMap2.set(h.responseId, new Set());
      if (h.tag) tagMap2.get(h.responseId)!.add(h.tag.name);
    }

    const allTags1 = new Set<string>();
    const allTags2 = new Set<string>();
    for (const tags of tagMap1.values()) tags.forEach(t => allTags1.add(t));
    for (const tags of tagMap2.values()) tags.forEach(t => allTags2.add(t));
    const commonTags = [...allTags1].filter(t => allTags2.has(t));

    if (commonTags.length === 0) {
      return res.json({
        success: true,
        data: { overallKappa: 0, overallInterpretation: 'No common tags', percentageAgreement: 0, totalSharedResponses: sharedResponseIds.length, perTag: [] },
      });
    }

    const result = calculateIRR(sharedResponseIds, tagMap1, tagMap2, commonTags);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});
