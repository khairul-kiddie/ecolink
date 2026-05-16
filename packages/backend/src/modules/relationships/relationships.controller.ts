import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/database';
import { AppError } from '../../middleware/errorHandler.middleware';
import { getPaginationParams, buildPaginatedResult } from '../../utils/pagination';
import { RelationshipStatus } from '@prisma/client';

// Valid state machine transitions
const ALLOWED_TRANSITIONS: Record<RelationshipStatus, RelationshipStatus[]> = {
  PROPOSED: ['PENDING_APPROVAL'],
  PENDING_APPROVAL: ['ACTIVE', 'TERMINATED'],
  ACTIVE: ['PAUSED', 'COMPLETED', 'TERMINATED'],
  PAUSED: ['ACTIVE', 'TERMINATED'],
  COMPLETED: ['TERMINATED'],
  TERMINATED: [],
};

const ADMIN_ONLY_TRANSITIONS: RelationshipStatus[] = ['TERMINATED', 'COMPLETED', 'ACTIVE'];

export async function listRelationships(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { page, limit } = getPaginationParams(req.query as Record<string, string>);
    const { type, status, programmeId, mentorId, companyId } = req.query as Record<string, string>;
    const user = req.user!;

    const where: Record<string, unknown> = { deletedAt: null };
    if (type) where.type = type;
    if (status) where.status = status;
    if (programmeId) where.programmeId = programmeId;
    if (mentorId) where.mentorId = mentorId;
    if (companyId) where.companyId = companyId;

    // Role-based visibility
    if (user.role === 'MENTOR') {
      const mentor = await prisma.mentorProfile.findUnique({ where: { userId: user.id } });
      if (mentor) where.mentorId = mentor.id;
    } else if (user.role === 'COMPANY_REP') {
      const company = await prisma.companyProfile.findUnique({ where: { userId: user.id } });
      if (company) where.companyId = company.id;
    } else if (user.role === 'PROGRAMME_OWNER') {
      // Show relationships explicitly linked to owned programmes, plus relationships
      // for companies that applied to owned programmes (AI matches carry no programmeId).
      const ownedProgrammes = await prisma.programme.findMany({
        where: { ownerId: user.id, deletedAt: null },
        select: { id: true, applications: { select: { companyId: true } } },
      });
      const ownedProgrammeIds = ownedProgrammes.map((p) => p.id);
      const companyIdsInProgrammes = [
        ...new Set(ownedProgrammes.flatMap((p) => p.applications.map((a) => a.companyId))),
      ];
      where.OR = [
        { programmeId: { in: ownedProgrammeIds } },
        { companyId: { in: companyIdsInProgrammes } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.relationship.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          mentor: { include: { user: { select: { firstName: true, lastName: true, avatarUrl: true } } } },
          company: { include: { user: { select: { firstName: true, lastName: true } } } },
          programme: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.relationship.count({ where }),
    ]);

    res.json({ success: true, ...buildPaginatedResult(data, total, { page, limit }) });
  } catch (err) {
    next(err);
  }
}

export async function createRelationship(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const relationship = await prisma.relationship.create({
      data: { ...req.body, initiatedById: req.user!.id },
    });
    res.status(201).json({ success: true, data: relationship });
  } catch (err) {
    next(err);
  }
}

export async function getRelationship(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const relationship = await prisma.relationship.findFirst({
      where: { id: req.params.id, deletedAt: null },
      include: {
        mentor: { include: { user: true } },
        company: { include: { user: true } },
        partner: { include: { user: true } },
        serviceProvider: { include: { user: true } },
        programme: true,
        engagementLogs: { orderBy: { occurredAt: 'desc' } },
        messages: { orderBy: { createdAt: 'asc' }, include: { sender: { select: { firstName: true, lastName: true, avatarUrl: true } } } },
      },
    });
    if (!relationship) throw new AppError(404, 'NOT_FOUND', 'Relationship not found');
    res.json({ success: true, data: relationship });
  } catch (err) {
    next(err);
  }
}

export async function updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { status } = req.body as { status: RelationshipStatus };
    const relationship = await prisma.relationship.findFirst({ where: { id: req.params.id, deletedAt: null } });
    if (!relationship) throw new AppError(404, 'NOT_FOUND', 'Relationship not found');

    const allowed = ALLOWED_TRANSITIONS[relationship.status] || [];
    if (!allowed.includes(status)) {
      throw new AppError(400, 'VALIDATION_ERROR', `Cannot transition from ${relationship.status} to ${status}`);
    }

    const adminRoles = ['SUPER_ADMIN', 'ECOSYSTEM_ADMIN', 'PROGRAMME_OWNER'];
    if (ADMIN_ONLY_TRANSITIONS.includes(status) && !adminRoles.includes(req.user!.role)) {
      throw new AppError(403, 'FORBIDDEN', 'Only admins can perform this status transition');
    }

    const updateData: Record<string, unknown> = { status };
    if (status === 'ACTIVE') updateData.startedAt = new Date();
    if (status === 'PAUSED') updateData.pausedAt = new Date();
    if (['COMPLETED', 'TERMINATED'].includes(status)) updateData.endedAt = new Date();

    const updated = await prisma.relationship.update({ where: { id: req.params.id }, data: updateData });

    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        action: 'UPDATE_RELATIONSHIP_STATUS',
        entityType: 'Relationship',
        entityId: req.params.id,
        before: { status: relationship.status },
        after: { status },
      },
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

export async function addEngagementLog(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const log = await prisma.engagementLog.create({
      data: { ...req.body, relationshipId: req.params.id, loggedById: req.user!.id },
    });
    res.status(201).json({ success: true, data: log });
  } catch (err) {
    next(err);
  }
}

export async function getMessages(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const messages = await prisma.message.findMany({
      where: { relationshipId: req.params.id },
      include: { sender: { select: { firstName: true, lastName: true, avatarUrl: true } } },
      orderBy: { createdAt: 'asc' },
    });
    res.json({ success: true, data: messages });
  } catch (err) {
    next(err);
  }
}

export async function sendMessage(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const message = await prisma.message.create({
      data: { relationshipId: req.params.id, senderId: req.user!.id, content: req.body.content },
      include: { sender: { select: { firstName: true, lastName: true, avatarUrl: true } } },
    });
    res.status(201).json({ success: true, data: message });
  } catch (err) {
    next(err);
  }
}
