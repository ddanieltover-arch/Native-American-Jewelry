import { crawlSite } from './scraper/crawler';
import { config } from './config';
import { logger } from './utils/logger';

/** Run scrape in-process when Redis/worker is unavailable */
export function startInlineScrape(triggeredBy: string): string {
  const jobId = `scrape-${Date.now().toString(36)}`;

  crawlSite(config.TARGET_URL, jobId)
    .then((result) => {
      logger.info('Inline scrape finished', {
        jobId,
        triggeredBy,
        imported: result.totalImported,
        found: result.totalFound,
      });
    })
    .catch((err) => {
      logger.error('Inline scrape failed', { jobId, triggeredBy, err });
    });

  logger.info('Inline scrape started', { jobId, triggeredBy });
  return jobId;
}
