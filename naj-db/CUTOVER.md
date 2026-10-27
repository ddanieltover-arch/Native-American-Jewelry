# Cutover checklist — Neon + Supabase Auth + R2

## Before deploy

1. Create Neon project; set `DATABASE_URL` (pooled) on storefront, admin, scraper.
2. Create Cloudflare R2 bucket + API token; set all `R2_*` vars; enable public access or custom domain → `R2_PUBLIC_BASE_URL`.
3. Keep Supabase Auth keys (`NEXT_PUBLIC_SUPABASE_*`, `SUPABASE_SERVICE_ROLE_KEY` for Auth admin APIs).
4. Pause scraper / freeze writes.

## Migrate data

```bash
cd naj-db
cp .env.example .env   # fill DATABASE_*, SUPABASE_*, R2_*
npm install
npm run apply-schema
npm run migrate-pg
npm run migrate-storage
npm run verify-counts
```

Insert admin row on **Neon** (Auth user still created in Supabase):

```sql
INSERT INTO admin_users (email, role)
VALUES ('your-admin@email.com', 'super_admin')
ON CONFLICT (email) DO NOTHING;
```

## Deploy apps

Deploy storefront, admin, scraper with new env. Smoke test:

- [ ] Login / signup (Supabase Auth)
- [ ] Shop catalog + product images (Neon + R2 URLs)
- [ ] Place order
- [ ] Upload payment proof (R2)
- [ ] Admin approve product / verify payment
- [ ] Scrape one product (Neon + R2)

## Reclaim Supabase disk

1. Confirm production traffic hits Neon.
2. Empty Storage buckets `product-images` and `payment-proofs` in Supabase dashboard.
3. Run `scripts/reclaim-supabase.sql` in Supabase SQL editor.
