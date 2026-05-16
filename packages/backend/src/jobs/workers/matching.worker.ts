import { Worker } from 'bullmq';
import { redisForBullMQ } from '../../config/redis';
import { findMentorsForCompany, batchMatchForProgramme } from '../../services/ai/matching.service';
import { prisma } from '../../config/database';
import { addNotificationJob } from '../queue';
import { logger } from '../../utils/logger';

export function startMatchingWorker() {
  const worker = new Worker(
    'ecolink-matching',
    async (job) => {
      const { type, companyId, programmeId } = job.data as {
        type: 'mentor-company' | 'batch-programme';
        companyId?: string;
        programmeId?: string;
      };

      if (type === 'mentor-company' && companyId) {
        const matches = await findMentorsForCompany(companyId, 5, programmeId);

        for (const match of matches) {
          const existing = await prisma.matchProposal.findFirst({
            where: { mentorId: match.entityId, companyId, status: 'PENDING' },
          });
          if (existing) continue;

          const proposal = await prisma.matchProposal.create({
            data: {
              mentorId: match.entityId,
              companyId,
              score: match.score,
              rationale: match.rationale,
              scoreBreakdown: match.scoreBreakdown,
              expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            },
            include: { mentor: { include: { user: true } }, company: { include: { user: true } } },
          });

          if (proposal.company?.user) {
            await addNotificationJob({
              userId: proposal.company.user.id,
              type: 'MATCH_PROPOSED',
              title: 'New Mentor Match!',
              body: `We found a great mentor match for you with a ${Math.round(match.score * 100)}% compatibility score.`,
              sendEmail: true,
            });
          }
        }

        logger.info('Mentor-company matching completed', { companyId, matchesFound: matches.length });
      } else if (type === 'batch-programme' && programmeId) {
        await batchMatchForProgramme(programmeId);
      }
    },
    { connection: redisForBullMQ, concurrency: 1 }
  );

  worker.on('failed', (job, err) => {
    logger.error('Matching job failed', { jobId: job?.id, error: err.message });
  });

  return worker;
}
