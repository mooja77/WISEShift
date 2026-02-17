import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { DOMAINS, getMaturityLevel } from '@wiseshift/shared';
import { AppError } from '../middleware/errorHandler.js';
import { validateAccessCode } from '../middleware/accessCode.js';
import { sendFormatted } from '../utils/formatResponse.js';
import { identifyStrengths } from '../utils/scoring.js';

export const registryRoutes = Router();

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
}

// GET /api/registry — Public list of WISEs (filterable)
registryRoutes.get('/', async (req, res, next) => {
  try {
    const { country, sector, maturityLevel, page = '1', limit = '20' } = req.query;

    const where: any = { isPublic: true };
    if (country) where.country = String(country);
    if (sector) where.sectors = { contains: String(sector) };

    const pageNum = Math.max(1, parseInt(String(page)));
    const limitNum = Math.min(50, Math.max(1, parseInt(String(limit))));
    const skip = (pageNum - 1) * limitNum;

    const [profiles, total] = await Promise.all([
      prisma.wISEProfile.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
        include: {
          organisation: {
            select: { name: true, sector: true, size: true },
          },
        },
      }),
      prisma.wISEProfile.count({ where }),
    ]);

    // Filter by maturity level in-memory if requested (since it's JSON)
    let filtered = profiles;
    if (maturityLevel) {
      filtered = profiles.filter(p => {
        if (!p.maturitySummary) return false;
        try {
          const summary = JSON.parse(p.maturitySummary);
          return summary.level === String(maturityLevel);
        } catch {
          return false;
        }
      });
    }

    const data = filtered.map(p => {
      const summary = p.maturitySummary ? JSON.parse(p.maturitySummary) : null;
      return {
        slug: p.slug,
        organisationName: p.organisation.name,
        bio: p.bio,
        country: p.country,
        region: p.region,
        sectors: p.sectors ? JSON.parse(p.sectors) : [],
        size: p.organisation.size,
        foundingYear: p.foundingYear,
        website: p.website,
        overallScore: summary?.overall ?? null,
        maturityLevel: summary?.level ?? null,
        strengths: p.strengths ? JSON.parse(p.strengths) : [],
      };
    });

    res.json({
      success: true,
      data,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/registry/export — Download registry as CSV/JSON
registryRoutes.get('/export', async (req, res, next) => {
  try {
    const format = req.query.format as string | undefined;

    const profiles = await prisma.wISEProfile.findMany({
      where: { isPublic: true },
      include: {
        organisation: {
          select: { name: true, sector: true, size: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const data = profiles.map(p => {
      const summary = p.maturitySummary ? JSON.parse(p.maturitySummary) : null;
      return {
        name: p.organisation.name,
        slug: p.slug,
        country: p.country || '',
        region: p.region || '',
        sector: p.organisation.sector || '',
        size: p.organisation.size || '',
        foundingYear: p.foundingYear || '',
        website: p.website || '',
        overallScore: summary?.overall ?? '',
        maturityLevel: summary?.level ?? '',
        strengths: p.strengths ? JSON.parse(p.strengths).join('; ') : '',
      };
    });

    sendFormatted(res, data, format, 'wiseshift-registry');
  } catch (err) {
    next(err);
  }
});

// GET /api/registry/:slug — Single public profile
registryRoutes.get('/:slug', async (req, res, next) => {
  try {
    const { slug } = req.params;

    const profile = await prisma.wISEProfile.findUnique({
      where: { slug },
      include: {
        organisation: {
          select: { name: true, sector: true, size: true, country: true, region: true },
          include: {
            assessments: {
              where: { status: 'completed' },
              orderBy: { completedAt: 'desc' },
              take: 1,
              include: { domainScores: true },
            },
          },
        },
      },
    });

    if (!profile || !profile.isPublic) {
      throw new AppError('Profile not found', 404);
    }

    const summary = profile.maturitySummary ? JSON.parse(profile.maturitySummary) : null;
    const latestAssessment = profile.organisation.assessments[0];

    // Build radar data from latest assessment
    const domainScores = latestAssessment?.domainScores?.map(ds => {
      const domain = DOMAINS.find(d => d.key === ds.domainKey);
      return {
        domainKey: ds.domainKey,
        domainName: domain?.name || ds.domainKey,
        score: ds.score,
      };
    }) || [];

    res.json({
      success: true,
      data: {
        slug: profile.slug,
        organisationName: profile.organisation.name,
        bio: profile.bio,
        logoUrl: profile.logoUrl,
        website: profile.website,
        socialLinks: profile.socialLinks ? JSON.parse(profile.socialLinks) : null,
        foundingYear: profile.foundingYear,
        targetPopulations: profile.targetPopulations ? JSON.parse(profile.targetPopulations) : [],
        sectors: profile.sectors ? JSON.parse(profile.sectors) : [],
        country: profile.country,
        region: profile.region,
        size: profile.organisation.size,
        overallScore: summary?.overall ?? null,
        maturityLevel: summary?.level ?? null,
        strengths: profile.strengths ? JSON.parse(profile.strengths) : [],
        domainScores,
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/registry/opt-in — Create profile after assessment
registryRoutes.post('/opt-in', validateAccessCode, async (req, res, next) => {
  try {
    const organisation = (req as any).organisation;
    const { bio, website, foundingYear, targetPopulations, sectors } = req.body;

    // Check if profile already exists
    const existing = await prisma.wISEProfile.findUnique({
      where: { organisationId: organisation.id },
    });
    if (existing) {
      throw new AppError('Profile already exists. Use PUT to update.', 409);
    }

    // Get latest completed assessment for maturity data
    const assessment = await prisma.assessment.findFirst({
      where: { organisationId: organisation.id, status: 'completed' },
      orderBy: { completedAt: 'desc' },
      include: { domainScores: true },
    });

    let maturitySummary: string | null = null;
    let strengthsJson: string | null = null;

    if (assessment && assessment.domainScores.length > 0) {
      const overall = assessment.overallScore ?? 0;
      const level = getMaturityLevel(overall).name;
      maturitySummary = JSON.stringify({ overall, level });

      const scored = assessment.domainScores
        .filter(d => d.score > 0)
        .map(d => ({
          domainKey: d.domainKey,
          domainName: DOMAINS.find(dom => dom.key === d.domainKey)?.name || d.domainKey,
          score: d.score,
          maturityLevel: d.maturityLevel,
        }));
      strengthsJson = JSON.stringify(identifyStrengths(scored));
    }

    // Generate unique slug
    let slug = generateSlug(organisation.name);
    const existingSlug = await prisma.wISEProfile.findUnique({ where: { slug } });
    if (existingSlug) {
      slug = `${slug}-${Date.now().toString(36).slice(-4)}`;
    }

    const profile = await prisma.wISEProfile.create({
      data: {
        organisationId: organisation.id,
        slug,
        isPublic: true,
        bio: bio || null,
        website: website || null,
        foundingYear: foundingYear ? parseInt(String(foundingYear)) : null,
        targetPopulations: targetPopulations ? JSON.stringify(targetPopulations) : null,
        sectors: sectors ? JSON.stringify(sectors) : (organisation.sector ? JSON.stringify([organisation.sector]) : null),
        country: organisation.country,
        region: organisation.region,
        maturitySummary,
        strengths: strengthsJson,
      },
    });

    res.status(201).json({ success: true, data: { slug: profile.slug, isPublic: profile.isPublic } });
  } catch (err) {
    next(err);
  }
});

// PUT /api/registry/:slug — Update profile
registryRoutes.put('/:slug', validateAccessCode, async (req, res, next) => {
  try {
    const { slug } = req.params;
    const organisation = (req as any).organisation;
    const { bio, website, foundingYear, targetPopulations, sectors, isPublic } = req.body;

    const profile = await prisma.wISEProfile.findUnique({ where: { slug } });
    if (!profile || profile.organisationId !== organisation.id) {
      throw new AppError('Profile not found or access denied', 404);
    }

    const updated = await prisma.wISEProfile.update({
      where: { slug },
      data: {
        bio: bio !== undefined ? bio : undefined,
        website: website !== undefined ? website : undefined,
        foundingYear: foundingYear !== undefined ? (foundingYear ? parseInt(String(foundingYear)) : null) : undefined,
        targetPopulations: targetPopulations !== undefined ? JSON.stringify(targetPopulations) : undefined,
        sectors: sectors !== undefined ? JSON.stringify(sectors) : undefined,
        isPublic: isPublic !== undefined ? Boolean(isPublic) : undefined,
      },
    });

    res.json({ success: true, data: { slug: updated.slug, isPublic: updated.isPublic } });
  } catch (err) {
    next(err);
  }
});
