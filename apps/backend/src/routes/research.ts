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
