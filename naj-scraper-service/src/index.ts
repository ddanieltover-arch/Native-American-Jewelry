import 'dotenv/config';
import http from 'http';
import { dispatchScrapeJob, getQueueStats, drainQueues } from './queues';
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
      const jobId = await dispatchScrapeJob('api');
      res.writeHead(202);
      res.end(JSON.stringify({ success: true, jobId, message: 'Scrape job queued' }));
      logger.info('Manual scrape triggered via API', { jobId });
    } catch (err) {
      res.writeHead(500);
      res.end(JSON.stringify({ error: 'Failed to dispatch job' }));
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
