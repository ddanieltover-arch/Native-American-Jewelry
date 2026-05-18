# Native American Jewelry — Production Ecommerce System
## Full Architecture, Implementation Guide & Deployment Reference

---

## 1. Project Overview

**Brand**: Native American Jewelry  
**Reference scrape source**: hippiecowgirlcouture.com  
**Stack**: Next.js 14 · Node.js · Supabase · BullMQ · Sharp · Resend · Vercel  
**Product filter**: $150 USD and above only · 5% discount applied on import  
**Payment model**: Manual only (Chime, CashApp, Apple Cash, Zelle, Bank Transfer)  
**Target scale**: 100,000+ products · mobile-first · SEO-optimized

---

## 2. Repository Structure

```
native-american-jewelry/
├── apps/
│   ├── web/                        # Next.js 14 storefront (Vercel)
│   │   ├── app/
│   │   │   ├── (store)/            # Customer-facing routes
│   │   │   │   ├── page.tsx        # Homepage
│   │   │   │   ├── shop/           # Catalog with filters
│   │   │   │   ├── product/[slug]/ # Product detail
│   │   │   │   ├── cart/           # Cart page
│   │   │   │   ├── checkout/       # Multi-step checkout
│   │   │   │   ├── account/        # Customer account
│   │   │   │   └── orders/         # Order history
│   │   │   ├── (admin)/            # Admin dashboard routes
│   │   │   │   ├── admin/
│   │   │   │   │   ├── page.tsx    # Analytics overview
│   │   │   │   │   ├── products/   # Product management
│   │   │   │   │   ├── orders/     # Order management
│   │   │   │   │   ├── customers/  # Customer management
│   │   │   │   │   ├── scraper/    # Scrape queue & approval
│   │   │   │   │   ├── payments/   # Payment verification
│   │   │   │   │   ├── shipping/   # Shipping config
│   │   │   │   │   ├── marketing/  # Coupons, banners, email
│   │   │   │   │   ├── notifications/ # Popup notification mgmt
│   │   │   │   │   └── settings/   # Store settings & roles
│   │   │   └── api/                # Next.js API routes
│   │   ├── components/
│   │   │   ├── store/              # Storefront UI components
│   │   │   └── admin/              # Admin UI components
│   │   └── lib/
│   │       ├── supabase.ts         # Supabase client
│   │       └── store.ts            # Cart & wishlist state (Zustand)
│   └── admin/                      # Standalone admin app (optional split)
├── services/
│   ├── scraper/                    # Playwright scraper service
│   │   ├── src/
│   │   │   ├── crawler.ts          # Playwright page crawler
│   │   │   ├── extractor.ts        # Data extraction (JSON-LD, DOM)
│   │   │   ├── transformer.ts      # Price filter + discount logic
│   │   │   └── scheduler.ts        # Cron-based job dispatch
│   │   ├── Dockerfile
│   │   └── package.json
│   ├── image-processor/            # Sharp image pipeline
│   │   ├── src/
│   │   │   ├── downloader.ts       # Fetch remote images
│   │   │   ├── rebrand.ts          # Watermark removal + brand overlay
│   │   │   ├── optimizer.ts        # WebP conversion + resize
│   │   │   └── uploader.ts         # Supabase Storage upload
│   │   └── Dockerfile
│   └── worker/                     # BullMQ worker service
│       ├── src/
│       │   ├── queues/
│       │   │   ├── scrapeQueue.ts
│       │   │   ├── imageQueue.ts
│       │   │   ├── emailQueue.ts
│       │   │   └── syncQueue.ts
│       │   └── processors/
│       │       ├── scrapeProcessor.ts
│       │       ├── imageProcessor.ts
│       │       ├── emailProcessor.ts
│       │       └── syncProcessor.ts
│       └── Dockerfile
├── packages/
│   ├── database/                   # Supabase schema & migrations
│   │   ├── migrations/
│   │   └── seed/
│   ├── email-templates/            # React Email templates
│   └── types/                      # Shared TypeScript types
├── docker-compose.yml
├── docker-compose.prod.yml
└── .env.example
```

---

## 3. Database Schema (Supabase PostgreSQL)

### Setup

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable full-text search
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
```

### Core Tables

```sql
-- Categories (nested via parent_id)
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  parent_id UUID REFERENCES categories(id),
  description TEXT,
  banner_url TEXT,
  featured BOOLEAN DEFAULT false,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Products
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  category_id UUID REFERENCES categories(id),
  source_price NUMERIC(10,2),          -- Original scraped price
  price NUMERIC(10,2) NOT NULL,        -- After 5% discount
  sku TEXT,
  tags TEXT[],
  in_stock BOOLEAN DEFAULT true,
  stock_quantity INT DEFAULT 0,
  status TEXT DEFAULT 'pending'        -- pending | active | archived
    CHECK (status IN ('pending','active','archived')),
  source_url TEXT,
  approved_by UUID REFERENCES admin_users(id),
  approved_at TIMESTAMPTZ,
  seo_title TEXT,
  seo_description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Product variants
