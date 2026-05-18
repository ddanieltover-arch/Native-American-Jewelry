import cron from 'node-cron';
import { dispatchScrapeJob, getQueueStats } from '../queues';
import { logger } from '../utils/logger';
import { config } from '../config';

let scheduledTask: cron.ScheduledTask | null = null;
let healthTask:    cron.ScheduledTask | null = null;

// ─── Start the daily scrape scheduler ────────────────────
export function startScheduler(): void {
  // ── Daily scrape cron ──────────────────────────────────
  if (!cron.validate(config.SCRAPE_CRON)) {
    logger.error('Invalid SCRAPE_CRON expression', { cron: config.SCRAPE_CRON });
    return;
  }

  scheduledTask = cron.schedule(
    config.SCRAPE_CRON,
    async () => {
      logger.info('Scheduled scrape triggered', { cron: config.SCRAPE_CRON });
      try {
        const jobId = await dispatchScrapeJob('scheduled');
        logger.info('Scheduled scrape job dispatched', { jobId });
      } catch (err) {
        logger.error('Failed to dispatch scheduled scrape', { err });
      }
    },
    {
      timezone: 'UTC',
    }
  );

  // ── Queue health check every 5 minutes ─────────────────
  healthTask = cron.schedule('*/5 * * * *', async () => {
    try {
      const stats = await getQueueStats();
      logger.info('Queue health', stats);

      // Alert if image queue has too many failures
      if (stats.image.failed > 50) {
        logger.warn('High image failure count', { failed: stats.image.failed });
      }

      // Alert if scrape queue is backed up
      if (stats.scrape.waiting > 5) {
        logger.warn('Scrape queue backed up', { waiting: stats.scrape.waiting });
      }
    } catch (err) {
      logger.warn('Queue health check failed', { err });
    }
  });

  logger.info('Scheduler started', {
    scrapeCron: config.SCRAPE_CRON,
    healthCheck: 'every 5 minutes',
  });
}

// ─── Stop all scheduled tasks ─────────────────────────────
export function stopScheduler(): void {
  scheduledTask?.stop();
  healthTask?.stop();
  logger.info('Scheduler stopped');
}

// ─── Human-readable next run info ─────────────────────────
export function getNextRunInfo(): { cron: string; description: string } {
  return {
    cron: config.SCRAPE_CRON,
    description: cronToHuman(config.SCRAPE_CRON),
  };
}

function cronToHuman(expr: string): string {
  const PRESETS: Record<string, string> = {
    '0 3 * * *':   'Daily at 3:00 AM UTC',
    '0 */6 * * *': 'Every 6 hours',
    '0 */12 * * *':'Every 12 hours',
    '0 2 * * 0':   'Weekly on Sunday at 2:00 AM UTC',
    '0 2 * * 1':   'Weekly on Monday at 2:00 AM UTC',
  };
  return PRESETS[expr] ?? `Cron: ${expr}`;
}
