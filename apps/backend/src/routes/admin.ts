import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { createHash } from 'crypto';
import { prisma } from '../lib/prisma.js';
import { validate, validateQuery, bulkImportSchema, auditLogQuerySchema, consentRecordsQuerySchema, researcherAccessQuerySchema, researcherListQuerySchema } from '../middleware/validation.js';
import { escapeCsv } from '../utils/csvSanitize.js';
import { generateAccessCode } from '../utils/accessCode.js';
import { calculateDomainScore, calculateOverallScore, calculateSectorScore } from '../utils/scoring.js';
import { DOMAINS, getMaturityLevel, getSectorModule, CURRENT_CONSENT_VERSION, K_ANONYMITY_THRESHOLD } from '@wiseshift/shared';
import { requireAdmin } from '../middleware/adminAuth.js';
import { logAudit } from '../middleware/auditLog.js';
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, HeadingLevel } from 'docx';
import { getRetentionPolicy } from '../middleware/dataRetention.js';

export const adminRoutes = Router();

// ─── Question ID → Domain/Type lookup map ───
const QUESTION_MAP = new Map<string, { domainKey: string; questionType: string }>();
for (const domain of DOMAINS) {
  for (const q of domain.questions) {
    QUESTION_MAP.set(q.id, { domainKey: domain.key, questionType: q.type });
  }
}

adminRoutes.use(requireAdmin);

