import { config } from '../config';
import { logger } from '../utils/logger';
import { applyDiscount, makeSlug, normalizeText } from '../utils/helpers';
import { mergeProductImageUrls } from '../utils/product-images';
import { isPlausibleUsdPrice } from '../utils/price';
import { productHandleFromUrl } from './shopify';
import type { RawProduct, TransformedProduct } from '../types';

// ─── Transform a single raw product ───────────────────────
export function transformProduct(raw: RawProduct): TransformedProduct | null {
  // ── Price filter: skip anything below MIN_PRICE ──────────
  if (!raw.price || !isPlausibleUsdPrice(raw.price)) {
    logger.debug('Filtered out — price below minimum or invalid USD', {
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

  // ── Gallery images (max 2 by default) ─────────────────────
  const imageUrls = mergeProductImageUrls(raw.images);

  logger.debug('Transformed product', {
    name,
    sourcePrice:   raw.price,
    storedPrice:   discountedPrice,
    images:        imageUrls.length,
    variants:      variants.length,
  });

  const handle = productHandleFromUrl(raw.sourceUrl);
  const slug   = handle ? makeSlug(handle) : makeSlug(name);

  return {
    name,
    slug,
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
