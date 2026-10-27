# naj-db — Neon + R2 cutover

Auth stays on **Supabase**. Business data lives on **Neon**. Files live on **Cloudflare R2**.

## Setup

1. Create a Neon project; copy the pooled connection string → `DATABASE_URL`.
2. Create an R2 bucket + API token; set `R2_*` vars (see `.env.example`).
3. Keep Supabase Auth keys on the apps; you no longer need Supabase Storage or Postgres disk for catalog data.

```bash
cd naj-db
cp .env.example .env   # fill in values
npm install
npm run apply-schema   # empty Neon
# optional empty seed: npm run apply-schema -- --seed
```

## Live data cutover

1. Pause the scraper.
2. Apply schema on Neon (`npm run apply-schema`).
3. `npm run migrate-pg` (needs `pg_dump` / `psql` + `SUPABASE_DB_URL`).
4. `npm run migrate-storage` (copies Storage → R2, rewrites URLs).
5. `npm run verify-counts`.
6. Deploy storefront / admin / scraper with `DATABASE_URL` + `R2_*`.
7. Empty Supabase Storage and truncate heavy public tables to reclaim disk.

## Apps

Storefront, admin, and scraper use server-side Neon SQL (`DATABASE_URL`) and R2 uploads. Supabase clients remain **Auth only**.
