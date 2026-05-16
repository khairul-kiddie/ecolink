import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/database';
import { AppError } from '../../middleware/errorHandler.middleware';
import { addMatchingJob } from '../../jobs/queue';
import { getPaginationParams, buildPaginatedResult } from '../../utils/pagination';

export async function listProposals(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { page, limit } = getPaginationParams(req.query as Record<string, string>);
    const user = req.user!;

    const where: Record<string, unknown> = {};
    if (user.role === 'MENTOR') {
      const mentor = await prisma.mentorProfile.findUnique({ where: { userId: user.id } });
      if (mentor) where.mentorId = mentor.id;
    } else if (user.role === 'COMPANY_REP') {
      const company = await prisma.companyProfile.findUnique({ where: { userId: user.id } });
      if (company) where.companyId = company.id;
    }

    const [data, total] = await Promise.all([
      prisma.matchProposal.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          mentor: { include: { user: { select: { firstName: true, lastName: true, avatarUrl: true } } } },
          company: { include: { user: { select: { firstName: true, lastName: true } } } },
        },
        orderBy: { score: 'desc' },
      }),
      prisma.matchProposal.count({ where }),
    ]);

    res.json({ success: true, ...buildPaginatedResult(data, total, { page, limit }) });
  } catch (err) {
    next(err);
  }
}

export async function findMentors(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { companyId } = req.params;
    await addMatchingJob({ type: 'mentor-company', companyId, programmeId: req.body.programmeId });
    res.json({ success: true, message: 'Matching job queued. Proposals will appear shortly.' });
  } catch (err) {
    next(err);
  }
}

export async function acceptProposal(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const proposal = await prisma.matchProposal.findUnique({ where: { id: req.params.id } });
    if (!proposal) throw new AppError(404, 'NOT_FOUND', 'Proposal not found');
    if (proposal.status !== 'PENDING') throw new AppError(400, 'VALIDATION_ERROR', 'Proposal is no longer pending');

    const updated = await prisma.matchProposal.update({
      where: { id: req.params.id },
      data: { status: 'ACCEPTED', acceptedAt: new Date() },
    });

    // Auto-create relationship
    if (proposal.mentorId && proposal.companyId) {
      await prisma.relationship.create({
        data: {
          type: 'MENTOR_COMPANY',
          status: 'PROPOSED',
          mentorId: proposal.mentorId,
          companyId: proposal.companyId,
          initiatedById: req.user!.id,
          isAiGenerated: true,
          aiMatchScore: proposal.score,
          aiRationale: proposal.rationale,
        },
      });
    }

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

export async function rejectProposal(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const proposal = await prisma.matchProposal.findUnique({ where: { id: req.params.id } });
    if (!proposal) throw new AppError(404, 'NOT_FOUND', 'Proposal not found');

    const updated = await prisma.matchProposal.update({
      where: { id: req.params.id },
      data: { status: 'REJECTED', rejectedAt: new Date(), rejectionReason: req.body.reason },
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}
