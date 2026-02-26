import type { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

/**
 * Shared admin authentication middleware.
 * Checks Authorization: Bearer <ADMIN_SECRET> header.
 * Uses timing-safe comparison to prevent timing attacks.
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace('Bearer ', '') || '';
  const secret = process.env.ADMIN_SECRET || '';

  if (!secret || !token) {
    return res.status(401).json({ success: false, error: 'Invalid admin token' });
  }

  // Constant-time comparison to prevent timing attacks
  const tokenBuf = Buffer.from(token, 'utf8');
  const secretBuf = Buffer.from(secret, 'utf8');

  if (tokenBuf.length !== secretBuf.length || !crypto.timingSafeEqual(tokenBuf, secretBuf)) {
    return res.status(401).json({ success: false, error: 'Invalid admin token' });
  }

  next();
}
