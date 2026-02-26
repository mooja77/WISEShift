import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma.js';
import { sha256 } from '../utils/hashing.js';

export interface AuditEntry {
  action: string;
  resource: string;
  resourceId?: string | null;
  actorType: string;
  actorId?: string | null;
  ip?: string | null;
  method?: string | null;
  path?: string | null;
  statusCode?: number | null;
  meta?: string | null;
}

function determineActorType(req: Request): { actorType: string; actorId: string | null } {
  if ((req as any).researcherAccountId) {
    return { actorType: 'researcher', actorId: (req as any).researcherAccountId };
  }
  if ((req as any).dashboardAccessId) {
    return { actorType: 'researcher', actorId: (req as any).dashboardAccessId };
  }
  if ((req as any).organisation) {
    return { actorType: 'organisation', actorId: (req as any).organisation.id };
  }
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return { actorType: 'admin', actorId: null };
  }
  return { actorType: 'system', actorId: null };
}

function determineAction(method: string, path: string): string {
  if (path.includes('/export')) return 'export';
  if (method === 'DELETE' && path.includes('/data')) return 'anonymise';
  switch (method) {
    case 'GET': return 'read';
    case 'POST': return 'write';
    case 'PUT': case 'PATCH': return 'update';
    case 'DELETE': return 'delete';
    default: return 'read';
  }
}

function determineResource(path: string): string {
  // Research workspace — granular resource tracking for coding audit trail
  if (path.includes('/layers') && path.includes('/highlights')) return 'layer-highlight';
  if (path.includes('/layers') && path.includes('/share')) return 'layer-share';
  if (path.includes('/layers')) return 'coding-layer';
  if (path.includes('/highlights')) return 'highlight';
  if (path.includes('/tags')) return 'research-tag';
  if (path.includes('/notes')) return 'research-note';
  if (path.includes('/quotes')) return 'quote-pin';
  if (path.includes('/heatmap')) return 'heatmap';
  if (path.includes('/sampling')) return 'sampling';
  if (path.includes('/irr')) return 'irr';
  if (path.includes('/trends')) return 'trends';
  if (path.includes('/narratives')) return 'narratives';
  if (path.includes('/statistics')) return 'statistics';
  if (path.includes('/codebook') || path.includes('/data-dictionary') || path.includes('/citation')) return 'research-export';
  if (path.includes('/action-plan')) return 'action-plan';
  if (path.includes('/responses')) return 'responses';
  if (path.includes('/results')) return 'results';
  if (path.includes('/report')) return 'report';
  if (path.includes('/export')) return 'export';
  if (path.includes('/domain')) return 'domain-scores';
  if (path.includes('/data')) return 'assessment-data';
  if (path.includes('/assessments')) return 'assessment';
  if (path.includes('/dashboard')) return 'dashboard';
  if (path.includes('/benchmarks')) return 'benchmarks';
  if (path.includes('/research')) return 'research';
  if (path.includes('/consent')) return 'consent';
  if (path.includes('/registry')) return 'registry';
  if (path.includes('/researchers')) return 'researcher';
  if (path.includes('/working-groups')) return 'working-group';
  if (path.includes('/admin')) return 'admin';
  return 'unknown';
}

/**
 * Write an audit entry directly to the database.
 * For use in route handlers (e.g., canvas coding operations).
 */
export async function logAudit(entry: AuditEntry): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        action: entry.action,
        resource: entry.resource,
        resourceId: entry.resourceId ?? null,
        actorType: entry.actorType,
        actorId: entry.actorId ?? null,
        ip: entry.ip ?? null,
        method: entry.method ?? null,
        path: entry.path ?? null,
        statusCode: entry.statusCode ?? null,
        meta: entry.meta ?? null,
      },
    });
  } catch (err) {
    // Fail silently — audit logging should not break the app
    console.error('Audit log write error:', (err as Error).message);
  }
}

/**
 * Express middleware that logs request/response to the AuditLog table.
 */
export function auditLog(req: Request, res: Response, next: NextFunction): void {
  const originalEnd = res.end;
  const startPath = req.originalUrl || req.path;

  res.end = function (...args: any[]) {
    const action = determineAction(req.method, startPath);
    const { actorType, actorId } = determineActorType(req);
    const rawIp = req.ip || req.socket.remoteAddress || 'unknown';
    const hashedIp = sha256(rawIp);

    logAudit({
      action,
      resource: determineResource(startPath),
      resourceId: req.params?.id || null,
      actorType,
      actorId,
      ip: hashedIp,
      method: req.method,
      path: startPath,
      statusCode: res.statusCode,
    });

    return (originalEnd as Function).apply(res, args);
  } as any;

  next();
}
