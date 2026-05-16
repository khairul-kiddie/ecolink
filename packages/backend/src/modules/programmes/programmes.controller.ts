import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/database';
import { getPaginationParams, buildPaginatedResult } from '../../utils/pagination';
import { AppError } from '../../middleware/errorHandler.middleware';
import { addMatchingJob } from '../../jobs/queue';

export async function listProgrammes(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { page, limit } = getPaginationParams(req.query as Record<string, string>);
    const { status, country, industry } = req.query as Record<string, string>;

    const where: Record<string, unknown> = { deletedAt: null };
    if (status) where.status = status;
    if (country) where.country = country;
    if (industry) where.targetIndustries = { has: industry };

    const [data, total] = await Promise.all([
      prisma.programme.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: { owner: { select: { firstName: true, lastName: true, email: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.programme.count({ where }),
    ]);

    res.json({ success: true, ...buildPaginatedResult(data, total, { page, limit }) });
  } catch (err) {
    next(err);
  }
}

export async function getProgramme(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const programme = await prisma.programme.findFirst({
      where: { id: req.params.id, deletedAt: null },
      include: {
        owner: { select: { firstName: true, lastName: true, email: true } },
        _count: { select: { applications: true, relationships: true } },
      },
    });
    if (!programme) throw new AppError(404, 'NOT_FOUND', 'Programme not found');
    res.json({ success: true, data: programme });
  } catch (err) {
    next(err);
  }
}

export async function createProgramme(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const programme = await prisma.programme.create({
      data: { ...req.body, ownerId: req.user!.id },
    });
    res.status(201).json({ success: true, data: programme });
  } catch (err) {
    next(err);
  }
}

export async function updateProgramme(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const programme = await prisma.programme.findFirst({ where: { id: req.params.id, deletedAt: null } });
    if (!programme) throw new AppError(404, 'NOT_FOUND', 'Programme not found');
    if (programme.ownerId !== req.user!.id && req.user!.role !== 'SUPER_ADMIN') {
      throw new AppError(403, 'FORBIDDEN', 'Not authorized to update this programme');
    }
    const updated = await prisma.programme.update({ where: { id: req.params.id }, data: req.body });
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

export async function deleteProgramme(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const programme = await prisma.programme.findFirst({ where: { id: req.params.id, deletedAt: null } });
    if (!programme) throw new AppError(404, 'NOT_FOUND', 'Programme not found');
    if (programme.ownerId !== req.user!.id && req.user!.role !== 'SUPER_ADMIN') {
      throw new AppError(403, 'FORBIDDEN', 'Not authorized');
    }
    await prisma.programme.update({ where: { id: req.params.id }, data: { deletedAt: new Date() } });
    res.json({ success: true, message: 'Programme deleted' });
  } catch (err) {
    next(err);
  }
}

export async function applyToProgramme(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const company = await prisma.companyProfile.findUnique({ where: { userId: req.user!.id } });
    if (!company) throw new AppError(400, 'VALIDATION_ERROR', 'Company profile required');

    const existing = await prisma.programmeApplication.findUnique({
      where: { programmeId_companyId: { programmeId: req.params.id, companyId: company.id } },
    });
    if (existing) throw new AppError(409, 'CONFLICT', 'Already applied to this programme');

    const application = await prisma.programmeApplication.create({
      data: { programmeId: req.params.id, companyId: company.id, applicationData: req.body },
    });
    res.status(201).json({ success: true, data: application });
  } catch (err) {
    next(err);
  }
}

export async function listApplications(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { page, limit } = getPaginationParams(req.query as Record<string, string>);
    const [data, total] = await Promise.all([
      prisma.programmeApplication.findMany({
        where: { programmeId: req.params.id },
        skip: (page - 1) * limit,
        take: limit,
        include: { company: { include: { user: { select: { firstName: true, lastName: true, email: true } } } } },
      }),
      prisma.programmeApplication.count({ where: { programmeId: req.params.id } }),
    ]);
    res.json({ success: true, ...buildPaginatedResult(data, total, { page, limit }) });
  } catch (err) {
    next(err);
  }
}

export async function reviewApplication(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { status, reviewNote } = req.body as { status: string; reviewNote?: string };
    const app = await prisma.programmeApplication.update({
      where: { id: req.params.appId },
      data: { status, reviewNote, reviewedAt: new Date(), reviewedById: req.user!.id },
    });
    res.json({ success: true, data: app });
  } catch (err) {
    next(err);
  }
}

export async function triggerMatching(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await addMatchingJob({ type: 'batch-programme', programmeId: req.params.id });
    res.json({ success: true, message: 'Batch matching job queued' });
  } catch (err) {
    next(err);
  }
}
