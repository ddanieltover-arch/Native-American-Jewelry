import { config } from '../config';
import { logger } from '../utils/logger';
import { applyDiscount, uniqueSlug, normalizeText } from '../utils/helpers';
import type { RawProduct, TransformedProduct } from '../types';

// ─── Transform a single raw product ───────────────────────
export function transformProduct(raw: RawProduct): TransformedProduct | null {
  // ── Price filter: skip anything below MIN_PRICE ──────────
  if (!raw.price || raw.price < config.MIN_PRICE_FILTER) {
    logger.debug('Filtered out — price below minimum', {
      name:  raw.name,
      price: raw.price,
      min:   config.MIN_PRICE_FILTER,
    });
    return null;
  }

  // ── Skip if marked out of stock ──────────────────────────
  if (raw.inStock === false) {
    logger.debug('Filtered out — out of stock', { name: raw.name });
    return null;
  }

  // ── Skip if name is empty / garbage ──────────────────────
  const name = normalizeText(raw.name);
  if (!name || name.length < 3) {
    logger.debug('Filtered out — invalid name', { raw: raw.name });
    return null;
  }

  // ── Apply 5% discount (always USD, no conversion) ────────
  const discountedPrice = applyDiscount(raw.price, config.DISCOUNT_RATE);

  // ── Transform variants ───────────────────────────────────
  const variants = raw.variants
    .filter((v) => v.name && v.value)
    .map((v) => ({
      name:           normalizeText(v.name),
      value:          normalizeText(v.value),
      price_modifier: v.price ?? 0,
      stock_quantity: 10, // default; updated manually or via future stock sync
    }))
    .slice(0, 20);

  // ── Normalize tags ────────────────────────────────────────
  const tags = raw.tags
    .map((t) => t.toLowerCase().trim())
    .filter((t) => t.length > 1 && t.length < 60)
    .slice(0, 15);

  // ── Normalize image URLs ──────────────────────────────────
  const imageUrls = raw.images
    .filter((url) => url && url.startsWith('http'))
    .map((url) => cleanImageUrl(url))
    .filter(Boolean)
    .slice(0, 8) as string[];

  logger.debug('Transformed product', {
    name,
    sourcePrice:   raw.price,
    storedPrice:   discountedPrice,
    images:        imageUrls.length,
    variants:      variants.length,
  });

  return {
    name,
    slug:          uniqueSlug(name),
    description:   raw.description ? cleanDescription(raw.description) : null,
    source_price:  raw.price,
    price:         discountedPrice,
    sku:           raw.sku ?? null,
    tags,
    in_stock:      true,
    source_url:    raw.sourceUrl,
    status:        'pending',
    category_name: raw.categoryName ?? null,
    image_urls:    imageUrls,
    variants,
  };
}

// ─── Clean image URL (remove query params, get full-size) ─
function cleanImageUrl(url: string): string | null {
  try {
    const parsed = new URL(url);

    // Shopify CDN: remove size suffix like _300x300, _1024x1024
    parsed.pathname = parsed.pathname.replace(/_\d+x\d*\.[a-z]+(\.[a-z]+)?$/, (match) => {
      const ext = match.split('.').pop();
      return `.${ext}`;
    });

    // Remove common tracking params
    ['v', 'width', 'height', 'crop', 'quality', 'format'].forEach((p) =>
      parsed.searchParams.delete(p)
    );

    return parsed.href;
  } catch {
    return null;
  }
}

// ─── Clean description text ───────────────────────────────
function cleanDescription(raw: string): string {
  return raw
    .replace(/\s+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, 3000);
}

// ─── Batch transform: returns [transformed[], filtered count]
export function transformBatch(raws: RawProduct[]): {
  products:        TransformedProduct[];
  filteredCount:   number;
} {
  const products: TransformedProduct[] = [];
  let filteredCount = 0;

  for (const raw of raws) {
    const result = transformProduct(raw);
    if (result) {
      products.push(result);
    } else {
      filteredCount++;
    }
  }

  return { products, filteredCount };
}