CREATE TABLE product_variants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,                  -- e.g. "Size", "Material"
  value TEXT NOT NULL,                 -- e.g. "Medium", "Sterling Silver"
  price_modifier NUMERIC(10,2) DEFAULT 0,
  stock_quantity INT DEFAULT 0,
  sku TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Product images
CREATE TABLE product_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  url TEXT NOT NULL,                   -- Supabase Storage URL
  alt TEXT,
  is_primary BOOLEAN DEFAULT false,
  position INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Customers (linked to Supabase Auth)
CREATE TABLE customers (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT UNIQUE NOT NULL,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  wishlist UUID[],                     -- Array of product IDs
  blacklisted BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Customer addresses
CREATE TABLE customer_addresses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  label TEXT,                          -- "Home", "Work"
  line1 TEXT NOT NULL,
  line2 TEXT,
  city TEXT NOT NULL,
  state TEXT,
  country TEXT NOT NULL DEFAULT 'US',
  zip TEXT,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Orders
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number TEXT UNIQUE NOT NULL,  -- Human-readable e.g. NAJ-2024-0001
  customer_id UUID REFERENCES customers(id),
  status TEXT DEFAULT 'awaiting_payment'
    CHECK (status IN ('awaiting_payment','payment_uploaded','payment_confirmed',
                      'processing','shipped','delivered','cancelled','refunded')),
  subtotal NUMERIC(10,2) NOT NULL,
  shipping_cost NUMERIC(10,2) DEFAULT 0,
  discount_amount NUMERIC(10,2) DEFAULT 0,
  total NUMERIC(10,2) NOT NULL,
  shipping_method TEXT,
  shipping_address JSONB,
  coupon_code TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Order items
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  product_name TEXT NOT NULL,          -- Snapshot at time of purchase
  variant_id UUID REFERENCES product_variants(id),
  quantity INT NOT NULL DEFAULT 1,
  unit_price NUMERIC(10,2) NOT NULL,
  subtotal NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payments (manual)
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  method TEXT NOT NULL
    CHECK (method IN ('chime','cashapp','apple_cash','zelle','bank_transfer')),
  status TEXT DEFAULT 'pending'
    CHECK (status IN ('pending','uploaded','confirmed','failed','refunded')),
  amount NUMERIC(10,2) NOT NULL,
  proof_url TEXT,                      -- Supabase Storage: payment screenshot
  transaction_note TEXT,
  transaction_ref TEXT,
  verified_by UUID REFERENCES admin_users(id),
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Shipping rates
CREATE TABLE shipping_rates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  zone TEXT NOT NULL,                  -- 'usa' | 'international'
  method TEXT NOT NULL,                -- 'standard' | 'express'
  label TEXT NOT NULL,
  rate NUMERIC(10,2) NOT NULL,
  free_threshold NUMERIC(10,2),        -- Free shipping above this amount
  est_days_min INT,
  est_days_max INT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Admin users
CREATE TABLE admin_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  role TEXT DEFAULT 'editor'
    CHECK (role IN ('super_admin','admin','editor','support','analyst')),
  totp_secret TEXT,
  totp_enabled BOOLEAN DEFAULT false,
  last_login_at TIMESTAMPTZ,
  last_login_ip TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Coupons
CREATE TABLE coupons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('percent','flat')),
  value NUMERIC(10,2) NOT NULL,
  min_order NUMERIC(10,2) DEFAULT 0,
  max_uses INT,
  used_count INT DEFAULT 0,
  applicable_to TEXT DEFAULT 'all'
    CHECK (applicable_to IN ('all','category','product')),
  applicable_id UUID,
  expires_at TIMESTAMPTZ,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Abandoned carts
CREATE TABLE abandoned_carts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES customers(id),
  email TEXT,
  items_json JSONB NOT NULL,
  recovery_email_sent BOOLEAN DEFAULT false,
  recovered BOOLEAN DEFAULT false,
  last_active_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Scrape logs
CREATE TABLE scrape_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id TEXT NOT NULL,
  target_url TEXT,
  status TEXT CHECK (status IN ('running','completed','failed','partial')),
  products_found INT DEFAULT 0,
  products_filtered INT DEFAULT 0,
  products_imported INT DEFAULT 0,
  errors JSONB,
  duration_ms INT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Inventory logs
