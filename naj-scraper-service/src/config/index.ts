import 'dotenv/config';
import { z } from 'zod';

const ConfigSchema = z.object({
  // Neon
  DATABASE_URL: z.string().min(10),

  // Cloudflare R2 (optional — without it, scraper keeps source image URLs)
  R2_ACCOUNT_ID: z.preprocess((v) => (v === '' || v == null ? undefined : v), z.string().optional()),
  R2_ACCESS_KEY_ID: z.preprocess((v) => (v === '' || v == null ? undefined : v), z.string().optional()),
  R2_SECRET_ACCESS_KEY: z.preprocess((v) => (v === '' || v == null ? undefined : v), z.string().optional()),
  R2_BUCKET: z.string().default('naj-assets'),
  R2_PUBLIC_BASE_URL: z.preprocess((v) => (v === '' || v == null ? undefined : v), z.string().url().optional()),

  // Redis
  REDIS_URL: z.string().default('redis://localhost:6379'),

  // Scraper
  TARGET_URL: z.string().url(),
  MIN_PRICE_FILTER: z.coerce.number().default(150),
  DISCOUNT_RATE: z.coerce.number().min(0).max(1).default(0.05),
  MAX_PRODUCTS_PER_RUN: z.coerce.number().default(0),
  MAX_IMAGES_PER_PRODUCT: z.coerce.number().min(1).max(8).default(2),

  // Proxy (optional)
  PROXY_SERVER: z.string().optional(),
  PROXY_USERNAME: z.string().optional(),
  PROXY_PASSWORD: z.string().optional(),

  // Email
  RESEND_API_KEY: z.string().optional(),
  ADMIN_EMAIL: z.string().email().optional(),
  FROM_EMAIL: z.string().email().optional(),

  // Branding
  BRAND_WATERMARK_PATH: z.string().optional(),
  BRAND_NAME: z.string().default('Native American Jewelry'),

  // Concurrency
  SCRAPE_CONCURRENCY: z.coerce.number().default(2),
  IMAGE_CONCURRENCY: z.coerce.number().default(3),
  PAGE_TIMEOUT_MS: z.coerce.number().default(30000),
  REQUEST_DELAY_MIN_MS: z.coerce.number().default(1500),
  REQUEST_DELAY_MAX_MS: z.coerce.number().default(4000),

  // Scheduler
  SCRAPE_CRON: z.string().default('0 3 * * *'),

  // API auth
  SCRAPER_API_KEY: z.string().min(8).optional(),

  // App
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
});

function loadConfig() {
  const result = ConfigSchema.safeParse(process.env);
  if (!result.success) {
    console.error('❌ Invalid environment configuration:');
    result.error.issues.forEach((issue) => {
      console.error(`   ${issue.path.join('.')}: ${issue.message}`);
    });
    process.exit(1);
  }

  const data = result.data;

  if (data.NODE_ENV === 'production' && !data.SCRAPER_API_KEY) {
    console.error('❌ SCRAPER_API_KEY is required when NODE_ENV=production');
    process.exit(1);
  }

  return data;
}

export const config = loadConfig();
export type Config = typeof config;
