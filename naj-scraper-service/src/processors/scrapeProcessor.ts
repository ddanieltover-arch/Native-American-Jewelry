import { Worker, Job } from 'bullmq';
import { redisConnection } from '../queues';
import { crawlSite } from '../scraper/crawler';
import { emailQueue } from '../queues';
import { logger, createJobLogger } from '../utils/logger';
import { config } from '../config';
import type { ScrapeJobData, ScrapeResult } from '../types';

export function createScrapeWorker() {
  const worker = new Worker<ScrapeJobData>(
    'scrape',
    async (job: Job<ScrapeJobData>) => {
      const { jobId, targetUrl, triggeredBy } = job.data;
      const jLog = createJobLogger(jobId);

      jLog.info('Scrape job started', { targetUrl, triggeredBy });

      // Update progress
      await job.updateProgress(5);

      let result: ScrapeResult;
      try {
        result = await crawlSite(targetUrl, jobId);
        await job.updateProgress(100);
      } catch (err) {
        jLog.error('Crawl threw unexpected error', { err });
        throw err;
      }

      // Queue admin summary email
      if (config.ADMIN_EMAIL && config.RESEND_API_KEY) {
        await emailQueue.add('scrape-complete-email', {
          type:    'scrape-complete',
          to:      config.ADMIN_EMAIL,
          payload: {
            jobId,
            totalFound:    result.totalFound,
            totalImported: result.totalImported,
            totalFiltered: result.totalFiltered,
            errorCount:    result.errors.length,
            durationMs:    result.durationMs,
            completedAt:   result.completedAt,
          },
        });
      }

      jLog.info('Scrape job finished', {
        found:    result.totalFound,
        imported: result.totalImported,
        filtered: result.totalFiltered,
        errors:   result.errors.length,
      });

      return result;
    },
    {
      connection: redisConnection,
      concurrency: 1,  // only one full site crawl at a time
      lockDuration: 10 * 60 * 1000,  // 10 min lock — crawls take time
    }
  );

  worker.on('active',     (job) => logger.info(`[scrape] active`, { jobId: job.data.jobId }));
  worker.on('completed',  (job) => logger.info(`[scrape] completed`, { jobId: job.data.jobId }));
  worker.on('failed',     (job, err) => logger.error(`[scrape] failed`, { jobId: job?.data?.jobId, err }));
  worker.on('stalled',    (jobId) => logger.warn(`[scrape] stalled`, { jobId }));
  worker.on('error',      (err) => logger.error(`[scrape] worker error`, { err }));

  logger.info('Scrape worker started');
  return worker;
}