CREATE TABLE inventory_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES products(id),
  change INT NOT NULL,
  reason TEXT,
  admin_id UUID REFERENCES admin_users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Homepage sections (CMS)
CREATE TABLE homepage_sections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL
    CHECK (type IN ('hero','banner','featured_collection','testimonials','announcement')),
  title TEXT,
  content_json JSONB,
  position INT DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Testimonials
CREATE TABLE testimonials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_name TEXT NOT NULL,
  content TEXT NOT NULL,
  rating INT CHECK (rating BETWEEN 1 AND 5),
  product_id UUID REFERENCES products(id),
  photo_url TEXT,
  approved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notification popups
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  text_template TEXT NOT NULL,
  -- e.g. "Someone in {state} just purchased {product}"
  active BOOLEAN DEFAULT true,
  interval_min_sec INT DEFAULT 30,
  interval_max_sec INT DEFAULT 90,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Discount rules
CREATE TABLE discount_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('percent','flat','free_shipping')),
  value NUMERIC(10,2),
  applies_to TEXT DEFAULT 'all',
  conditions_json JSONB,
  priority INT DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_price ON products(price);
CREATE INDEX idx_products_search ON products USING gin(to_tsvector('english', name || ' ' || COALESCE(description, '')));
CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_payments_order ON payments(order_id);
CREATE INDEX idx_payments_status ON payments(status);
```

### Row Level Security

```sql
-- Products: public read (active only), admin full access
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read active products" ON products
  FOR SELECT USING (status = 'active');
CREATE POLICY "Admins have full access" ON products
  FOR ALL USING (auth.jwt() ->> 'role' IN ('admin','super_admin'));

-- Orders: customers see their own, admins see all
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Customers see own orders" ON orders
  FOR SELECT USING (customer_id = auth.uid());
CREATE POLICY "Admins see all orders" ON orders
  FOR ALL USING (auth.jwt() ->> 'role' IN ('admin','super_admin','support'));
```

---

## 4. Scraper Service

### Core scraper (`services/scraper/src/crawler.ts`)

```typescript
import { chromium, Browser, Page } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import { extractProductData } from './extractor';
import { transformProduct } from './transformer';
import { logger } from './logger';

const TARGET_URL = process.env.TARGET_URL!;
const MIN_PRICE = parseFloat(process.env.MIN_PRICE_FILTER || '150');
const DISCOUNT_RATE = parseFloat(process.env.DISCOUNT_RATE || '0.05');

export async function scrapeAllProducts(jobId: string): Promise<void> {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    viewport: { width: 1280, height: 800 },
  });

  try {
    const catalogUrls = await getCatalogUrls(context);
    logger.info(`Found ${catalogUrls.length} catalog pages`);

    for (const url of catalogUrls) {
      await scrapePage(context, url, jobId);
      await delay(2000 + Math.random() * 3000); // Throttle between pages
    }
  } finally {
    await browser.close();
  }
}

async function getCatalogUrls(context: any): Promise<string[]> {
  const page = await context.newPage();
  const urls: string[] = [TARGET_URL + '/collections/all'];
  
  await page.goto(TARGET_URL, { waitUntil: 'networkidle' });
  
  // Extract category/collection links
  const links = await page.$$eval('a[href*="/collections/"]', (els: HTMLAnchorElement[]) =>
    els.map(el => el.href).filter((href, i, arr) => arr.indexOf(href) === i)
  );
  
  return [...new Set([...urls, ...links])];
}

async function scrapePage(context: any, url: string, jobId: string): Promise<void> {
  const page = await context.newPage();
  
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    await handleInfiniteScroll(page);
    
    const productLinks = await page.$$eval('a[href*="/products/"]', (els: HTMLAnchorElement[]) =>
      [...new Set(els.map(el => el.href))]
    );

    for (const productUrl of productLinks) {
      try {
        await scrapeProduct(context, productUrl, jobId);
        await delay(1500 + Math.random() * 2000);
      } catch (err) {
        logger.error(`Failed to scrape ${productUrl}:`, err);
      }
    }
  } finally {
    await page.close();
  }
}

async function handleInfiniteScroll(page: Page): Promise<void> {
  let previousHeight = 0;
  let attempts = 0;
  const MAX_ATTEMPTS = 20;

  while (attempts < MAX_ATTEMPTS) {
    const currentHeight = await page.evaluate(() => document.body.scrollHeight);
    if (currentHeight === previousHeight) break;
    
    previousHeight = currentHeight;
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(2000);
    attempts++;
  }
}
```

### Extractor (`services/scraper/src/extractor.ts`)

```typescript
import { Page } from 'playwright';

