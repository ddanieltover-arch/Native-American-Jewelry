# Scraper Skill — Native American Jewelry

Agent directive for catalog ingestion. **Start with [`SKILL.md`](SKILL.md).**

## Brand constants

| | |
|--|--|
| Brand | Native American Jewelry |
| Source | hippiecowgirlcouture.com |
| Min price | $150 USD |
| Discount on import | 5% (`DISCOUNT_RATE=0.05`) |
| Scale target | 100,000+ products |
| Storefront | Mobile-first |

## Documentation

| Path | Purpose |
|------|---------|
| [`SKILL.md`](SKILL.md) | Agent entry point, commands, env |
| [`references/architecture.md`](references/architecture.md) | Pipeline, queues, Supabase |
| [`references/adapters.md`](references/adapters.md) | Extraction strategies |
| [`references/frontend.md`](references/frontend.md) | Storefront USD / mobile |
| [`references/compliance.md`](references/compliance.md) | Legal & ops safety |
| [`assets/csv_import_template.csv`](assets/csv_import_template.csv) | Manual USD import template |

## Quick commands

```bash
cd naj-scraper-service
docker-compose up -d
curl http://localhost:4000/health
npm run scrape:now
```

## Legacy

Python/EUR scripts from a prior project live under [`legacy/`](legacy/) — **not used for NAJ**.
