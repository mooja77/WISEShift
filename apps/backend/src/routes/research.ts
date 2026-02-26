import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { DOMAINS, DEFAULT_RESEARCH_TAGS, TAG_COLORS } from '@wiseshift/shared';
import { AppError } from '../middleware/errorHandler.js';
import { logAudit } from '../middleware/auditLog.js';
import {
  validate,
  narrativeSearchSchema,
  createTagSchema,
  updateTagSchema,
  createHighlightSchema,
  upsertNoteSchema,
  createQuotePinSchema,
  reorderQuotesSchema,
  reorderTagsSchema,
  mergeTagsSchema,
  splitTagSchema,
  inVivoCodingSchema,
  executeQuerySchema,
  saveQuerySchema,
} from '../middleware/validation.js';
import { Document, Packer, Table, TableRow, TableCell, Paragraph, TextRun, WidthType, HeadingLevel } from 'docx';
import { extractWordFrequencies } from '../utils/wordFrequency.js';
import archiver from 'archiver';

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
    const { search, assessmentId, domainKeys, countries, sectors, sizes, scoreMin, scoreMax, page, pageSize } = req.body;

    // Build where clause for responses
    const where: any = {
      questionType: 'narrative',
      textValue: { not: null },
      assessment: { status: 'completed' },
    };

    if (assessmentId) {
      where.assessmentId = assessmentId;
    }

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
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
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
    const { name, color, description, parentId } = req.body;

    // Validate parent belongs to same dashboard if provided
    if (parentId) {
      const parent = await prisma.researchTag.findFirst({
        where: { id: parentId, dashboardAccessId },
      });
      if (!parent) throw new AppError('Parent tag not found', 404);
    }

    const tag = await prisma.researchTag.create({
      data: { dashboardAccessId, name, color, description, ...(parentId && { parentId }) },
    });
    await logAudit({
      action: 'write', resource: 'research-tag', resourceId: tag.id,
      actorType: 'researcher', actorId: dashboardAccessId,
      method: 'POST', path: '/api/research/tags',
      meta: JSON.stringify({ tagName: name, parentId: parentId || null }),
    });
    res.status(201).json({ success: true, data: tag });
  } catch (err: any) {
    if (err.code === 'P2002') {
      return next(new AppError('A tag with that name already exists', 409));
    }
    next(err);
  }
});