export interface RawProduct {
  name?: string;
  description?: string;
  price?: number;
  images?: string[];
  variants?: Array<{ name: string; value: string; price?: number }>;
  sku?: string;
  tags?: string[];
  inStock?: boolean;
  url: string;
}

export async function extractProductData(page: Page, url: string): Promise<RawProduct> {
  // Priority 1: JSON-LD structured data
  const jsonLd = await page.evaluate(() => {
    const scripts = document.querySelectorAll('script[type="application/ld+json"]');
    for (const script of scripts) {
      try {
        const data = JSON.parse(script.textContent || '');
        if (data['@type'] === 'Product') return data;
      } catch {}
    }
    return null;
  });

  if (jsonLd) {
    return extractFromJsonLd(jsonLd, url);
  }

  // Priority 2: DOM parsing
  return extractFromDom(page, url);
}

async function extractFromDom(page: Page, url: string): Promise<RawProduct> {
  return page.evaluate((pageUrl: string) => {
    const getText = (sel: string) => document.querySelector(sel)?.textContent?.trim();
    const getPrice = (sel: string) => {
      const text = document.querySelector(sel)?.textContent?.trim() || '';
      return parseFloat(text.replace(/[^0-9.]/g, ''));
    };

    const images = Array.from(document.querySelectorAll<HTMLImageElement>(
      '.product-image img, .product-gallery img, [class*="product"] img'
    )).map(img => img.src).filter(Boolean);

    return {
      name: getText('h1.product-title, h1[class*="product"], h1'),
      description: getText('.product-description, .product-body, [class*="description"]'),
      price: getPrice('.price, .product-price, [class*="price"]'),
      images,
      url: pageUrl,
      inStock: !document.querySelector('.sold-out, .out-of-stock'),
    };
  }, url);
}
```

### Transformer (`services/scraper/src/transformer.ts`)

```typescript
import { RawProduct } from './extractor';
import slugify from 'slugify';

const MIN_PRICE = parseFloat(process.env.MIN_PRICE_FILTER || '150');
const DISCOUNT_RATE = parseFloat(process.env.DISCOUNT_RATE || '0.05');

export interface TransformedProduct {
  name: string;
  slug: string;
  description: string | null;
  source_price: number;
  price: number;                // source_price * (1 - DISCOUNT_RATE)
  sku: string | null;
  tags: string[];
  in_stock: boolean;
  source_url: string;
  status: 'pending';
}

export function transformProduct(raw: RawProduct): TransformedProduct | null {
  // Skip if no price or below minimum
  if (!raw.price || raw.price < MIN_PRICE) return null;

  // Skip unavailable products
  if (raw.inStock === false) return null;

  const discountedPrice = parseFloat((raw.price * (1 - DISCOUNT_RATE)).toFixed(2));

  return {
    name: raw.name || 'Unnamed Product',
    slug: slugify(raw.name || '', { lower: true, strict: true }) + '-' + Date.now(),
    description: raw.description || null,
    source_price: raw.price,
    price: discountedPrice,           // Always USD, never converted
    sku: raw.sku || null,
    tags: raw.tags || [],
    in_stock: raw.inStock !== false,
    source_url: raw.url,
    status: 'pending',                // Always pending until admin approves
  };
}
```

---

## 5. Image Processing Pipeline

### Rebranding processor (`services/image-processor/src/rebrand.ts`)

```typescript
import sharp, { Sharp } from 'sharp';
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';
import path from 'path';

const BRAND_WATERMARK_PATH = process.env.BRAND_WATERMARK_PATH!; // Your brand overlay

export async function processProductImage(
  sourceUrl: string,
  productId: string,
  position: number
): Promise<string> {
  // 1. Download source image
  const response = await axios.get(sourceUrl, { responseType: 'arraybuffer' });
  const inputBuffer = Buffer.from(response.data);

  // 2. Process with Sharp
  let image = sharp(inputBuffer);
  const metadata = await image.metadata();

  image = image
    .resize(1200, 1200, {
      fit: 'inside',
      withoutEnlargement: true,
    })
    // Remove watermarks by blurring + masking known watermark regions
    // (In production: use specific crop/blur zones based on source site)
    .webp({ quality: 85, effort: 4 });

  // 3. Apply brand overlay if brand watermark exists
  if (BRAND_WATERMARK_PATH) {
    const watermark = await sharp(BRAND_WATERMARK_PATH)
      .resize(200, 60, { fit: 'inside' })
      .toBuffer();

    image = image.composite([{
      input: watermark,
      gravity: 'southeast',
      blend: 'over',
    }]);
  }

  const processedBuffer = await image.toBuffer();

  // 4. Upload to Supabase Storage
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const filename = `products/${productId}/${position}_${Date.now()}.webp`;

  const { data, error } = await supabase.storage
    .from(process.env.SUPABASE_STORAGE_BUCKET!)
    .upload(filename, processedBuffer, {
      contentType: 'image/webp',
      upsert: true,
    });

  if (error) throw error;

  const { data: { publicUrl } } = supabase.storage
    .from(process.env.SUPABASE_STORAGE_BUCKET!)
    .getPublicUrl(filename);

  return publicUrl;
}

