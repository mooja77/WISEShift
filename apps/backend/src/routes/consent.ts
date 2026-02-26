import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { validate } from '../middleware/validation.js';
import { AppError } from '../middleware/errorHandler.js';
import { sha256 } from '../utils/hashing.js';
import { CURRENT_CONSENT_VERSION } from '@wiseshift/shared';
import { z } from 'zod';

export const consentRoutes = Router();

const consentSchema = z.object({
  subjectType: z.enum(['organisation', 'researcher']),
  subjectId: z.string().min(1),
  consentVersion: z.string().min(1).optional(),
});

// POST /api/consent — Record consent grant
consentRoutes.post('/', validate(consentSchema), async (req, res, next) => {
  try {
    const { subjectType, subjectId, consentVersion } = req.body;
    const version = consentVersion || CURRENT_CONSENT_VERSION;
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const ipHash = sha256(ip);

    const record = await prisma.consentRecord.create({
      data: {
        subjectType,
        subjectId,
        consentVersion: version,
        action: 'granted',
        ipHash,
      },
    });

    // Update organisation/researcher consent timestamp
    if (subjectType === 'organisation') {
      await prisma.organisation.update({
        where: { id: subjectId },
        data: { consentedAt: new Date(), consentVersion: version },
      }).catch(() => {/* org may not exist by this ID — non-fatal */});
    }

    res.status(201).json({
      success: true,
      data: { id: record.id, consentVersion: version },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/consent/:subjectType/:subjectId — Check current consent status
consentRoutes.get('/:subjectType/:subjectId', async (req, res, next) => {
  try {
    const { subjectType, subjectId } = req.params;

    const latestRecord = await prisma.consentRecord.findFirst({
      where: { subjectType, subjectId },
      orderBy: { createdAt: 'desc' },
    });

    if (!latestRecord || latestRecord.action === 'withdrawn') {
      return res.json({
        success: true,
        data: { consented: false, currentVersion: CURRENT_CONSENT_VERSION },
      });
    }

    const isCurrentVersion = latestRecord.consentVersion === CURRENT_CONSENT_VERSION;

    res.json({
      success: true,
      data: {
        consented: true,
        consentVersion: latestRecord.consentVersion,
        currentVersion: CURRENT_CONSENT_VERSION,
        needsRenewal: !isCurrentVersion,
        grantedAt: latestRecord.createdAt,
      },
    });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/consent/:subjectType/:subjectId — Withdraw consent
consentRoutes.delete('/:subjectType/:subjectId', async (req, res, next) => {
  try {
    const { subjectType, subjectId } = req.params;
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const ipHash = sha256(ip);

    await prisma.consentRecord.create({
      data: {
        subjectType,
        subjectId,
        consentVersion: CURRENT_CONSENT_VERSION,
        action: 'withdrawn',
        ipHash,
      },
    });

    // Clear organisation consent timestamp
    if (subjectType === 'organisation') {
      await prisma.organisation.update({
        where: { id: subjectId },
        data: { consentedAt: null, consentVersion: null },
      }).catch(() => {});
    }

    res.json({ success: true, data: { message: 'Consent withdrawn' } });
  } catch (err) {
    next(err);
  }
});
