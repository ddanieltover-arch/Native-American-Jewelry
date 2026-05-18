# NAJ Scraper Service

Playwright scraper + BullMQ worker for **Native American Jewelry**.

Scrapes product data from the reference site, filters by price, applies a 5% discount, processes images (watermark removal + brand overlay + WebP), and saves everything to Supabase as `status: pending` for admin approval.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    HTTP API (:4000)                      │
│          /health  /scrape/trigger  /queues/stats         │
└────────────────────┬────────────────────────────────────┘
                     │ dispatches jobs
┌────────────────────▼────────────────────────────────────┐
│                   BullMQ + Redis                         │
│   ┌──────────────┐ ┌─────────────────┐ ┌─────────────┐ │
│   │ scrape queue │ │  image queue    │ │ email queue │ │
│   └──────┬───────┘ └────────┬────────┘ └──────┬──────┘ │
└──────────┼──────────────────┼─────────────────┼────────┘
           │                  │                 │
    ┌──────▼──────┐   ┌───────▼──────┐  ┌──────▼──────┐
    │   Crawler   │   │    Sharp     │  │   Resend    │
    │  Playwright │   │  processor   │  │   emails    │
    │  (stealth)  │   │ watermark+   │  │             │
    │             │   │ webp+CDN     │  │             │
    └──────┬──────┘   └───────┬──────┘  └─────────────┘
           │                  │
    ┌──────▼──────────────────▼──────────────────────┐
    │                   Supabase                      │
    │   products (pending) · product_images           │
    │   product_variants  · scrape_logs               │
    └────────────────────────────────────────────────┘
```

---

## Quick Start

### Option A — Docker (recommended)

```bash
cp .env.example .env
# Fill in SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, TARGET_URL

docker-compose up -d

# View logs
docker-compose logs -f worker

# Bull Board UI: http://localhost:3001
# Health check:  http://localhost:4000/health
```

### Option B — Local development

```bash
# Prerequisites: Node 20+, Redis running locally

npm install
npx playwright install chromium

cp .env.example .env
# Fill in env vars

# Start worker (all three processors + scheduler)
npm run worker

# OR: run a one-shot scrape right now (no Redis needed)
npm run scrape:now

# OR: start just the API server
npm run dev
```

---

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `SUPABASE_URL` | ✅ | — | Your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | — | Service role key (server-only) |
| `SUPABASE_STORAGE_BUCKET` | | `product-images` | Storage bucket name |
| `REDIS_URL` | ✅ | `redis://localhost:6379` | Redis connection URL |
| `TARGET_URL` | ✅ | — | Site to scrape |
| `MIN_PRICE_FILTER` | | `150` | Skip products below this USD price |
| `DISCOUNT_RATE` | | `0.05` | 5% discount applied to stored price |
| `PROXY_SERVER` | | — | `http://host:port` (strongly recommended in prod) |
| `PROXY_USERNAME` | | — | Proxy auth username |
| `PROXY_PASSWORD` | | — | Proxy auth password |
| `RESEND_API_KEY` | | — | For scrape summary emails |
| `ADMIN_EMAIL` | | — | Recipient of scrape reports |
| `BRAND_WATERMARK_PATH` | | — | Path to PNG watermark (e.g. `./assets/watermark.png`) |
| `SCRAPE_CONCURRENCY` | | `2` | Parallel product page scrapers |
| `IMAGE_CONCURRENCY` | | `3` | Parallel image processing jobs |
| `SCRAPE_CRON` | | `0 3 * * *` | When to auto-scrape (3am UTC daily) |
| `SCRAPER_API_KEY` | | — | Auth key for POST /scrape/trigger |

---

## Scraping Pipeline

### Step-by-step flow

```
1. Browser launch (Playwright, stealth mode, optional proxy)
      ↓
2. Discover catalog/collection URLs from site navigation
      ↓
3. Scroll + collect all /products/ links (handles infinite scroll)
      ↓
4. Per product page — try in order:
   a. JSON-LD structured data   (most reliable)
   b. OpenGraph + DOM hybrid    (fallback)
   c. Pure DOM selectors        (last resort)
      ↓
5. Filter: skip if price < $150 or out of stock
      ↓
6. Transform: apply 5% discount  |  price = source * 0.95
      ↓
7. Save to Supabase with status = 'pending'
      ↓
8. Queue image jobs for each product image
      ↓
9. Image worker: download → remove watermark → apply brand →
                 convert WebP → generate 3 sizes → upload to CDN
      ↓
10. Admin dashboard: review pending products → approve → live
```

### Price rule (always USD, never converted)

