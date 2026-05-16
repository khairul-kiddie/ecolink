import { Worker } from 'bullmq';
import { redisForBullMQ } from '../../config/redis';
import { prisma } from '../../config/database';
import { logger } from '../../utils/logger';
import { NotificationType } from '@prisma/client';

export function startNotificationWorker() {
  const worker = new Worker(
    'ecolink-notification',
    async (job) => {
      const { userId, type, title, body, data } = job.data as {
        userId: string;
        type: string;
        title: string;
        body: string;
        data?: unknown;
        sendEmail?: boolean;
      };

      await prisma.notification.create({
        data: {
          userId,
          type: type as NotificationType,
          title,
          body,
          data: data as object | undefined,
        },
      });

      logger.info('Notification created', { userId, type });
    },
    { connection: redisForBullMQ }
  );

  worker.on('failed', (job, err) => {
    logger.error('Notification job failed', { jobId: job?.id, error: err.message });
  });

  return worker;
}
