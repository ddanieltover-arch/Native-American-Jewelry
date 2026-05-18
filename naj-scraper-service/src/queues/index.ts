import { Queue, QueueEvents } from 'bullmq';
import IORedis from 'ioredis';
import { config } from '../config';
import { logger } from '../utils/logger';
import type { ScrapeJobData, ImageJobData, EmailJobData } from '../types';

// ─── Redis connection ─────────────────────────────────────
export const redisConnection = new IORedis(config.REDIS_URL, {
  maxRetriesPerRequest: null,  // required by BullMQ
  enableReadyCheck:     false,
  lazyConnect:          true,
  retryStrategy: (times) => {
    const delay = Math.min(times * 500, 5000);
    logger.warn(`Redis retry #${times}, next attempt in ${delay}ms`);
    return delay;
  },
});

redisConnection.on('connect',     () => logger.info('Redis connected'));
redisConnection.on('error', (err) => logger.error('Redis error', { err }));
redisConnection.on('close',       () => logger.warn('Redis connection closed'));

// ─── Default job options ──────────────────────────────────
const DEFAULT_OPTS = {
  removeOnComplete: { count: 100 },
  removeOnFail:     { count: 500 },
};

// ─── Scrape queue ─────────────────────────────────────────
export const scrapeQueue = new Queue<ScrapeJobData>('scrape', {
  connection: redisConnection,
  defaultJobOptions: {
    ...DEFAULT_OPTS,
    attempts: 2,
    backoff:  { type: 'exponential', delay: 10_000 },
  },
});

// ─── Image processing queue ───────────────────────────────
export const imageQueue = new Queue<ImageJobData>('image-processing', {
  connection: redisConnection,
  defaultJobOptions: {
    ...DEFAULT_OPTS,
    attempts: 5,
    backoff:  { type: 'exponential', delay: 3_000 },
  },
});

// ─── Email queue ──────────────────────────────────────────
export const emailQueue = new Queue<EmailJobData>('email', {
  connection: redisConnection,
  defaultJobOptions: {
    ...DEFAULT_OPTS,
    attempts: 3,
    backoff:  { type: 'fixed', delay: 15_000 },
  },
});

// ─── Queue event loggers ──────────────────────────────────
function attachEventLogger(queue: Queue, name: string) {
  const events = new QueueEvents(name, { connection: redisConnection });

  events.on('completed', ({ jobId })     => logger.info(`[${name}] job completed`, { jobId }));
  events.on('failed',    ({ jobId, failedReason }) =>
    logger.error(`[${name}] job failed`, { jobId, reason: failedReason })
  );
  events.on('stalled',   ({ jobId })     => logger.warn(`[${name}] job stalled`, { jobId }));
  events.on('delayed',   ({ jobId, delay }) =>
    logger.debug(`[${name}] job delayed ${delay}ms`, { jobId })
  );

  return events;
}

export function attachAllEventLoggers() {
  attachEventLogger(scrapeQueue, 'scrape');
  attachEventLogger(imageQueue,  'image-processing');
  attachEventLogger(emailQueue,  'email');
}

// ─── Helper: dispatch a scrape job now ───────────────────
export async function dispatchScrapeJob(
  triggeredBy: ScrapeJobData['triggeredBy'] = 'manual'
): Promise<{ jobId: string; mode: 'queue' }> {
  const jobId = `scrape-${Date.now().toString(36)}`;

  await redisConnection.ping();
  const job = await scrapeQueue.add(
    'scrape-site',
    {
      jobId,
      targetUrl:    config.TARGET_URL,
      triggeredBy,
      triggeredAt:  new Date().toISOString(),
    },
    { jobId }
  );

  logger.info('Scrape job queued', { jobId, triggeredBy });
  return { jobId: job.id ?? jobId, mode: 'queue' };
}

// ─── Helper: get queue stats ──────────────────────────────
export async function getQueueStats() {
  const [scrapeWaiting, scrapeActive, scrapeFailed] = await Promise.all([
    scrapeQueue.getWaitingCount(),
    scrapeQueue.getActiveCount(),
    scrapeQueue.getFailedCount(),
  ]);

  const [imageWaiting, imageActive, imageFailed] = await Promise.all([
    imageQueue.getWaitingCount(),
    imageQueue.getActiveCount(),
    imageQueue.getFailedCount(),
  ]);

  const [emailWaiting, emailActive] = await Promise.all([
    emailQueue.getWaitingCount(),
    emailQueue.getActiveCount(),
  ]);

  return {
    scrape: { waiting: scrapeWaiting, active: scrapeActive, failed: scrapeFailed },
    image:  { waiting: imageWaiting,  active: imageActive,  failed: imageFailed  },
    email:  { waiting: emailWaiting,  active: emailActive                        },
  };
}

// ─── Clean up stale jobs ─────────────────────────────────
export async function drainQueues(): Promise<void> {
  await Promise.all([
    scrapeQueue.drain(),
    imageQueue.drain(),
    emailQueue.drain(),
  ]);
  logger.info('All queues drained');
}
