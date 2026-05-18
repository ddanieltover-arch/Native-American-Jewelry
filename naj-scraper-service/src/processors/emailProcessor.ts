import { Worker, Job } from 'bullmq';
import { Resend } from 'resend';
import { redisConnection } from '../queues';
import { logger } from '../utils/logger';
import { config } from '../config';
import type { EmailJobData } from '../types';

function getResend(): Resend | null {
  if (!config.RESEND_API_KEY) return null;
  return new Resend(config.RESEND_API_KEY);
}

// ─── Email template builders ──────────────────────────────
function buildScrapeCompleteEmail(payload: Record<string, unknown>): {
  subject: string;
  html:    string;
} {
  const {
    jobId, totalFound, totalImported, totalFiltered, errorCount, durationMs, completedAt,
  } = payload as Record<string, any>;

  const durationSec = ((durationMs ?? 0) / 1000).toFixed(1);
  const status      = errorCount > 0 ? '⚠️ Partial' : '✅ Success';

  return {
    subject: `${status} — Scrape Job ${jobId} Complete`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body        { font-family: 'Jost', sans-serif; background: #faf6ef; color: #1c1916; margin: 0; padding: 0; }
    .container  { max-width: 600px; margin: 40px auto; background: #fff; border: 1px solid #f0e8d8; }
    .header     { background: #0e0c0a; color: #f0e8d8; padding: 28px 32px; }
    .header h1  { font-family: Georgia, serif; font-weight: 300; font-size: 22px; margin: 0; }
    .body       { padding: 32px; }
    .stat-row   { display: flex; gap: 12px; margin-bottom: 24px; }
    .stat       { flex: 1; border: 1px solid #f0e8d8; padding: 16px; text-align: center; }
    .stat-num   { font-size: 28px; font-weight: 300; color: #1c1916; font-family: Georgia, serif; }
    .stat-label { font-size: 11px; color: #8b5e3c; text-transform: uppercase; letter-spacing: 0.1em; margin-top: 4px; }
    .info       { font-size: 13px; color: #3d2c1e; line-height: 1.7; }
    .badge-ok   { display: inline-block; background: #3da8a0; color: #fff; padding: 3px 10px; font-size: 11px; border-radius: 3px; }
    .badge-warn { display: inline-block; background: #c8973a; color: #fff; padding: 3px 10px; font-size: 11px; border-radius: 3px; }
    .footer     { border-top: 1px solid #f0e8d8; padding: 16px 32px; font-size: 11px; color: #8b5e3c; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Native American Jewelry — Scrape Report</h1>
    </div>
    <div class="body">
      <p class="info">
        <strong>Job ID:</strong> ${jobId}<br>
        <strong>Status:</strong>
        ${errorCount === 0
          ? '<span class="badge-ok">Completed</span>'
          : `<span class="badge-warn">${errorCount} error(s)</span>`
        }<br>
        <strong>Completed:</strong> ${new Date(completedAt).toLocaleString('en-US')}<br>
        <strong>Duration:</strong> ${durationSec}s
      </p>

      <div class="stat-row">
        <div class="stat">
          <div class="stat-num">${totalFound ?? 0}</div>
          <div class="stat-label">Products Found</div>
        </div>
        <div class="stat">
          <div class="stat-num">${totalImported ?? 0}</div>
          <div class="stat-label">Imported</div>
        </div>
        <div class="stat">
          <div class="stat-num">${totalFiltered ?? 0}</div>
          <div class="stat-label">Filtered</div>
        </div>
        <div class="stat">
          <div class="stat-num">${errorCount ?? 0}</div>
          <div class="stat-label">Errors</div>
        </div>
      </div>

      <p class="info">
        New products are saved with <strong>status: pending</strong> and await your
        approval in the admin dashboard before going live.
      </p>
    </div>
    <div class="footer">
      Native American Jewelry · Automated Scraper System
    </div>
  </div>
</body>
</html>`,
  };
}

function buildScrapeErrorEmail(payload: Record<string, unknown>): {
  subject: string;
  html:    string;
} {
  const { jobId, error } = payload as Record<string, any>;
  return {
    subject: `❌ Scrape Job ${jobId} Failed`,
    html: `
<div style="font-family:sans-serif;max-width:520px;margin:40px auto;padding:32px;border:1px solid #f0e8d8;">
  <h2 style="font-family:Georgia,serif;font-weight:300;color:#1c1916">Scrape Job Failed</h2>
  <p style="color:#3d2c1e"><strong>Job ID:</strong> ${jobId}</p>
  <p style="color:#3d2c1e"><strong>Error:</strong></p>
  <pre style="background:#faf6ef;padding:16px;font-size:12px;overflow:auto;">${error}</pre>
  <p style="color:#8b5e3c;font-size:12px">Check logs for full details.</p>
</div>`,
  };
}

// ─── Email worker ─────────────────────────────────────────
export function createEmailWorker() {
  const resend = getResend();

  const worker = new Worker<EmailJobData>(
    'email',
    async (job: Job<EmailJobData>) => {
      const { type, to, payload } = job.data;

      if (!resend) {
        logger.warn('Resend not configured — email skipped', { type, to });
        return;
      }

      let subject: string;
      let html:    string;

      switch (type) {
        case 'scrape-complete':
          ({ subject, html } = buildScrapeCompleteEmail(payload));
          break;
        case 'scrape-error':
          ({ subject, html } = buildScrapeErrorEmail(payload));
          break;
        default:
          logger.warn('Unknown email type', { type });
          return;
      }

      const { data, error } = await resend.emails.send({
        from:    config.FROM_EMAIL ?? 'scraper@nativeamericanjewelry.com',
        to,
        subject,
        html,
      });

      if (error) {
        logger.error('Resend send failed', { error, type, to });
        throw new Error(`Resend error: ${error.message}`);
      }

      logger.info('Email sent', { type, to, id: data?.id });
      return { emailId: data?.id };
    },
    {
      connection:  redisConnection,
      concurrency: 2,
    }
  );

  worker.on('failed', (job, err) =>
    logger.error('[email] job failed', { type: job?.data?.type, err })
  );
  worker.on('error', (err) => logger.error('[email] worker error', { err }));

  logger.info('Email worker started');
  return worker;
}
