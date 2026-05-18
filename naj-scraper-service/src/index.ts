import 'dotenv/config';
import http from 'http';
import { dispatchScrapeJob, getQueueStats, drainQueues } from './queues';
import { startInlineScrape } from './scrape-inline';
import { getNextRunInfo } from './processors/scheduler';
import { logger } from './utils/logger';
import { config } from './config';

function verifyApiKey(req: http.IncomingMessage): boolean {
  const expected = config.SCRAPER_API_KEY;
  if (!expected) return false;
  const header = req.headers['x-api-key'];
  if (!header || Array.isArray(header)) return false;
  return header === expected;
}

// ─── Minimal HTTP server for health checks + manual triggers
const server = http.createServer(async (req, res) => {
  const url    = new URL(req.url ?? '/', `http://localhost`);
  const method = req.method ?? 'GET';

  res.setHeader('Content-Type', 'application/json');

  // ── GET /health ────────────────────────────────────────
  if (method === 'GET' && url.pathname === '/health') {
    const stats = await getQueueStats().catch(() => null);
    res.writeHead(200);
    res.end(JSON.stringify({
      status:    'ok',
      service:   'naj-scraper',
      uptime:    Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
      scheduler: getNextRunInfo(),
      queues:    stats,
    }, null, 2));
    return;
  }

  // ── POST /scrape/trigger ───────────────────────────────
  if (method === 'POST' && url.pathname === '/scrape/trigger') {
    if (!verifyApiKey(req)) {
      res.writeHead(401);
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return;
    }

    try {
      let jobId: string;
      let mode: 'queue' | 'inline' = 'queue';
      let message = 'Scrape job queued — worker will process it';

      const preferInline =
        process.env.SCRAPE_INLINE === 'true' ||
        (process.env.NODE_ENV !== 'production' && process.env.SCRAPE_INLINE !== 'false');

      if (preferInline) {
        jobId = startInlineScrape('api');
        mode = 'inline';
        message = 'Scrape running on API server (inline mode)';
      } else {
        try {
          const dispatched = await dispatchScrapeJob('api');
          jobId = dispatched.jobId;
        } catch (err) {
          logger.warn('Redis queue unavailable — inline scrape fallback', { err });
          jobId = startInlineScrape('api');
          mode = 'inline';
          message =
            'Scrape running inline (start Redis + worker for queued jobs, or docker-compose up)';
        }
      }

      res.writeHead(202);
      res.end(JSON.stringify({ success: true, jobId, mode, message }));
      logger.info('Manual scrape triggered via API', { jobId, mode });
    } catch (err) {
      logger.error('Failed to dispatch scrape', { err });
      res.writeHead(500);
      res.end(JSON.stringify({ error: 'Failed to start scrape job' }));
    }
    return;
  }

  // ── GET /queues/stats ──────────────────────────────────
  if (method === 'GET' && url.pathname === '/queues/stats') {
    const stats = await getQueueStats().catch(() => null);
    res.writeHead(200);
    res.end(JSON.stringify(stats, null, 2));
    return;
  }

  // ── POST /queues/drain (admin only) ───────────────────
  if (method === 'POST' && url.pathname === '/queues/drain') {
    if (!verifyApiKey(req)) {
      res.writeHead(401);
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return;
    }
    await drainQueues();
    res.writeHead(200);
    res.end(JSON.stringify({ success: true, message: 'All queues drained' }));
    return;
  }

  // ── 404 ───────────────────────────────────────────────
  res.writeHead(404);
  res.end(JSON.stringify({ error: 'Not found' }));
});

const PORT = parseInt(process.env.PORT ?? '4000', 10);

server.listen(PORT, () => {
  logger.info(`NAJ Scraper API listening on port ${PORT}`);
  logger.info('Endpoints:');
  logger.info(`  GET  http://localhost:${PORT}/health`);
  logger.info(`  GET  http://localhost:${PORT}/queues/stats`);
  logger.info(`  POST http://localhost:${PORT}/scrape/trigger  (requires x-api-key header)`);
  logger.info(`  POST http://localhost:${PORT}/queues/drain    (requires x-api-key header)`);
});

export default server;
