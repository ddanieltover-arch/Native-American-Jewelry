/**
 * Run a scrape immediately in-process (no queue).
 * Usage: npm run scrape:now
 *        tsx src/scraper/run-now.ts
 *        tsx src/scraper/run-now.ts --url https://example.com
 */
import 'dotenv/config';
import { crawlSite } from './crawler';
import { closeBrowser } from './browser';
import { generateJobId } from '../utils/helpers';
import { logger } from '../utils/logger';
import { config } from '../config';

async function main() {
  const args = process.argv.slice(2);
  const urlArg = args.find((a) => a.startsWith('--url='))?.split('=')[1];
  const targetUrl = urlArg ?? config.TARGET_URL;
  const jobId     = generateJobId('manual');

  logger.info('══════════════════════════════════════');
  logger.info(' Running one-shot scrape              ');
  logger.info('══════════════════════════════════════');
  logger.info(`Target:   ${targetUrl}`);
  logger.info(`Job ID:   ${jobId}`);
  logger.info(`Min price: $${config.MIN_PRICE_FILTER}`);
  logger.info(`Discount:  ${(config.DISCOUNT_RATE * 100).toFixed(0)}%`);
  logger.info('Starting…\n');

  const start = Date.now();

  try {
    const result = await crawlSite(targetUrl, jobId);

    logger.info('\n══════════════════════════════════════');
    logger.info(' Scrape Complete                      ');
    logger.info('══════════════════════════════════════');
    logger.info(`Products found:    ${result.totalFound}`);
    logger.info(`Products imported: ${result.totalImported}`);
    logger.info(`Products filtered: ${result.totalFiltered}`);
    logger.info(`Image jobs queued: ${result.totalImageJobs}`);
    logger.info(`Errors:            ${result.errors.length}`);
    logger.info(`Duration:          ${(result.durationMs / 1000).toFixed(1)}s`);

    if (result.errors.length > 0) {
      logger.warn('\nErrors encountered:');
      result.errors.slice(0, 10).forEach((e) => {
        logger.warn(`  [${e.stage}] ${e.url} — ${e.message}`);
      });
    }

    logger.info('\nProducts are saved with status=pending');
    logger.info('Approve them in the admin dashboard to make them live.');
  } catch (err) {
    logger.error('Scrape failed with uncaught error', { err });
  } finally {
    await closeBrowser();
    process.exit(0);
  }
}

main();
