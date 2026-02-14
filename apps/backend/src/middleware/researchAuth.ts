import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma.js';
import { AppError } from './errorHandler.js';

export async function researchAuth(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  const dashboardCode = req.headers['x-dashboard-code'] as string;

  if (!dashboardCode) {
    return next(new AppError('Dashboard access code is required', 401));
  }

  const access = await prisma.dashboardAccess.findUnique({
    where: { accessCode: dashboardCode },
  });

  if (!access) {
    return next(new AppError('Invalid dashboard access code', 401));
  }

  if (new Date() > access.expiresAt) {
    return next(new AppError('Dashboard access code has expired', 401));
  }

  (req as any).dashboardAccessId = access.id;
  (req as any).dashboardAccess = access;
  next();
}
