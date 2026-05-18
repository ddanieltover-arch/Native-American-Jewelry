import 'dotenv/config';
import { z } from 'zod';

const ConfigSchema = z.object({
  // Supabase
  SUPABASE_URL:              z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(10),
  SUPABASE_STORAGE_BUCKET:   z.string().default('product-images'),

  // Redis
  REDIS_URL: z.string().default('redis://localhost:6379'),

  // Scraper
  TARGET_URL:       z.string().url(),
  MIN_PRICE_FILTER: z.coerce.number().default(150),
  DISCOUNT_RATE:    z.coerce.number().min(0).max(1).default(0.05),

  // Proxy (optional)
  PROXY_SERVER:   z.string().optional(),
  PROXY_USERNAME: z.string().optional(),
  PROXY_PASSWORD: z.string().optional(),

  // Email
  RESEND_API_KEY: z.string().optional(),
  ADMIN_EMAIL:    z.string().email().optional(),
  FROM_EMAIL:     z.string().email().optional(),

  // Branding
  BRAND_WATERMARK_PATH: z.string().optional(),
  BRAND_NAME:           z.string().default('Native American Jewelry'),

  // Concurrency
  SCRAPE_CONCURRENCY:    z.coerce.number().default(2),
  IMAGE_CONCURRENCY:     z.coerce.number().default(3),
  PAGE_TIMEOUT_MS:       z.coerce.number().default(30000),
  REQUEST_DELAY_MIN_MS:  z.coerce.number().default(1500),
  REQUEST_DELAY_MAX_MS:  z.coerce.number().default(4000),

  // Scheduler
  SCRAPE_CRON: z.string().default('0 3 * * *'),

  // API auth
  SCRAPER_API_KEY: z.string().min(8).optional(),

  // App
  NODE_ENV:  z.enum(['development', 'production', 'test']).default('development'),
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
