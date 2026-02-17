import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../middleware/errorHandler.js';
import { nanoid } from 'nanoid';

export const workingGroupRoutes = Router();

// ─── Helper: validate access code and get org ───
async function resolveAccessCode(accessCode: string) {
  if (!accessCode) throw new AppError('Access code is required', 401);
  const org = await prisma.organisation.findUnique({ where: { accessCode } });
  if (!org) throw new AppError('Invalid access code', 401);
  return org;
}

// ─── Helper: check membership & role ───
async function getMembership(groupId: string, accessCode: string) {
  return prisma.workingGroupMember.findUnique({
    where: { workingGroupId_accessCode: { workingGroupId: groupId, accessCode } },
  });
}

// ─── Helper: log activity ───
async function logActivity(groupId: string, actorName: string, action: string, detail?: string) {
  await prisma.activityEntry.create({
    data: { workingGroupId: groupId, actorName, action, detail },
  });
}

// ─── POST /api/working-groups — Create a new working group ───
workingGroupRoutes.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const accessCode = req.headers['x-access-code'] as string;
    const org = await resolveAccessCode(accessCode);
    const { name, description, sector } = req.body;

    if (!name) throw new AppError('Group name is required', 400);

    const group = await prisma.workingGroup.create({
      data: {
        name,
        description: description || null,
        sector: sector || org.sector || null,
        createdBy: accessCode,
      },
    });

    // Auto-add creator as admin member
    await prisma.workingGroupMember.create({
      data: {
        workingGroupId: group.id,
        accessCode,
        displayName: org.name,
        role: 'admin',
      },
    });

    await logActivity(group.id, org.name, 'created', `Created working group "${name}"`);

    res.status(201).json({ success: true, data: group });
  } catch (err) { next(err); }
});

// ─── GET /api/working-groups — List groups for current org ───
workingGroupRoutes.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const accessCode = req.headers['x-access-code'] as string;
    await resolveAccessCode(accessCode);

    const memberships = await prisma.workingGroupMember.findMany({
      where: { accessCode },
      include: {
        workingGroup: {
          include: {
            members: { select: { id: true, displayName: true, role: true } },
            _count: { select: { assignments: true, discussions: true } },
          },
        },
      },
    });

    const groups = memberships.map(m => ({
      ...m.workingGroup,
      myRole: m.role,
      memberCount: m.workingGroup.members.length,
      assignmentCount: m.workingGroup._count.assignments,
      discussionCount: m.workingGroup._count.discussions,
    }));

    res.json({ success: true, data: groups });
  } catch (err) { next(err); }
});

// ─── GET /api/working-groups/:id — Get group details ───
workingGroupRoutes.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const accessCode = req.headers['x-access-code'] as string;
    await resolveAccessCode(accessCode);
    const { id } = req.params;

    const membership = await getMembership(id, accessCode);
    if (!membership) throw new AppError('You are not a member of this group', 403);

    const group = await prisma.workingGroup.findUnique({
      where: { id },
      include: {
        members: { orderBy: { joinedAt: 'asc' } },
        assignments: {
          include: {
            assessment: {
              include: {
                organisation: { select: { name: true, country: true, sector: true } },
                domainScores: true,
              },
            },
          },
        },
        discussions: { orderBy: { createdAt: 'desc' }, take: 20 },
        documents: { orderBy: { createdAt: 'desc' } },
        activities: { orderBy: { createdAt: 'desc' }, take: 30 },
      },
    });

    if (!group) throw new AppError('Working group not found', 404);

    res.json({ success: true, data: { ...group, myRole: membership.role } });
  } catch (err) { next(err); }
});

// ─── POST /api/working-groups/:id/members — Add a member ───
workingGroupRoutes.post('/:id/members', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const callerCode = req.headers['x-access-code'] as string;
    await resolveAccessCode(callerCode);
    const { id } = req.params;

    const caller = await getMembership(id, callerCode);
    if (!caller || caller.role !== 'admin') throw new AppError('Only admins can add members', 403);

    const { accessCode, displayName, role = 'member' } = req.body;
    if (!accessCode || !displayName) throw new AppError('accessCode and displayName are required', 400);

    // Verify the access code belongs to an org
    const org = await prisma.organisation.findUnique({ where: { accessCode } });
    if (!org) throw new AppError('Invalid member access code', 400);

    const member = await prisma.workingGroupMember.create({
      data: {
        workingGroupId: id,
        accessCode,
        displayName,
        role: ['admin', 'member', 'observer'].includes(role) ? role : 'member',
      },
    });

    await logActivity(id, caller.displayName, 'joined', `${displayName} joined the group`);

    res.status(201).json({ success: true, data: member });
  } catch (err) { next(err); }
});