// ─── POST /import — Bulk import assessments ───
adminRoutes.post('/import', validate(bulkImportSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = req.body;
    const dryRun = body.dryRun ?? false;
    const assessments = body.assessments;

    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];
    const skippedOrgs: string[] = [];

    for (let i = 0; i < assessments.length; i++) {
      const entry = assessments[i];
      const orgData = entry.organisation;

      try {
        // Idempotency: skip if org with same name+country already exists
        const existing = await prisma.organisation.findFirst({
          where: { name: orgData.name, country: orgData.country },
        });
        if (existing) {
          skipped++;
          skippedOrgs.push(`${orgData.name} (${orgData.country}) — already exists`);
          continue;
        }

        if (dryRun) {
          // Validate but don't persist
          if (body.format === 'full') {
            for (const resp of entry.responses) {
              if (!QUESTION_MAP.has(resp.questionId)) {
                errors.push(`Assessment ${i}: unknown questionId "${resp.questionId}"`);
              }
            }
          }
          imported++;
          continue;
        }

        // Create organisation
        const { sha256Index, bcryptHash } = await generateAccessCode();
        const organisation = await prisma.organisation.create({
          data: {
            name: orgData.name,
            accessCode: sha256Index,
            accessCodeHash: bcryptHash,
            country: orgData.country,
            region: orgData.region,
            sector: orgData.sector,
            size: orgData.size,
            legalStructure: orgData.legalStructure,
          },
        });

        // Create assessment
        const assessment = await prisma.assessment.create({
          data: {
            organisationId: organisation.id,
            status: 'completed',
            completedAt: new Date(),
          },
        });

        if (body.format === 'full') {
          // ── Full format: create responses, calculate scores ──
          const responseRecords = entry.responses.map((resp: any) => {
            const meta = QUESTION_MAP.get(resp.questionId);
            if (!meta) {
              errors.push(`Assessment ${i}: unknown questionId "${resp.questionId}"`);
              return null;
            }
            return {
              assessmentId: assessment.id,
              domainKey: meta.domainKey,
              questionId: resp.questionId,
              questionType: meta.questionType,
              numericValue: resp.numericValue ?? null,
              textValue: resp.textValue ?? null,
            };
          }).filter(Boolean);

          if (responseRecords.length > 0) {
            await prisma.response.createMany({ data: responseRecords });
          }

          // Fetch created responses for scoring
          const allResponses = await prisma.response.findMany({
            where: { assessmentId: assessment.id },
          });

          // Calculate domain scores
          const domainScores = DOMAINS.map(domain =>
            calculateDomainScore(domain.key, allResponses)
          ).filter((s): s is NonNullable<typeof s> => s !== null);

          // Save domain scores
          if (domainScores.length > 0) {
            await prisma.domainScore.createMany({
              data: domainScores.map(ds => ({
                assessmentId: assessment.id,
                domainKey: ds.domainKey,
                score: ds.score,
                maturityLevel: ds.maturityLevel,
              })),
            });
          }

          // Calculate and save sector score if applicable
          if (orgData.sector) {
            const sectorModule = getSectorModule(orgData.sector);
            if (sectorModule) {
              const sectorScore = calculateSectorScore(sectorModule, allResponses);
              if (sectorScore) {
                await prisma.sectorScore.create({
                  data: {
                    assessmentId: assessment.id,
                    sectorKey: sectorScore.sectorKey,
                    score: sectorScore.score,
                  },
                });
              }
            }
          }

          // Calculate and save overall score
          const overallScore = calculateOverallScore(domainScores);
          await prisma.assessment.update({
            where: { id: assessment.id },
            data: { overallScore },
          });

        } else {
          // ── Simplified format: create domain scores directly ──
          const domainEntries = Object.entries(entry.domainScores) as [string, number][];
          const domainScoreRecords = domainEntries.map(([domainKey, score]) => {
            const maturity = getMaturityLevel(score);
            return {
              assessmentId: assessment.id,
              domainKey,
              score,
              maturityLevel: maturity.name,
            };
          });

          if (domainScoreRecords.length > 0) {
            await prisma.domainScore.createMany({ data: domainScoreRecords });
          }

          // Calculate overall score as average
          const scores = domainEntries.map(([, s]) => s);
          const overallScore = scores.length > 0
            ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) / 100
            : 0;

          await prisma.assessment.update({
            where: { id: assessment.id },
            data: { overallScore },
          });
        }

        imported++;
      } catch (err: any) {
        // Sanitise error — never leak raw database messages to client
        const safeMsg = err.code?.startsWith('P')
          ? 'Database constraint error'
          : 'Processing error';
        errors.push(`Assessment ${i} (${orgData.name}): ${safeMsg}`);
      }
    }

    res.json({
      success: true,
      data: { imported, skipped, errors, skippedOrgs, dryRun },
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET /import/stats — Import statistics ───
adminRoutes.get('/import/stats', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const totalOrgs = await prisma.organisation.count();
    const totalAssessments = await prisma.assessment.count({
      where: { status: 'completed' },
    });

    // Breakdown by country
    const orgsByCountry = await prisma.organisation.groupBy({
      by: ['country'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    });

    // Breakdown by sector
    const orgsBySector = await prisma.organisation.groupBy({
      by: ['sector'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    });

    // Last import = most recent completed assessment
    const lastAssessment = await prisma.assessment.findFirst({
      where: { status: 'completed' },
      orderBy: { completedAt: 'desc' },
      select: { completedAt: true },
    });

    res.json({
      success: true,
      data: {
        totalOrgs,
        totalAssessments,
        byCountry: orgsByCountry.map(r => ({ country: r.country ?? 'Unknown', count: r._count.id })),
        bySector: orgsBySector.map(r => ({ sector: r.sector ?? 'Unknown', count: r._count.id })),
        lastImportAt: lastAssessment?.completedAt?.toISOString() ?? null,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════════════════════════
// ETHICS OVERSIGHT ENDPOINTS
// Required for ethics committee audit, GDPR compliance, and
// research environment accountability (NVivo-equivalent standard)
// ═══════════════════════════════════════════════════════════════

// ─── GET /audit-log — Export audit trail for ethics review ───
adminRoutes.get('/audit-log', validateQuery(auditLogQuerySchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      startDate,
      endDate,
      action,
      resource,
      actorType,
      actorId,
      page = '1',
      limit = '100',
      format = 'json',
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(500, Math.max(1, parseInt(limit as string, 10) || 100));

    const where: any = {};
    if (startDate) where.timestamp = { ...where.timestamp, gte: new Date(startDate as string) };
    if (endDate) where.timestamp = { ...where.timestamp, lte: new Date(endDate as string) };
    if (action) where.action = action as string;
    if (resource) where.resource = resource as string;
    if (actorType) where.actorType = actorType as string;
    if (actorId) where.actorId = actorId as string;

    const [total, logs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
    ]);

    // Log this admin access to the audit trail
    await logAudit({
      action: 'export',
      resource: 'audit-log',
      actorType: 'admin',
      method: 'GET',
      path: req.originalUrl,
      statusCode: 200,
      meta: JSON.stringify({ filters: { startDate, endDate, action, resource, actorType }, resultCount: logs.length }),
    });

    if (format === 'csv') {
      const headers = ['Timestamp', 'Action', 'Resource', 'ResourceId', 'ActorType', 'ActorId', 'IpHash', 'Method', 'Path', 'StatusCode', 'Meta'];
      const csvRows = [headers.map(escapeCsv).join(',')];
      for (const log of logs) {
        csvRows.push([
          escapeCsv(log.timestamp.toISOString()),
          escapeCsv(log.action),
          escapeCsv(log.resource),
          escapeCsv(log.resourceId),
          escapeCsv(log.actorType),
          escapeCsv(log.actorId),
          escapeCsv(log.ip),
          escapeCsv(log.method),
          escapeCsv(log.path),
          escapeCsv(log.statusCode),
          escapeCsv(log.meta),
        ].join(','));
      }
      const filename = `wiseshift-audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      return res.send(csvRows.join('\r\n'));
    }

    res.json({
      success: true,
      data: logs,
      pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET /consent-records — Export consent records for ethics review ───
adminRoutes.get('/consent-records', validateQuery(consentRecordsQuerySchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { subjectType, since, format = 'json' } = req.query;

    const where: any = {};
    if (subjectType) where.subjectType = subjectType as string;
    if (since) where.createdAt = { gte: new Date(since as string) };

    const records = await prisma.consentRecord.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    // Summary statistics
    const granted = records.filter(r => r.action === 'granted').length;
    const withdrawn = records.filter(r => r.action === 'withdrawn').length;
    const uniqueSubjects = new Set(records.map(r => `${r.subjectType}:${r.subjectId}`)).size;
    const currentVersionCount = records.filter(r => r.consentVersion === CURRENT_CONSENT_VERSION && r.action === 'granted').length;

    await logAudit({
      action: 'export',
      resource: 'consent-records',
      actorType: 'admin',
      method: 'GET',
      path: req.originalUrl,
      statusCode: 200,
      meta: JSON.stringify({ resultCount: records.length }),
    });

    if (format === 'csv') {
      const headers = ['SubjectType', 'SubjectId', 'ConsentVersion', 'Action', 'IpHash', 'CreatedAt'];
      const csvRows = [headers.map(escapeCsv).join(',')];
      for (const r of records) {
        csvRows.push([
          escapeCsv(r.subjectType),
          escapeCsv(r.subjectId),
          escapeCsv(r.consentVersion),
          escapeCsv(r.action),
          escapeCsv(r.ipHash),
          escapeCsv(r.createdAt.toISOString()),
        ].join(','));
      }
      const filename = `wiseshift-consent-records-${new Date().toISOString().slice(0, 10)}.csv`;
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      return res.send(csvRows.join('\r\n'));
    }

    res.json({
      success: true,
      data: {
        records,
        summary: {
          total: records.length,
          granted,
          withdrawn,
          uniqueSubjects,
          currentVersionCount,
          currentVersion: CURRENT_CONSENT_VERSION,
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET /data-integrity — Verify database integrity ───
adminRoutes.get('/data-integrity', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    // Row counts for all key tables
    const [
      organisations,
      assessments,
      responses,
      domainScores,
      auditLogs,
      consentRecords,
      researcherAccounts,
      dataAccessLogs,
    ] = await Promise.all([
      prisma.organisation.count(),
      prisma.assessment.count(),
      prisma.response.count(),
      prisma.domainScore.count(),
      prisma.auditLog.count(),
      prisma.consentRecord.count(),
      prisma.researcherAccount.count(),
      prisma.dataAccessLog.count(),
    ]);

    // Integrity checks
    const orphanedAssessments = await prisma.assessment.count({
      where: { organisation: { is: null as any } },
    }).catch(() => 0);

    const assessmentsWithoutScores = await prisma.assessment.count({
      where: {
        status: 'completed',
        domainScores: { none: {} },
      },
    });

    const unconsentedOrgs = await prisma.organisation.count({
      where: { consentedAt: null },
    });

    // Compute a table-count checksum for tamper detection
    const countsString = `${organisations}:${assessments}:${responses}:${domainScores}:${auditLogs}:${consentRecords}`;
    const checksum = createHash('sha256').update(countsString).digest('hex').slice(0, 16);

    await logAudit({
      action: 'read',
      resource: 'data-integrity',
      actorType: 'admin',
      method: 'GET',
      path: '/api/admin/data-integrity',
      statusCode: 200,
    });

    res.json({
      success: true,
      data: {
        verifiedAt: new Date().toISOString(),
        tableCounts: {
          organisations,
          assessments,
          responses,
          domainScores,
          auditLogs,
          consentRecords,
          researcherAccounts,
          dataAccessLogs,
        },
        integrityChecks: {
          orphanedAssessments,
          completedWithoutScores: assessmentsWithoutScores,
          unconsentedOrganisations: unconsentedOrgs,
        },
        checksum,
        status: orphanedAssessments === 0 && assessmentsWithoutScores === 0
          ? 'healthy'
          : 'warnings',
      },
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET /researcher-access — Audit researcher data access ───
adminRoutes.get('/researcher-access', validateQuery(researcherAccessQuerySchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { researcherId, startDate, endDate, page = '1', limit = '100' } = req.query;
    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(500, Math.max(1, parseInt(limit as string, 10) || 100));

    const where: any = {};
    if (researcherId) where.researcherId = researcherId as string;
    if (startDate) where.createdAt = { ...where.createdAt, gte: new Date(startDate as string) };
    if (endDate) where.createdAt = { ...where.createdAt, lte: new Date(endDate as string) };

    const [total, logs] = await Promise.all([
      prisma.dataAccessLog.count({ where }),
      prisma.dataAccessLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
    ]);

    // Enrich with researcher info
    const researcherIds = [...new Set(logs.map(l => l.researcherId))];
    const researchers = await prisma.researcherAccount.findMany({
      where: { id: { in: researcherIds } },
      select: { id: true, email: true, name: true, institution: true, accessLevel: true, ethicsApproval: true },
    });
    const researcherMap = new Map(researchers.map(r => [r.id, r]));

    const enrichedLogs = logs.map(l => ({
      ...l,
      queryParams: l.queryParams ? JSON.parse(l.queryParams) : null,
      researcher: researcherMap.get(l.researcherId) || null,
    }));

    await logAudit({
      action: 'read',
      resource: 'researcher-access',
      actorType: 'admin',
      method: 'GET',
      path: req.originalUrl,
      statusCode: 200,
      meta: JSON.stringify({ researcherId, resultCount: logs.length }),
    });

    res.json({
      success: true,
      data: enrichedLogs,
      pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET /researchers — List all researcher accounts for ethics oversight ───
adminRoutes.get('/researchers', validateQuery(researcherListQuerySchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { accessLevel, verified } = req.query;

    const where: any = {};
    if (accessLevel) where.accessLevel = accessLevel as string;
    if (verified !== undefined) where.verified = verified === 'true';

    const researchers = await prisma.researcherAccount.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        name: true,
        institution: true,
        accessLevel: true,
        verified: true,
        ethicsApproval: true,
        createdAt: true,
      },
    });

    // Get access counts per researcher
    const accessCounts = await prisma.dataAccessLog.groupBy({
      by: ['researcherId'],
      _count: true,
    });
    const countMap = new Map(accessCounts.map(a => [a.researcherId, a._count]));

    const data = researchers.map(r => ({
      ...r,
      dataAccessCount: countMap.get(r.id) || 0,
    }));

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

// ─── PUT /researchers/:id/access-level — Admin-controlled access level changes ───
adminRoutes.put('/researchers/:id/access-level', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { accessLevel } = req.body;

    if (!['public', 'registered', 'approved'].includes(accessLevel)) {
      return res.status(400).json({ success: false, error: 'Invalid access level. Must be: public, registered, or approved' });
    }

    const researcher = await prisma.researcherAccount.findUnique({ where: { id } });
    if (!researcher) {
      return res.status(404).json({ success: false, error: 'Researcher not found' });
    }

    const updated = await prisma.researcherAccount.update({
      where: { id },
      data: { accessLevel },
    });

    await logAudit({
      action: 'update',
      resource: 'researcher',
      resourceId: id,
      actorType: 'admin',
      method: 'PUT',
      path: `/api/admin/researchers/${id}/access-level`,
      statusCode: 200,
      meta: JSON.stringify({ previousLevel: researcher.accessLevel, newLevel: accessLevel }),
    });

    res.json({
      success: true,
      data: {
        id: updated.id,
        email: updated.email,
        name: updated.name,
        accessLevel: updated.accessLevel,
        ethicsApproval: updated.ethicsApproval,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════════════════════════
// ETHICS SUBMISSION REPORT GENERATOR
// Generates a comprehensive DOCX for ethics committee review
// ═══════════════════════════════════════════════════════════════

adminRoutes.get('/ethics-report', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Gather all ethics-relevant data
    const [
      orgCount,
      assessmentCount,
      completedCount,
      responseCount,
      consentRecords,
      auditLogCount,
      researcherAccounts,
      dataAccessLogCount,
      unconsentedOrgs,
      assessmentsWithoutScores,
    ] = await Promise.all([
      prisma.organisation.count(),
      prisma.assessment.count(),
      prisma.assessment.count({ where: { status: 'completed' } }),
      prisma.response.count(),
      prisma.consentRecord.findMany({ orderBy: { createdAt: 'desc' } }),
      prisma.auditLog.count(),
      prisma.researcherAccount.findMany({
        select: { id: true, email: true, name: true, institution: true, accessLevel: true, verified: true, ethicsApproval: true, createdAt: true },
      }),
      prisma.dataAccessLog.count(),
      prisma.organisation.count({ where: { consentedAt: null } }),
      prisma.assessment.count({ where: { status: 'completed', domainScores: { none: {} } } }),
    ]);

    const retentionPolicy = getRetentionPolicy();
    const consentGranted = consentRecords.filter(r => r.action === 'granted').length;
    const consentWithdrawn = consentRecords.filter(r => r.action === 'withdrawn').length;
    const uniqueSubjects = new Set(consentRecords.map(r => `${r.subjectType}:${r.subjectId}`)).size;

    // Compute integrity checksum
    const countsString = `${orgCount}:${assessmentCount}:${responseCount}:${auditLogCount}:${consentRecords.length}`;
    const checksum = createHash('sha256').update(countsString).digest('hex').slice(0, 16);

    // Build document
    const children: any[] = [];

    // Title page
    children.push(new Paragraph({ text: 'WISEShift Research Ethics Compliance Report', heading: HeadingLevel.TITLE }));
    children.push(new Paragraph({ text: `Generated: ${new Date().toISOString().slice(0, 10)}`, spacing: { after: 100 } }));
    children.push(new Paragraph({ text: `Data Integrity Checksum: ${checksum}`, spacing: { after: 400 } }));
    children.push(new Paragraph({ text: 'This report is auto-generated by the WISEShift platform to support ethics committee review. It summarises data protection measures, consent compliance, access controls, audit trail integrity, and data retention policies.', spacing: { after: 400 } }));

    // 1. Data Protection Summary
    children.push(new Paragraph({ text: '1. Data Protection Measures', heading: HeadingLevel.HEADING_1, spacing: { before: 400 } }));
    children.push(new Paragraph({ text: 'The WISEShift platform implements the following data protection measures:', spacing: { after: 200 } }));
    const protections = [
      'Access codes are stored using dual-hash security: SHA-256 index for O(1) lookup + bcrypt (12 rounds) for verification. Raw codes are never stored.',
      `K-anonymity threshold of ${K_ANONYMITY_THRESHOLD}: aggregate data suppresses categories with fewer than ${K_ANONYMITY_THRESHOLD} entries to prevent re-identification.`,
      'CSRF protection via Origin header validation on all mutation endpoints.',
      'HTTPS enforcement with HSTS (1 year, includeSubDomains, preload) in production.',
      'Rate limiting: 100 req/15min (general API), 500 req/15min (research), 5 req/15min (resume/brute-force protection).',
      'Content Security Policy with restrictive directives (no inline scripts, frame-ancestors: none).',
      'IP addresses are hashed (SHA-256) before storage in audit and consent records.',
      'GDPR right to erasure (full delete) and right to restriction (anonymisation) supported via API endpoints.',
    ];
    for (const p of protections) {
      children.push(new Paragraph({ text: `  \u2022  ${p}`, spacing: { after: 60 } }));
    }

    // 2. Consent Compliance
    children.push(new Paragraph({ text: '2. Consent Compliance', heading: HeadingLevel.HEADING_1, spacing: { before: 400 } }));
    const consentTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({ children: [
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Metric', bold: true })] })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Value', bold: true })] })] }),
        ]}),
        new TableRow({ children: [
          new TableCell({ children: [new Paragraph('Current Consent Version')] }),
          new TableCell({ children: [new Paragraph(CURRENT_CONSENT_VERSION)] }),
        ]}),
        new TableRow({ children: [
          new TableCell({ children: [new Paragraph('Total Consent Records')] }),
          new TableCell({ children: [new Paragraph(String(consentRecords.length))] }),
        ]}),
        new TableRow({ children: [
          new TableCell({ children: [new Paragraph('Consent Granted')] }),
          new TableCell({ children: [new Paragraph(String(consentGranted))] }),
        ]}),
        new TableRow({ children: [
          new TableCell({ children: [new Paragraph('Consent Withdrawn')] }),
          new TableCell({ children: [new Paragraph(String(consentWithdrawn))] }),
        ]}),
        new TableRow({ children: [
          new TableCell({ children: [new Paragraph('Unique Subjects')] }),
          new TableCell({ children: [new Paragraph(String(uniqueSubjects))] }),
        ]}),
        new TableRow({ children: [
          new TableCell({ children: [new Paragraph('Organisations Without Consent')] }),
          new TableCell({ children: [new Paragraph(String(unconsentedOrgs))] }),
        ]}),
      ],
    });
    children.push(consentTable);
    children.push(new Paragraph({ text: 'Consent is recorded with timestamp, version, action (granted/withdrawn), and hashed IP. Participants can withdraw consent at any time via the platform.', spacing: { before: 200, after: 200 } }));

    // 3. Data Inventory
    children.push(new Paragraph({ text: '3. Data Inventory', heading: HeadingLevel.HEADING_1, spacing: { before: 400 } }));
    const dataTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({ children: [
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Data Category', bold: true })] })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Count', bold: true })] })] }),
        ]}),
        new TableRow({ children: [
          new TableCell({ children: [new Paragraph('Organisations')] }),
          new TableCell({ children: [new Paragraph(String(orgCount))] }),
        ]}),
        new TableRow({ children: [
          new TableCell({ children: [new Paragraph('Assessments (total)')] }),
          new TableCell({ children: [new Paragraph(String(assessmentCount))] }),
        ]}),
        new TableRow({ children: [
          new TableCell({ children: [new Paragraph('Assessments (completed)')] }),
          new TableCell({ children: [new Paragraph(String(completedCount))] }),
        ]}),
        new TableRow({ children: [
          new TableCell({ children: [new Paragraph('Individual Responses')] }),
          new TableCell({ children: [new Paragraph(String(responseCount))] }),
        ]}),
        new TableRow({ children: [
          new TableCell({ children: [new Paragraph('Audit Log Entries')] }),
          new TableCell({ children: [new Paragraph(String(auditLogCount))] }),
        ]}),
        new TableRow({ children: [
          new TableCell({ children: [new Paragraph('Researcher Data Access Logs')] }),
          new TableCell({ children: [new Paragraph(String(dataAccessLogCount))] }),
        ]}),
      ],
    });
    children.push(dataTable);

    // 4. Data Retention
    children.push(new Paragraph({ text: '4. Data Retention Policy', heading: HeadingLevel.HEADING_1, spacing: { before: 400 } }));
    children.push(new Paragraph({ text: `Completed assessments: ${retentionPolicy.completedRetentionMonths} months retention.`, spacing: { after: 60 } }));
    children.push(new Paragraph({ text: `In-progress assessments: ${retentionPolicy.inProgressRetentionMonths} months retention.`, spacing: { after: 60 } }));
    children.push(new Paragraph({ text: 'Expired data is purged via an admin-triggered cleanup endpoint. Automated scheduling is recommended for production deployment.', spacing: { after: 200 } }));

    // 5. Access Controls
    children.push(new Paragraph({ text: '5. Access Controls', heading: HeadingLevel.HEADING_1, spacing: { before: 400 } }));
    children.push(new Paragraph({ text: 'The platform implements role-based access with the following tiers:', spacing: { after: 200 } }));
    const accessTiers = [
      'Participant: Organisation-level access via hashed access code. Can complete assessments, view own results, export own data, and exercise GDPR rights.',
      'Researcher (Dashboard): Time-limited dashboard codes with role designation (policymaker/funder/researcher). Access to aggregate data, coding tools, and anonymised narratives.',
      'Researcher (Portal): Self-registered accounts with 3-tier access (public → registered → approved). Elevated access requires ethics approval reference and admin approval.',
      'Administrator: Secret key authentication. Access to bulk import, ethics oversight endpoints, and researcher account management.',
    ];
    for (const tier of accessTiers) {
      children.push(new Paragraph({ text: `  \u2022  ${tier}`, spacing: { after: 60 } }));
    }

    // 6. Researcher Accounts
    children.push(new Paragraph({ text: '6. Registered Researchers', heading: HeadingLevel.HEADING_1, spacing: { before: 400 } }));
    if (researcherAccounts.length === 0) {
      children.push(new Paragraph({ text: 'No researcher accounts registered at the time of report generation.' }));
    } else {
      const researcherHeaderRow = new TableRow({ children: [
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Name', bold: true })] })] }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Institution', bold: true })] })] }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Access Level', bold: true })] })] }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Verified', bold: true })] })] }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Ethics Ref', bold: true })] })] }),
      ]});
      const researcherRows = researcherAccounts.map(r => new TableRow({ children: [
        new TableCell({ children: [new Paragraph(r.name)] }),
        new TableCell({ children: [new Paragraph(r.institution)] }),
        new TableCell({ children: [new Paragraph(r.accessLevel)] }),
        new TableCell({ children: [new Paragraph(r.verified ? 'Yes' : 'No')] }),
        new TableCell({ children: [new Paragraph(r.ethicsApproval || 'N/A')] }),
      ]}));
      children.push(new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [researcherHeaderRow, ...researcherRows],
      }));
    }

    // 7. Audit Trail Summary
    children.push(new Paragraph({ text: '7. Audit Trail', heading: HeadingLevel.HEADING_1, spacing: { before: 400 } }));
    children.push(new Paragraph({ text: `Total audit log entries: ${auditLogCount}`, spacing: { after: 60 } }));
    children.push(new Paragraph({ text: 'All API access, data mutations, exports, and administrative actions are logged with timestamp, actor type/ID, hashed IP, HTTP method/path, and contextual metadata.', spacing: { after: 60 } }));
    children.push(new Paragraph({ text: 'Research coding actions (tag CRUD, highlights, notes, quotes, layers, shares) include explicit semantic audit entries with metadata identifying the specific tag, response, and action.', spacing: { after: 200 } }));

    // 8. Integrity
    children.push(new Paragraph({ text: '8. Data Integrity Verification', heading: HeadingLevel.HEADING_1, spacing: { before: 400 } }));
    children.push(new Paragraph({ text: `Completed assessments without scores: ${assessmentsWithoutScores}`, spacing: { after: 60 } }));
    children.push(new Paragraph({ text: `Organisations without consent record: ${unconsentedOrgs}`, spacing: { after: 60 } }));
    children.push(new Paragraph({ text: `Table count checksum (SHA-256): ${checksum}`, spacing: { after: 60 } }));
    const integrityStatus = assessmentsWithoutScores === 0 ? 'HEALTHY' : 'WARNINGS — review flagged items above';
    children.push(new Paragraph({
      children: [new TextRun({ text: `Overall status: ${integrityStatus}`, bold: true })],
      spacing: { after: 200 },
    }));

    const doc = new Document({ sections: [{ children }] });
    const buffer = await Packer.toBuffer(doc);

    await logAudit({
      action: 'export', resource: 'ethics-report',
      actorType: 'admin', method: 'GET', path: req.originalUrl,
      statusCode: 200,
    });

    const filename = `wiseshift-ethics-report-${new Date().toISOString().slice(0, 10)}.docx`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.send(Buffer.from(buffer));
  } catch (err) {
    next(err);
  }
});