```
source_price = $200.00  →  stored price = $190.00  (−5%)
source_price = $895.00  →  stored price = $850.25  (−5%)
source_price = $149.99  →  SKIPPED (below $150 minimum)
```

---

## API Endpoints

### `GET /health`
```json
{
  "status": "ok",
  "uptime": 3600,
  "scheduler": { "cron": "0 3 * * *", "description": "Daily at 3:00 AM UTC" },
  "queues": {
    "scrape": { "waiting": 0, "active": 1, "failed": 0 },
    "image":  { "waiting": 42, "active": 3, "failed": 0 },
    "email":  { "waiting": 0, "active": 0 }
  }
}
```

### `POST /scrape/trigger`
```bash
curl -X POST http://localhost:4000/scrape/trigger \
  -H "x-api-key: YOUR_SCRAPER_API_KEY"

# Response:
{ "success": true, "jobId": "scrape-m5x9q-a3b1", "message": "Scrape job queued" }
```

### `GET /queues/stats`
Returns live queue counts for all three queues.

### `POST /queues/drain`
Empties all queues (admin use only, requires `x-api-key`).

---

## Image Processing

Each product image goes through:

| Stage | What happens |
|---|---|
| Download | Fetches with retry (up to 3 attempts, 20MB limit) |
| Validate | Sharp reads metadata — rejects non-images |
| Debrand | Blurs/covers bottom 8% strip (typical watermark zone) |
| Brand overlay | Applies your PNG watermark to bottom-right corner |
| Resize | Generates 3 sizes: 400px · 800px · 1200px |
| Convert | All outputs: WebP quality 82 (smaller + sharper than JPEG) |
| Upload | Each size uploaded to `products/{id}/{pos}_{size}.webp` |
| Record | `product_images` row saved pointing to CDN URL |

For advanced watermark removal (AI inpainting), integrate [IOPaint](https://github.com/Sanster/IOPaint) as an optional preprocessing step before the Sharp pipeline.

---

## Monitoring

**Bull Board UI** — visual queue monitor at `http://localhost:3001`
- View all jobs in each queue
- Retry failed jobs
- See job payloads and results
- Monitor throughput

**Logs** — structured JSON written to `./logs/`
- `scraper-YYYY-MM-DD.log` — all events
- `errors-YYYY-MM-DD.log` — errors only
- Rotated daily, kept for 14 days, gzipped

**Scrape logs table** — every job recorded in Supabase `scrape_logs`:
```sql
SELECT * FROM scrape_logs ORDER BY started_at DESC LIMIT 10;
```

---

## Project Structure

```
src/
├── index.ts              # HTTP API server (health + trigger)
├── worker.ts             # Worker boot (all 3 processors + scheduler)
├── config/
│   └── index.ts          # Env validation via Zod
├── types.ts              # Shared TypeScript types
├── queues/
│   └── index.ts          # BullMQ queue definitions + Redis client
├── scraper/
│   ├── browser.ts        # Playwright browser manager (stealth)
│   ├── crawler.ts        # Main crawl orchestration
│   ├── extractor.ts      # Data extraction (JSON-LD → OG → DOM)
│   ├── transformer.ts    # Price filter + discount + normalization
│   └── run-now.ts        # One-shot manual scrape script
├── image/
│   └── processor.ts      # Sharp pipeline (debrand → brand → WebP → upload)
├── processors/
│   ├── scrapeProcessor.ts # BullMQ worker for scrape queue
│   ├── imageProcessor.ts  # BullMQ worker for image queue
│   ├── emailProcessor.ts  # BullMQ worker for email queue
│   └── scheduler.ts       # node-cron daily trigger
├── db/
│   └── supabase.ts       # Supabase client + DB helpers
└── utils/
    ├── logger.ts          # Winston logger with daily rotation
    └── helpers.ts         # Utility functions
```

---

## Deployment

### Railway / Render / Fly.io

Push the repo and set env vars in the platform dashboard.

```bash
# Build command:
npm run build

# Start command (worker):
node dist/worker.js

# Start command (API):
node dist/index.js
```

Run **both** as separate services pointing to the same Redis and Supabase.

### Scaling

- Increase `SCRAPE_CONCURRENCY` for faster crawling (watch for rate limits/blocks)
- Increase `IMAGE_CONCURRENCY` to process more images in parallel
- Deploy multiple worker instances — BullMQ handles job locking automatically
- Add a residential proxy to avoid IP blocks in production

---

## Legal Note

Scraping for commercial resale requires review of the target site's Terms of Service. Consult legal counsel before deploying against any production site.
