import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';

const { combine, timestamp, colorize, printf, json, errors } = winston.format;

// ─── Console format (dev-friendly) ───────────────────────
const consoleFormat = printf(({ level, message, timestamp, jobId, url, ...meta }) => {
  const jobStr = jobId ? ` [${jobId}]` : '';
  const urlStr = url   ? ` ${url}`     : '';
  const metaStr = Object.keys(meta).length
    ? ' ' + JSON.stringify(meta, null, 0)
    : '';
  return `${timestamp} ${level}${jobStr}${urlStr}: ${message}${metaStr}`;
});

// ─── File transports ─────────────────────────────────────
const fileTransport = new DailyRotateFile({
  dirname:         path.join(process.cwd(), 'logs'),
  filename:        'scraper-%DATE%.log',
  datePattern:     'YYYY-MM-DD',
  maxFiles:        '14d',
  maxSize:         '50m',
  zippedArchive:   true,
  format:          combine(timestamp(), errors({ stack: true }), json()),
});

const errorTransport = new DailyRotateFile({
  level:           'error',
  dirname:         path.join(process.cwd(), 'logs'),
  filename:        'errors-%DATE%.log',
  datePattern:     'YYYY-MM-DD',
  maxFiles:        '30d',
  zippedArchive:   true,
  format:          combine(timestamp(), errors({ stack: true }), json()),
});

// ─── Logger instance ──────────────────────────────────────
export const logger = winston.createLogger({
  level:       process.env.LOG_LEVEL ?? 'info',
  defaultMeta: { service: 'naj-scraper' },
  transports: [
    new winston.transports.Console({
      format: combine(
        colorize({ all: true }),
        timestamp({ format: 'HH:mm:ss' }),
        errors({ stack: true }),
        consoleFormat
      ),
    }),
    fileTransport,
    errorTransport,
  ],
});

// ─── Child logger factory (adds contextual fields) ────────
export function createJobLogger(jobId: string) {
  return logger.child({ jobId });
}
