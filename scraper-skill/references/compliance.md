# Compliance & Operational Safety — NAJ

Guidelines for scraping **hippiecowgirlcouture.com** into **Native American Jewelry**. Not legal advice — escalate to counsel before production resale.

---

## Legal & business risk

| Risk | Notes |
|------|--------|
| **Terms of service** | Commercial scraping and resale may violate the source site’s ToS. |
| **Copyright** | Product photos and descriptions may be protected; watermark removal does not clear rights. |
| **Trademark** | “Native American Jewelry” branding must not imply false tribal affiliation or violate the Indian Arts and Crafts Act (US). Ensure product descriptions and marketing are accurate. |
| **Consumer protection** | Displayed `price` must match checkout; `source_price` strike-through must reflect real prior pricing rules in your jurisdiction. |

See also architecture doc §17 (legal review checklist).

---

## robots.txt & crawling etiquette

Before production crawls:

1. Fetch `https://hippiecowgirlcouture.com/robots.txt`.
2. Respect `Disallow` paths for catalog crawlers unless counsel approves otherwise.
3. Use conservative concurrency defaults (`SCRAPE_CONCURRENCY=2`, catalog `pLimit(1)`).
4. Random delay between requests: `REQUEST_DELAY_MIN_MS` / `REQUEST_DELAY_MAX_MS` (1.5–4s default).

**User-Agent:** Playwright stealth context in `browser.ts` — do not impersonate Googlebot. If you add a custom UA string, identify the bot and provide a contact URL on your domain.

---

## Rate limiting & blocks

| Signal | Response |
|--------|----------|
| HTTP 429 / 503 | Back off; increase delays; pause cron |
| Empty catalog pages | Theme change — fix selectors, not harder crawling |
| IP block | Configure `PROXY_SERVER`, `PROXY_USERNAME`, `PROXY_PASSWORD` |
| Partial scrape log | Review `errors[]` in `scrape_logs`; fix URLs individually |

Never run multiple overlapping full-site jobs (scrape worker concurrency = 1 by design).

---

## Data handling

| Data | Rule |
|------|------|
| `SUPABASE_SERVICE_ROLE_KEY` | Scraper + admin server only; never in storefront client bundle |
| `SCRAPER_API_KEY` | Required on `POST /scrape/trigger`; rotate if leaked |
| Customer PII | Not collected by scraper |
| Source URLs | Store in `source_url` for audit; don’t expose prominently on PDP if policy requires |

---

## Pricing policy (enforced in code)

| Rule | Env / code |
|------|------------|
| Minimum import price | `MIN_PRICE_FILTER=150` (USD) |
| Discount on import | `DISCOUNT_RATE=0.05` |
| Currency | USD only — no FX in pipeline |

**Do not** lower `MIN_PRICE_FILTER` or change `DISCOUNT_RATE` without explicit business approval — affects margin on every SKU.

---

## Human review (approval queue)

Default workflow requires admin approval:

1. Visual QA — watermark removal quality, wrong crops.
2. Price sanity — `source_price` vs `price` vs market.
3. Copy — descriptions acceptable for NAJ brand voice.
4. Authenticity claims — no misleading “authentic” labels without documentation.

Do not bulk-approve thousands of pending rows without sampling.

---

## Image processing ethics

`removeBranding()` covers bottom 8% of images to hide source watermarks, then optionally applies **NAJ** watermark via `BRAND_WATERMARK_PATH`.

- Removing another business’s watermark for resale is legally sensitive.
- Prefer licensed/supplier imagery long-term.
- Document AI/inpainting if upgraded beyond simple composite.

---

## Cron & production

| Setting | Default | Note |
|---------|---------|------|
| `SCRAPE_CRON` | `0 3 * * *` | Off-peak US time; adjust for server TZ |
| Daily full crawl | Re-imports / updates pending | Monitor `products_filtered` vs `products_imported` |

Alert on `scrape_logs.status = failed` or error rate &gt; threshold (wire in admin or external monitoring).

---

## Checklist before go-live

- [ ] Legal review of scraping + resale
- [ ] robots.txt reviewed
- [ ] `MIN_PRICE_FILTER` and `DISCOUNT_RATE` confirmed with owner
- [ ] Proxy plan if source rate-limits
- [ ] Admin approval process staffed
- [ ] Keys in Render/Vercel secrets, not git
- [ ] Sample of 20 approved PDPs reviewed on mobile storefront

---

## Incident response

| Incident | Action |
|----------|--------|
| Cease-and-desist from source | Stop cron; disable trigger API; preserve logs |
| Key leak | Rotate Supabase service role + `SCRAPER_API_KEY` |
| Bad batch import | Bulk archive in admin; fix transformer; re-scrape subset |
