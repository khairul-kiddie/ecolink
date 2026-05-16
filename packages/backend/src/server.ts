import './config/env'; // validate env first
import { app } from './app';
import { connectDatabase } from './config/database';
import { env } from './config/env';
import { logger } from './utils/logger';
import { startEmbeddingWorker } from './jobs/workers/embedding.worker';
import { startMatchingWorker } from './jobs/workers/matching.worker';
import { startNotificationWorker } from './jobs/workers/notification.worker';

async function main() {
  await connectDatabase();

  const embeddingWorker = startEmbeddingWorker();
  const matchingWorker = startMatchingWorker();
  const notificationWorker = startNotificationWorker();

  const server = app.listen(env.PORT, () => {
    logger.info(`EcoLink API running on port ${env.PORT}`);
    logger.info(`Swagger docs: http://localhost:${env.PORT}/api/docs`);
  });

  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}, shutting down...`);
    server.close(async () => {
      await embeddingWorker.close();
      await matchingWorker.close();
      await notificationWorker.close();
      const { disconnectDatabase } = await import('./config/database');
      await disconnectDatabase();
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  logger.error('Fatal startup error', { error: err.message });
  process.exit(1);
});
