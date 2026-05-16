import { Queue } from 'bullmq';
import { redisForBullMQ } from '../config/redis';

const connection = redisForBullMQ;

export const embeddingQueue = new Queue('ecolink-embedding', { connection });
export const matchingQueue = new Queue('ecolink-matching', { connection });
export const notificationQueue = new Queue('ecolink-notification', { connection });

export async function addEmbeddingJob(entityType: string, entityId: string) {
  await embeddingQueue.add('generate-embedding', { entityType, entityId }, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 },
  });
}

export async function addMatchingJob(data: {
  type: 'mentor-company' | 'batch-programme';
  companyId?: string;
  programmeId?: string;
}) {
  await matchingQueue.add('run-matching', data, {
    attempts: 2,
    backoff: { type: 'fixed', delay: 5000 },
  });
}

export async function addNotificationJob(data: {
  userId: string;
  type: string;
  title: string;
  body: string;
  data?: unknown;
  sendEmail?: boolean;
}) {
  await notificationQueue.add('send-notification', data, { attempts: 3 });
}