// GET /api/research/tags/tree — Return the full nested tree with highlight counts
researchRoutes.get('/tags/tree', async (req, res, next) => {
  try {
    const dashboardAccessId = (req as any).dashboardAccessId;

    const tags = await prisma.researchTag.findMany({
      where: { dashboardAccessId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      include: { _count: { select: { highlights: true } } },
    });

    // Build tree in JS: group by parentId, nest children under parents
    const tagMap = new Map<string, any>();
    for (const t of tags) {
      tagMap.set(t.id, {
        id: t.id,
        dashboardAccessId: t.dashboardAccessId,
        name: t.name,
        color: t.color,
        description: t.description,
        isDefault: t.isDefault,
        parentId: t.parentId,
        sortOrder: t.sortOrder,
        isInVivo: t.isInVivo,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
        highlightCount: t._count.highlights,
        children: [],
      });
    }

    const roots: any[] = [];
    for (const node of tagMap.values()) {
      if (node.parentId && tagMap.has(node.parentId)) {
        tagMap.get(node.parentId).children.push(node);
      } else {
        roots.push(node);
      }
    }

    res.json({ success: true, data: roots });
  } catch (err) {
    next(err);
  }
});

// PUT /api/research/tags/reorder — Bulk update parentId and sortOrder for drag-and-drop
researchRoutes.put('/tags/reorder', validate(reorderTagsSchema), async (req, res, next) => {
  try {
    const dashboardAccessId = (req as any).dashboardAccessId;
    const { items } = req.body as { items: { tagId: string; parentId: string | null; sortOrder: number }[] };

    // Validate all tags belong to the same dashboardAccessId
    const tagIds = items.map(i => i.tagId);
    const ownedTags = await prisma.researchTag.findMany({
      where: { id: { in: tagIds }, dashboardAccessId },
      select: { id: true },
    });
    const ownedIds = new Set(ownedTags.map(t => t.id));
    for (const item of items) {
      if (!ownedIds.has(item.tagId)) {
        throw new AppError(`Tag ${item.tagId} not found or not owned`, 404);
      }
    }

    // Validate parent tags belong to same dashboard if provided
    const parentIds = items.map(i => i.parentId).filter((p): p is string => p !== null);
    if (parentIds.length > 0) {
      const ownedParents = await prisma.researchTag.findMany({
        where: { id: { in: parentIds }, dashboardAccessId },
        select: { id: true },
      });
      const ownedParentIds = new Set(ownedParents.map(t => t.id));
      for (const pid of parentIds) {
        if (!ownedParentIds.has(pid)) {
          throw new AppError(`Parent tag ${pid} not found or not owned`, 404);
        }
      }
    }

    // Apply all updates in a transaction
    await prisma.$transaction(
      items.map(item =>
        prisma.researchTag.update({
          where: { id: item.tagId },
          data: { parentId: item.parentId, sortOrder: item.sortOrder },
        })
      )
    );

    await logAudit({
      action: 'update', resource: 'research-tag-order', resourceId: dashboardAccessId,
      actorType: 'researcher', actorId: dashboardAccessId,
      method: 'PUT', path: '/api/research/tags/reorder',
      meta: JSON.stringify({ itemCount: items.length }),
    });

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// PUT /api/research/tags/:id
researchRoutes.put('/tags/:id', validate(updateTagSchema), async (req, res, next) => {
  try {
    const dashboardAccessId = (req as any).dashboardAccessId;
    const { id } = req.params;
    const { name, color, description, parentId, sortOrder } = req.body;

    const existing = await prisma.researchTag.findFirst({
      where: { id, dashboardAccessId },
    });
    if (!existing) throw new AppError('Tag not found', 404);

    // Validate parent belongs to same dashboard if provided (and not self-referential)
    if (parentId !== undefined && parentId !== null) {
      if (parentId === id) throw new AppError('A tag cannot be its own parent', 400);
      const parent = await prisma.researchTag.findFirst({
        where: { id: parentId, dashboardAccessId },
      });
      if (!parent) throw new AppError('Parent tag not found', 404);
    }

    const tag = await prisma.researchTag.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(color !== undefined && { color }),
        ...(description !== undefined && { description }),
        ...(parentId !== undefined && { parentId }),
        ...(sortOrder !== undefined && { sortOrder }),
      },
    });
    await logAudit({
      action: 'update', resource: 'research-tag', resourceId: id,
      actorType: 'researcher', actorId: dashboardAccessId,
      method: 'PUT', path: `/api/research/tags/${id}`,
      meta: JSON.stringify({ tagName: tag.name, parentId: tag.parentId }),
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

    // Move children to root (parentId = null) instead of cascade-deleting them
    await prisma.researchTag.updateMany({
      where: { parentId: id, dashboardAccessId },
      data: { parentId: null },
    });

    await prisma.researchTag.delete({ where: { id } });
    await logAudit({
      action: 'delete', resource: 'research-tag', resourceId: id,
      actorType: 'researcher', actorId: dashboardAccessId,
      method: 'DELETE', path: `/api/research/tags/${id}`,
      meta: JSON.stringify({ tagName: existing.name }),
    });
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

// ═══════════════════════════════════════════════════════════════
// CODE MERGE, SPLIT & IN-VIVO CODING
// ═══════════════════════════════════════════════════════════════

// POST /api/research/tags/merge — Merge 2+ tags into one
researchRoutes.post('/tags/merge', validate(mergeTagsSchema), async (req, res, next) => {
  try {
    const dashboardAccessId = (req as any).dashboardAccessId;
    const { sourceTagIds, targetName, targetColor, targetDescription } = req.body;

    // Validate all source tags belong to this researcher
    const sourceTags = await prisma.researchTag.findMany({
      where: { id: { in: sourceTagIds }, dashboardAccessId },
      include: { highlights: true, layerHighlights: true },
    });

    if (sourceTags.length !== sourceTagIds.length) {
      throw new AppError('One or more tags not found', 404);
    }

    // Snapshot current state for undo
    const snapshot = {
      sourceTags: sourceTags.map(t => ({
        id: t.id,
        name: t.name,
        color: t.color,
        description: t.description,
        parentId: t.parentId,
        sortOrder: t.sortOrder,
        isDefault: t.isDefault,
        isInVivo: t.isInVivo,
        highlights: t.highlights.map(h => ({
          id: h.id,
          responseId: h.responseId,
          tagId: h.tagId,
          startOffset: h.startOffset,
          endOffset: h.endOffset,
          highlightedText: h.highlightedText,
        })),
        layerHighlights: t.layerHighlights.map(lh => ({
          id: lh.id,
          codingLayerId: lh.codingLayerId,
          responseId: lh.responseId,
          tagId: lh.tagId,
          startOffset: lh.startOffset,
          endOffset: lh.endOffset,
          highlightedText: lh.highlightedText,
        })),
      })),
    };

    // Check if first source matches the target name — reuse it
    const reuseTag = sourceTags.find(t => t.name === targetName);

    let targetTag;
    let tagsToDelete: string[];

    if (reuseTag) {
      // Update the reused tag with target colour/description
      targetTag = await prisma.researchTag.update({
        where: { id: reuseTag.id },
        data: { color: targetColor, ...(targetDescription !== undefined && { description: targetDescription }) },
      });
      tagsToDelete = sourceTagIds.filter((sid: string) => sid !== reuseTag.id);
    } else {
      // Create a brand new tag
      targetTag = await prisma.researchTag.create({
        data: {
          dashboardAccessId,
          name: targetName,
          color: targetColor,
          description: targetDescription || null,
          parentId: sourceTags[0].parentId,
        },
      });
      tagsToDelete = sourceTagIds;
    }

    // Reassign all TextHighlights from source tags to target
    const textResult = await prisma.textHighlight.updateMany({
      where: { tagId: { in: tagsToDelete }, dashboardAccessId },
      data: { tagId: targetTag.id },
    });

    // Reassign all LayerHighlights from source tags to target
    await prisma.layerHighlight.updateMany({
      where: { tagId: { in: tagsToDelete } },
      data: { tagId: targetTag.id },
    });

    // Delete source tags (except the reused one)
    if (tagsToDelete.length > 0) {
      await prisma.researchTag.deleteMany({
        where: { id: { in: tagsToDelete } },
      });
    }

    // Store the operation for undo
    const operation = await prisma.tagOperation.create({
      data: {
        dashboardAccessId,
        operationType: 'merge',
        sourceTagIds: JSON.stringify(sourceTagIds),
        targetTagId: targetTag.id,
        snapshot: JSON.stringify(snapshot),
      },
    });

    await logAudit({
      action: 'write', resource: 'tag-merge', resourceId: operation.id,
      actorType: 'researcher', actorId: dashboardAccessId,
      method: 'POST', path: '/api/research/tags/merge',
      meta: JSON.stringify({ sourceTagIds, targetName, reassignedCount: textResult.count }),
    });

    res.json({
      success: true,
      data: { tag: targetTag, reassignedCount: textResult.count, operationId: operation.id },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/research/tags/split — Split one tag into new tags
researchRoutes.post('/tags/split', validate(splitTagSchema), async (req, res, next) => {
  try {
    const dashboardAccessId = (req as any).dashboardAccessId;
    const { sourceTagId, newTags } = req.body;

    // Validate source tag
    const sourceTag = await prisma.researchTag.findFirst({
      where: { id: sourceTagId, dashboardAccessId },
      include: { highlights: true, layerHighlights: true },
    });
    if (!sourceTag) throw new AppError('Tag not found', 404);

    // Collect all highlightIds from the request
    const allRequestedIds = newTags.flatMap((nt: any) => nt.highlightIds);

    // Validate all highlightIds belong to the source tag
    const validHighlights = await prisma.textHighlight.findMany({
      where: { id: { in: allRequestedIds }, tagId: sourceTagId, dashboardAccessId },
    });
    if (validHighlights.length !== allRequestedIds.length) {
      throw new AppError('One or more highlights do not belong to this tag', 400);
    }

    // Snapshot current state
    const snapshot = {
      sourceTag: {
        id: sourceTag.id,
        name: sourceTag.name,
        color: sourceTag.color,
        description: sourceTag.description,
        parentId: sourceTag.parentId,
        sortOrder: sourceTag.sortOrder,
        isDefault: sourceTag.isDefault,
        isInVivo: sourceTag.isInVivo,
        highlights: sourceTag.highlights.map(h => ({
          id: h.id,
          responseId: h.responseId,
          tagId: h.tagId,
          startOffset: h.startOffset,
          endOffset: h.endOffset,
          highlightedText: h.highlightedText,
        })),
        layerHighlights: sourceTag.layerHighlights.map(lh => ({
          id: lh.id,
          codingLayerId: lh.codingLayerId,
          responseId: lh.responseId,
          tagId: lh.tagId,
          startOffset: lh.startOffset,
          endOffset: lh.endOffset,
          highlightedText: lh.highlightedText,
        })),
      },
    };

    // Create each new tag as a child of the source tag's parent (preserving hierarchy)
    const createdTags = [];
    for (const nt of newTags) {
      const newTag = await prisma.researchTag.create({
        data: {
          dashboardAccessId,
          name: nt.name,
          color: nt.color,
          parentId: sourceTag.parentId,
        },
      });

      // Reassign the specified highlights
      await prisma.textHighlight.updateMany({
        where: { id: { in: nt.highlightIds }, dashboardAccessId },
        data: { tagId: newTag.id },
      });

      createdTags.push(newTag);
    }

    // Also reassign any layer highlights — proportionally distribute to the first new tag
    if (sourceTag.layerHighlights.length > 0) {
      await prisma.layerHighlight.updateMany({
        where: { tagId: sourceTagId },
        data: { tagId: createdTags[0].id },
      });
    }

    // Delete the source tag
    await prisma.researchTag.delete({ where: { id: sourceTagId } });

    // Store operation for undo
    const operation = await prisma.tagOperation.create({
      data: {
        dashboardAccessId,
        operationType: 'split',
        sourceTagIds: JSON.stringify([sourceTagId]),
        targetTagId: createdTags[0].id,
        snapshot: JSON.stringify(snapshot),
      },
    });

    await logAudit({
      action: 'write', resource: 'tag-split', resourceId: operation.id,
      actorType: 'researcher', actorId: dashboardAccessId,
      method: 'POST', path: '/api/research/tags/split',
      meta: JSON.stringify({ sourceTagId, newTagNames: createdTags.map(t => t.name) }),
    });

    res.json({
      success: true,
      data: { newTags: createdTags, operationId: operation.id },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/research/tags/operations/:id/undo — Reverse a merge/split
researchRoutes.post('/tags/operations/:id/undo', async (req, res, next) => {
  try {
    const dashboardAccessId = (req as any).dashboardAccessId;
    const { id } = req.params;

    const operation = await prisma.tagOperation.findFirst({
      where: { id, dashboardAccessId },
    });
    if (!operation) throw new AppError('Operation not found', 404);

    const snapshot = JSON.parse(operation.snapshot);

    if (operation.operationType === 'merge') {
      // Undo merge: recreate source tags, reassign highlights back, delete merged tag
      const { sourceTags } = snapshot;

      for (const st of sourceTags) {
        // Recreate the tag with its original ID if possible (use upsert)
        await prisma.researchTag.upsert({
          where: { id: st.id },
          create: {
            id: st.id,
            dashboardAccessId,
            name: st.name,
            color: st.color,
            description: st.description || null,
            parentId: st.parentId || null,
            sortOrder: st.sortOrder || 0,
            isDefault: st.isDefault || false,
            isInVivo: st.isInVivo || false,
          },
          update: {
            name: st.name,
            color: st.color,
            description: st.description || null,
          },
        });

        // Reassign TextHighlights back to their original tags
        for (const h of st.highlights) {
          await prisma.textHighlight.updateMany({
            where: { id: h.id },
            data: { tagId: st.id },
          });
        }

        // Reassign LayerHighlights back
        for (const lh of st.layerHighlights) {
          await prisma.layerHighlight.updateMany({
            where: { id: lh.id },
            data: { tagId: st.id },
          });
        }
      }

      // Delete the merged target tag if it was newly created (not one of the original source IDs)
      const sourceIds = sourceTags.map((st: any) => st.id);
      if (!sourceIds.includes(operation.targetTagId)) {
        await prisma.researchTag.deleteMany({
          where: { id: operation.targetTagId },
        });
      }
    } else if (operation.operationType === 'split') {
      // Undo split: recreate source tag, reassign highlights back, delete split tags
      const { sourceTag } = snapshot;

      // Recreate the source tag
      await prisma.researchTag.upsert({
        where: { id: sourceTag.id },
        create: {
          id: sourceTag.id,
          dashboardAccessId,
          name: sourceTag.name,
          color: sourceTag.color,
          description: sourceTag.description || null,
          parentId: sourceTag.parentId || null,
          sortOrder: sourceTag.sortOrder || 0,
          isDefault: sourceTag.isDefault || false,
          isInVivo: sourceTag.isInVivo || false,
        },
        update: {
          name: sourceTag.name,
          color: sourceTag.color,
          description: sourceTag.description || null,
        },
      });

      // Reassign all highlights back to the source tag
      for (const h of sourceTag.highlights) {
        await prisma.textHighlight.updateMany({
          where: { id: h.id },
          data: { tagId: sourceTag.id },
        });
      }

      // Reassign layer highlights back
      for (const lh of sourceTag.layerHighlights) {
        await prisma.layerHighlight.updateMany({
          where: { id: lh.id },
          data: { tagId: sourceTag.id },
        });
      }

      // Find and delete the split tags (tags created during the split that aren't the source)
      // The targetTagId was the first created tag; we need to find all tags that were created by the split.
      // Since we don't store all created tag IDs, we delete tags that hold the reassigned highlights
      // Safer approach: parse the operation's sourceTagIds to find the original, then delete any tags
      // that now hold highlights that originally belonged to sourceTag
      // For simplicity, delete the targetTagId and any other tags with the same parent that were created after the operation
      const splitSourceIds = JSON.parse(operation.sourceTagIds);
      // The original source tag ID is in splitSourceIds[0]
      // We need to find tags that were created by the split — these won't be in the snapshot
      // Best approach: find tags holding highlights from our snapshot that aren't the source
      const highlightIds = sourceTag.highlights.map((h: any) => h.id);
      if (highlightIds.length > 0) {
        const currentHighlights = await prisma.textHighlight.findMany({
          where: { id: { in: highlightIds } },
          select: { tagId: true },
        });
        const tagIdsHoldingOurHighlights = [...new Set(currentHighlights.map(h => h.tagId))];
        const tagsToDelete = tagIdsHoldingOurHighlights.filter(tid => tid !== sourceTag.id);
        if (tagsToDelete.length > 0) {
          // First reassign any remaining highlights on those tags
          await prisma.textHighlight.updateMany({
            where: { tagId: { in: tagsToDelete }, dashboardAccessId },
            data: { tagId: sourceTag.id },
          });
          await prisma.layerHighlight.updateMany({
            where: { tagId: { in: tagsToDelete } },
            data: { tagId: sourceTag.id },
          });
          await prisma.researchTag.deleteMany({
            where: { id: { in: tagsToDelete } },
          });
        }
      }
    }

    // Delete the operation record
    await prisma.tagOperation.delete({ where: { id } });

    await logAudit({
      action: 'write', resource: 'tag-operation-undo', resourceId: id,
      actorType: 'researcher', actorId: dashboardAccessId,
      method: 'POST', path: `/api/research/tags/operations/${id}/undo`,
      meta: JSON.stringify({ operationType: operation.operationType }),
    });

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// GET /api/research/tags/operations — List recent tag operations
researchRoutes.get('/tags/operations', async (req, res, next) => {
  try {
    const dashboardAccessId = (req as any).dashboardAccessId;

    const operations = await prisma.tagOperation.findMany({
      where: { dashboardAccessId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    const data = operations.map(op => ({
      id: op.id,
      operationType: op.operationType,
      sourceTagIds: JSON.parse(op.sourceTagIds),
      targetTagId: op.targetTagId,
      createdAt: op.createdAt,
    }));

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

// POST /api/research/tags/in-vivo — Create tag from selected text AND create highlight atomically
researchRoutes.post('/tags/in-vivo', validate(inVivoCodingSchema), async (req, res, next) => {
  try {
    const dashboardAccessId = (req as any).dashboardAccessId;
    const { responseId, startOffset, endOffset, highlightedText, color, parentId } = req.body;

    const result = await prisma.$transaction(async (tx) => {
      // Count existing tags to auto-pick colour from TAG_COLORS cycle
      const tagCount = await tx.researchTag.count({ where: { dashboardAccessId } });
      const autoColor = color || TAG_COLORS[tagCount % TAG_COLORS.length];

      // Create the tag with the highlighted text as its name (truncated to 100 chars)
      const tagName = highlightedText.slice(0, 100);

      const tag = await tx.researchTag.create({
        data: {
          dashboardAccessId,
          name: tagName,
          color: autoColor,
          isInVivo: true,
          parentId: parentId || null,
        },
      });

      // Create the highlight linking to the new tag
      const highlight = await tx.textHighlight.create({
        data: {
          dashboardAccessId,
          responseId,
          tagId: tag.id,
          startOffset,
          endOffset,
          highlightedText,
        },
        include: { tag: true },
      });

      return { tag, highlight };
    });

    await logAudit({
      action: 'write', resource: 'in-vivo-code', resourceId: result.tag.id,
      actorType: 'researcher', actorId: dashboardAccessId,
      method: 'POST', path: '/api/research/tags/in-vivo',
      meta: JSON.stringify({ tagName: result.tag.name, responseId }),
    });

    res.status(201).json({ success: true, data: result });
  } catch (err: any) {
    if (err.code === 'P2002') {
      return next(new AppError('A tag with that name already exists. Try selecting different text.', 409));
    }
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
    await logAudit({
      action: 'write', resource: 'highlight', resourceId: highlight.id,
      actorType: 'researcher', actorId: dashboardAccessId,
      method: 'POST', path: '/api/research/highlights',
      meta: JSON.stringify({ responseId, tagName: highlight.tag?.name, startOffset, endOffset }),
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
    await logAudit({
      action: 'delete', resource: 'highlight', resourceId: id,
      actorType: 'researcher', actorId: dashboardAccessId,
      method: 'DELETE', path: `/api/research/highlights/${id}`,
      meta: JSON.stringify({ responseId: existing.responseId }),
    });
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
    await logAudit({
      action: 'update', resource: 'research-note', resourceId: note.id,
      actorType: 'researcher', actorId: dashboardAccessId,
      method: 'PUT', path: '/api/research/notes',
      meta: JSON.stringify({ responseId }),
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
    await logAudit({
      action: 'delete', resource: 'research-note',
      actorType: 'researcher', actorId: dashboardAccessId,
      method: 'DELETE', path: `/api/research/notes/${responseId}`,
      meta: JSON.stringify({ responseId }),
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
    await logAudit({
      action: 'write', resource: 'quote-pin', resourceId: pin.id,
      actorType: 'researcher', actorId: dashboardAccessId,
      method: 'POST', path: '/api/research/quotes',
      meta: JSON.stringify({ responseId }),
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
    await logAudit({
      action: 'delete', resource: 'quote-pin', resourceId: id,
      actorType: 'researcher', actorId: dashboardAccessId,
      method: 'DELETE', path: `/api/research/quotes/${id}`,
      meta: JSON.stringify({ responseId: existing.responseId }),
    });
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

// GET /api/research/export/refi-qda — Generate and download a REFI-QDA Project Exchange (.qdpx) file
researchRoutes.get('/export/refi-qda', async (req, res, next) => {
  try {
    const dashboardAccessId = (req as any).dashboardAccessId;

    // XML entity escaper
    function escXml(s: string): string {
      return s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
    }

    // Fetch all research data in parallel
    const [tags, highlights, notes, memos, layers] = await Promise.all([
      prisma.researchTag.findMany({ where: { dashboardAccessId }, orderBy: { sortOrder: 'asc' } }),
      prisma.textHighlight.findMany({
        where: { dashboardAccessId },
        include: { response: { include: { assessment: { include: { organisation: true } } } } },
      }),
      prisma.researchNote.findMany({
        where: { dashboardAccessId },
        include: { response: true },
      }),
      prisma.researchMemo.findMany({ where: { dashboardAccessId } }),
      prisma.codingLayer.findMany({ where: { dashboardAccessId } }),
    ]);

    // Fetch all narrative responses from completed assessments
    const assessments = await prisma.assessment.findMany({
      where: { status: 'completed' },
      include: {
        responses: { where: { questionType: 'narrative', textValue: { not: null } } },
        organisation: true,
      },
    });

    const allNarrativeResponses = assessments.flatMap(a =>
      a.responses.map(r => ({ ...r, organisation: a.organisation }))
    );

    // Build tag tree for nested <Code> elements
    const tagMap = new Map(tags.map(t => [t.id, t]));
    const rootTags = tags.filter(t => !t.parentId);
    const childrenOf = (parentId: string) => tags.filter(t => t.parentId === parentId);

    function renderCodeXml(tag: typeof tags[0], indent: string): string {
      const children = childrenOf(tag.id);
      const desc = tag.description ? `\n${indent}  <Description>${escXml(tag.description)}</Description>` : `\n${indent}  <Description></Description>`;
      if (children.length === 0) {
        return `${indent}<Code guid="code-${escXml(tag.id)}" name="${escXml(tag.name)}" color="${escXml(tag.color)}" isCodable="true">${desc}\n${indent}</Code>`;
      }
      let xml = `${indent}<Code guid="code-${escXml(tag.id)}" name="${escXml(tag.name)}" color="${escXml(tag.color)}" isCodable="true">${desc}`;
      for (const child of children) {
        xml += '\n' + renderCodeXml(child, indent + '  ');
      }
      xml += `\n${indent}</Code>`;
      return xml;
    }

    const now = new Date().toISOString();

    // Build XML content
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<Project name="WISEShift Research" origin="WISEShift"\n`;
    xml += `  xmlns="urn:QDA-XML:project:1.0"\n`;
    xml += `  creatingUserGUID="user-${escXml(dashboardAccessId)}"\n`;
    xml += `  creationDateTime="${now}">\n\n`;

    // Users
    xml += `  <Users>\n`;
    xml += `    <User guid="user-${escXml(dashboardAccessId)}" name="Researcher" />\n`;
    xml += `  </Users>\n\n`;

    // CodeBook
    xml += `  <CodeBook>\n    <Codes>\n`;
    for (const tag of rootTags) {
      xml += renderCodeXml(tag, '      ') + '\n';
    }
    xml += `    </Codes>\n  </CodeBook>\n\n`;

    // Sources
    xml += `  <Sources>\n`;
    for (const r of allNarrativeResponses) {
      const qText = questionText(r.domainKey, r.questionId);
      const ctx = anonymiseOrg(r.organisation);
      xml += `    <TextSource guid="source-${escXml(r.id)}"\n`;
      xml += `      plainTextPath="internal://Sources/${escXml(r.id)}.txt"\n`;
      xml += `      name="${escXml(qText)} - ${escXml(ctx)}">\n`;
      xml += `    </TextSource>\n`;
    }
    xml += `  </Sources>\n\n`;

    // Coding
    xml += `  <Coding>\n`;
    for (const h of highlights) {
      xml += `    <CodeRef targetGUID="code-${escXml(h.tagId)}">\n`;
      xml += `      <Selection guid="sel-${escXml(h.id)}"\n`;
      xml += `        startPosition="${h.startOffset}"\n`;
      xml += `        endPosition="${h.endOffset}" />\n`;
      xml += `    </CodeRef>\n`;
    }
    xml += `  </Coding>\n\n`;

    // Notes
    xml += `  <Notes>\n`;
    for (const n of notes) {
      const qText = questionText(n.response.domainKey, n.response.questionId);
      xml += `    <Note guid="note-${escXml(n.id)}" name="Note on ${escXml(qText)}"\n`;
      xml += `      creatingUser="user-${escXml(dashboardAccessId)}"\n`;
      xml += `      creationDateTime="${n.createdAt.toISOString()}">\n`;
      xml += `      <PlainTextContent>${escXml(n.text)}</PlainTextContent>\n`;
      xml += `    </Note>\n`;
    }
    for (const m of memos) {
      const label = m.content.length > 50 ? m.content.slice(0, 50) + '...' : m.content;
      xml += `    <Note guid="memo-${escXml(m.id)}" name="${escXml(m.type)}: ${escXml(label)}"\n`;
      xml += `      creatingUser="user-${escXml(dashboardAccessId)}"\n`;
      xml += `      creationDateTime="${m.createdAt.toISOString()}">\n`;
      xml += `      <PlainTextContent>${escXml(m.content)}</PlainTextContent>\n`;
      xml += `    </Note>\n`;
    }
    xml += `  </Notes>\n\n`;

    // Sets (Coding Layers)
    xml += `  <Sets>\n`;
    for (const l of layers) {
      xml += `    <Set guid="set-${escXml(l.id)}" name="${escXml(l.name)}">\n`;
      xml += `      <Description>${escXml(l.description || '')}</Description>\n`;
      xml += `    </Set>\n`;
    }
    xml += `  </Sets>\n\n`;

    xml += `</Project>\n`;

    // Create ZIP archive
    const archive = archiver('zip', { zlib: { level: 9 } });
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="wiseshift-project.qdpx"');
    archive.pipe(res);

    // Add project.qde XML
    archive.append(xml, { name: 'project.qde' });

    // Add source text files
    for (const r of allNarrativeResponses) {
      archive.append(r.textValue || '', { name: `Sources/${r.id}.txt` });
    }

    await archive.finalize();
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

    await logAudit({
      action: 'write', resource: 'coding-layer', resourceId: layer.id,
      actorType: 'researcher', actorId: access.id,
      method: 'POST', path: '/api/research/layers',
      meta: JSON.stringify({ layerName: name.trim() }),
    });
    res.json({ success: true, data: layer });
  } catch (err) {
    next(err);
  }
});

// PUT /api/research/layers/:id — update layer
researchRoutes.put('/layers/:id', async (req, res, next) => {
  try {
    const dashboardAccessId = (req as any).dashboardAccessId;
    const { name, description } = req.body;
    const layer = await prisma.codingLayer.update({
      where: { id: req.params.id },
      data: { ...(name && { name }), ...(description !== undefined && { description }) },
    });
    await logAudit({
      action: 'update', resource: 'coding-layer', resourceId: req.params.id,
      actorType: 'researcher', actorId: dashboardAccessId,
      method: 'PUT', path: `/api/research/layers/${req.params.id}`,
      meta: JSON.stringify({ layerName: layer.name }),
    });
    res.json({ success: true, data: layer });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/research/layers/:id
researchRoutes.delete('/layers/:id', async (req, res, next) => {
  try {
    const dashboardAccessId = (req as any).dashboardAccessId;
    const layer = await prisma.codingLayer.findUnique({ where: { id: req.params.id } });
    await prisma.codingLayer.delete({ where: { id: req.params.id } });
    await logAudit({
      action: 'delete', resource: 'coding-layer', resourceId: req.params.id,
      actorType: 'researcher', actorId: dashboardAccessId,
      method: 'DELETE', path: `/api/research/layers/${req.params.id}`,
      meta: JSON.stringify({ layerName: layer?.name }),
    });
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
    const dashboardAccessId = (req as any).dashboardAccessId;
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
    await logAudit({
      action: 'write', resource: 'layer-highlight', resourceId: highlight.id,
      actorType: 'researcher', actorId: dashboardAccessId,
      method: 'POST', path: `/api/research/layers/${req.params.id}/highlights`,
      meta: JSON.stringify({ layerId: req.params.id, responseId, tagName: highlight.tag?.name }),
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
    const dashboardAccessId = (req as any).dashboardAccessId;
    await prisma.layerHighlight.delete({ where: { id: req.params.highlightId } });
    await logAudit({
      action: 'delete', resource: 'layer-highlight', resourceId: req.params.highlightId,
      actorType: 'researcher', actorId: dashboardAccessId,
      method: 'DELETE', path: `/api/research/layers/${req.params.layerId}/highlights/${req.params.highlightId}`,
      meta: JSON.stringify({ layerId: req.params.layerId }),
    });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// POST /api/research/layers/:id/share — share layer with another researcher
researchRoutes.post('/layers/:id/share', async (req, res, next) => {
  try {
    const dashboardAccessId = (req as any).dashboardAccessId;
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
    await logAudit({
      action: 'write', resource: 'layer-share', resourceId: share.id,
      actorType: 'researcher', actorId: dashboardAccessId,
      method: 'POST', path: `/api/research/layers/${req.params.id}/share`,
      meta: JSON.stringify({ layerId: req.params.id, sharedWithId: target.id, permission: permission || 'read' }),
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

// ═══════════════════════════════════════════════════════════════
// RESEARCHER REFLEXIVITY JOURNAL (MEMOS)
// NVivo-equivalent analytical/reflexive/methodological memo system
// ═══════════════════════════════════════════════════════════════

// GET /api/research/memos — list researcher's memos
researchRoutes.get('/memos', async (req, res, next) => {
  try {
    const dashboardAccessId = (req as any).dashboardAccessId;
    const { type, search } = req.query;

    const where: any = { dashboardAccessId };
    if (type) where.type = type as string;
    if (search) {
      where.OR = [
        { title: { contains: search as string } },
        { content: { contains: search as string } },
      ];
    }

    const memos = await prisma.researchMemo.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
    });
    res.json({ success: true, data: memos });
  } catch (err) {
    next(err);
  }
});

// POST /api/research/memos — create a new memo
researchRoutes.post('/memos', async (req, res, next) => {
  try {
    const dashboardAccessId = (req as any).dashboardAccessId;
    const { title, content, type, linkedResponseId, linkedTagId, linkedLayerId } = req.body;

    if (!title || !content) throw new AppError('Title and content are required', 400);
    const validTypes = ['analytical', 'reflexive', 'methodological', 'procedural'];
    if (type && !validTypes.includes(type)) throw new AppError(`Invalid memo type. Must be: ${validTypes.join(', ')}`, 400);

    const memo = await prisma.researchMemo.create({
      data: {
        dashboardAccessId,
        title,
        content,
        type: type || 'analytical',
        linkedResponseId: linkedResponseId || null,
        linkedTagId: linkedTagId || null,
        linkedLayerId: linkedLayerId || null,
      },
    });

    await logAudit({
      action: 'write', resource: 'research-memo', resourceId: memo.id,
      actorType: 'researcher', actorId: dashboardAccessId,
      method: 'POST', path: '/api/research/memos',
      meta: JSON.stringify({ title, type: memo.type }),
    });

    res.status(201).json({ success: true, data: memo });
  } catch (err) {
    next(err);
  }
});

// PUT /api/research/memos/:id — update a memo
researchRoutes.put('/memos/:id', async (req, res, next) => {
  try {
    const dashboardAccessId = (req as any).dashboardAccessId;
    const { title, content, type, linkedResponseId, linkedTagId, linkedLayerId } = req.body;

    const existing = await prisma.researchMemo.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new AppError('Memo not found', 404);
    if (existing.dashboardAccessId !== dashboardAccessId) throw new AppError('Access denied', 403);

    const validTypes = ['analytical', 'reflexive', 'methodological', 'procedural'];
    if (type && !validTypes.includes(type)) throw new AppError(`Invalid memo type. Must be: ${validTypes.join(', ')}`, 400);

    const data: any = {};
    if (title !== undefined) data.title = title;
    if (content !== undefined) data.content = content;
    if (type !== undefined) data.type = type;
    if (linkedResponseId !== undefined) data.linkedResponseId = linkedResponseId;
    if (linkedTagId !== undefined) data.linkedTagId = linkedTagId;
    if (linkedLayerId !== undefined) data.linkedLayerId = linkedLayerId;

    const memo = await prisma.researchMemo.update({
      where: { id: req.params.id },
      data,
    });

    await logAudit({
      action: 'update', resource: 'research-memo', resourceId: memo.id,
      actorType: 'researcher', actorId: dashboardAccessId,
      method: 'PUT', path: `/api/research/memos/${req.params.id}`,
      meta: JSON.stringify({ title: memo.title, type: memo.type }),
    });

    res.json({ success: true, data: memo });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/research/memos/:id — delete a memo
researchRoutes.delete('/memos/:id', async (req, res, next) => {
  try {
    const dashboardAccessId = (req as any).dashboardAccessId;
    const existing = await prisma.researchMemo.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new AppError('Memo not found', 404);
    if (existing.dashboardAccessId !== dashboardAccessId) throw new AppError('Access denied', 403);

    await prisma.researchMemo.delete({ where: { id: req.params.id } });

    await logAudit({
      action: 'delete', resource: 'research-memo', resourceId: req.params.id,
      actorType: 'researcher', actorId: dashboardAccessId,
      method: 'DELETE', path: `/api/research/memos/${req.params.id}`,
      meta: JSON.stringify({ title: existing.title }),
    });

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// GET /api/research/memos/export — export all memos as DOCX
researchRoutes.get('/memos/export', async (req, res, next) => {
  try {
    const dashboardAccessId = (req as any).dashboardAccessId;
    const memos = await prisma.researchMemo.findMany({
      where: { dashboardAccessId },
      orderBy: { updatedAt: 'desc' },
    });

    const children: any[] = [
      new Paragraph({ text: 'Research Reflexivity Journal', heading: HeadingLevel.TITLE }),
      new Paragraph({ text: `Exported: ${new Date().toISOString().slice(0, 10)}`, spacing: { after: 400 } }),
    ];

    const memosByType = new Map<string, typeof memos>();
    for (const m of memos) {
      if (!memosByType.has(m.type)) memosByType.set(m.type, []);
      memosByType.get(m.type)!.push(m);
    }

    for (const [type, typeMemos] of memosByType) {
      children.push(new Paragraph({ text: `${type.charAt(0).toUpperCase() + type.slice(1)} Memos`, heading: HeadingLevel.HEADING_1, spacing: { before: 400 } }));
      for (const m of typeMemos) {
        children.push(new Paragraph({ text: m.title, heading: HeadingLevel.HEADING_2, spacing: { before: 200 } }));
        children.push(new Paragraph({
          children: [new TextRun({ text: `Created: ${m.createdAt.toISOString().slice(0, 10)} | Updated: ${m.updatedAt.toISOString().slice(0, 10)}`, italics: true, size: 18, color: '666666' })],
          spacing: { after: 100 },
        }));
        // Split content by newlines for proper paragraphs
        for (const line of m.content.split('\n')) {
          children.push(new Paragraph({ text: line, spacing: { after: 60 } }));
        }
      }
    }

    const doc = new Document({ sections: [{ children }] });
    const buffer = await Packer.toBuffer(doc);

    const filename = `reflexivity-journal-${new Date().toISOString().slice(0, 10)}.docx`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.send(Buffer.from(buffer));
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════════════════════════
// CODEBOOK VERSIONING
// Snapshot codebook state at a point in time for methodological
// transparency and audit trail
// ═══════════════════════════════════════════════════════════════

// GET /api/research/codebook-snapshots — list all snapshots
researchRoutes.get('/codebook-snapshots', async (req, res, next) => {
  try {
    const dashboardAccessId = (req as any).dashboardAccessId;
    const snapshots = await prisma.codebookSnapshot.findMany({
      where: { dashboardAccessId },
      orderBy: { version: 'desc' },
    });
    // Parse snapshot JSON
    const data = snapshots.map(s => ({ ...s, snapshot: JSON.parse(s.snapshot) }));
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

// POST /api/research/codebook-snapshots — create a snapshot of current codebook state
researchRoutes.post('/codebook-snapshots', async (req, res, next) => {
  try {
    const dashboardAccessId = (req as any).dashboardAccessId;
    const { label } = req.body;
    if (!label) throw new AppError('Snapshot label is required', 400);

    // Get current codebook state
    const tags = await prisma.researchTag.findMany({
      where: { dashboardAccessId },
      include: {
        highlights: { select: { id: true } },
        layerHighlights: { select: { id: true } },
      },
    });

    // Build snapshot with usage stats
    const tagSnapshots = await Promise.all(tags.map(async (tag) => {
      const highlightCount = tag.highlights.length + tag.layerHighlights.length;
      // Get up to 3 example quotes
      const exampleHighlights = await prisma.textHighlight.findMany({
        where: { tagId: tag.id },
        select: { highlightedText: true },
        take: 3,
      });
      return {
        tagName: tag.name,
        color: tag.color,
        description: tag.description || '',
        highlightCount,
        exampleQuotes: exampleHighlights.map(h => h.highlightedText),
      };
    }));

    // Get next version number
    const lastSnapshot = await prisma.codebookSnapshot.findFirst({
      where: { dashboardAccessId },
      orderBy: { version: 'desc' },
    });
    const nextVersion = (lastSnapshot?.version || 0) + 1;

    const snapshot = await prisma.codebookSnapshot.create({
      data: {
        dashboardAccessId,
        version: nextVersion,
        label,
        snapshot: JSON.stringify(tagSnapshots),
      },
    });

    await logAudit({
      action: 'write', resource: 'codebook-snapshot', resourceId: snapshot.id,
      actorType: 'researcher', actorId: dashboardAccessId,
      method: 'POST', path: '/api/research/codebook-snapshots',
      meta: JSON.stringify({ version: nextVersion, label, tagCount: tagSnapshots.length }),
    });

    res.status(201).json({ success: true, data: { ...snapshot, snapshot: tagSnapshots } });
  } catch (err) {
    next(err);
  }
});

// GET /api/research/codebook-snapshots/compare — compare two versions
researchRoutes.get('/codebook-snapshots/compare', async (req, res, next) => {
  try {
    const dashboardAccessId = (req as any).dashboardAccessId;
    const { v1, v2 } = req.query;
    if (!v1 || !v2) throw new AppError('Both v1 and v2 version numbers are required', 400);

    const [snap1, snap2] = await Promise.all([
      prisma.codebookSnapshot.findFirst({ where: { dashboardAccessId, version: parseInt(v1 as string) } }),
      prisma.codebookSnapshot.findFirst({ where: { dashboardAccessId, version: parseInt(v2 as string) } }),
    ]);

    if (!snap1 || !snap2) throw new AppError('One or both snapshot versions not found', 404);

    const tags1: any[] = JSON.parse(snap1.snapshot);
    const tags2: any[] = JSON.parse(snap2.snapshot);

    const names1 = new Set(tags1.map(t => t.tagName));
    const names2 = new Set(tags2.map(t => t.tagName));

    const added = tags2.filter(t => !names1.has(t.tagName));
    const removed = tags1.filter(t => !names2.has(t.tagName));
    const modified = tags2.filter(t => {
      if (!names1.has(t.tagName)) return false;
      const old = tags1.find(o => o.tagName === t.tagName);
      return old && (old.color !== t.color || old.description !== t.description || old.highlightCount !== t.highlightCount);
    });

    res.json({
      success: true,
      data: {
        from: { version: snap1.version, label: snap1.label, createdAt: snap1.createdAt, tagCount: tags1.length },
        to: { version: snap2.version, label: snap2.label, createdAt: snap2.createdAt, tagCount: tags2.length },
        changes: {
          added: added.map(t => ({ tagName: t.tagName, color: t.color })),
          removed: removed.map(t => ({ tagName: t.tagName, color: t.color })),
          modified: modified.map(t => {
            const old = tags1.find(o => o.tagName === t.tagName);
            return {
              tagName: t.tagName,
              colorChanged: old.color !== t.color,
              descriptionChanged: old.description !== t.description,
              highlightCountDelta: t.highlightCount - old.highlightCount,
            };
          }),
        },
        summary: `${added.length} added, ${removed.length} removed, ${modified.length} modified`,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════════════════════════
// DATA SATURATION TRACKER
// Tracks "new codes per case" curve to indicate when theoretical
// saturation is approaching (no new themes emerging)
// ═══════════════════════════════════════════════════════════════

// GET /api/research/saturation — compute saturation curve
researchRoutes.get('/saturation', async (req, res, next) => {
  try {
    const dashboardAccessId = (req as any).dashboardAccessId;

    // Get all highlights by this researcher, ordered by creation time
    const highlights = await prisma.textHighlight.findMany({
      where: { dashboardAccessId },
      include: { tag: { select: { name: true } }, response: { select: { assessmentId: true } } },
      orderBy: { createdAt: 'asc' },
    });

    if (highlights.length === 0) {
      return res.json({
        success: true,
        data: {
          saturationCurve: [],
          totalCases: 0,
          totalUniqueCodes: 0,
          saturationIndex: 0,
          interpretation: 'No coding data available. Start coding narratives to track saturation.',
        },
      });
    }

    // Group highlights by assessment (case), in order of first contact
    const caseOrder: string[] = [];
    const caseCodeSets = new Map<string, Set<string>>();
    for (const h of highlights) {
      const caseId = h.response.assessmentId;
      if (!caseCodeSets.has(caseId)) {
        caseOrder.push(caseId);
        caseCodeSets.set(caseId, new Set());
      }
      caseCodeSets.get(caseId)!.add(h.tag.name);
    }

    // Build saturation curve: new codes introduced per case
    const seenCodes = new Set<string>();
    const saturationCurve: { caseIndex: number; caseId: string; newCodes: number; cumulativeCodes: number }[] = [];

    for (let i = 0; i < caseOrder.length; i++) {
      const caseId = caseOrder[i];
      const codes = caseCodeSets.get(caseId)!;
      let newCodes = 0;
      for (const code of codes) {
        if (!seenCodes.has(code)) {
          seenCodes.add(code);
          newCodes++;
        }
      }
      saturationCurve.push({
        caseIndex: i + 1,
        caseId,
        newCodes,
        cumulativeCodes: seenCodes.size,
      });
    }

    // Calculate saturation index: % of recent cases (last 25%) that introduced 0 new codes
    const recentCount = Math.max(1, Math.floor(caseOrder.length * 0.25));
    const recentCases = saturationCurve.slice(-recentCount);
    const zeroCases = recentCases.filter(c => c.newCodes === 0).length;
    const saturationIndex = Math.round((zeroCases / recentCount) * 100);

    let interpretation: string;
    if (caseOrder.length < 3) {
      interpretation = 'Too few cases coded to assess saturation. Continue coding.';
    } else if (saturationIndex >= 80) {
      interpretation = 'Strong saturation signal — no new codes emerging in recent cases. Your codebook appears stable.';
    } else if (saturationIndex >= 50) {
      interpretation = 'Approaching saturation — fewer new codes in recent cases. Consider whether remaining gaps warrant additional coding.';
    } else {
      interpretation = 'Not yet saturated — new codes still emerging regularly. Continue coding additional cases.';
    }

    res.json({
      success: true,
      data: {
        saturationCurve,
        totalCases: caseOrder.length,
        totalUniqueCodes: seenCodes.size,
        saturationIndex,
        interpretation,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════════════════════════
// SATURATION REPORT EXPORT (DOCX)
// Publication-ready saturation analysis report
// ═══════════════════════════════════════════════════════════════

// GET /api/research/saturation/report — generate saturation report as DOCX
researchRoutes.get('/saturation/report', async (req, res, next) => {
  try {
    const dashboardAccessId = (req as any).dashboardAccessId;

    // Reuse the same saturation computation logic from GET /saturation
    const highlights = await prisma.textHighlight.findMany({
      where: { dashboardAccessId },
      include: { tag: { select: { name: true } }, response: { select: { assessmentId: true } } },
      orderBy: { createdAt: 'asc' },
    });

    if (highlights.length === 0) {
      throw new AppError('No coding data available. Code some narratives before generating a saturation report.', 400);
    }

    // Group highlights by assessment (case), in order of first contact
    const caseOrder: string[] = [];
    const caseCodeSets = new Map<string, Set<string>>();
    for (const h of highlights) {
      const caseId = h.response.assessmentId;
      if (!caseCodeSets.has(caseId)) {
        caseOrder.push(caseId);
        caseCodeSets.set(caseId, new Set());
      }
      caseCodeSets.get(caseId)!.add(h.tag.name);
    }

    // Build saturation curve: new codes introduced per case
    const seenCodes = new Set<string>();
    const saturationCurve: { caseIndex: number; caseId: string; newCodes: number; cumulativeCodes: number }[] = [];

    for (let i = 0; i < caseOrder.length; i++) {
      const caseId = caseOrder[i];
      const codes = caseCodeSets.get(caseId)!;
      let newCodes = 0;
      for (const code of codes) {
        if (!seenCodes.has(code)) {
          seenCodes.add(code);
          newCodes++;
        }
      }
      saturationCurve.push({
        caseIndex: i + 1,
        caseId,
        newCodes,
        cumulativeCodes: seenCodes.size,
      });
    }

    // Calculate saturation index
    const recentCount = Math.max(1, Math.floor(caseOrder.length * 0.25));
    const recentCases = saturationCurve.slice(-recentCount);
    const zeroCases = recentCases.filter(c => c.newCodes === 0).length;
    const saturationIndex = Math.round((zeroCases / recentCount) * 100);

    // Determine interpretation text
    let interpretationText: string;
    if (caseOrder.length < 3) {
      interpretationText = 'However, with fewer than three cases coded, this assessment should be considered preliminary.';
    } else if (saturationIndex >= 80) {
      interpretationText = 'This suggests strong theoretical saturation has been achieved, with the codebook appearing stable and no substantively new themes emerging.';
    } else if (saturationIndex >= 50) {
      interpretationText = 'This suggests the analysis is approaching saturation, though some new themes may still emerge with additional data collection.';
    } else {
      interpretationText = 'This indicates that saturation has not yet been reached, as new codes continue to emerge regularly. Further data collection is recommended.';
    }

    // Find last case that introduced a new code
    let lastNewCodeCase = 0;
    for (const point of saturationCurve) {
      if (point.newCodes > 0) lastNewCodeCase = point.caseIndex;
    }

    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];

    // Build DOCX document
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          // Title
          new Paragraph({
            heading: HeadingLevel.TITLE,
            children: [new TextRun({ text: 'Data Saturation Analysis Report', bold: true })],
          }),
          // Date
          new Paragraph({
            spacing: { after: 300 },
            children: [new TextRun({ text: `Generated: ${dateStr}`, italics: true, color: '666666' })],
          }),

          // Section 1: Summary
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            children: [new TextRun({ text: '1. Summary', bold: true })],
          }),
          new Paragraph({
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: `Theoretical saturation was assessed using the code-emergence approach (Guest, Bunce & Johnson, 2006). Across ${caseOrder.length} coded cases, ${seenCodes.size} unique codes were identified. The saturation index \u2014 defined as the proportion of recent cases (last 25%) introducing zero new codes \u2014 reached ${saturationIndex}%. ${interpretationText} The last new code was introduced at Case ${lastNewCodeCase}.`,
              }),
            ],
          }),

          // Section 2: Saturation Curve Data
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            children: [new TextRun({ text: '2. Saturation Curve Data', bold: true })],
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              // Header row
              new TableRow({
                tableHeader: true,
                children: [
                  new TableCell({ width: { size: 33, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: 'Case Index', bold: true })] })] }),
                  new TableCell({ width: { size: 33, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: 'New Codes', bold: true })] })] }),
                  new TableCell({ width: { size: 34, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: 'Cumulative Codes', bold: true })] })] }),
                ],
              }),
              // Data rows
              ...saturationCurve.map(point =>
                new TableRow({
                  children: [
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: String(point.caseIndex) })] })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: String(point.newCodes) })] })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: String(point.cumulativeCodes) })] })] }),
                  ],
                })
              ),
            ],
          }),

          // Section 3: Methodology Note
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            children: [new TextRun({ text: '3. Methodology Note', bold: true })],
          }),
          new Paragraph({
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: 'Data saturation was evaluated using a code-emergence tracking approach. Cases were ordered chronologically based on initial coding contact. For each successive case, the number of newly introduced codes (i.e., codes not previously observed in any prior case) was recorded alongside the cumulative code total. The saturation index was calculated as the percentage of cases in the final quartile (last 25%) that introduced zero new codes. An index of 80% or above is interpreted as strong evidence of saturation, indicating that the codebook has stabilised and continued data collection is unlikely to yield substantively new themes. This approach follows the methodology outlined by Guest, Bunce, and Johnson (2006).',
              }),
            ],
          }),

          // Reference
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            children: [new TextRun({ text: 'References', bold: true })],
          }),
          new Paragraph({
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: 'Guest, G., Bunce, A., & Johnson, L. (2006). How many interviews are enough? An experiment with data saturation and variability. ',
              }),
              new TextRun({
                text: 'Field Methods',
                italics: true,
              }),
              new TextRun({
                text: ', 18(1), 59-82.',
              }),
            ],
          }),
        ],
      }],
    });

    const buffer = await Packer.toBuffer(doc);
    const filename = `saturation-report-${dateStr}.docx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(Buffer.from(buffer));
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════════════════════════
// IRR REPORT EXPORT (DOCX)
// Formatted inter-rater reliability report for ethics submissions
// and methodology chapters
// ═══════════════════════════════════════════════════════════════

// POST /api/research/irr/report — generate IRR report as DOCX
researchRoutes.post('/irr/report', async (req, res, next) => {
  try {
    const dashboardAccessId = (req as any).dashboardAccessId;
    const { otherDashboardCode } = req.body;
    if (!otherDashboardCode) throw new AppError('Other dashboard code is required', 400);

    // Replicate IRR calculation logic
    const dashboardCode = req.headers['x-dashboard-code'] as string;
    const [myAccess, otherAccess] = await Promise.all([
      prisma.dashboardAccess.findUnique({ where: { accessCode: dashboardCode } }),
      prisma.dashboardAccess.findUnique({ where: { accessCode: otherDashboardCode } }),
    ]);
    if (!myAccess || !otherAccess) throw new AppError('Invalid dashboard code', 401);

    const [myHighlights, otherHighlights] = await Promise.all([
      prisma.textHighlight.findMany({ where: { dashboardAccessId: myAccess.id }, include: { tag: true } }),
      prisma.textHighlight.findMany({ where: { dashboardAccessId: otherAccess.id }, include: { tag: true } }),
    ]);

    const responseIds1 = new Set(myHighlights.map(h => h.responseId));
    const responseIds2 = new Set(otherHighlights.map(h => h.responseId));
    const sharedResponseIds = [...responseIds1].filter(id => responseIds2.has(id));

    const tagMap1 = new Map<string, Set<string>>();
    for (const h of myHighlights) {
      if (!tagMap1.has(h.responseId)) tagMap1.set(h.responseId, new Set());
      tagMap1.get(h.responseId)!.add(h.tag.name);
    }
    const tagMap2 = new Map<string, Set<string>>();
    for (const h of otherHighlights) {
      if (!tagMap2.has(h.responseId)) tagMap2.set(h.responseId, new Set());
      tagMap2.get(h.responseId)!.add(h.tag.name);
    }

    const allTags1 = new Set<string>();
    const allTags2 = new Set<string>();
    for (const tags of tagMap1.values()) tags.forEach(t => allTags1.add(t));
    for (const tags of tagMap2.values()) tags.forEach(t => allTags2.add(t));
    const commonTags = [...allTags1].filter(t => allTags2.has(t));

    const irr = sharedResponseIds.length > 0 && commonTags.length > 0
      ? calculateIRR(sharedResponseIds, tagMap1, tagMap2, commonTags)
      : { overallKappa: 0, overallInterpretation: 'Insufficient data', percentageAgreement: 0, totalSharedResponses: sharedResponseIds.length, perTag: [] };

    // Build DOCX
    const children: any[] = [
      new Paragraph({ text: 'Inter-Rater Reliability Report', heading: HeadingLevel.TITLE }),
      new Paragraph({ text: `Generated: ${new Date().toISOString().slice(0, 10)}`, spacing: { after: 200 } }),
      new Paragraph({ text: 'Overview', heading: HeadingLevel.HEADING_1, spacing: { before: 300 } }),
      new Paragraph({ text: `This report presents Cohen's kappa inter-rater reliability analysis between two independent coders analysing qualitative narrative responses from the WISEShift assessment instrument.`, spacing: { after: 200 } }),
      new Paragraph({ text: 'Summary Statistics', heading: HeadingLevel.HEADING_1, spacing: { before: 300 } }),
    ];

    // Summary table
    const summaryTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({ children: [
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Metric', bold: true })] })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Value', bold: true })] })] }),
        ]}),
        new TableRow({ children: [
          new TableCell({ children: [new Paragraph('Overall Cohen\'s Kappa')] }),
          new TableCell({ children: [new Paragraph(irr.overallKappa.toFixed(3))] }),
        ]}),
        new TableRow({ children: [
          new TableCell({ children: [new Paragraph('Interpretation')] }),
          new TableCell({ children: [new Paragraph(irr.overallInterpretation)] }),
        ]}),
        new TableRow({ children: [
          new TableCell({ children: [new Paragraph('Percentage Agreement')] }),
          new TableCell({ children: [new Paragraph(`${irr.percentageAgreement}%`)] }),
        ]}),
        new TableRow({ children: [
          new TableCell({ children: [new Paragraph('Shared Responses Analysed')] }),
          new TableCell({ children: [new Paragraph(String(irr.totalSharedResponses))] }),
        ]}),
        new TableRow({ children: [
          new TableCell({ children: [new Paragraph('Common Tags')] }),
          new TableCell({ children: [new Paragraph(String(commonTags.length))] }),
        ]}),
      ],
    });
    children.push(summaryTable);

    // Per-tag breakdown
    if (irr.perTag.length > 0) {
      children.push(new Paragraph({ text: 'Per-Tag Agreement', heading: HeadingLevel.HEADING_1, spacing: { before: 400 } }));

      const headerRow = new TableRow({ children: [
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Tag', bold: true })] })] }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Kappa', bold: true })] })] }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Interpretation', bold: true })] })] }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Rater 1', bold: true })] })] }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Rater 2', bold: true })] })] }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Both', bold: true })] })] }),
      ]});

      const tagRows = irr.perTag.map((t: any) => new TableRow({ children: [
        new TableCell({ children: [new Paragraph(t.tagName)] }),
        new TableCell({ children: [new Paragraph(t.kappa.toFixed(3))] }),
        new TableCell({ children: [new Paragraph(t.interpretation)] }),
        new TableCell({ children: [new Paragraph(String(t.rater1Count))] }),
        new TableCell({ children: [new Paragraph(String(t.rater2Count))] }),
        new TableCell({ children: [new Paragraph(String(t.bothCount))] }),
      ]}));

      children.push(new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [headerRow, ...tagRows],
      }));
    }

    // Methodology text
    children.push(new Paragraph({ text: 'Methodology Statement', heading: HeadingLevel.HEADING_1, spacing: { before: 400 } }));
    children.push(new Paragraph({
      text: `Inter-rater reliability was assessed using Cohen's kappa coefficient (Cohen, 1960). Two independent coders applied a shared codebook of ${commonTags.length} codes to ${irr.totalSharedResponses} narrative responses. The overall kappa of ${irr.overallKappa.toFixed(3)} indicates ${irr.overallInterpretation.toLowerCase()} agreement (Landis & Koch, 1977). Percentage agreement across all coded segments was ${irr.percentageAgreement}%.`,
      spacing: { after: 200 },
    }));
    children.push(new Paragraph({ text: 'Interpretation Scale', heading: HeadingLevel.HEADING_2, spacing: { before: 200 } }));
    children.push(new Paragraph({
      children: [new TextRun({ text: 'Following Landis & Koch (1977): <0 = Poor, 0.00-0.20 = Slight, 0.21-0.40 = Fair, 0.41-0.60 = Moderate, 0.61-0.80 = Substantial, 0.81-1.00 = Almost Perfect.', italics: true })],
      spacing: { after: 200 },
    }));
    children.push(new Paragraph({ text: 'References', heading: HeadingLevel.HEADING_1, spacing: { before: 300 } }));
    children.push(new Paragraph({ text: 'Cohen, J. (1960). A coefficient of agreement for nominal scales. Educational and Psychological Measurement, 20(1), 37-46.', spacing: { after: 100 } }));
    children.push(new Paragraph({ text: 'Landis, J. R., & Koch, G. G. (1977). The measurement of observer agreement for categorical data. Biometrics, 33(1), 159-174.' }));

    const doc = new Document({ sections: [{ children }] });
    const buffer = await Packer.toBuffer(doc);

    await logAudit({
      action: 'export', resource: 'irr-report',
      actorType: 'researcher', actorId: dashboardAccessId,
      method: 'POST', path: '/api/research/irr/report',
      meta: JSON.stringify({ overallKappa: irr.overallKappa, sharedResponses: irr.totalSharedResponses }),
    });

    const filename = `irr-report-${new Date().toISOString().slice(0, 10)}.docx`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.send(Buffer.from(buffer));
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════════════════════════
// CROSS-CASE MATRIX
// ═══════════════════════════════════════════════════════════════

// GET /api/research/matrix — Build case × theme matrix
researchRoutes.get('/matrix', async (req, res, next) => {
  try {
    const dashboardAccessId = (req as any).dashboardAccessId;

    // 1. Get all completed assessments with organisations
    const assessments = await prisma.assessment.findMany({
      where: { status: 'completed', domainScores: { some: {} } },
      include: {
        organisation: {
          select: { country: true, sector: true, size: true, legalStructure: true },
        },
      },
      orderBy: { completedAt: 'desc' },
    });

    // 2. Get all research tags for this dashboard
    const tags = await prisma.researchTag.findMany({
      where: { dashboardAccessId },
      select: { id: true, name: true, color: true },
      orderBy: { name: 'asc' },
    });

    // 3. Get all highlights for this dashboard, grouped by (assessmentId, tagId)
    const highlights = await prisma.textHighlight.findMany({
      where: { dashboardAccessId },
      include: {
        response: { select: { assessmentId: true } },
      },
    });

    // Count per (assessmentId, tagId)
    const countMap = new Map<string, number>();
    for (const h of highlights) {
      const key = `${h.response.assessmentId}|${h.tagId}`;
      countMap.set(key, (countMap.get(key) || 0) + 1);
    }

    // 4. Get all MatrixCellSummary records for this dashboard
    const summaries = await prisma.matrixCellSummary.findMany({
      where: { dashboardAccessId },
    });
    const summaryMap = new Map<string, string>();
    for (const s of summaries) {
      summaryMap.set(`${s.assessmentId}|${s.tagId}`, s.summary);
    }

    // 5. Build rows, columns, cells
    const rows = assessments.map((a, idx) => ({
      assessmentId: a.id,
      label: `Case ${idx + 1}`,
      country: a.organisation.country ?? undefined,
      sector: a.organisation.sector ?? undefined,
      overallScore: a.overallScore ?? undefined,
    }));

    const columns = tags.map(t => ({
      tagId: t.id,
      tagName: t.name,
      color: t.color,
    }));

    const cells: { assessmentId: string; tagId: string; highlightCount: number; summary?: string }[] = [];
    for (const a of assessments) {
      for (const t of tags) {
        const key = `${a.id}|${t.id}`;
        const highlightCount = countMap.get(key) || 0;
        const summary = summaryMap.get(key);
        cells.push({
          assessmentId: a.id,
          tagId: t.id,
          highlightCount,
          ...(summary ? { summary } : {}),
        });
      }
    }

    res.json({ success: true, data: { rows, columns, cells } });
  } catch (err) {
    next(err);
  }
});

// GET /api/research/matrix/cell?assessmentId=X&tagId=Y — Drilldown into a specific cell
researchRoutes.get('/matrix/cell', async (req, res, next) => {
  try {
    const dashboardAccessId = (req as any).dashboardAccessId;
    const { assessmentId, tagId } = req.query;

    if (!assessmentId || !tagId) {
      throw new AppError('assessmentId and tagId are required', 400);
    }

    // Get highlights where response.assessmentId matches AND tagId matches
    const highlights = await prisma.textHighlight.findMany({
      where: {
        dashboardAccessId,
        tagId: tagId as string,
        response: { assessmentId: assessmentId as string },
      },
      include: {
        response: { select: { domainKey: true, questionId: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Get the MatrixCellSummary if it exists
    const summaryRecord = await prisma.matrixCellSummary.findUnique({
      where: {
        dashboardAccessId_assessmentId_tagId: {
          dashboardAccessId,
          assessmentId: assessmentId as string,
          tagId: tagId as string,
        },
      },
    });

    res.json({
      success: true,
      data: {
        assessmentId,
        tagId,
        highlights: highlights.map(h => ({
          id: h.id,
          highlightedText: h.highlightedText,
          domainKey: h.response.domainKey,
          questionId: h.response.questionId,
        })),
        summary: summaryRecord?.summary,
      },
    });
  } catch (err) {
    next(err);
  }
});

// PUT /api/research/matrix/cell-summary — Upsert a cell summary
researchRoutes.put('/matrix/cell-summary', async (req, res, next) => {
  try {
    const dashboardAccessId = (req as any).dashboardAccessId;
    const { assessmentId, tagId, summary } = req.body;

    if (!assessmentId || !tagId || typeof summary !== 'string') {
      throw new AppError('assessmentId, tagId, and summary are required', 400);
    }

    const record = await prisma.matrixCellSummary.upsert({
      where: {
        dashboardAccessId_assessmentId_tagId: {
          dashboardAccessId,
          assessmentId,
          tagId,
        },
      },
      update: { summary },
      create: { dashboardAccessId, assessmentId, tagId, summary },
    });

    await logAudit({
      action: 'update', resource: 'matrix-cell-summary', resourceId: record.id,
      actorType: 'researcher', actorId: dashboardAccessId,
      method: 'PUT', path: '/api/research/matrix/cell-summary',
      meta: JSON.stringify({ assessmentId, tagId }),
    });

    res.json({ success: true, data: record });
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════════════════════════
// LONGITUDINAL TRACKING
// ═══════════════════════════════════════════════════════════════

// GET /api/research/longitudinal
researchRoutes.get('/longitudinal', async (req, res, next) => {
  try {
    const assessments = await prisma.assessment.findMany({
      where: { status: 'completed' },
      include: {
        domainScores: true,
        organisation: { select: { id: true, country: true, sector: true } },
      },
      orderBy: { completedAt: 'asc' },
    });

    if (assessments.length === 0) {
      return res.json({ success: true, data: { cases: [], totalOrganisationsWithMultipleRounds: 0 } });
    }

    // Index assessments by id for chain-tracing
    const byId = new Map(assessments.map(a => [a.id, a]));

    // Build forward map: previousAssessmentId → next assessment
    type AssessmentRow = typeof assessments[number];
    const forwardMap = new Map<string, AssessmentRow>();
    for (const a of assessments) {
      if (a.previousAssessmentId) {
        forwardMap.set(a.previousAssessmentId, a);
      }
    }

    // Build chains by tracing backward to root, then forward
    const visited = new Set<string>();
    const chains: AssessmentRow[][] = [];

    for (const a of assessments) {
      if (visited.has(a.id)) continue;

      // Trace backward to find the root of this chain
      let root = a;
      const backVisited = new Set<string>([a.id]);
      while (root.previousAssessmentId && byId.has(root.previousAssessmentId) && !backVisited.has(root.previousAssessmentId)) {
        root = byId.get(root.previousAssessmentId)!;
        backVisited.add(root.id);
      }

      // Trace forward from root to build the full chain
      const chain: AssessmentRow[] = [];
      let current: AssessmentRow | undefined = root;
      const chainVisited = new Set<string>();
      while (current && !chainVisited.has(current.id)) {
        chain.push(current);
        chainVisited.add(current.id);
        visited.add(current.id);
        current = forwardMap.get(current.id);
      }

      chains.push(chain);
    }

    // Group chains by organisationId — merge all chains for the same org
    const orgMap = new Map<string, AssessmentRow[]>();
    for (const chain of chains) {
      const orgId = chain[0].organisationId;
      if (!orgMap.has(orgId)) orgMap.set(orgId, []);
      for (const a of chain) {
        // Avoid duplicates if multiple chains share an org
        if (!orgMap.get(orgId)!.find(x => x.id === a.id)) {
          orgMap.get(orgId)!.push(a);
        }
      }
    }

    // Build LongitudinalCase for each org
    let orgCounter = 0;
    let multiRoundCount = 0;
    const cases: any[] = [];

    for (const [orgId, orgList] of orgMap) {
      orgCounter++;

      // Sort chronologically
      orgList.sort((a, b) => {
        const aDate = a.completedAt?.getTime() || a.createdAt.getTime();
        const bDate = b.completedAt?.getTime() || b.createdAt.getTime();
        return aDate - bDate;
      });

      const org = orgList[0].organisation;

      const rounds = orgList.map((a, idx) => ({
        assessmentId: a.id,
        roundNumber: idx + 1,
        overallScore: a.overallScore,
        domainScores: Object.fromEntries(
          a.domainScores.map(ds => [ds.domainKey, ds.score])
        ),
        completedAt: a.completedAt?.toISOString() || null,
      }));

      if (rounds.length >= 2) multiRoundCount++;

      cases.push({
        organisationId: orgId,
        label: `Organisation ${orgCounter}`,
        country: org.country || undefined,
        sector: org.sector || undefined,
        rounds,
      });
    }

    // Sort: multi-round cases first, then by number of rounds descending
    cases.sort((a, b) => b.rounds.length - a.rounds.length);

    res.json({
      success: true,
      data: { cases, totalOrganisationsWithMultipleRounds: multiRoundCount },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/research/longitudinal/:assessmentId
researchRoutes.get('/longitudinal/:assessmentId', async (req, res, next) => {
  try {
    const { assessmentId } = req.params;

    const target = await prisma.assessment.findUnique({
      where: { id: assessmentId },
      include: {
        domainScores: true,
        organisation: { select: { id: true, country: true, sector: true } },
      },
    });

    if (!target || target.status !== 'completed') {
      throw new AppError('Assessment not found or not completed', 404);
    }

    // Load all completed assessments for this organisation
    const orgAssessments = await prisma.assessment.findMany({
      where: { organisationId: target.organisationId, status: 'completed' },
      include: { domainScores: true },
      orderBy: { completedAt: 'asc' },
    });

    // Index by id
    const byId = new Map(orgAssessments.map(a => [a.id, a]));

    // Build forward map
    const forwardMap = new Map<string, typeof orgAssessments[number]>();
    for (const a of orgAssessments) {
      if (a.previousAssessmentId) {
        forwardMap.set(a.previousAssessmentId, a);
      }
    }

    // Trace backward to root using IDs
    let rootId = target.id;
    const backVisited = new Set<string>([target.id]);
    {
      let cur = byId.get(rootId);
      while (cur?.previousAssessmentId && byId.has(cur.previousAssessmentId) && !backVisited.has(cur.previousAssessmentId)) {
        rootId = cur.previousAssessmentId;
        backVisited.add(rootId);
        cur = byId.get(rootId);
      }
    }

    // Trace forward from root
    const chain: typeof orgAssessments = [];
    let current: typeof orgAssessments[number] | undefined = byId.get(rootId);
    const chainVisited = new Set<string>();
    while (current && !chainVisited.has(current.id)) {
      chain.push(current);
      chainVisited.add(current.id);
      current = forwardMap.get(current.id);
    }

    // Sort chronologically
    chain.sort((a, b) => {
      const aDate = a.completedAt?.getTime() || a.createdAt.getTime();
      const bDate = b.completedAt?.getTime() || b.createdAt.getTime();
      return aDate - bDate;
    });

    const rounds = chain.map((a, idx) => ({
      assessmentId: a.id,
      roundNumber: idx + 1,
      overallScore: a.overallScore,
      domainScores: Object.fromEntries(
        a.domainScores.map(ds => [ds.domainKey, ds.score])
      ),
      completedAt: a.completedAt?.toISOString() || null,
    }));

    const org = target.organisation;

    res.json({
      success: true,
      data: {
        organisationId: target.organisationId,
        label: 'Selected Organisation',
        country: org.country || undefined,
        sector: org.sector || undefined,
        rounds,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════════════════════════
// CO-OCCURRENCE MATRIX
// ═══════════════════════════════════════════════════════════════

// GET /api/research/cooccurrence?level=response|passage
researchRoutes.get('/cooccurrence', async (req, res, next) => {
  try {
    const dashboardAccessId = (req as any).dashboardAccessId;
    const level = (req.query.level as string) === 'passage' ? 'passage' : 'response';

    // 1. Fetch all tags
    const tags = await prisma.researchTag.findMany({
      where: { dashboardAccessId },
      select: { id: true, name: true, color: true },
      orderBy: { name: 'asc' },
    });

    if (tags.length < 2) {
      return res.json({
        success: true,
        data: {
          tags,
          matrix: tags.map(() => tags.map(() => 0)),
          maxCount: 0,
          level,
        },
      });
    }

    // 2. Fetch all highlights
    const highlights = await prisma.textHighlight.findMany({
      where: { dashboardAccessId },
      select: {
        id: true,
        tagId: true,
        responseId: true,
        startOffset: true,
        endOffset: true,
      },
    });

    // Build tag index map for fast lookups
    const tagIndex = new Map<string, number>();
    tags.forEach((t, i) => tagIndex.set(t.id, i));

    const n = tags.length;
    const matrix: number[][] = Array.from({ length: n }, () => Array(n).fill(0));

    if (level === 'response') {
      // 3. Response-level: Group highlights by responseId
      const byResponse = new Map<string, Set<string>>();
      for (const h of highlights) {
        if (!tagIndex.has(h.tagId)) continue;
        let tagSet = byResponse.get(h.responseId);
        if (!tagSet) {
          tagSet = new Set<string>();
          byResponse.set(h.responseId, tagSet);
        }
        tagSet.add(h.tagId);
      }

      // For each response, increment count for every pair of tags that both appear
      for (const tagSet of byResponse.values()) {
        const tagArr = Array.from(tagSet);
        for (let a = 0; a < tagArr.length; a++) {
          for (let b = a + 1; b < tagArr.length; b++) {
            const i = tagIndex.get(tagArr[a])!;
            const j = tagIndex.get(tagArr[b])!;
            matrix[i][j]++;
            matrix[j][i]++;
          }
        }
      }
    } else {
      // 4. Passage-level: Check for overlapping highlight ranges within same response
      const byResponse = new Map<string, typeof highlights>();
      for (const h of highlights) {
        if (!tagIndex.has(h.tagId)) continue;
        let arr = byResponse.get(h.responseId);
        if (!arr) {
          arr = [];
          byResponse.set(h.responseId, arr);
        }
        arr.push(h);
      }

      // For each response, check all pairs of highlights for overlap
      for (const responseHighlights of byResponse.values()) {
        // Track which tag pairs we've already counted for this response
        // to avoid counting the same pair multiple times from multiple overlapping highlights
        const counted = new Set<string>();
        for (let a = 0; a < responseHighlights.length; a++) {
          for (let b = a + 1; b < responseHighlights.length; b++) {
            const h1 = responseHighlights[a];
            const h2 = responseHighlights[b];
            // Skip same tag
            if (h1.tagId === h2.tagId) continue;
            // Check overlap: h1.endOffset > h2.startOffset && h2.endOffset > h1.startOffset
            if (h1.endOffset > h2.startOffset && h2.endOffset > h1.startOffset) {
              const i = tagIndex.get(h1.tagId)!;
              const j = tagIndex.get(h2.tagId)!;
              const pairKey = i < j ? `${i}|${j}` : `${j}|${i}`;
              if (!counted.has(pairKey)) {
                counted.add(pairKey);
                const mi = Math.min(i, j);
                const mj = Math.max(i, j);
                matrix[mi][mj]++;
                matrix[mj][mi]++;
              }
            }
          }
        }
      }
    }

    // 5. Compute maxCount
    let maxCount = 0;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        if (matrix[i][j] > maxCount) maxCount = matrix[i][j];
      }
    }

    res.json({
      success: true,
      data: { tags, matrix, maxCount, level },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/research/cooccurrence/drilldown?tag1=...&tag2=...
researchRoutes.get('/cooccurrence/drilldown', async (req, res, next) => {
  try {
    const dashboardAccessId = (req as any).dashboardAccessId;
    const { tag1, tag2 } = req.query;

    if (!tag1 || !tag2) {
      throw new AppError('tag1 and tag2 query params are required', 400);
    }

    const tag1Id = tag1 as string;
    const tag2Id = tag2 as string;

    // Verify both tags belong to this dashboard
    const [tagA, tagB] = await Promise.all([
      prisma.researchTag.findFirst({ where: { id: tag1Id, dashboardAccessId } }),
      prisma.researchTag.findFirst({ where: { id: tag2Id, dashboardAccessId } }),
    ]);

    if (!tagA || !tagB) {
      throw new AppError('One or both tags not found', 404);
    }

    // Find responseIds where BOTH tags have highlights
    const [highlightsTag1, highlightsTag2] = await Promise.all([
      prisma.textHighlight.findMany({
        where: { dashboardAccessId, tagId: tag1Id },
        select: { responseId: true, id: true, highlightedText: true, startOffset: true, endOffset: true },
      }),
      prisma.textHighlight.findMany({
        where: { dashboardAccessId, tagId: tag2Id },
        select: { responseId: true, id: true, highlightedText: true, startOffset: true, endOffset: true },
      }),
    ]);

    const tag1ResponseIds = new Set(highlightsTag1.map(h => h.responseId));
    const tag2ResponseIds = new Set(highlightsTag2.map(h => h.responseId));
    const sharedResponseIds = [...tag1ResponseIds].filter(id => tag2ResponseIds.has(id));

    if (sharedResponseIds.length === 0) {
      return res.json({ success: true, data: [] });
    }

    // Limit to 50 results
    const limitedIds = sharedResponseIds.slice(0, 50);

    // Fetch full response data
    const responses = await prisma.response.findMany({
      where: { id: { in: limitedIds } },
      include: {
        assessment: {
          include: {
            organisation: true,
          },
        },
      },
    });

    const responseMap = new Map(responses.map(r => [r.id, r]));

    const results = limitedIds.map(responseId => {
      const response = responseMap.get(responseId);
      if (!response) return null;

      return {
        responseId,
        questionText: questionText(response.domainKey, response.questionId),
        anonymisedContext: anonymiseOrg(response.assessment.organisation),
        textValue: response.textValue || '',
        tag1Highlights: highlightsTag1
          .filter(h => h.responseId === responseId)
          .map(h => ({ id: h.id, highlightedText: h.highlightedText, startOffset: h.startOffset, endOffset: h.endOffset })),
        tag2Highlights: highlightsTag2
          .filter(h => h.responseId === responseId)
          .map(h => ({ id: h.id, highlightedText: h.highlightedText, startOffset: h.startOffset, endOffset: h.endOffset })),
      };
    }).filter(Boolean);

    res.json({ success: true, data: results });
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════════════════════════
// WORD FREQUENCY
// ═══════════════════════════════════════════════════════════════

// GET /word-frequency — Word frequencies across all narrative responses
researchRoutes.get('/word-frequency', async (req, res, next) => {
  try {
    const minLength = Math.max(1, parseInt(req.query.minLength as string, 10) || 3);
    const minCount = Math.max(1, parseInt(req.query.minCount as string, 10) || 2);
    const limit = Math.min(500, Math.max(1, parseInt(req.query.limit as string, 10) || 200));
    const domainKey = (req.query.domainKey as string) || undefined;

    // Build where clause for narrative responses
    const where: any = {
      questionType: 'narrative',
      textValue: { not: null },
      assessment: { status: 'completed' },
    };
    if (domainKey) {
      where.domainKey = domainKey;
    }

    const responses = await prisma.response.findMany({
      where,
      select: { textValue: true },
    });

    const texts = responses.map(r => r.textValue).filter((t): t is string => !!t);

    if (texts.length === 0) {
      return res.json({
        success: true,
        data: { words: [], totalWords: 0, uniqueWords: 0 },
      });
    }

    // Use a large topN so we get the full frequency map, then apply our own filters
    const rawFrequencies = extractWordFrequencies(texts, 10000);

    // Apply minLength filter
    const filtered = rawFrequencies.filter(w => w.text.length >= minLength && w.value >= minCount);

    // Calculate totalWords from all words (before filtering) — sum of all values
    const totalWords = rawFrequencies.reduce((sum, w) => sum + w.value, 0);
    const uniqueWords = rawFrequencies.length;

    // Apply limit
    const limited = filtered.slice(0, limit);

    // Build response with percentage
    const words = limited.map(w => ({
      text: w.text,
      count: w.value,
      percentage: totalWords > 0 ? Math.round((w.value / totalWords) * 10000) / 100 : 0,
    }));

    res.json({
      success: true,
      data: { words, totalWords, uniqueWords },
    });
  } catch (err) {
    next(err);
  }
});

// GET /word-frequency/by-tag — Word frequencies within text coded with a specific tag
researchRoutes.get('/word-frequency/by-tag', async (req, res, next) => {
  try {
    const dashboardAccessId = (req as any).dashboardAccessId;
    const tagId = req.query.tagId as string;

    if (!tagId) {
      throw new AppError('tagId query parameter is required', 400);
    }

    // Verify the tag exists and belongs to this dashboard
    const tag = await prisma.researchTag.findFirst({
      where: { id: tagId, dashboardAccessId },
    });

    if (!tag) {
      throw new AppError('Tag not found', 404);
    }

    // Fetch all highlights for this tag
    const highlights = await prisma.textHighlight.findMany({
      where: { tagId, dashboardAccessId },
      select: { highlightedText: true },
    });

    const texts = highlights.map(h => h.highlightedText).filter(Boolean);

    if (texts.length === 0) {
      return res.json({
        success: true,
        data: { words: [], totalWords: 0, uniqueWords: 0 },
      });
    }

    const minLength = Math.max(1, parseInt(req.query.minLength as string, 10) || 3);
    const minCount = Math.max(1, parseInt(req.query.minCount as string, 10) || 1);
    const limit = Math.min(500, Math.max(1, parseInt(req.query.limit as string, 10) || 200));

    const rawFrequencies = extractWordFrequencies(texts, 10000);
    const filtered = rawFrequencies.filter(w => w.text.length >= minLength && w.value >= minCount);
    const totalWords = rawFrequencies.reduce((sum, w) => sum + w.value, 0);
    const uniqueWords = rawFrequencies.length;
    const limited = filtered.slice(0, limit);

    const words = limited.map(w => ({
      text: w.text,
      count: w.value,
      percentage: totalWords > 0 ? Math.round((w.value / totalWords) * 10000) / 100 : 0,
    }));

    res.json({
      success: true,
      data: { words, totalWords, uniqueWords },
    });
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════════════════════════
// BOOLEAN / COMPOUND QUERIES
// ═══════════════════════════════════════════════════════════════

// Helper: recursively execute a query tree and return matching responseIds
async function executeQueryTree(
  node: any,
  dashboardAccessId: string,
): Promise<Set<string>> {
  // Leaf node — a single tag
  if ('tagId' in node) {
    const highlights = await prisma.textHighlight.findMany({
      where: { dashboardAccessId, tagId: node.tagId },
      select: { responseId: true },
    });
    return new Set(highlights.map(h => h.responseId));
  }

  // Operator node
  const { operator, operands } = node;
  const operandSets = await Promise.all(
    operands.map((op: any) => executeQueryTree(op, dashboardAccessId)),
  );

  if (operandSets.length === 0) return new Set();

  if (operator === 'AND') {
    // Intersection of all operand sets
    let result: Set<string> = operandSets[0];
    for (let i = 1; i < operandSets.length; i++) {
      const next = operandSets[i];
      result = new Set<string>([...result].filter(id => next.has(id)));
    }
    return result;
  }

  if (operator === 'OR') {
    // Union of all operand sets
    const result = new Set<string>();
    for (const s of operandSets) {
      for (const id of s) result.add(id);
    }
    return result;
  }

  if (operator === 'NOT') {
    // First operand set minus all subsequent operand sets
    const result = new Set<string>(operandSets[0]);
    for (let i = 1; i < operandSets.length; i++) {
      for (const id of operandSets[i]) result.delete(id);
    }
    return result;
  }

  return new Set<string>();
}

// Helper: collect all tagIds referenced in a query tree
function collectTagIds(node: any): string[] {
  if ('tagId' in node) return [node.tagId];
  const ids: string[] = [];
  for (const op of node.operands || []) {
    ids.push(...collectTagIds(op));
  }
  return ids;
}

// POST /api/research/queries/execute — Execute a boolean query and return matching passages
researchRoutes.post('/queries/execute', validate(executeQuerySchema), async (req, res, next) => {
  try {
    const dashboardAccessId = (req as any).dashboardAccessId;
    const { query, page, pageSize } = req.body;

    // 1. Execute the query tree recursively
    const matchingIds = await executeQueryTree(query, dashboardAccessId);
    const allResponseIds = [...matchingIds];
    const total = allResponseIds.length;

    if (total === 0) {
      return res.json({
        success: true,
        data: { results: [], total: 0, page, pageSize },
      });
    }

    // 2. Paginate the responseIds
    const startIdx = (page - 1) * pageSize;
    const pageIds = allResponseIds.slice(startIdx, startIdx + pageSize);

    // 3. Fetch full response data
    const responses = await prisma.response.findMany({
      where: { id: { in: pageIds } },
      include: {
        assessment: {
          include: {
            organisation: true,
            domainScores: true,
          },
        },
      },
    });

    // 4. Get all tag IDs referenced in the query for matchingTagIds
    const queryTagIds = collectTagIds(query);

    // 5. Fetch highlights for these responses to determine which tags matched
    const highlights = await prisma.textHighlight.findMany({
      where: {
        dashboardAccessId,
        responseId: { in: pageIds },
        tagId: { in: queryTagIds },
      },
      select: { responseId: true, tagId: true },
    });

    // Build responseId -> Set of matching tagIds
    const matchingTagMap = new Map<string, Set<string>>();
    for (const h of highlights) {
      let s = matchingTagMap.get(h.responseId);
      if (!s) {
        s = new Set();
        matchingTagMap.set(h.responseId, s);
      }
      s.add(h.tagId);
    }

    // 6. Build result items
    const results = responses.map(r => {
      const ds = r.assessment.domainScores.find(s => s.domainKey === r.domainKey)
        || r.assessment.domainScores.find(s => s.domainKey === (findDomain(r.domainKey)?.key || ''));
      const score = ds && ds.score > 0 ? ds.score : null;

      return {
        responseId: r.id,
        questionText: questionText(r.domainKey, r.questionId),
        textValue: r.textValue || '',
        anonymisedContext: anonymiseOrg(r.assessment.organisation),
        domainKey: r.domainKey,
        domainName: domainName(r.domainKey),
        domainScore: score,
        matchingTagIds: [...(matchingTagMap.get(r.id) || [])],
      };
    });

    res.json({
      success: true,
      data: { results, total, page, pageSize },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/research/queries/save — Save a named query
researchRoutes.post('/queries/save', validate(saveQuerySchema), async (req, res, next) => {
  try {
    const dashboardAccessId = (req as any).dashboardAccessId;
    const { name, query } = req.body;

    const saved = await prisma.savedQuery.create({
      data: {
        dashboardAccessId,
        name,
        query: JSON.stringify(query),
      },
    });

    await logAudit({
      action: 'write', resource: 'saved-query', resourceId: saved.id,
      actorType: 'researcher', actorId: dashboardAccessId,
      method: 'POST', path: '/api/research/queries/save',
      meta: JSON.stringify({ name }),
    });

    res.status(201).json({
      success: true,
      data: {
        id: saved.id,
        name: saved.name,
        query: JSON.parse(saved.query),
        createdAt: saved.createdAt.toISOString(),
        updatedAt: saved.updatedAt.toISOString(),
      },
    });
  } catch (err: any) {
    if (err?.code === 'P2002') {
      return res.status(409).json({
        success: false,
        error: 'A saved query with this name already exists. Please choose a different name.',
      });
    }
    next(err);
  }
});

// GET /api/research/queries — List saved queries
researchRoutes.get('/queries', async (req, res, next) => {
  try {
    const dashboardAccessId = (req as any).dashboardAccessId;

    const queries = await prisma.savedQuery.findMany({
      where: { dashboardAccessId },
      orderBy: { updatedAt: 'desc' },
    });

    const data = queries.map(q => ({
      id: q.id,
      name: q.name,
      query: JSON.parse(q.query),
      createdAt: q.createdAt.toISOString(),
      updatedAt: q.updatedAt.toISOString(),
    }));

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/research/queries/:id — Delete a saved query
researchRoutes.delete('/queries/:id', async (req, res, next) => {
  try {
    const dashboardAccessId = (req as any).dashboardAccessId;
    const { id } = req.params;

    const existing = await prisma.savedQuery.findFirst({
      where: { id, dashboardAccessId },
    });

    if (!existing) {
      throw new AppError('Saved query not found', 404);
    }

    await prisma.savedQuery.delete({ where: { id } });

    await logAudit({
      action: 'delete', resource: 'saved-query', resourceId: id,
      actorType: 'researcher', actorId: dashboardAccessId,
      method: 'DELETE', path: `/api/research/queries/${id}`,
      meta: JSON.stringify({ name: existing.name }),
    });

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════════════════════
// ─── Concept Map / Theory Building ───────────────────────
// ═══════════════════════════════════════════════════════════

// GET /api/research/concept-maps — List all saved concept maps
researchRoutes.get('/concept-maps', async (req, res, next) => {
  try {
    const dashboardAccessId = (req as any).dashboardAccessId;

    const maps = await prisma.conceptMap.findMany({
      where: { dashboardAccessId },
      orderBy: { updatedAt: 'desc' },
    });

    const data = maps.map(m => ({
      id: m.id,
      name: m.name,
      nodes: JSON.parse(m.nodes),
      edges: JSON.parse(m.edges),
      viewport: m.viewport ? JSON.parse(m.viewport) : undefined,
      createdAt: m.createdAt.toISOString(),
      updatedAt: m.updatedAt.toISOString(),
    }));

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

// POST /api/research/concept-maps — Create a new concept map
researchRoutes.post('/concept-maps', async (req, res, next) => {
  try {
    const dashboardAccessId = (req as any).dashboardAccessId;
    const { name } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      throw new AppError('Name is required', 400);
    }

    const map = await prisma.conceptMap.create({
      data: {
        dashboardAccessId,
        name: name.trim(),
        nodes: '[]',
        edges: '[]',
      },
    });

    await logAudit({
      action: 'create', resource: 'concept-map', resourceId: map.id,
      actorType: 'researcher', actorId: dashboardAccessId,
      method: 'POST', path: '/api/research/concept-maps',
      meta: JSON.stringify({ name: map.name }),
    });

    res.status(201).json({
      success: true,
      data: {
        id: map.id,
        name: map.name,
        nodes: [],
        edges: [],
        createdAt: map.createdAt.toISOString(),
        updatedAt: map.updatedAt.toISOString(),
      },
    });
  } catch (err: any) {
    // Handle unique constraint violation (duplicate name)
    if (err?.code === 'P2002') {
      return next(new AppError('A concept map with that name already exists', 409));
    }
    next(err);
  }
});

// PUT /api/research/concept-maps/:id — Update map state
researchRoutes.put('/concept-maps/:id', async (req, res, next) => {
  try {
    const dashboardAccessId = (req as any).dashboardAccessId;
    const { id } = req.params;
    const { nodes, edges, viewport } = req.body;

    // Validate ownership
    const existing = await prisma.conceptMap.findFirst({
      where: { id, dashboardAccessId },
    });

    if (!existing) {
      throw new AppError('Concept map not found', 404);
    }

    const updateData: any = {};
    if (nodes !== undefined) updateData.nodes = JSON.stringify(nodes);
    if (edges !== undefined) updateData.edges = JSON.stringify(edges);
    if (viewport !== undefined) updateData.viewport = JSON.stringify(viewport);

    const updated = await prisma.conceptMap.update({
      where: { id },
      data: updateData,
    });

    res.json({
      success: true,
      data: {
        id: updated.id,
        name: updated.name,
        nodes: JSON.parse(updated.nodes),
        edges: JSON.parse(updated.edges),
        viewport: updated.viewport ? JSON.parse(updated.viewport) : undefined,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      },
    });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/research/concept-maps/:id — Delete a concept map
researchRoutes.delete('/concept-maps/:id', async (req, res, next) => {
  try {
    const dashboardAccessId = (req as any).dashboardAccessId;
    const { id } = req.params;

    const existing = await prisma.conceptMap.findFirst({
      where: { id, dashboardAccessId },
    });

    if (!existing) {
      throw new AppError('Concept map not found', 404);
    }

    await prisma.conceptMap.delete({ where: { id } });

    await logAudit({
      action: 'delete', resource: 'concept-map', resourceId: id,
      actorType: 'researcher', actorId: dashboardAccessId,
      method: 'DELETE', path: `/api/research/concept-maps/${id}`,
      meta: JSON.stringify({ name: existing.name }),
    });

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// POST /api/research/concept-maps/auto-generate — Generate from co-occurrence data
researchRoutes.post('/concept-maps/auto-generate', async (req, res, next) => {
  try {
    const dashboardAccessId = (req as any).dashboardAccessId;

    // Fetch all tags with highlight counts
    const tags = await prisma.researchTag.findMany({
      where: { dashboardAccessId },
      include: { _count: { select: { highlights: true } } },
    });

    if (tags.length === 0) {
      throw new AppError('No tags found. Create and apply tags to your narratives first.', 400);
    }

    // Fetch all highlights to compute co-occurrence (response-level)
    const highlights = await prisma.textHighlight.findMany({
      where: { dashboardAccessId },
      select: { responseId: true, tagId: true },
    });

    // Build response -> tagIds map
    const responseTagMap = new Map<string, Set<string>>();
    for (const h of highlights) {
      if (!responseTagMap.has(h.responseId)) {
        responseTagMap.set(h.responseId, new Set());
      }
      responseTagMap.get(h.responseId)!.add(h.tagId);
    }

    // Compute co-occurrence counts between tag pairs
    const cooccurrence = new Map<string, number>();
    for (const tagSet of responseTagMap.values()) {
      const tagIds = Array.from(tagSet);
      for (let i = 0; i < tagIds.length; i++) {
        for (let j = i + 1; j < tagIds.length; j++) {
          const key = [tagIds[i], tagIds[j]].sort().join('::');
          cooccurrence.set(key, (cooccurrence.get(key) || 0) + 1);
        }
      }
    }

    // Create nodes in circular layout
    const cx = 400, cy = 300, radius = 250;
    const nodes = tags.map((tag, i) => {
      const angle = (2 * Math.PI * i) / tags.length;
      return {
        id: `theme-${tag.id}`,
        type: 'theme' as const,
        position: { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) },
        data: {
          label: tag.name,
          tagId: tag.id,
          color: tag.color,
          highlightCount: tag._count.highlights,
        },
      };
    });

    // Create edges from co-occurrence pairs
    const edges: { id: string; source: string; target: string; label: string; style: 'solid' | 'dashed' | 'thick' }[] = [];
    for (const [key, count] of cooccurrence.entries()) {
      if (count > 0) {
        const [tagId1, tagId2] = key.split('::');
        let style: 'solid' | 'dashed' | 'thick' = 'dashed';
        if (count >= 5) style = 'thick';
        else if (count >= 2) style = 'solid';

        edges.push({
          id: `edge-${tagId1}-${tagId2}`,
          source: `theme-${tagId1}`,
          target: `theme-${tagId2}`,
          label: String(count),
          style,
        });
      }
    }

    res.json({ success: true, data: { nodes, edges } });
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════════════════════════
// AI-ASSISTED CODING SUGGESTIONS
// ═══════════════════════════════════════════════════════════════

// GET /api/research/ai/status — Check if AI coding is available
researchRoutes.get('/ai/status', async (_req, res) => {
  const enabled = process.env.AI_CODING_ENABLED === 'true';
  const provider = enabled ? (process.env.AI_PROVIDER || undefined) : undefined;
  res.json({ success: true, data: { enabled, provider } });
});

// POST /api/research/ai/suggest — Generate coding suggestions for specific responses
researchRoutes.post('/ai/suggest', async (req, res, next) => {
  try {
    const dashboardAccessId = (req as any).dashboardAccessId;

    // Check if AI coding is enabled
    if (process.env.AI_CODING_ENABLED !== 'true') {
      throw new AppError('AI-assisted coding is not enabled', 403);
    }

    const provider = process.env.AI_PROVIDER;
    const apiKey = process.env.AI_API_KEY;
    if (!provider || !apiKey) {
      throw new AppError('AI provider is not configured', 503);
    }

    const { responseIds } = req.body;
    if (!Array.isArray(responseIds) || responseIds.length === 0 || responseIds.length > 20) {
      throw new AppError('responseIds must be an array of 1-20 IDs', 400);
    }

    // Rate limit: max 10 requests per hour per dashboard (approx 200 suggestions)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentCount = await prisma.aISuggestion.count({
      where: {
        dashboardAccessId,
        createdAt: { gte: oneHourAgo },
      },
    });
    if (recentCount > 200) {
      throw new AppError('Rate limit exceeded. Maximum 10 AI suggestion requests per hour.', 429);
    }

    // Fetch the researcher's codebook (all tags with descriptions and top 3 example quotes each)
    const tags = await prisma.researchTag.findMany({
      where: { dashboardAccessId },
      include: {
        highlights: {
          take: 3,
          orderBy: { createdAt: 'desc' },
          select: { highlightedText: true },
        },
      },
    });

    if (tags.length === 0) {
      throw new AppError('No tags found in your codebook. Create tags before using AI suggestions.', 400);
    }

    // Fetch the narrative texts for the given responseIds
    const responses = await prisma.response.findMany({
      where: {
        id: { in: responseIds },
        questionType: 'narrative',
        textValue: { not: null },
      },
      select: { id: true, textValue: true },
    });

    if (responses.length === 0) {
      throw new AppError('No narrative responses found for the given IDs', 404);
    }

    // Build codebook description for the prompt
    const codebookText = tags.map(tag => {
      const examples = tag.highlights.map(h => `"${h.highlightedText}"`).join(', ');
      const examplesStr = examples ? ` Examples: ${examples}` : '';
      return `- "${tag.name}": ${tag.description || 'No description'}.${examplesStr}`;
    }).join('\n');

    const systemPrompt = `You are a qualitative research coding assistant for a study on Work Integration Social Enterprises (WISEs). Given a codebook of themes and a narrative response, suggest which themes should be applied to which specific text passages. Only suggest themes you are confident about. Return valid JSON only.`;

    const allSuggestions: Array<{
      dashboardAccessId: string;
      responseId: string;
      suggestedTagId: string;
      startOffset: number;
      endOffset: number;
      suggestedText: string;
      confidence: number;
    }> = [];
    let totalSkipped = 0;

    for (const response of responses) {
      const text = response.textValue!;

      const userPrompt = `Codebook:\n${codebookText}\n\nNarrative text:\n"${text}"\n\nReturn a JSON array of suggestions:\n[{"tagName": "exact tag name", "startOffset": 0, "endOffset": 50, "suggestedText": "the exact text", "confidence": 0.85}]\n\nRules:\n- Only suggest tags from the codebook above\n- confidence must be between 0.6 and 1.0\n- startOffset and endOffset must be valid character positions in the text\n- suggestedText must exactly match the text at those positions`;

      let aiResponseText = '';

      try {
        if (provider === 'openai') {
          const model = process.env.AI_MODEL || 'gpt-4o-mini';
          const aiRes = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model,
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
              ],
              temperature: 0.3,
              max_tokens: 2000,
            }),
          });

          if (!aiRes.ok) {
            const errBody = await aiRes.text();
            console.error('OpenAI API error:', aiRes.status, errBody);
            throw new AppError('AI provider returned an error', 502);
          }

          const aiData = await aiRes.json() as any;
          aiResponseText = aiData.choices?.[0]?.message?.content || '';
        } else if (provider === 'anthropic') {
          const model = process.env.AI_MODEL || 'claude-haiku-4-5-20251001';
          const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': apiKey,
              'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
              model,
              max_tokens: 2000,
              system: systemPrompt,
              messages: [
                { role: 'user', content: userPrompt },
              ],
            }),
          });

          if (!aiRes.ok) {
            const errBody = await aiRes.text();
            console.error('Anthropic API error:', aiRes.status, errBody);
            throw new AppError('AI provider returned an error', 502);
          }

          const aiData = await aiRes.json() as any;
          aiResponseText = aiData.content?.[0]?.text || '';
        } else {
          throw new AppError(`Unsupported AI provider: ${provider}`, 400);
        }

        // Extract JSON array from the response (handle markdown code blocks)
        let jsonStr = aiResponseText.trim();
        const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) {
          jsonStr = jsonMatch[1].trim();
        }
        // Also try to find a bare JSON array
        const arrayMatch = jsonStr.match(/\[[\s\S]*\]/);
        if (arrayMatch) {
          jsonStr = arrayMatch[0];
        }

        let parsed: any[];
        try {
          parsed = JSON.parse(jsonStr);
        } catch {
          console.error('Failed to parse AI response as JSON:', jsonStr.slice(0, 200));
          totalSkipped += 1;
          continue;
        }

        if (!Array.isArray(parsed)) {
          totalSkipped += 1;
          continue;
        }

        // Validate and store each suggestion
        const tagNameMap = new Map(tags.map(t => [t.name.toLowerCase(), t]));

        for (const s of parsed) {
          // Validate tag name
          const tag = tagNameMap.get((s.tagName || '').toLowerCase());
          if (!tag) {
            totalSkipped += 1;
            continue;
          }

          // Validate offsets
          const startOffset = Number(s.startOffset);
          const endOffset = Number(s.endOffset);
          if (isNaN(startOffset) || isNaN(endOffset) || startOffset < 0 || endOffset <= startOffset || endOffset > text.length) {
            totalSkipped += 1;
            continue;
          }

          // Validate confidence
          const confidence = Number(s.confidence);
          if (isNaN(confidence) || confidence < 0.6 || confidence > 1.0) {
            totalSkipped += 1;
            continue;
          }

          // Use the actual text from the offsets for storage to ensure correctness
          const actualText = text.slice(startOffset, endOffset);

          allSuggestions.push({
            dashboardAccessId,
            responseId: response.id,
            suggestedTagId: tag.id,
            startOffset,
            endOffset,
            suggestedText: actualText,
            confidence,
          });
        }
      } catch (err) {
        if (err instanceof AppError) throw err;
        console.error('AI suggestion error for response', response.id, err);
        totalSkipped += 1;
      }
    }

    // Store all valid suggestions in the database
    const created: any[] = [];
    for (const suggData of allSuggestions) {
      const suggestion = await prisma.aISuggestion.create({
        data: suggData,
        include: { tag: true },
      });
      created.push(suggestion);
    }

    await logAudit({
      action: 'write', resource: 'ai-suggestion',
      actorType: 'researcher', actorId: dashboardAccessId,
      method: 'POST', path: '/api/research/ai/suggest',
      meta: JSON.stringify({ responseCount: responses.length, suggestionsCreated: created.length, skipped: totalSkipped }),
    });

    res.json({ success: true, data: { suggestions: created, skipped: totalSkipped } });
  } catch (err) {
    next(err);
  }
});

// GET /api/research/ai/suggestions — List suggestions
researchRoutes.get('/ai/suggestions', async (req, res, next) => {
  try {
    const dashboardAccessId = (req as any).dashboardAccessId;
    const { status, responseId } = req.query;

    const where: any = { dashboardAccessId };
    if (status && typeof status === 'string') {
      where.status = status;
    }
    if (responseId && typeof responseId === 'string') {
      where.responseId = responseId;
    }

    const suggestions = await prisma.aISuggestion.findMany({
      where,
      include: { tag: true },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: suggestions });
  } catch (err) {
    next(err);
  }
});

// PUT /api/research/ai/suggestions/:id — Accept or reject a suggestion
researchRoutes.put('/ai/suggestions/:id', async (req, res, next) => {
  try {
    const dashboardAccessId = (req as any).dashboardAccessId;
    const { id } = req.params;
    const { status } = req.body;

    if (status !== 'accepted' && status !== 'rejected') {
      throw new AppError('status must be "accepted" or "rejected"', 400);
    }

    const suggestion = await prisma.aISuggestion.findFirst({
      where: { id, dashboardAccessId },
    });
    if (!suggestion) {
      throw new AppError('Suggestion not found', 404);
    }

    const updated = await prisma.aISuggestion.update({
      where: { id },
      data: { status },
      include: { tag: true },
    });

    // If accepted, create a real TextHighlight
    if (status === 'accepted') {
      await prisma.textHighlight.create({
        data: {
          dashboardAccessId,
          responseId: suggestion.responseId,
          tagId: suggestion.suggestedTagId,
          startOffset: suggestion.startOffset,
          endOffset: suggestion.endOffset,
          highlightedText: suggestion.suggestedText,
        },
      });
    }

    await logAudit({
      action: 'update', resource: 'ai-suggestion', resourceId: id,
      actorType: 'researcher', actorId: dashboardAccessId,
      method: 'PUT', path: `/api/research/ai/suggestions/${id}`,
      meta: JSON.stringify({ status, tagName: updated.tag?.name }),
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

// POST /api/research/ai/suggestions/bulk-accept — Accept multiple suggestions
researchRoutes.post('/ai/suggestions/bulk-accept', async (req, res, next) => {
  try {
    const dashboardAccessId = (req as any).dashboardAccessId;
    const { suggestionIds } = req.body;

    if (!Array.isArray(suggestionIds) || suggestionIds.length === 0) {
      throw new AppError('suggestionIds must be a non-empty array', 400);
    }

    const suggestions = await prisma.aISuggestion.findMany({
      where: { id: { in: suggestionIds }, dashboardAccessId, status: 'pending' },
    });

    let accepted = 0;
    for (const suggestion of suggestions) {
      await prisma.aISuggestion.update({
        where: { id: suggestion.id },
        data: { status: 'accepted' },
      });

      await prisma.textHighlight.create({
        data: {
          dashboardAccessId,
          responseId: suggestion.responseId,
          tagId: suggestion.suggestedTagId,
          startOffset: suggestion.startOffset,
          endOffset: suggestion.endOffset,
          highlightedText: suggestion.suggestedText,
        },
      });

      accepted++;
    }

    await logAudit({
      action: 'update', resource: 'ai-suggestion',
      actorType: 'researcher', actorId: dashboardAccessId,
      method: 'POST', path: '/api/research/ai/suggestions/bulk-accept',
      meta: JSON.stringify({ accepted, requested: suggestionIds.length }),
    });

    res.json({ success: true, data: { accepted } });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/research/ai/suggestions/clear — Clear all pending suggestions
researchRoutes.delete('/ai/suggestions/clear', async (req, res, next) => {
  try {
    const dashboardAccessId = (req as any).dashboardAccessId;

    const result = await prisma.aISuggestion.deleteMany({
      where: { dashboardAccessId, status: 'pending' },
    });

    await logAudit({
      action: 'delete', resource: 'ai-suggestion',
      actorType: 'researcher', actorId: dashboardAccessId,
      method: 'DELETE', path: '/api/research/ai/suggestions/clear',
      meta: JSON.stringify({ deleted: result.count }),
    });

    res.json({ success: true, data: { deleted: result.count } });
  } catch (err) {
    next(err);
  }
});