// Generate responsive sizes
export async function generateResponsiveSizes(
  sourceBuffer: Buffer,
  productId: string,
  filename: string
): Promise<Record<string, string>> {
  const sizes = { thumb: 400, medium: 800, large: 1200 };
  const urls: Record<string, string> = {};
  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  for (const [label, width] of Object.entries(sizes)) {
    const resized = await sharp(sourceBuffer)
      .resize(width, undefined, { fit: 'inside' })
      .webp({ quality: 80 })
      .toBuffer();

    const key = `products/${productId}/${label}_${filename}.webp`;
    await supabase.storage.from(process.env.SUPABASE_STORAGE_BUCKET!).upload(key, resized, {
      contentType: 'image/webp',
      upsert: true,
    });
    
    const { data: { publicUrl } } = supabase.storage.from(process.env.SUPABASE_STORAGE_BUCKET!).getPublicUrl(key);
    urls[label] = publicUrl;
  }

  return urls;
}
```

---

## 6. Queue Architecture (BullMQ)

### Queue definitions (`services/worker/src/queues/index.ts`)

```typescript
import { Queue, Worker, QueueEvents } from 'bullmq';
import Redis from 'ioredis';

const connection = new Redis(process.env.REDIS_URL!, { maxRetriesPerRequest: null });

export const scrapeQueue = new Queue('scrape', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: 100,
    removeOnFail: 500,
  },
});

export const imageQueue = new Queue('image-processing', {
  connection,
  defaultJobOptions: {
    attempts: 5,
    backoff: { type: 'exponential', delay: 2000 },
    concurrency: 3,
  },
});

export const emailQueue = new Queue('email', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'fixed', delay: 10000 },
  },
});

export const syncQueue = new Queue('sync', { connection });

// Schedule recurring scrape (daily at 3am UTC)
export async function scheduleDailyScrape(): Promise<void> {
  await scrapeQueue.add(
    'daily-scrape',
    { targetUrl: process.env.TARGET_URL },
    { repeat: { cron: '0 3 * * *' }, jobId: 'scheduled-daily-scrape' }
  );
}
```

### Scrape processor (`services/worker/src/processors/scrapeProcessor.ts`)

```typescript
import { Job } from 'bullmq';
import { scrapeAllProducts } from '../../scraper/src/crawler';
import { imageQueue } from '../queues';
import { supabaseAdmin } from '../lib/supabase';

export async function scrapeProcessor(job: Job): Promise<void> {
  const jobId = job.id!;
  
  // Log start
  await supabaseAdmin.from('scrape_logs').insert({
    job_id: jobId,
    target_url: job.data.targetUrl,
    status: 'running',
  });

  try {
    const products = await scrapeAllProducts(jobId);
    
    for (const product of products) {
      // Insert product as pending
      const { data: savedProduct } = await supabaseAdmin
        .from('products')
        .insert(product)
        .select('id')
        .single();

      if (savedProduct && product.imageUrls?.length) {
        // Queue image processing for each image
        for (let i = 0; i < product.imageUrls.length; i++) {
          await imageQueue.add('process-image', {
            sourceUrl: product.imageUrls[i],
            productId: savedProduct.id,
            position: i,
            isPrimary: i === 0,
          });
        }
      }
    }

    await supabaseAdmin.from('scrape_logs')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('job_id', jobId);

  } catch (error) {
    await supabaseAdmin.from('scrape_logs')
      .update({ status: 'failed', errors: { message: String(error) } })
      .eq('job_id', jobId);
    throw error;
  }
}
```

---

## 7. API Layer (Node.js / Express)

### Route structure

```
POST   /api/auth/login                 Admin login
POST   /api/auth/verify-2fa           TOTP verification

GET    /api/products                   List active products (paginated, filtered)
GET    /api/products/:slug             Single product detail
GET    /api/categories                 Category tree

