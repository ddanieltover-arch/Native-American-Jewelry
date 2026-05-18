---
name: scraper
description: >
  Operational skill for Native American Jewelry catalog ingestion. Use when the user
  wants to scrape hippiecowgirlcouture.com (or another Shopify-style catalog), import
  products into Supabase as pending for admin approval, trigger the scraper API/worker,
  process images (watermark removal, WebP, Supabase Storage), tune price filters, or
  debug scrape → approve → storefront flow. Triggers on "scrape products", "run the
  scraper", "import catalog", "approve pending products", "trigger scrape on Render",
  or "fill the shop from hippiecowgirlcouture". Prefer naj-scraper-service (Node +
  Playwright + BullMQ) over hand-rolling scrapers — it matches the NAJ schema and
  approval workflow.
---

# Scraper Skill — Native American Jewelry

Operational skill for ingesting product data into the **Native American Jewelry**
Supabase catalog. The production scraper is **`naj-scraper-service`** (Node.js,
Playwright, BullMQ, Sharp). Products land as `status: pending` until approved in
**`naj-admin-dashboard`**, then appear on **`naj-storefront`** (mobile-first).

---

## Brand & catalog rules (canonical)

| Setting | Value |
|---------|--------|
| **Brand** | Native American Jewelry |
| **Reference scrape source** | [hippiecowgirlcouture.com](https://hippiecowgirlcouture.com) |
| **Currency** | USD only (no FX conversion in this project) |
| **Min price** | $150 USD — products below this are **skipped** on import |
| **Stored price** | `source_price × (1 - 0.05)` — **5% discount** applied on import |
| **Target scale** | 100,000+ products — use queues, throttling, pagination; avoid single-threaded one-offs at full scale |
| **Storefront** | Mobile-first (`naj-storefront`) |
| **Payment model** | Manual only (not scraper scope) |

Environment defaults (override in `.env`):

```env
TARGET_URL=https://hippiecowgirlcouture.com
MIN_PRICE_FILTER=150
DISCOUNT_RATE=0.05
BRAND_NAME=Native American Jewelry
```

Price logic lives in `naj-scraper-service/src/scraper/transformer.ts`:

- Skip if `raw.price < MIN_PRICE_FILTER` (default 150).
- Persist `source_price` = original scraped price, `price` = after 5% discount.

---

## When this skill triggers

| User intent | What to run |
|-------------|-------------|
| Scrape reference site → Supabase (pending) | `naj-scraper-service`: API trigger or `npm run scrape:now` |
| Start / debug local scraper stack | `docker-compose up -d` in `naj-scraper-service` |
| Deploy scraper to production | Render — see `naj-scraper-service/RENDER.md` |
| Approve products for live shop | `naj-admin-dashboard` → Products → Approval |
| Check scrape history / errors | Admin → Scraper, or `scrape_logs` in Supabase |
| Re-run after schema/env change | Migrations first, then scraper; verify `/health` |

If the user wants to **build the storefront or admin UI**, use the main architecture doc
[`native-american-jewelry-architecture.md`](../native-american-jewelry-architecture.md)
— this skill is **ingestion and catalog ops only**.

---

## Decision tree on entry

```
User wants to scrape / import products?
├── Production / scheduled → naj-scraper-service on Render + Redis (Upstash)
│     POST {SCRAPER_SERVICE_URL}/scrape/trigger  (header: x-api-key)
├── Local one-shot test → cd naj-scraper-service && npm run scrape:now
├── Local full stack → docker-compose up -d  (API :4000, worker, Redis, Bull Board :3001)
└── Manual CSV / one-off URL experiments
      → Prefer extending naj-scraper-service; see assets/csv_import_template.csv
      → Do NOT use scraper-skill/legacy/scripts/ (archived Python stack)

After scrape:
├── Admin approves pending → status active
└── Verify naj-storefront /shop (only active products visible to anon RLS)
```

Always confirm **Supabase migrations** (`naj-supabase-integration/migrations/001–003`) ran before first scrape.

---

## Pipeline at a glance

```
┌─────────────────┐     ┌──────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│ hippiecowgirl   │     │ naj-scraper-     │     │ Supabase         │     │ naj-admin       │
│ couture.com     │ ──▶ │ service          │ ──▶ │ products         │ ──▶ │ approval queue  │
│ (collections/   │     │ Playwright crawl │     │ status=pending   │     │ → active        │
│  PDPs)          │     │ filter ≥$150     │     │ product_images   │     └────────┬────────┘
└─────────────────┘     │ 5% discount      │     │ scrape_logs      │              │
                        │ BullMQ image Q   │     └──────────────────┘              ▼
                        └──────────────────┘                          ┌─────────────────┐
                                                                          │ naj-storefront  │
                                                                          │ /shop (mobile)  │
                                                                          └─────────────────┘
```

---

## Integration with the NAJ stack

1. **Schema** — [`naj-supabase-integration/migrations/`](../naj-supabase-integration/migrations/). Tables: `products`, `product_images`, `product_variants`, `scrape_logs`, etc. Do not invent columns without a migration.

2. **Scraper service** — [`naj-scraper-service/`](../naj-scraper-service/). This is the **only** maintained production ingester for NAJ.

3. **Admin approval** — Scraped rows are `pending` until `adminApproveProduct` (dashboard or API). Never set `active` in bulk without review (watermarks, pricing, compliance).

4. **Storefront** — Reads `status = active` only. Sales notifications use US state names (`SalesNotification.tsx`), not EU localisation.

5. **Environment files**
   - Scraper: `naj-scraper-service/.env`
   - Admin trigger URL: `SCRAPER_SERVICE_URL` + `SCRAPER_API_KEY` in `naj-admin-dashboard/.env.local`
   - Shared: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET=product-images`

6. **`scraper-skill/legacy/`** — Archived Python / EUR tooling from another project. For NAJ, use **`naj-scraper-service`** only.

---

## Running the scraper (NAJ)

### Local — Docker (recommended)

```bash
cd naj-scraper-service
cp .env.example .env   # set SUPABASE_*, REDIS_URL, TARGET_URL, SCRAPER_API_KEY

docker-compose up -d

curl http://localhost:4000/health
curl -X POST http://localhost:4000/scrape/trigger -H "x-api-key: YOUR_SCRAPER_API_KEY"
```

- Bull Board: `http://localhost:3001`
- Logs: `docker-compose logs -f worker`

### Local — one-shot (no Redis)

```bash
cd naj-scraper-service
npm install && npx playwright install chromium
npm run scrape:now
# optional: npm run scrape:now -- https://hippiecowgirlcouture.com/collections/necklaces
```

### Production — Render

See [`naj-scraper-service/RENDER.md`](../naj-scraper-service/RENDER.md).

```env
SCRAPER_SERVICE_URL=https://naj-scraper-api.onrender.com
```

(Set in Vercel admin env to match Render + same `SCRAPER_API_KEY`.)

---

## Scale: hippiecowgirl (~1,573 SKUs) and beyond

**Reference catalog:** [hippiecowgirlcouture.com](https://hippiecowgirlcouture.com) lists **~1,573 products** under `/collections/all` (Shopify, paginated `?page=2`, `?page=3`, …). The crawler walks those pages until no new `/products/` links appear.

| Concern | Approach |
|---------|----------|
| **Full catalog discovery** | Primary seed: `TARGET_URL/collections/all` + Shopify `?page=N` pagination (not scroll-only) |
| **Manual runs on Render** | `SCRAPE_INLINE=true` (no Redis). Set `MAX_PRODUCTS_PER_RUN=100` for ~30–60 min batches; repeat until catalog is covered |
| **Long runs in admin** | Scrape logs stay `running` up to **12 hours** before marked stale |
| **Throughput** | `SCRAPE_CONCURRENCY=2`, delays 1.5–4s → full catalog **~2.5–5+ hours** if `MAX_PRODUCTS_PER_RUN=0` |
| **Images (inline)** | With `SCRAPE_INLINE=true`, images process in-process (`processImage`); no worker required |
| **Images (queued)** | Redis + worker: `image` queue → WebP → `product-images` bucket |
| **DB** | Indexes in `001_schema.sql`; approve in batches via admin |
| **Rate limits** | `REQUEST_DELAY_MIN_MS` / `REQUEST_DELAY_MAX_MS`; use `PROXY_*` if blocked |
| **Idempotency** | Upsert by `slug`; re-scrape skips duplicates |

Example Render env for batched manual ingestion:

```env
TARGET_URL=https://hippiecowgirlcouture.com
SCRAPE_INLINE=true
MAX_PRODUCTS_PER_RUN=100
MIN_PRICE_FILTER=150
DISCOUNT_RATE=0.05
```

Monitor `scrape_logs` for `partial` / `failed` and IP blocks.

---

## Safety & compliance

- **Legal** — Scraping hippiecowgirlcouture.com for commercial resale may violate their terms and copyright. Flag for legal review before production ([architecture §17](../native-american-jewelry-architecture.md)).
- **Robots / ToS** — Respect `robots.txt`; throttle requests; consider residential proxy (`PROXY_*`).
- **Price filter** — Never lower `MIN_PRICE_FILTER` below 150 without explicit user request (brand positioning).
- **Discount** — `DISCOUNT_RATE=0.05` is fixed business logic; changing it affects margin on every SKU.
- **Approval** — Do not auto-approve all pending in production without image/price QA.

---

## Approval → live storefront

1. Scraper inserts `products` with `status = 'pending'`.
2. Admin: **Products → Approval** → approve (or bulk approve).
3. Storefront `/shop` and homepage only show `active` products (min price $150 already enforced at import).

---

## Where to look for deeper detail

| Doc | Use when |
|-----|----------|
| [`references/architecture.md`](references/architecture.md) | Module map, queues, crawl steps, scale |
| [`references/adapters.md`](references/adapters.md) | JSON-LD / DOM extraction, Shopify variants |
| [`references/frontend.md`](references/frontend.md) | USD display, mobile UX, approval visibility |
| [`references/compliance.md`](references/compliance.md) | Legal, robots, throttling, approval QA |
| [`native-american-jewelry-architecture.md`](../native-american-jewelry-architecture.md) | Full system design, env vars, security |
| [`naj-scraper-service/README.md`](../naj-scraper-service/README.md) | API endpoints, env table, image pipeline |
| [`naj-scraper-service/RENDER.md`](../naj-scraper-service/RENDER.md) | Deploy API + worker + Upstash |
| [`naj-supabase-integration/INTEGRATION_GUIDE.md`](../naj-supabase-integration/INTEGRATION_GUIDE.md) | Wiring storefront/admin to Supabase |
| [`DEPLOY.md`](../DEPLOY.md) | End-to-end deploy checklist |

---

## Self-annealing

1. Prefer fixing **`naj-scraper-service`** (selectors, transformer, queues) over new one-off scripts.
2. Test with **one product URL** or small collection before full catalog.
3. If Shopify theme changes break extraction, update `extractor.ts` / `crawler.ts`, not storefront.
4. After env changes, restart worker + API containers.

---

## What this skill does NOT do

- Payments, checkout, or orders (storefront + admin).
- Customer auth or account flows.
- Auto-approve without human review (by default).
- EUR conversion or EU sales-popup localisation (NAJ is USD / US-focused).
- Replace `naj-scraper-service` with archived Python in `scraper-skill/legacy/scripts/`.
