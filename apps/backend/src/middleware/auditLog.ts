import type { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';

const AUDIT_LOG_PATH = path.resolve(process.cwd(), 'audit.log');

export interface AuditEntry {
  timestamp: string;
  action: 'read' | 'write' | 'delete' | 'anonymise' | 'export';
  resource: string;
  resourceId: string | null;
  accessCode: string | null;
  ip: string;
  userAgent: string;
  statusCode: number;
  method: string;
  path: string;
}

function extractAccessCode(req: Request): string | null {
  // From route parameter (resume endpoint)
  if (req.params?.accessCode) {
    return req.params.accessCode;
  }
  // From header
  const headerCode = req.headers['x-access-code'] as string | undefined;
  if (headerCode) {
    return headerCode;
  }
  // From the organisation attached by validateAccessCode middleware
  if ((req as any).organisation?.accessCode) {
    return (req as any).organisation.accessCode;
  }
  return null;
}

function determineAction(method: string): AuditEntry['action'] {
  switch (method) {
    case 'GET':
      return 'read';
    case 'POST':
    case 'PUT':
    case 'PATCH':
      return 'write';
    case 'DELETE':
      return 'delete';
    default:
      return 'read';
  }
}

function determineResource(path: string): string {
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
  return 'unknown';
}

function writeAuditEntry(entry: AuditEntry): void {
  try {
    const line = JSON.stringify(entry) + '\n';
    fs.appendFileSync(AUDIT_LOG_PATH, line, 'utf-8');
  } catch (err) {
    // Fail silently — audit logging should not break the app
    console.error('Audit log write error:', (err as Error).message);
  }
}

/**
 * Audit logging middleware for assessment routes.
 * Logs data access events: who accessed what, what action, timestamp.
 */
export function auditLog(req: Request, res: Response, next: NextFunction): void {
  // Capture the original end to log after response is sent
  const originalEnd = res.end;
  const startPath = req.originalUrl || req.path;

  res.end = function (...args: any[]) {
    // Determine the action — override for specific endpoints
    let action = determineAction(req.method);
    if (startPath.includes('/export')) {
      action = 'export';
    }
    if (req.method === 'DELETE' && startPath.includes('/data')) {
      action = 'anonymise';
    }

    const entry: AuditEntry = {
      timestamp: new Date().toISOString(),
      action,
      resource: determineResource(startPath),
      resourceId: req.params?.id || null,
      accessCode: extractAccessCode(req),
      ip: req.ip || req.socket.remoteAddress || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
      statusCode: res.statusCode,
      method: req.method,
      path: startPath,
    };

    writeAuditEntry(entry);

    return (originalEnd as Function).apply(res, args);
  } as any;

  next();
}