POST   /api/checkout/validate-cart     Validate cart items
POST   /api/checkout/calculate-shipping  Shipping estimate
POST   /api/orders                     Place order
POST   /api/orders/:id/upload-proof    Upload payment proof

GET    /api/admin/products             Admin: all products (with pending)
PATCH  /api/admin/products/:id/approve  Admin: approve scraped product
DELETE /api/admin/products/:id          Admin: delete product
GET    /api/admin/orders               Admin: all orders
PATCH  /api/admin/orders/:id/payment-status  Admin: update payment status
POST   /api/admin/scrape/trigger       Admin: trigger manual scrape
GET    /api/admin/scrape/logs          Admin: scrape history
GET    /api/admin/analytics/overview   Admin: revenue + KPI data
```

### Auth middleware

```typescript
import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { rateLimit } from 'express-rate-limit';

export const adminOnly = async (req: Request, res: Response, next: NextFunction) => {
  const token = req.cookies.admin_token || req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const payload = jwt.verify(token, process.env.ADMIN_JWT_SECRET!) as any;
    if (!['admin', 'super_admin'].includes(payload.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    req.admin = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};

export const apiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { error: 'Too many requests' },
});
```

---

## 8. Frontend Architecture (Next.js 14)

### State management (`apps/web/lib/store.ts`)

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  variantId?: string;
  variantLabel?: string;
  imageUrl?: string;
}

interface StoreState {
  cart: CartItem[];
  wishlist: string[];
  addToCart: (item: CartItem) => void;
  removeFromCart: (productId: string, variantId?: string) => void;
  updateQuantity: (productId: string, quantity: number, variantId?: string) => void;
  clearCart: () => void;
  toggleWishlist: (productId: string) => void;
  cartTotal: () => number;
  cartCount: () => number;
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      cart: [],
      wishlist: [],

      addToCart: (item) => set((state) => {
        const key = `${item.productId}-${item.variantId}`;
        const existing = state.cart.find(i => `${i.productId}-${i.variantId}` === key);
        if (existing) {
          return { cart: state.cart.map(i => 
            `${i.productId}-${i.variantId}` === key 
              ? { ...i, quantity: i.quantity + item.quantity }
              : i
          )};
        }
        return { cart: [...state.cart, item] };
      }),

      cartTotal: () => get().cart.reduce((sum, i) => sum + i.price * i.quantity, 0),
      cartCount: () => get().cart.reduce((sum, i) => sum + i.quantity, 0),
      
      toggleWishlist: (productId) => set((state) => ({
        wishlist: state.wishlist.includes(productId)
          ? state.wishlist.filter(id => id !== productId)
          : [...state.wishlist, productId]
      })),

      removeFromCart: (productId, variantId) => set((state) => ({
        cart: state.cart.filter(i => !(i.productId === productId && i.variantId === variantId))
      })),

      updateQuantity: (productId, quantity, variantId) => set((state) => ({
        cart: state.cart.map(i => 
          i.productId === productId && i.variantId === variantId
            ? { ...i, quantity }
            : i
        ).filter(i => i.quantity > 0)
      })),

      clearCart: () => set({ cart: [] }),
    }),
    { name: 'naj-store' }
  )
);
```

### Sales notification popup (`apps/web/components/store/SalesNotification.tsx`)

```tsx
'use client';
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

const USA_STATES = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado',
  'Connecticut', 'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho',
  'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana',
  'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota',
  'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada',
  'New Hampshire', 'New Jersey', 'New Mexico', 'New York',
  'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon',
  'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota',
  'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington',
  'West Virginia', 'Wisconsin', 'Wyoming',
];

interface SalesNotificationProps {
  products: Array<{ name: string }>;
}

export function SalesNotification({ products }: SalesNotificationProps) {
  const [notification, setNotification] = useState<{
    state: string;
    product: string;
  } | null>(null);

  useEffect(() => {
    const show = () => {
      const state = USA_STATES[Math.floor(Math.random() * USA_STATES.length)];
      const product = products[Math.floor(Math.random() * products.length)]?.name;
      if (!product) return;
      
      setNotification({ state, product });
      setTimeout(() => setNotification(null), 5000);
    };

    const getRandomInterval = () =>
      30000 + Math.random() * 60000; // 30–90 seconds

    let timer: NodeJS.Timeout;
    const schedule = () => {
      timer = setTimeout(() => {
        show();
        schedule();
      }, getRandomInterval());
    };

    schedule();
    return () => clearTimeout(timer);
  }, [products]);

  return (
    <AnimatePresence>
      {notification && (
        <motion.div
          className="fixed bottom-6 left-6 z-50 max-w-xs"
          initial={{ opacity: 0, x: -20, y: 20 }}
          animate={{ opacity: 1, x: 0, y: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        >
          {/* Mobile: center bottom */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 
                          rounded-xl shadow-lg p-3 flex items-center gap-3">
            <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
              🛍️
            </div>
            <div>
              <p className="text-xs text-gray-500">Someone in {notification.state}</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white line-clamp-1">
                just purchased {notification.product}
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

---

## 9. Manual Payment Workflow

### Checkout payment step

```tsx
// apps/web/app/(store)/checkout/payment/page.tsx

