import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma.js';
import { AppError } from './errorHandler.js';

export async function validateAccessCode(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const accessCode = req.params.accessCode || req.headers['x-access-code'] as string | undefined;

  if (!accessCode) {
    return next(new AppError('Access code is required', 401));
  }

  const organisation = await prisma.organisation.findUnique({
    where: { accessCode },
    include: { assessments: true },
  });

  if (!organisation) {
    return next(new AppError('Invalid access code', 404));
  }

  (req as any).organisation = organisation;
  next();
}
