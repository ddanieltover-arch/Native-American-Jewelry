# Legacy — Precision Health / Python stack

This folder archives the **previous** scraper toolkit (Python, EUR conversion, EU storefront paths). It is **not used** by Native American Jewelry.

## Do not use for NAJ

| Legacy | NAJ replacement |
|--------|-----------------|
| `scripts/run_scrape.py` | `naj-scraper-service` (`npm run scrape:now`) |
| `scripts/fx_rates.py` | USD only — `DISCOUNT_RATE` in transformer |
| `scripts/_env.py` → `precision-health-store/` | `naj-scraper-service/.env` |
| `scripts/import_csv.py` | Admin import or extend Node service |
| `assets/eu_*.json` | `USA_STATES` in `naj-storefront/src/lib/utils.ts` |

## Contents

- **`scripts/`** — Python scraper, FX, CSV import, EU location enricher
- **`assets/`** — EU location/name JSON from old project

## If you need something from here

Port the logic into **`naj-scraper-service`** (TypeScript) against the schema in `naj-supabase-integration/migrations/`. Do not re-enable EUR defaults or wrong `.env` paths.

Active documentation: [`../SKILL.md`](../SKILL.md) and [`../references/`](../references/).
