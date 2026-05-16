import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/database';

export async function getDashboard(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = req.user!;
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    if (['SUPER_ADMIN', 'ECOSYSTEM_ADMIN'].includes(user.role)) {
      const [userCounts, relationshipCounts, recentRelationships, proposals] = await Promise.all([
        prisma.user.groupBy({ by: ['role'], _count: true }),
        prisma.relationship.groupBy({ by: ['type', 'status'], _count: true }),
        prisma.relationship.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
        prisma.matchProposal.findMany({ select: { status: true, score: true } }),
      ]);

      const accepted = proposals.filter(p => p.status === 'ACCEPTED').length;
      const avgScore = proposals.length ? proposals.reduce((s, p) => s + p.score, 0) / proposals.length : 0;

      res.json({
        success: true,
        data: {
          role: user.role,
          userCounts,
          relationshipCounts,
          recentRelationships,
          matchAcceptanceRate: proposals.length ? accepted / proposals.length : 0,
          avgMatchScore: avgScore,
        },
      });
      return;
    }

    if (user.role === 'PROGRAMME_OWNER') {
      const programmes = await prisma.programme.findMany({
        where: { ownerId: user.id, deletedAt: null },
        include: {
          _count: { select: { applications: true, relationships: true } },
        },
      });

      res.json({ success: true, data: { role: user.role, programmes } });
      return;
    }

    if (user.role === 'MENTOR') {
      const mentor = await prisma.mentorProfile.findUnique({ where: { userId: user.id } });
      if (!mentor) { res.json({ success: true, data: { role: user.role, relationships: [], proposals: [] } }); return; }

      const [relationships, proposals] = await Promise.all([
        prisma.relationship.findMany({ where: { mentorId: mentor.id }, include: { company: { select: { companyName: true } } } }),
        prisma.matchProposal.findMany({ where: { mentorId: mentor.id }, orderBy: { createdAt: 'desc' }, take: 5 }),
      ]);

      res.json({ success: true, data: { role: user.role, relationships, proposals } });
      return;
    }

    if (user.role === 'COMPANY_REP') {
      const company = await prisma.companyProfile.findUnique({ where: { userId: user.id } });
      if (!company) { res.json({ success: true, data: { role: user.role } }); return; }

      const [applications, mentorRelationships, proposals] = await Promise.all([
        prisma.programmeApplication.findMany({ where: { companyId: company.id }, include: { programme: { select: { name: true, status: true } } } }),
        prisma.relationship.findMany({ where: { companyId: company.id, type: 'MENTOR_COMPANY' }, include: { mentor: { include: { user: { select: { firstName: true, lastName: true } } } } } }),
        prisma.matchProposal.findMany({ where: { companyId: company.id, status: 'PENDING' }, orderBy: { score: 'desc' }, take: 5, include: { mentor: { include: { user: { select: { firstName: true, lastName: true, avatarUrl: true } } } } } }),
      ]);

      res.json({ success: true, data: { role: user.role, applications, mentorRelationships, pendingProposals: proposals } });
      return;
    }

    res.json({ success: true, data: { role: user.role } });
  } catch (err) {
    next(err);
  }
}

export async function getMatchingEffectiveness(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const proposals = await prisma.matchProposal.findMany({
      select: { status: true, score: true, createdAt: true, acceptedAt: true },
    });

    const accepted = proposals.filter(p => p.status === 'ACCEPTED');
    const rejected = proposals.filter(p => p.status === 'REJECTED');
    const expired = proposals.filter(p => p.status === 'EXPIRED');

    const avgDaysToAccept = accepted.length
      ? accepted
          .filter(p => p.acceptedAt)
          .reduce((sum, p) => sum + (p.acceptedAt!.getTime() - p.createdAt.getTime()) / (1000 * 60 * 60 * 24), 0) /
        accepted.length
      : 0;

    res.json({
      success: true,
      data: {
        total: proposals.length,
        accepted: accepted.length,
        rejected: rejected.length,
        expired: expired.length,
        acceptanceRate: proposals.length ? accepted.length / proposals.length : 0,
        avgDaysToAccept,
        avgScore: proposals.length ? proposals.reduce((s, p) => s + p.score, 0) / proposals.length : 0,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function getEcosystemGraph(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const [mentors, companies, partners, serviceProviders, programmes, relationships] = await Promise.all([
      prisma.mentorProfile.findMany({ include: { user: { select: { firstName: true, lastName: true } } } }),
      prisma.companyProfile.findMany({ include: { user: { select: { firstName: true, lastName: true } } } }),
      prisma.partnerProfile.findMany({ include: { user: { select: { firstName: true, lastName: true } } } }),
      prisma.serviceProviderProfile.findMany({ include: { user: { select: { firstName: true, lastName: true } } } }),
      prisma.programme.findMany({ where: { deletedAt: null }, select: { id: true, name: true } }),
      prisma.relationship.findMany({ where: { status: 'ACTIVE', deletedAt: null } }),
    ]);

    const nodes = [
      ...mentors.map(m => ({ id: `mentor-${m.id}`, type: 'mentor', label: `${m.user.firstName} ${m.user.lastName}` })),
      ...companies.map(c => ({ id: `company-${c.id}`, type: 'company', label: c.companyName })),
      ...partners.map(p => ({ id: `partner-${p.id}`, type: 'partner', label: p.orgName })),
      ...serviceProviders.map(s => ({ id: `service-${s.id}`, type: 'service_provider', label: s.orgName })),
      ...programmes.map(p => ({ id: `programme-${p.id}`, type: 'programme', label: p.name })),
    ];

    const edges = relationships.map(r => ({
      source: r.mentorId ? `mentor-${r.mentorId}` : r.partnerId ? `partner-${r.partnerId}` : `service-${r.serviceProviderId}`,
      target: r.companyId ? `company-${r.companyId}` : `programme-${r.programmeId}`,
      type: r.type,
      weight: r.aiMatchScore || 0.5,
    })).filter(e => e.source && e.target);

    res.json({ success: true, data: { nodes, edges } });
  } catch (err) {
    next(err);
  }
}