// ─── DELETE /api/working-groups/:id/members/:memberId — Remove a member ───
workingGroupRoutes.delete('/:id/members/:memberId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const callerCode = req.headers['x-access-code'] as string;
    await resolveAccessCode(callerCode);
    const { id, memberId } = req.params;

    const caller = await getMembership(id, callerCode);
    if (!caller || caller.role !== 'admin') throw new AppError('Only admins can remove members', 403);

    const member = await prisma.workingGroupMember.findUnique({ where: { id: memberId } });
    if (!member || member.workingGroupId !== id) throw new AppError('Member not found in this group', 404);

    await prisma.workingGroupMember.delete({ where: { id: memberId } });
    await logActivity(id, caller.displayName, 'removed', `${member.displayName} was removed`);

    res.json({ success: true });
  } catch (err) { next(err); }
});

// ─── POST /api/working-groups/:id/assignments — Assign an assessment ───
workingGroupRoutes.post('/:id/assignments', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const callerCode = req.headers['x-access-code'] as string;
    await resolveAccessCode(callerCode);
    const { id } = req.params;

    const caller = await getMembership(id, callerCode);
    if (!caller || !['admin', 'member'].includes(caller.role)) {
      throw new AppError('Observers cannot assign assessments', 403);
    }

    const { assessmentId } = req.body;
    if (!assessmentId) throw new AppError('assessmentId is required', 400);

    const assessment = await prisma.assessment.findUnique({ where: { id: assessmentId } });
    if (!assessment) throw new AppError('Assessment not found', 404);

    const assignment = await prisma.workingGroupAssignment.create({
      data: {
        workingGroupId: id,
        assessmentId,
        assignedBy: callerCode,
      },
    });

    await logActivity(id, caller.displayName, 'assigned', `Assigned assessment ${assessmentId}`);

    res.status(201).json({ success: true, data: assignment });
  } catch (err) { next(err); }
});

// ─── DELETE /api/working-groups/:id/assignments/:assignmentId — Unassign ───
workingGroupRoutes.delete('/:id/assignments/:assignmentId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const callerCode = req.headers['x-access-code'] as string;
    await resolveAccessCode(callerCode);
    const { id, assignmentId } = req.params;

    const caller = await getMembership(id, callerCode);
    if (!caller || caller.role !== 'admin') throw new AppError('Only admins can unassign', 403);

    await prisma.workingGroupAssignment.delete({ where: { id: assignmentId } });

    res.json({ success: true });
  } catch (err) { next(err); }
});

// ─── POST /api/working-groups/:id/discussions — Post a discussion message ───
workingGroupRoutes.post('/:id/discussions', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const callerCode = req.headers['x-access-code'] as string;
    await resolveAccessCode(callerCode);
    const { id } = req.params;

    const caller = await getMembership(id, callerCode);
    if (!caller) throw new AppError('You are not a member of this group', 403);
    if (caller.role === 'observer') throw new AppError('Observers cannot post discussions', 403);

    const { title, content, parentId } = req.body;
    if (!content) throw new AppError('Content is required', 400);

    const discussion = await prisma.discussion.create({
      data: {
        workingGroupId: id,
        authorName: caller.displayName,
        title: title || null,
        content,
        parentId: parentId || null,
      },
    });

    await logActivity(id, caller.displayName, 'posted', title || content.slice(0, 80));

    res.status(201).json({ success: true, data: discussion });
  } catch (err) { next(err); }
});

// ─── GET /api/working-groups/:id/discussions — Get all discussions ───
workingGroupRoutes.get('/:id/discussions', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const callerCode = req.headers['x-access-code'] as string;
    await resolveAccessCode(callerCode);
    const { id } = req.params;

    const caller = await getMembership(id, callerCode);
    if (!caller) throw new AppError('You are not a member of this group', 403);

    const discussions = await prisma.discussion.findMany({
      where: { workingGroupId: id },
      orderBy: { createdAt: 'desc' },
    });

    // Build thread structure
    const topLevel = discussions.filter(d => !d.parentId);
    const replies = discussions.filter(d => d.parentId);

    const threads = topLevel.map(d => ({
      ...d,
      replies: replies.filter(r => r.parentId === d.id).sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      ),
    }));

    res.json({ success: true, data: threads });
  } catch (err) { next(err); }
});

