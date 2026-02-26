import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma.js';
import { AppError } from './errorHandler.js';
import { sha256, verifyAccessCode } from '../utils/hashing.js';
import { verifyResearcherToken } from '../utils/jwt.js';

export async function researchAuth(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  const dashboardCode = req.headers['x-dashboard-code'] as string;

  if (!dashboardCode) {
    return next(new AppError('Dashboard access code is required', 401));
  }

  // Try JWT verification first (for researcher tokens)
  const jwtPayload = verifyResearcherToken(dashboardCode);
  if (jwtPayload) {
    // JWT-authenticated researcher — look up their dashboard access
    const access = await prisma.dashboardAccess.findFirst({
      where: { id: jwtPayload.accountId },
    });
    if (access) {
      (req as any).dashboardAccessId = access.id;
      (req as any).dashboardAccess = access;
      (req as any).researcherAccountId = jwtPayload.accountId;
      return next();
    }
  }

  // Try SHA-256 hashed lookup
  const sha256Index = sha256(dashboardCode);
  let access = await prisma.dashboardAccess.findUnique({
    where: { accessCode: sha256Index },
  });

  if (access && access.accessCodeHash) {
    // Verify with bcrypt
    const valid = await verifyAccessCode(dashboardCode, access.accessCodeHash);
    if (!valid) {
      return next(new AppError('Invalid dashboard access code', 401));
    }
  } else if (!access) {
    // Fallback: plaintext lookup for un-migrated codes
    access = await prisma.dashboardAccess.findUnique({
      where: { accessCode: dashboardCode },
    });
    if (!access) {
      return next(new AppError('Invalid dashboard access code', 401));
    }
  }

  if (new Date() > access.expiresAt) {
    return next(new AppError('Dashboard access code has expired', 401));
  }

  (req as any).dashboardAccessId = access.id;
  (req as any).dashboardAccess = access;
  next();
}