const PAYMENT_METHODS = [
  { id: 'chime',        label: 'Chime',         icon: '💚', desc: 'Chime app or debit card' },
  { id: 'cashapp',      label: 'Cash App',       icon: '💵', desc: 'Send to $handle' },
  { id: 'apple_cash',   label: 'Apple Cash',     icon: '🍎', desc: 'iMessage payment' },
  { id: 'zelle',        label: 'Zelle',          icon: '💙', desc: 'Bank-to-bank transfer' },
  { id: 'bank_transfer',label: 'Bank Transfer',  icon: '🏦', desc: 'ACH / wire transfer' },
];

// After order placement, customer receives an email with:
// - Selected payment method details (amount, handle/account)
// - Unique order reference number
// - Link to upload payment proof
// - Instructions to allow 24-48h for verification
```

### Admin payment verification (admin route)

```typescript
// PATCH /api/admin/orders/:orderId/payment-status
export async function updatePaymentStatus(req: Request, res: Response) {
  const { orderId } = req.params;
  const { status, notes } = req.body; // confirmed | failed | refunded

  await supabaseAdmin
    .from('payments')
    .update({
      status,
      verified_by: req.admin.id,
      verified_at: new Date().toISOString(),
    })
    .eq('order_id', orderId);

  // Update order status
  const orderStatus = status === 'confirmed' ? 'processing'
    : status === 'failed' ? 'cancelled'
    : 'refunded';

  await supabaseAdmin
    .from('orders')
    .update({ status: orderStatus })
    .eq('id', orderId);

  // Send customer notification email
  await emailQueue.add('payment-status-update', {
    orderId,
    status,
    notes,
  });

  res.json({ success: true });
}
```

---

## 10. Email Templates (React Email + Resend)

### Order confirmation template

```tsx
// packages/email-templates/src/OrderConfirmation.tsx
import { Html, Head, Body, Container, Text, Button, Hr } from '@react-email/components';

interface OrderConfirmationProps {
  orderNumber: string;
  customerName: string;
  items: Array<{ name: string; quantity: number; price: number }>;
  total: number;
  paymentMethod: string;
  paymentInstructions: string;
}

export function OrderConfirmationEmail({ 
  orderNumber, customerName, items, total, paymentMethod, paymentInstructions 
}: OrderConfirmationProps) {
  return (
    <Html>
      <Head />
      <Body style={{ fontFamily: 'Georgia, serif', background: '#f9f5f0' }}>
        <Container style={{ maxWidth: 600, margin: '0 auto', background: '#fff', padding: 40 }}>
          <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#1a1a1a' }}>
            Native American Jewelry
          </Text>
          <Text style={{ fontSize: 18, color: '#8B6914' }}>
            Order Confirmed: #{orderNumber}
          </Text>
          <Text>Hi {customerName},</Text>
          <Text>
            Thank you for your order. Please complete your payment using {paymentMethod} 
            to begin processing.
          </Text>
          <Container style={{ background: '#fef9f0', border: '1px solid #d4a853', 
                             borderRadius: 8, padding: 20, margin: '20px 0' }}>
            <Text style={{ fontWeight: 'bold', marginBottom: 8 }}>Payment Instructions</Text>
            <Text style={{ whiteSpace: 'pre-line' }}>{paymentInstructions}</Text>
          </Container>
          <Button href={`${process.env.NEXT_PUBLIC_SITE_URL}/account/orders/${orderNumber}`}
                  style={{ background: '#8B6914', color: '#fff', padding: '12px 24px',
                           borderRadius: 6, textDecoration: 'none' }}>
            Upload Payment Proof
          </Button>
        </Container>
      </Body>
    </Html>
  );
}
```

---

## 11. Shipping Configuration

### Default rates (insert as seed data)

```sql
INSERT INTO shipping_rates (zone, method, label, rate, free_threshold, est_days_min, est_days_max) VALUES
  ('usa', 'standard', 'Standard Shipping (USA)',     9.99,  75.00,  5, 8),
  ('usa', 'express',  'Express Shipping (USA)',      19.99, 150.00, 2, 4),
  ('intl','standard', 'Standard International',      24.99, NULL,   10, 21),
  ('intl','express',  'Express International',       49.99, NULL,   5, 10);
