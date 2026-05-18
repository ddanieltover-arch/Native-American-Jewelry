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

## 5. Scraper + Redis (Railway / Render)

```bash
cd naj-scraper-service
docker-compose up -d
```

Or deploy `Dockerfile` with Redis (Upstash) and env from `.env.example`.

## 6. Smoke test

- [ ] `/shop` shows products from Supabase
- [ ] Checkout creates order + Resend email
- [ ] `/contact` sends email
- [ ] Admin login → approve pending product → visible on shop
- [ ] `POST /scrape/trigger` on scraper service
