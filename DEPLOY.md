# Deployment Guide — Native American Jewelry

## 1. Supabase (required first)

1. Open [Supabase SQL Editor](https://supabase.com/dashboard/project/juddflbuwnymmwyyekrw/sql/new)
2. Run migrations **in order** from `naj-supabase-integration/migrations/`:
   - `001_schema.sql`
   - `002_seed.sql`
   - `003_functions.sql`
   - `004_seed_sample_products.sql` (optional sample catalog)
3. Create an admin user: Authentication → Users → Add user
4. Insert admin row (replace email):

```sql
INSERT INTO admin_users (email, role)
VALUES ('your-admin@email.com', 'super_admin')
ON CONFLICT (email) DO NOTHING;
```

5. Seed catalog (if empty): `node scripts/setup-supabase.mjs`

## 2. Environment variables

Copy from `.env.all-services.example` and set in each host:

| Service | Key files |
|---------|-----------|
| Storefront | `naj-storefront/.env.local` |
| Admin | `naj-admin-dashboard/.env.local` |
| Scraper | `naj-scraper-service/.env` |

Required: `SUPABASE_*`, `RESEND_API_KEY`, `FROM_EMAIL`

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
3. Add env vars to **naj-scraper-api** and **naj-scraper-worker** (Supabase, Redis, `SCRAPER_API_KEY`, etc.)
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

Optional one-shot test (requires image worker running for photos):
```bash
cd naj-scraper-service
npm run scrape:now -- https://hippiecowgirlcouture.com/collections/necklaces
```
