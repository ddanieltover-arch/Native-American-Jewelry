import 'dotenv/config';
import { createScrapeWorker } from './processors/scrapeProcessor';
import { createImageWorker }  from './processors/imageProcessor';
import { createEmailWorker }  from './processors/emailProcessor';
import { startScheduler, stopScheduler } from './processors/scheduler';
import { attachAllEventLoggers, redisConnection } from './queues';
import { verifySharp } from './image/processor';
import { logger } from './utils/logger';

async function boot() {
  logger.info('═══════════════════════════════════════');
  logger.info(' NAJ Scraper Worker Service booting…   ');
  logger.info('═══════════════════════════════════════');

  // ── Verify dependencies ────────────────────────────────
  logger.info('Checking dependencies…');

  // Redis
  try {
    await redisConnection.ping();
    logger.info('✓ Redis connected');
  } catch (err) {
    logger.error('✗ Redis connection failed — cannot start', { err });
    process.exit(1);
  }

  // Sharp
  const sharpOk = await verifySharp();
  if (sharpOk) {
    logger.info('✓ Sharp image processing ready');
  } else {
    logger.warn('⚠ Sharp verification failed — images may not process correctly');
  }

  // ── Start workers ──────────────────────────────────────
  const scrapeWorker = createScrapeWorker();
  const imageWorker  = createImageWorker();
  const emailWorker  = createEmailWorker();

  // ── Attach event loggers ───────────────────────────────
  attachAllEventLoggers();

  // ── Start cron scheduler ───────────────────────────────
  startScheduler();

  logger.info('All workers running. Waiting for jobs…');
  logger.info('  Queues: scrape · image-processing · email');
  logger.info('  Press Ctrl+C to stop gracefully');

  // ── Graceful shutdown ──────────────────────────────────
  async function shutdown(signal: string) {
    logger.info(`${signal} received — shutting down gracefully`);
    stopScheduler();

    await Promise.all([
      scrapeWorker.close(),
      imageWorker.close(),
      emailWorker.close(),
    ]);

    await redisConnection.quit();
    logger.info('Shutdown complete');
    process.exit(0);
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT',  () => shutdown('SIGINT'));

  process.on('uncaughtException', (err) => {
    logger.error('Uncaught exception', { err });
    shutdown('uncaughtException');
  });

  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled rejection', { reason });
  });
}

boot();
