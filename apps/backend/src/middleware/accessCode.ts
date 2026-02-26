import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma.js';
import { AppError } from './errorHandler.js';
import { sha256, verifyAccessCode } from '../utils/hashing.js';

export async function validateAccessCode(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const accessCode = req.params.accessCode || req.headers['x-access-code'] as string | undefined;

  if (!accessCode) {
    return next(new AppError('Access code is required', 401));
  }

  // Lookup by SHA-256 index for O(1) performance
  const sha256Index = sha256(accessCode);
  let organisation = await prisma.organisation.findUnique({
    where: { accessCode: sha256Index },
    include: { assessments: true },
  });

  if (organisation && organisation.accessCodeHash) {
    // New hashed flow: verify with bcrypt
    const valid = await verifyAccessCode(accessCode, organisation.accessCodeHash);
    if (!valid) {
      return next(new AppError('Invalid access code', 404));
    }
  } else if (!organisation) {
    // Fallback: try plaintext lookup for un-migrated codes
    organisation = await prisma.organisation.findUnique({
      where: { accessCode },
      include: { assessments: true },
    });
    if (!organisation) {
      return next(new AppError('Invalid access code', 404));
    }
  }

  (req as any).organisation = organisation;
  next();
}
