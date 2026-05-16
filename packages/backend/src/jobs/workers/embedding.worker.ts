import { Worker } from 'bullmq';
import { redisForBullMQ } from '../../config/redis';
import { prisma } from '../../config/database';
import { generateEmbedding, buildMentorEmbeddingText, buildCompanyEmbeddingText, buildPartnerEmbeddingText, buildServiceProviderEmbeddingText } from '../../services/ai/embedding.service';
import { logger } from '../../utils/logger';

export function startEmbeddingWorker() {
  const worker = new Worker(
    'ecolink-embedding',
    async (job) => {
      const { entityType, entityId } = job.data as { entityType: string; entityId: string };
      logger.info('Processing embedding job', { entityType, entityId });

      let text: string | null = null;

      if (entityType === 'mentor') {
        const mentor = await prisma.mentorProfile.findUnique({ where: { id: entityId }, include: { user: true } });
        if (mentor) text = buildMentorEmbeddingText(mentor);
      } else if (entityType === 'company') {
        const company = await prisma.companyProfile.findUnique({ where: { id: entityId }, include: { user: true } });
        if (company) text = buildCompanyEmbeddingText(company);
      } else if (entityType === 'partner') {
        const partner = await prisma.partnerProfile.findUnique({ where: { id: entityId }, include: { user: true } });
        if (partner) text = buildPartnerEmbeddingText(partner);
      } else if (entityType === 'service_provider') {
        const sp = await prisma.serviceProviderProfile.findUnique({ where: { id: entityId }, include: { user: true } });
        if (sp) text = buildServiceProviderEmbeddingText(sp);
      }

      if (!text) {
        logger.warn('No profile found for embedding job', { entityType, entityId });
        return;
      }

      const embedding = await generateEmbedding(text);
      const vectorStr = `[${embedding.join(',')}]`;
      const now = new Date();

      if (entityType === 'mentor') {
        await prisma.$executeRaw`UPDATE mentor_profiles SET embedding = ${vectorStr}::vector, "embeddingUpdatedAt" = ${now} WHERE id = ${entityId}::uuid`;
      } else if (entityType === 'company') {
        await prisma.$executeRaw`UPDATE company_profiles SET embedding = ${vectorStr}::vector, "embeddingUpdatedAt" = ${now} WHERE id = ${entityId}::uuid`;
      } else if (entityType === 'partner') {
        await prisma.$executeRaw`UPDATE partner_profiles SET embedding = ${vectorStr}::vector, "embeddingUpdatedAt" = ${now} WHERE id = ${entityId}::uuid`;
      } else if (entityType === 'service_provider') {
        await prisma.$executeRaw`UPDATE service_provider_profiles SET embedding = ${vectorStr}::vector, "embeddingUpdatedAt" = ${now} WHERE id = ${entityId}::uuid`;
      }

      logger.info('Embedding stored', { entityType, entityId });
    },
    { connection: redisForBullMQ, concurrency: 2 }
  );

  worker.on('failed', (job, err) => {
    logger.error('Embedding job failed', { jobId: job?.id, error: err.message });
  });

  return worker;
}