// ─── POST /api/working-groups/:id/documents — Add a document link ───
workingGroupRoutes.post('/:id/documents', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const callerCode = req.headers['x-access-code'] as string;
    await resolveAccessCode(callerCode);
    const { id } = req.params;

    const caller = await getMembership(id, callerCode);
    if (!caller || caller.role === 'observer') throw new AppError('Observers cannot add documents', 403);

    const { title, url, description } = req.body;
    if (!title || !url) throw new AppError('Title and URL are required', 400);

    const doc = await prisma.documentLink.create({
      data: {
        workingGroupId: id,
        title,
        url,
        description: description || null,
        addedBy: caller.displayName,
      },
    });

    await logActivity(id, caller.displayName, 'uploaded', `Added document "${title}"`);

    res.status(201).json({ success: true, data: doc });
  } catch (err) { next(err); }
});

// ─── DELETE /api/working-groups/:id/documents/:docId — Remove a document link ───
workingGroupRoutes.delete('/:id/documents/:docId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const callerCode = req.headers['x-access-code'] as string;
    await resolveAccessCode(callerCode);
    const { id, docId } = req.params;

    const caller = await getMembership(id, callerCode);
    if (!caller || caller.role !== 'admin') throw new AppError('Only admins can remove documents', 403);

    await prisma.documentLink.delete({ where: { id: docId } });

    res.json({ success: true });
  } catch (err) { next(err); }
});

// ─── GET /api/working-groups/:id/activities — Get activity feed ───
workingGroupRoutes.get('/:id/activities', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const callerCode = req.headers['x-access-code'] as string;
    await resolveAccessCode(callerCode);
    const { id } = req.params;

    const caller = await getMembership(id, callerCode);
    if (!caller) throw new AppError('You are not a member of this group', 403);

    const activities = await prisma.activityEntry.findMany({
      where: { workingGroupId: id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    res.json({ success: true, data: activities });
  } catch (err) { next(err); }
});

// ─── GET /api/working-groups/:id/dashboard — Aggregated assessment data ───
workingGroupRoutes.get('/:id/dashboard', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const callerCode = req.headers['x-access-code'] as string;
    await resolveAccessCode(callerCode);
    const { id } = req.params;

    const caller = await getMembership(id, callerCode);
    if (!caller) throw new AppError('You are not a member of this group', 403);

    const assignments = await prisma.workingGroupAssignment.findMany({
      where: { workingGroupId: id },
      include: {
        assessment: {
          include: {
            organisation: { select: { name: true, country: true, sector: true, size: true } },
            domainScores: true,
          },
        },
      },
    });

    const assessments = assignments.map(a => a.assessment);

    // Calculate aggregated stats
    const completedAssessments = assessments.filter(a => a.status === 'completed');
    const overallScores = completedAssessments.map(a => a.overallScore).filter((s): s is number => s != null);

    // Domain averages across all assigned assessments
    const domainAggregates: Record<string, number[]> = {};
    for (const a of completedAssessments) {
      for (const ds of a.domainScores) {
        if (!domainAggregates[ds.domainKey]) domainAggregates[ds.domainKey] = [];
        domainAggregates[ds.domainKey].push(ds.score);
      }
    }

    const domainAverages = Object.entries(domainAggregates).map(([key, scores]) => ({
      domainKey: key,
      average: Math.round((scores.reduce((s, v) => s + v, 0) / scores.length) * 100) / 100,
      min: Math.min(...scores),
      max: Math.max(...scores),
      count: scores.length,
    }));

    res.json({
      success: true,
      data: {
        totalAssessments: assessments.length,
        completedAssessments: completedAssessments.length,
        averageOverallScore: overallScores.length > 0
          ? Math.round((overallScores.reduce((s, v) => s + v, 0) / overallScores.length) * 100) / 100
          : null,
        domainAverages,
        countries: [...new Set(assessments.map(a => a.organisation.country).filter(Boolean))],
        sectors: [...new Set(assessments.map(a => a.organisation.sector).filter(Boolean))],
        assessments: assessments.map(a => ({
          id: a.id,
          organisationName: a.organisation.name,
          country: a.organisation.country,
          sector: a.organisation.sector,
          status: a.status,
          overallScore: a.overallScore,
          completedAt: a.completedAt,
        })),
      },
    });
  } catch (err) { next(err); }
});
