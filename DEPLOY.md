# Deployment Guide — Native American Jewelry

## Architecture

| Concern | Provider |
|---------|----------|
| Auth (customers + admin login) | **Supabase Auth** |
| Postgres (catalog, orders, admin_users, …) | **Neon** |
| Files (product images, payment proofs) | **Cloudflare R2** |

Full cutover steps: [naj-db/CUTOVER.md](naj-db/CUTOVER.md) and [naj-db/README.md](naj-db/README.md).

## 1. Neon + R2 (required first)

1. Create a Neon project; apply schema from `naj-db/migrations/` (`npm run apply-schema` in `naj-db`).
2. Create Cloudflare R2 bucket + public base URL.
3. Create a Supabase Auth user for admin; insert matching row on **Neon**:

```sql
INSERT INTO admin_users (email, role)
VALUES ('your-admin@email.com', 'super_admin')
ON CONFLICT (email) DO NOTHING;
```

4. For live data from an existing Supabase DB, follow `naj-db/CUTOVER.md` (`migrate-pg` + `migrate-storage`).

## 2. Environment variables

| Service | Key files |
|---------|-----------|
| Storefront | `naj-storefront/.env.local` |
| Admin | `naj-admin-dashboard/.env.local` |
| Scraper | `naj-scraper-service/.env` |
| Cutover scripts | `naj-db/.env` |

Required: `DATABASE_URL`, `R2_*`, Supabase Auth keys (`NEXT_PUBLIC_SUPABASE_*`), `RESEND_API_KEY`, `FROM_EMAIL`, `NEXT_PUBLIC_SITE_URL`

Transactional emails (shared `naj-email-templates/`): order confirmation, payment instructions, payment verified/failed/refunded, shipped/delivered. Configure payment handles: `PAYMENT_CHIME_HANDLE`, `PAYMENT_CASHAPP_TAG`, `PAYMENT_ZELLE_EMAIL`, etc. See `naj-email-templates/README.md`.

## 3. Vercel — Storefront

```bash
cd naj-storefront
vercel --prod
```

Add all vars from `naj-storefront/.env.example` in Vercel project settings.

## 4. Vercel — Admin (separate project)

```bash
cd naj-admin-dashboard
vercel --prod
```

Set `SCRAPER_SERVICE_URL` to your scraper host URL.

## 5. Scraper on Render (recommended for production)

Full guide: [naj-scraper-service/RENDER.md](naj-scraper-service/RENDER.md)

1. Create **Upstash Redis** → copy `REDIS_URL`
2. Render → **New → Blueprint** → connect [GitHub repo](https://github.com/ddanieltover-arch/Native-American-Jewelry)
3. Add env vars to **naj-scraper-api** and **naj-scraper-worker** (`DATABASE_URL`, `R2_*`, Redis, `SCRAPER_API_KEY`, etc.)
4. Your scraper URL:

```env
SCRAPER_SERVICE_URL=https://naj-scraper-api.onrender.com
```

Set that in Vercel admin env + matching `SCRAPER_API_KEY`.

**Local dev** (optional):

```bash
cd naj-scraper-service
docker-compose up -d
# SCRAPER_SERVICE_URL=http://localhost:4000
```

## 6. Smoke test

### Storefront & orders

- [ ] `/shop` shows products from Supabase
- [ ] Checkout creates order + Resend email
- [ ] `/contact` sends email

### Scraper skill (scrape → approve → storefront)

Prerequisites: migrations `001`–`003` applied; `naj-scraper-service/.env` and admin `.env.local` share the same `SCRAPER_API_KEY`.

1. Start scraper stack:
   ```bash
   cd naj-scraper-service
   docker-compose up -d
   curl http://localhost:4000/health
   ```
   Or locally: `npm run dev` + `npm run dev:worker` in separate terminals.

2. Trigger a scrape (pick one):
   - Admin → **Scraper** → **Trigger Scrape Now**
   - Or: `curl -X POST http://localhost:4000/scrape/trigger -H "x-api-key: YOUR_SCRAPER_API_KEY"`

3. Verify in Supabase (or admin **Scrape History**):
   - `scrape_logs` row with `status` completed/partial
   - `products` rows with `status = pending`, `source_price >= 150`, `price ≈ source_price × 0.95`

4. Admin → **Approval Queue** → approve one product.

5. Storefront `/shop` shows only **active** products (approved SKU visible; pending hidden).

Optional small batch test (USD prices, inline images, $150+ only):
```bash
cd naj-scraper-service
# First 30 SKUs only — set in .env: MAX_PRODUCTS_PER_RUN=30
npm run scrape:now
```

Scraper forces `?currency=USD`, reads Shopify JSON (not ₦ DOM text), dedupes by product handle, and sets `SCRAPE_INLINE=true` for images on `scrape:now`.
