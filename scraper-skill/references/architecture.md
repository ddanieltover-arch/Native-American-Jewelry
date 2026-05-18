# NAJ Scraper Architecture

How **Native American Jewelry** catalog ingestion fits the monorepo. Production code lives in **`naj-scraper-service`**; this doc is the deep reference for agents working on scrape → approve → storefront flow.

---

## Brand constants

| | |
|--|--|
| Brand | Native American Jewelry |
| Default source | `https://hippiecowgirlcouture.com` |
| Currency | USD (no FX layer) |
| Min import price | $150 |
| Stored price | `source_price × 0.95` (5% discount) |
| Product status on import | `pending` |
| Scale target | 100,000+ SKUs |
| Storefront | Mobile-first (`naj-storefront`) |

---

## System diagram

```
┌──────────────────────┐
│ hippiecowgirlcouture │
│ .com (Shopify-style) │
└──────────┬───────────┘
           │ Playwright crawl
           ▼
┌──────────────────────┐     Redis (BullMQ)
│ naj-scraper-service  │◄──────────────────┐
│  API :4000           │                   │
│  worker              │   queues: scrape, │
│  scheduler (cron)    │           image,  │
└──────────┬───────────┘           email   │
           │ service role              │
           ▼                           │
┌──────────────────────┐               │
│ Supabase             │               │
│  products (pending)  │               │
│  product_images      │               │
│  product_variants    │               │
│  scrape_logs         │               │
│  Storage: product-   │               │
│    images/*.webp     │               │
└──────────┬───────────┘               │
           │ approve                    │
           ▼                           │
┌──────────────────────┐               │
│ naj-admin-dashboard  │── trigger ────┘
│  POST /scrape/trigger│
└──────────┬───────────┘
           │ status = active
           ▼
┌──────────────────────┐
│ naj-storefront       │
│  RLS: active only    │
│  /shop, PDP, cart    │
└──────────────────────┘
```

---

## `naj-scraper-service` module map

| Path | Role |
|------|------|
| `src/index.ts` | Express API: `/health`, `/scrape/trigger`, `/scrape/status/:jobId` |
| `src/worker.ts` | Starts scrape + image + email workers |
| `src/scraper/crawler.ts` | Full-site crawl orchestration |
| `src/scraper/extractor.ts` | JSON-LD → OG+DOM → DOM fallback |
| `src/scraper/transformer.ts` | $150 filter, 5% discount, slug, `pending` |
| `src/scraper/browser.ts` | Stealth Playwright context, scroll, throttle |
| `src/scraper/run-now.ts` | CLI one-shot (no Redis) |
| `src/processors/scrapeProcessor.ts` | BullMQ `scrape` queue handler |
| `src/processors/imageProcessor.ts` | BullMQ `image` queue handler |
| `src/image/processor.ts` | Download, watermark strip, WebP, Storage upload |
| `src/db/supabase.ts` | Upsert product, variants, images, scrape_logs |
| `src/config/index.ts` | Zod-validated env |
| `src/queues/index.ts` | Queue definitions + scheduled repeat |

---

## Crawl pipeline (3 steps)

### 1. Discover catalog URLs

- Load `TARGET_URL` homepage.
- `extractCatalogLinks()` → `/collections/*`, `/category/*`, `/shop/*`.
- Seed list always includes:
  - `{TARGET_URL}/collections/all`
  - `{TARGET_URL}/collections/jewelry`
  - `{TARGET_URL}/shop`

### 2. Collect product URLs

- For each catalog URL: `safeGoto` → `scrollToBottom` (up to 15 passes) → `extractProductLinks()`.
- Links matching `/products/` or `/product/`.
- Catalog pages processed **one at a time** (`pLimit(1)`).

### 3. Scrape each PDP

- Concurrency: `SCRAPE_CONCURRENCY` (default 2).
- `extractProductData()` then optional `extractShopifyVariants()`.
- `transformProduct()` — skip if price &lt; `MIN_PRICE_FILTER` or OOS.
- `saveProduct()` — upsert by slug; duplicates return no new id.
- Enqueue one BullMQ job per image URL (`process-image`, 5 retries).

Between requests: random delay `REQUEST_DELAY_MIN_MS`–`REQUEST_DELAY_MAX_MS`.

---

## Queues

| Queue | Concurrency | Purpose |
|-------|-------------|---------|
| `scrape` | 1 | Full-site crawl (long-running, 10 min lock) |
| `image` | `IMAGE_CONCURRENCY` (3) | Sharp pipeline per image |
| `email` | — | Resend summary to `ADMIN_EMAIL` after scrape |

Scheduler: `SCRAPE_CRON` (default `0 3 * * *`) enqueues daily scrape of `TARGET_URL`.

---

## Data written to Supabase

**`products`** (on import):

- `source_price` — scraped USD price
- `price` — after 5% discount
- `source_url` — canonical PDP URL
- `status` — always `pending`
- `slug` — from product name (deduped)

**`product_images`** — filled asynchronously after image worker runs (WebP in Storage).

**`scrape_logs`** — `products_found`, `products_filtered`, `products_imported`, `errors[]`, `duration_ms`, status `completed` | `partial` | `failed`.

---

## Environment (scraper)

See `naj-scraper-service/.env.example`. Critical keys:

```env
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_STORAGE_BUCKET=product-images
REDIS_URL=redis://localhost:6379
TARGET_URL=https://hippiecowgirlcouture.com
MIN_PRICE_FILTER=150
DISCOUNT_RATE=0.05
SCRAPER_API_KEY=          # API + admin must match
BRAND_NAME=Native American Jewelry
BRAND_WATERMARK_PATH=     # optional PNG
```

Admin triggers scraper via `SCRAPER_SERVICE_URL` + same `SCRAPER_API_KEY`.

---

## Scale: 100,000+ products

| Risk | Mitigation |
|------|------------|
| Memory / runtime | One crawl job at a time; don’t run overlapping full crawls |
| Rate limits | Throttle delays + optional `PROXY_*` |
| DB growth | Indexes on `slug`, `status`; batch approval in admin |
| Image backlog | Scale image worker concurrency cautiously; monitor Bull Board |
| Re-scrapes | Slug upsert updates existing rows; review pending duplicates in admin |

For very large catalogs, consider splitting by collection URL (`npm run scrape:now -- <collection-url>`) before full-site cron.

---

## Related docs

| Doc | Topic |
|-----|--------|
| [`adapters.md`](adapters.md) | Extraction strategies, Shopify selectors |
| [`compliance.md`](compliance.md) | Legal, robots, throttling |
| [`frontend.md`](frontend.md) | Storefront USD display, mobile UX |
| [`../SKILL.md`](../SKILL.md) | Agent entry point |
| [`../../native-american-jewelry-architecture.md`](../../native-american-jewelry-architecture.md) | Full platform spec |

Legacy Python stack: [`../legacy/README.md`](../legacy/README.md) (archived, do not use for NAJ).
