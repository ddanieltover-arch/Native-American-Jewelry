import { Worker, Job } from 'bullmq';
import { redisConnection } from '../queues';
import { processImage } from '../image/processor';
import { logger } from '../utils/logger';
import { config } from '../config';
import type { ImageJobData } from '../types';

export function createImageWorker() {
  const worker = new Worker<ImageJobData>(
    'image-processing',
    async (job: Job<ImageJobData>) => {
      const { productId, sourceUrl, position, isPrimary, productName } = job.data;

      logger.debug('Image job started', { productId, position, sourceUrl });

      await job.updateProgress(10);

      const result = await processImage({
        productId,
        sourceUrl,
        position,
        isPrimary,
        productName,
      });

      await job.updateProgress(100);

      if (!result) {
        throw new Error(`Image processing returned null for ${sourceUrl}`);
      }

      logger.debug('Image job done', {
        productId,
        position,
        publicUrl: result.publicUrl,
        size:      result.sizeBytes,
      });

      return result;
    },
    {
      connection:   redisConnection,
      concurrency:  config.IMAGE_CONCURRENCY,
      lockDuration: 3 * 60 * 1000,  // 3 min per image job
    }
  );

  worker.on('failed', (job, err) =>
    logger.error('[image] job failed', {
      productId: job?.data?.productId,
      sourceUrl: job?.data?.sourceUrl,
      attempt:   job?.attemptsMade,
      err,
    })
  );
  worker.on('error', (err) => logger.error('[image] worker error', { err }));

  logger.info(`Image worker started (concurrency: ${config.IMAGE_CONCURRENCY})`);
  return worker;
}