```

---

## 12. Docker Setup

### `docker-compose.yml`

```yaml
version: '3.8'

services:
  redis:
    image: redis:7-alpine
    ports: ['6379:6379']
    volumes: ['redis_data:/data']

  worker:
    build: ./services/worker
    environment:
      - REDIS_URL=redis://redis:6379
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
      - RESEND_API_KEY=${RESEND_API_KEY}
    depends_on: [redis]
    restart: always

  scraper:
    build: ./services/scraper
    environment:
      - REDIS_URL=redis://redis:6379
      - TARGET_URL=${TARGET_URL}
      - MIN_PRICE_FILTER=${MIN_PRICE_FILTER}
      - DISCOUNT_RATE=${DISCOUNT_RATE}
    depends_on: [redis]
    restart: always

volumes:
  redis_data:
```

---

## 13. Environment Variables

```env
# Supabase
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_STORAGE_BUCKET=product-images

# Email
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx
FROM_EMAIL=orders@nativeamericanjewelry.com

# Redis
REDIS_URL=rediss://YOUR_PROJECT.upstash.io
REDIS_TOKEN=your_upstash_token

# Auth
JWT_SECRET=your_64_char_random_string
ADMIN_JWT_SECRET=your_admin_64_char_random_string
CSRF_SECRET=your_32_char_random_string
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=https://nativeamericanjewelry.com

# Scraper
TARGET_URL=https://hippiecowgirlcouture.com
MIN_PRICE_FILTER=150
DISCOUNT_RATE=0.05
PROXY_URL=

# App
NEXT_PUBLIC_SITE_URL=https://nativeamericanjewelry.com
NEXT_PUBLIC_BRAND_NAME=Native American Jewelry
NODE_ENV=production

# Optional: Monitoring
SENTRY_DSN=
LOGTAIL_TOKEN=
```

---

## 14. Vercel Deployment

### `vercel.json`

```json
{
  "framework": "nextjs",
  "buildCommand": "cd apps/web && next build",
  "outputDirectory": "apps/web/.next",
  "regions": ["iad1"],
  "functions": {
    "apps/web/app/api/**/*.ts": {
      "maxDuration": 30
    }
  },
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Frame-Options", "value": "SAMEORIGIN" },
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
        { "key": "Permissions-Policy", "value": "camera=(), microphone=(), geolocation=()" }
      ]
    }
  ]
}
```

---

## 15. Security Implementation

```typescript
// middleware.ts (Next.js)
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect admin routes
  if (pathname.startsWith('/admin')) {
    const token = request.cookies.get('admin_token');
    if (!token) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
  }

  // Security headers
  const response = NextResponse.next();
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  
  return response;
}

export const config = {
  matcher: ['/admin/:path*', '/api/:path*'],
};
```

---

## 16. Admin Dashboard — Key Features Checklist

**Products**
- Scrape approval queue with preview, edit, approve, reject
- Bulk approve/reject with filters
- Product editor with image management
- Inventory adjustment with log

**Orders**
- Order list with status filter and search
- Order detail with payment proof viewer
- Payment status update (Confirmed / Failed / Refunded)
- Order timeline with admin notes
- Shipping assignment

**Scraper**
- Manual scrape trigger with progress indicator
- Scrape history table (jobs, status, products found)
- Bull Board embedded for queue monitoring
- Scheduled scrape toggle (enable/disable daily cron)

**Analytics**
- Revenue chart (7d / 30d / 90d)
- Top 10 selling products
- Orders by status donut
- Abandoned cart recovery rate
- Inventory low-stock alerts

---

## 17. Assumptions & Notes

1. **Scraping legality**: Scraping hippiecowgirlcouture.com for commercial resale requires legal review. Ensure compliance with their terms of service and copyright law before deploying.
2. **Watermark removal**: AI-based watermark removal is recommended (e.g. Lama Cleaner / IOPaint) for complex cases. Sharp alone handles simple overlays.
3. **Manual payments**: Without a payment processor, fraud risk is managed via admin verification. Consider adding photo ID requirements for large orders.
4. **Proxy**: For production scraping, a rotating residential proxy service (Brightdata, OxylabS) is strongly recommended to avoid IP blocks.
5. **5% discount**: Applied as `stored_price = source_price × 0.95`. Currency is always USD with no conversion.
6. **Image CDN**: Supabase Storage serves via CDN. For higher traffic, adding Cloudflare in front of Supabase Storage URLs is recommended.
