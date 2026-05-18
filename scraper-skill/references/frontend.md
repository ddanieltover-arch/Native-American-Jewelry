# Storefront & Catalog UX — NAJ

How scraped catalog data surfaces on **`naj-storefront`** after admin approval. Scraper agents rarely edit UI, but must understand **USD pricing**, **mobile layout**, and **what customers see**.

---

## Brand positioning (customer-facing)

- **Brand**: Native American Jewelry
- **Catalog**: Authentic-style jewelry; scraped reference inventory from hippiecowgirlcouture.com (internal only — never expose source branding on product images after processing).
- **Price floor**: Only products ≥ **$150** are imported; storefront shows **discounted** `price` (5% below source).
- **Payments**: Manual methods only (Zelle, Cash App, etc.) — checkout is not scraper scope.

---

## Product visibility

| `products.status` | Storefront (anon) | Admin |
|-------------------|-------------------|-------|
| `pending` | Hidden | Approval queue |
| `active` | Visible on `/shop`, homepage, search | Full CRUD |
| `archived` | Hidden | Historical |

RLS and API routes filter `status = active` for public catalog.

Flow: scrape → **pending** → admin approve → **active** → appears in `fetch('/api/products')`.

---

## USD pricing display

**Scraper stores:**

- `source_price` — original scraped USD
- `price` — `source_price × 0.95`

**Storefront** (`naj-storefront/src/lib/utils.ts`):

```typescript
export function formatPrice(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}
```

**ProductCard / ProductDetail:**

- Show `formatPrice(product.price)` as sale price.
- Optional strike-through `formatPrice(product.source_price)` when `source_price > price` (communicates 5% savings).

Do **not** add EUR conversion or `fx_rates` — NAJ is US-only pricing.

---

## Mobile-first layout

Storefront is designed **mobile-first**:

| Area | Mobile behavior |
|------|-----------------|
| Header | Hamburger nav, compact cart |
| Shop grid | 2 columns on small screens |
| Product PDP | Stacked gallery + sticky add-to-cart on larger breakpoints |
| Cart drawer | Full-height sheet from right |
| Sales popup | `fixed bottom-24` on mobile (clears tab bar), `md:bottom-8` on desktop |
| Checkout | Single-column form, large tap targets |

When adding catalog features, test at 375px width first.

---

## Sales notifications (US)

`SalesNotification.tsx` — social proof toasts:

- Loads active products from `/api/products?per_page=50`.
- Random **US state** from `USA_STATES` in `utils.ts` (not EU cities).
- Copy pattern: “Someone in {state} purchased {productName}”.
- Interval: 30–90s after 8s initial delay.

Scraper/import changes affect this component only after products are **active** and named sensibly.

---

## Images on storefront

- Primary image from `product_images` where `is_primary = true` (set by scraper for position 0).
- Storage URLs point to Supabase `product-images` bucket (WebP).
- Fallback: gradient placeholder via `getProductGradient(slug)` when image missing or still processing.

If PDP shows placeholder after approve:

1. Check BullMQ image queue completed.
2. Check `product_images` rows for that `product_id`.
3. Re-run image job or manual upload in admin.

---

## SEO & discovery

- `sitemap.ts` — active product slugs from Supabase.
- Product pages: server-rendered metadata from product name/description.
- Only **active** products should appear in sitemap (matches RLS).

Pending products must not leak to sitemap or public API.

---

## Scale considerations (100k+ products)

| Surface | Note |
|---------|------|
| `/shop` | Paginate (`per_page`); avoid loading full catalog client-side |
| Search | API-backed; index-friendly filters on category, price |
| Homepage | Curated subsets (featured, new arrivals) — don’t query 100k rows |
| Sales notification | Already caps fetch at 50 products |

Scraper throughput does not require storefront changes if pagination APIs stay bounded.

---

## Files to touch (rare)

| File | When |
|------|------|
| `src/lib/utils.ts` | `formatPrice`, `applyDiscount`, `USA_STATES` |
| `src/components/store/ProductCard.tsx` | Price display, grid |
| `src/components/store/ProductDetail.tsx` | Variant price modifiers |
| `src/components/store/SalesNotification.tsx` | Social proof copy/states |
| `src/app/api/products/route.ts` | Public catalog filters |

Full UI spec: [`../../native-american-jewelry-architecture.md`](../../native-american-jewelry-architecture.md).
