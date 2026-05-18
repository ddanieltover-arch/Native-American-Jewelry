# Extraction & Site Adapters — NAJ

The NAJ scraper does **not** use per-site Python adapter classes. Extraction is implemented in **`naj-scraper-service/src/scraper/extractor.ts`** with a fixed strategy chain tuned for **Shopify-style** stores like hippiecowgirlcouture.com.

When a source site changes markup, update **extractor** and/or **crawler** — not the storefront.

---

## Strategy chain (priority order)

### 1. JSON-LD (`application/ld+json`)

- Finds `@type: Product` in script tags (including `@graph` arrays).
- Reads `name`, `description`, `offers.price`, `offers.availability`, `image`, `sku` / `mpn`.
- **Most reliable** when the theme emits valid schema.org Product JSON.

### 2. OpenGraph + DOM hybrid

- Meta: `og:title`, `og:description`, `og:image`, `product:price:amount`.
- DOM fallbacks: `h1`, price elements (`[class*="price"]`, `.product-price`, `[data-price]`).
- Stock: absent `.sold-out` / `.out-of-stock`.

### 3. Pure DOM fallback

- Price selectors (in order): `.product-price__amount`, `.price-item--sale`, `[data-product-price]`, `.price`, etc.
- Images: `.product__media img`, `.product-single__photo img`, gallery selectors.
- Caps: 8 images, description 2000 chars in-page evaluate.

If all three fail → product logged as extract error in `scrape_logs.errors`.

---

## Catalog & navigation

| Function | Selectors / behavior |
|----------|----------------------|
| `extractCatalogLinks` | `a[href*="/collections/"]`, `/category/`, `/shop/` — excludes `sort_by`, `filter` query params |
| `extractProductLinks` | `a[href*="/products/"]`, `a[href*="/product/"]` — deduped absolute URLs |
| `scrollToBottom` | Infinite-scroll collection pages (up to 15 scroll passes in crawler) |

**Hard-coded collection seeds** (crawler.ts):

- `/collections/all`
- `/collections/jewelry`
- `/shop`

Add new seeds when hippiecowgirl adds major categories not linked from the homepage nav.

---

## Shopify variants

`extractShopifyVariants(page)` reads:

- `script[type="application/json"][data-product-json]`
- `#ProductJson-product-template`

Maps `variants[]` to `{ name, value, price_modifier }` (price delta vs base variant, cents ÷ 100).

If Shopify JSON has more variants than JSON-LD, crawler prefers Shopify list.

---

## Transform rules (after extract)

Implemented in `transformer.ts` — **not** in extractor:

| Rule | Action |
|------|--------|
| `price < MIN_PRICE_FILTER` (150) | Drop product (`filtered`) |
| `inStock === false` | Drop |
| Name &lt; 3 chars | Drop |
| Price OK | `source_price = raw.price`, `price = raw.price × (1 - DISCOUNT_RATE)` |
| Status | `pending` |
| Images | Max 8 URLs; Shopify CDN size suffix stripped (`_300x300` etc.) |
| Variants | Max 20; default `stock_quantity: 10` |

---

## Image adapter (post-extract)

`src/image/processor.ts`:

1. Download source URL (axios, retries).
2. **Remove competitor watermark** — white composite on bottom 8% (typical hippiecowgirl text strip).
3. **Optional NAJ watermark** — `BRAND_WATERMARK_PATH`, southeast, ~18% width.
4. Generate WebP: thumb 400px, medium 800px, large 1200px.
5. Upload to `product-images` bucket; insert `product_images` row (primary = position 0).

For heavy watermarks, consider AI inpainting later — document in architecture, don’t block MVP.

---

## Adding a second source site

1. Set `TARGET_URL` (or pass URL to `scrape:now` / trigger body).
2. Run **one PDP** and **one collection** locally; inspect logs for strategy used (`JSON-LD` vs `OG+DOM` vs `DOM`).
3. If JSON-LD missing, extend DOM selectors in `extractFromDom` / `extractOpenGraph`.
4. If not Shopify, add variant script selector alongside `data-product-json`.
5. Re-verify `MIN_PRICE_FILTER` still makes sense for that catalog’s price distribution.
6. Legal review per [`compliance.md`](compliance.md).

Do **not** fork a second scraper repo — extend `naj-scraper-service`.

---

## Debugging checklist

| Symptom | Check |
|---------|--------|
| 0 products imported | `MIN_PRICE_FILTER` too high for catalog; extraction failing |
| High `products_filtered` | Expected for sub-$150 SKUs on source site |
| Partial scrape | `scrape_logs.errors` — timeouts → increase `PAGE_TIMEOUT_MS` or add proxy |
| Missing images | Image queue backlog / download 403 — referer or CDN blocking |
| Duplicate slugs | Same title from source; `uniqueSlug` suffixes — review in admin |
| Wrong price | Compare `source_price` on PDP vs scraped JSON-LD offer |

Test command:

```bash
cd naj-scraper-service
npm run scrape:now -- https://hippiecowgirlcouture.com/products/<handle>
```

---

## CSV import (manual)

For bulk manual loads, use [`../assets/csv_import_template.csv`](../assets/csv_import_template.csv) and admin/API — not the Python `import_csv.py` in `legacy/`.

Required fields align with `products` table: name, slug, `source_price`, `price`, USD, `status` usually `pending` until reviewed.
