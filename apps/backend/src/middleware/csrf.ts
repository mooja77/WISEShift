import type { Request, Response, NextFunction } from 'express';

const MUTATION_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * CSRF protection middleware via Origin header validation.
 * For mutation requests (POST/PUT/PATCH/DELETE):
 *   - If Origin header is present, it must match an allowed origin
 *   - If no Origin (server-to-server, curl), allow through (already auth'd via headers)
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction) {
  if (!MUTATION_METHODS.has(req.method)) {
    return next();
  }

  const origin = req.headers.origin;

  // No Origin header → server-to-server, curl, or same-origin form. Allow through.
  if (!origin) {
    return next();
  }

  const allowedOrigins = getAllowedOrigins();

  if (allowedOrigins.length === 0) {
    // No allowed origins configured → skip CSRF in dev
    return next();
  }

  if (allowedOrigins.includes(origin)) {
    return next();
  }

  return res.status(403).json({
    success: false,
    error: 'CSRF validation failed: origin not allowed',
  });
}

function getAllowedOrigins(): string[] {
  const origins: string[] = [];

  if (process.env.ALLOWED_ORIGINS) {
    origins.push(...process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim()));
  }

  if (process.env.CORS_ORIGIN) {
    origins.push(process.env.CORS_ORIGIN);
  }

  if (process.env.FRONTEND_URL) {
    origins.push(process.env.FRONTEND_URL);
  }

  // In production, the app serves from same origin
  if (process.env.NODE_ENV === 'production' && process.env.RAILWAY_PUBLIC_DOMAIN) {
    origins.push(`https://${process.env.RAILWAY_PUBLIC_DOMAIN}`);
  }

  return origins;
}
