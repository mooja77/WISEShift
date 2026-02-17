import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { DOMAINS } from '@wiseshift/shared';
import { AppError } from '../middleware/errorHandler.js';
import { nanoid } from 'nanoid';

export const researcherRoutes = Router();

// ─── Helper: generate 6-digit verification code ───
function generateVerificationCode(): string {
  return nanoid(6).toUpperCase();
}

// ─── Middleware: authenticate researcher via x-researcher-token header ───
async function researcherAuth(req: any, _res: any, next: any) {
  const token = req.headers['x-researcher-token'] as string;
  if (!token) {
    return next(new AppError('Researcher authentication required', 401));
  }

  const researcher = await prisma.researcherAccount.findUnique({
    where: { id: token },
  });

  if (!researcher) {
    return next(new AppError('Invalid researcher token', 401));
  }

  if (!researcher.verified) {
    return next(new AppError('Email not verified. Please verify your email first.', 403));
  }

  req.researcher = researcher;
  next();
}

// POST /api/researchers/register — Register a new researcher account
researcherRoutes.post('/register', async (req, res, next) => {
  try {
    const { email, name, institution } = req.body;

    if (!email || !name || !institution) {
      throw new AppError('Email, name, and institution are required', 400);
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new AppError('Invalid email address', 400);
    }

    // Check if already registered
    const existing = await prisma.researcherAccount.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existing) {
      if (existing.verified) {
        throw new AppError('This email is already registered. Use your researcher token to sign in.', 409);
      }
      // Re-send verification code for unverified accounts
      const verificationCode = generateVerificationCode();
      const updated = await prisma.researcherAccount.update({
        where: { id: existing.id },
        data: { verificationCode, name, institution },
      });

      return res.json({
        success: true,
        data: {
          id: updated.id,
          verificationCode: updated.verificationCode,
          message: 'Verification code regenerated. In production, this would be emailed.',
        },
      });
    }

    const verificationCode = generateVerificationCode();
    const researcher = await prisma.researcherAccount.create({
      data: {
        email: email.toLowerCase(),
        name,
        institution,
        verificationCode,
        accessLevel: 'registered',
      },
    });

    // In production, send verification email. For now, return the code.
    res.status(201).json({
      success: true,
      data: {
        id: researcher.id,
        verificationCode: researcher.verificationCode,
        message: 'Account created. In production, a verification email would be sent. Use the verification code to verify your account.',
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/researchers/verify — Verify email with code
researcherRoutes.post('/verify', async (req, res, next) => {
  try {
    const { email, verificationCode } = req.body;

    if (!email || !verificationCode) {
      throw new AppError('Email and verification code are required', 400);
    }

    const researcher = await prisma.researcherAccount.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!researcher) {
      throw new AppError('No account found with this email', 404);
    }

    if (researcher.verified) {
      return res.json({
        success: true,
        data: { id: researcher.id, message: 'Already verified.' },
      });
    }

    if (researcher.verificationCode !== verificationCode) {
      throw new AppError('Invalid verification code', 400);
    }

    const updated = await prisma.researcherAccount.update({
      where: { id: researcher.id },
      data: { verified: true, verificationCode: null },
    });

    res.json({
      success: true,
      data: {
        id: updated.id,
        token: updated.id, // Use ID as token for simplicity
        message: 'Email verified. Use your token for authenticated requests.',
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/researchers/profile — Get own profile (authenticated)
researcherRoutes.get('/profile', researcherAuth, async (req: any, res, next) => {
  try {
    const researcher = req.researcher;

    const logCount = await prisma.dataAccessLog.count({
      where: { researcherId: researcher.id },
    });

    res.json({
      success: true,
      data: {
        id: researcher.id,
        email: researcher.email,
        name: researcher.name,
        institution: researcher.institution,
        accessLevel: researcher.accessLevel,
        verified: researcher.verified,
        ethicsApproval: researcher.ethicsApproval,
        createdAt: researcher.createdAt,
        dataAccessCount: logCount,
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/researchers/request-access — Request elevated access level
researcherRoutes.post('/request-access', researcherAuth, async (req: any, res, next) => {
  try {
    const researcher = req.researcher;
    const { ethicsApproval, justification } = req.body;

    if (researcher.accessLevel === 'approved') {
      return res.json({
        success: true,
        data: { message: 'You already have approved access.' },
      });
    }

    // Store ethics approval reference if provided
    const updated = await prisma.researcherAccount.update({
      where: { id: researcher.id },
      data: {
        ethicsApproval: ethicsApproval || researcher.ethicsApproval,
        // In production, this would go through an approval workflow
        // For now, auto-approve if ethics approval is provided
        accessLevel: ethicsApproval ? 'approved' : 'registered',
      },
    });

    // Log the access request
    await prisma.dataAccessLog.create({
      data: {
        researcherId: researcher.id,
        endpoint: '/request-access',
        queryParams: JSON.stringify({ ethicsApproval: !!ethicsApproval, justification }),
      },
    });

    res.json({
      success: true,
      data: {
        accessLevel: updated.accessLevel,
        message: ethicsApproval
          ? 'Access upgraded to approved. You can now access individual case-level data.'
          : 'Access request noted. Provide ethics approval reference for elevated access.',
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/researchers/query — Query assessment data with filters
researcherRoutes.get('/query', researcherAuth, async (req: any, res, next) => {
  try {
    const researcher = req.researcher;
    const {
      country,
      sector,
      size,
      minScore,
      maxScore,
      dateFrom,
      dateTo,
      domainKey,
      page = '1',
      limit = '20',
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 20));

    // Build where clause
    const where: any = { status: 'completed' };

    if (country) where.organisation = { ...where.organisation, country: { equals: country, mode: 'insensitive' } };
    if (sector) where.organisation = { ...where.organisation, sector: { equals: sector, mode: 'insensitive' } };
    if (size) where.organisation = { ...where.organisation, size: { equals: size, mode: 'insensitive' } };
    if (minScore) where.overallScore = { ...where.overallScore, gte: parseFloat(minScore as string) };
    if (maxScore) where.overallScore = { ...where.overallScore, lte: parseFloat(maxScore as string) };
    if (dateFrom) where.completedAt = { ...where.completedAt, gte: new Date(dateFrom as string) };
    if (dateTo) where.completedAt = { ...where.completedAt, lte: new Date(dateTo as string) };

    const [total, assessments] = await Promise.all([
      prisma.assessment.count({ where }),
      prisma.assessment.findMany({
        where,
        include: {
          organisation: { select: { country: true, sector: true, size: true, legalStructure: true } },
          domainScores: true,
          sectorScores: true,
        },
        orderBy: { completedAt: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
    ]);

    // Format results based on access level
    const isApproved = researcher.accessLevel === 'approved';

    const data = assessments.map((a, idx) => {
      const scores: Record<string, number> = {};
      for (const ds of a.domainScores) {
        // Filter by domain if specified
        if (domainKey && ds.domainKey !== domainKey) continue;
        scores[ds.domainKey] = ds.score;
      }

      const base: any = {
        caseId: `CASE_${String((pageNum - 1) * limitNum + idx + 1).padStart(3, '0')}`,
        country: a.organisation.country || null,
        sector: a.organisation.sector || null,
        size: a.organisation.size || null,
        overallScore: a.overallScore,
        domainScores: scores,
        completedAt: a.completedAt?.toISOString().slice(0, 10) || null,
      };

      // Approved researchers get more detail
      if (isApproved) {
        base.legalStructure = a.organisation.legalStructure || null;
        base.sectorScores = a.sectorScores.reduce((acc: Record<string, number>, ss) => {
          acc[ss.sectorKey] = ss.score;
          return acc;
        }, {});
      }

      return base;
    });

    // Log the query
    await prisma.dataAccessLog.create({
      data: {
        researcherId: researcher.id,
        endpoint: '/query',
        queryParams: JSON.stringify(req.query),
        resultCount: data.length,
      },
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
      meta: {
        accessLevel: researcher.accessLevel,
        availableFilters: {
          country: 'ISO country code (e.g., IE, DE, FR)',
          sector: 'Organisation sector',
          size: 'Organisation size (micro, small, medium, large, very_large)',
          minScore: 'Minimum overall score (0-5)',
          maxScore: 'Maximum overall score (0-5)',
          dateFrom: 'Start date (ISO format)',
          dateTo: 'End date (ISO format)',
          domainKey: `Domain key (${DOMAINS.map(d => d.key).join(', ')})`,
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/researchers/batch-download — Download selected assessments as CSV or JSON
researcherRoutes.post('/batch-download', researcherAuth, async (req: any, res, next) => {
  try {
    const researcher = req.researcher;
    const { caseIds, format = 'csv' } = req.body;

    if (!Array.isArray(caseIds) || caseIds.length === 0) {
      throw new AppError('caseIds array is required', 400);
    }

    if (caseIds.length > 200) {
      throw new AppError('Maximum 200 cases per batch download', 400);
    }

    const assessments = await prisma.assessment.findMany({
      where: { status: 'completed' },
      include: {
        organisation: { select: { country: true, sector: true, size: true, legalStructure: true } },
        domainScores: true,
      },
      orderBy: { completedAt: 'desc' },
    });

    // Map to case IDs and filter
    const selected = assessments
      .map((a, idx) => ({ ...a, caseId: `CASE_${String(idx + 1).padStart(3, '0')}` }))
      .filter(a => caseIds.includes(a.caseId));

    if (selected.length === 0) {
      throw new AppError('No matching cases found', 404);
    }

    // Log the download
    await prisma.dataAccessLog.create({
      data: {
        researcherId: researcher.id,
        endpoint: '/batch-download',
        queryParams: JSON.stringify({ caseIds, format }),
        resultCount: selected.length,
      },
    });

    const domainKeys = DOMAINS.map(d => d.key);

    if (format === 'json') {
      const data = selected.map(a => {
        const scores: Record<string, number> = {};
        for (const ds of a.domainScores) {
          scores[ds.domainKey] = ds.score;
        }
        return {
          caseId: a.caseId,
          country: a.organisation.country || null,
          sector: a.organisation.sector || null,
          size: a.organisation.size || null,
          overallScore: a.overallScore,
          domainScores: scores,
          completedAt: a.completedAt?.toISOString().slice(0, 10) || null,
        };
      });

      const filename = `wiseshift-research-batch-${new Date().toISOString().slice(0, 10)}.json`;
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Type', 'application/json');
      return res.json({ count: data.length, data });
    }

    // CSV format
    const headers = ['CaseID', 'Country', 'Sector', 'Size', 'OverallScore', ...domainKeys.map(k => `Score_${k}`), 'CompletedAt'];

    function escapeCsv(value: string | number | null | undefined): string {
      if (value === null || value === undefined) return '';
      const str = String(value);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    }

    const rows = [headers.map(escapeCsv).join(',')];
    for (const a of selected) {
      const scoreMap: Record<string, number> = {};
      for (const ds of a.domainScores) scoreMap[ds.domainKey] = ds.score;

      rows.push([
        escapeCsv(a.caseId),
        escapeCsv(a.organisation.country),
        escapeCsv(a.organisation.sector),
        escapeCsv(a.organisation.size),
        escapeCsv(a.overallScore),
        ...domainKeys.map(k => escapeCsv(scoreMap[k])),
        escapeCsv(a.completedAt?.toISOString().slice(0, 10)),
      ].join(','));
    }

    const csvContent = rows.join('\r\n');
    const filename = `wiseshift-research-batch-${new Date().toISOString().slice(0, 10)}.csv`;

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.send(csvContent);
  } catch (err) {
    next(err);
  }
});

// GET /api/researchers/access-log — View own access log (authenticated)
researcherRoutes.get('/access-log', researcherAuth, async (req: any, res, next) => {
  try {
    const researcher = req.researcher;

    const logs = await prisma.dataAccessLog.findMany({
      where: { researcherId: researcher.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    res.json({
      success: true,
      data: logs.map(l => ({
        endpoint: l.endpoint,
        queryParams: l.queryParams ? JSON.parse(l.queryParams) : null,
        resultCount: l.resultCount,
        createdAt: l.createdAt,
      })),
    });
  } catch (err) {
    next(err);
  }
});
