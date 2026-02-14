import { prisma } from '../lib/prisma.js';

/**
 * Data retention policy for GDPR compliance.
 *
 * Default retention periods:
 * - Completed assessments: 24 months from updatedAt
 * - In-progress assessments: 6 months from updatedAt
 *
 * The concept of retentionExpiresAt is derived from:
 *   updatedAt + retention period (no schema change required)
 */

const COMPLETED_RETENTION_MONTHS = 24;
const IN_PROGRESS_RETENTION_MONTHS = 6;

function subtractMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() - months);
  return result;
}

/**
 * Calculate the retention expiry date for a given assessment.
 */
export function getRetentionExpiresAt(
  updatedAt: Date,
  status: string
): Date {
  const months = status === 'completed'
    ? COMPLETED_RETENTION_MONTHS
    : IN_PROGRESS_RETENTION_MONTHS;

  const expiresAt = new Date(updatedAt);
  expiresAt.setMonth(expiresAt.getMonth() + months);
  return expiresAt;
}

/**
 * Clean up expired data according to the retention policy.
 *
 * - In-progress assessments older than 6 months: delete entirely
 * - Completed assessments older than 24 months: anonymise
 *   (replace org name, clear narratives, keep numeric scores)
 *
 * Returns a summary of what was cleaned up.
 */
export async function cleanupExpiredData(): Promise<{
  deletedInProgress: number;
  anonymisedCompleted: number;
}> {
  const now = new Date();

  // 1. Delete in-progress assessments past their retention period
  const inProgressCutoff = subtractMonths(now, IN_PROGRESS_RETENTION_MONTHS);

  const expiredInProgress = await prisma.assessment.findMany({
    where: {
      status: 'in_progress',
      updatedAt: { lt: inProgressCutoff },
    },
    select: { id: true, organisationId: true },
  });

  // Delete assessments (cascading deletes handle responses, scores, action plans)
  for (const assessment of expiredInProgress) {
    await prisma.assessment.delete({ where: { id: assessment.id } });
  }

  // Clean up orphaned organisations (those with no remaining assessments)
  const orphanedOrgIds = new Set(expiredInProgress.map(a => a.organisationId));
  for (const orgId of orphanedOrgIds) {
    const remaining = await prisma.assessment.count({
      where: { organisationId: orgId },
    });
    if (remaining === 0) {
      await prisma.organisation.delete({ where: { id: orgId } });
    }
  }

  // 2. Anonymise completed assessments past their retention period
  const completedCutoff = subtractMonths(now, COMPLETED_RETENTION_MONTHS);

  const expiredCompleted = await prisma.assessment.findMany({
    where: {
      status: 'completed',
      updatedAt: { lt: completedCutoff },
    },
    include: { organisation: true },
  });

  for (const assessment of expiredCompleted) {
    // Anonymise organisation name (only if not already anonymised)
    if (assessment.organisation.name !== 'Anonymised Organisation') {
      await prisma.organisation.update({
        where: { id: assessment.organisationId },
        data: { name: 'Anonymised Organisation' },
      });
    }

    // Clear narrative text responses but keep numeric scores
    await prisma.response.updateMany({
      where: {
        assessmentId: assessment.id,
        questionType: 'narrative',
      },
      data: {
        textValue: null,
        tags: null,
      },
    });
  }

  return {
    deletedInProgress: expiredInProgress.length,
    anonymisedCompleted: expiredCompleted.length,
  };
}

/**
 * Returns retention policy information (useful for API responses / transparency).
 */
export function getRetentionPolicy() {
  return {
    completedRetentionMonths: COMPLETED_RETENTION_MONTHS,
    inProgressRetentionMonths: IN_PROGRESS_RETENTION_MONTHS,
    description:
      'Completed assessments are retained for 24 months, then anonymised. ' +
      'In-progress assessments are deleted after 6 months of inactivity.',
  };
}
