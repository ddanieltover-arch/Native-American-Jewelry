import { Page } from 'playwright';
import type { RawVariant } from '../types';
import { runInPage } from './page-eval';
import { loadPageScript } from './in-browser/load-script';

export interface ShopifyProductData {
  name:         string | null;
  description:  string | null;
  priceUsd:     number | null;
  compareAtUsd: number | null;
  currency:     string | null;
  sku:          string | null;
  productType:  string | null;
  tags:         string[];
  images:       string[];
  variants:     RawVariant[];
  inStock:      boolean;
}

export interface ShopifyCollectionMeta {
  slug:        string;
  name:        string;
  description: string | null;
  sourceUrl:   string;
}

const SKIP_COLLECTION_SLUGS = new Set([
  'all',
  'frontpage',
  'vendors',
  'types',
]);

export function collectionHandleFromUrl(url: string): string | null {
  try {
    const match = new URL(url).pathname.match(/\/collections\/([^/?#]+)/i);
    if (!match) return null;
    const slug = match[1].toLowerCase();
    if (SKIP_COLLECTION_SLUGS.has(slug)) return null;
    return slug;
  } catch {
    return null;
  }
}

/** "turquoise-necklaces" → "Turquoise Necklaces" */
export function collectionSlugToDisplayName(slug: string): string {
  return slug
    .split('-')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function isCollectionUrl(url: string): boolean {
  return collectionHandleFromUrl(url) !== null;
}

/** Canonical PDP URL: origin + /products/{handle} */
export function normalizeShopifyProductUrl(url: string, defaultOrigin?: string): string | null {
  try {
    const u = new URL(url, defaultOrigin ?? 'https://hippiecowgirlcouture.com');
    const match = u.pathname.match(/\/products\/([^/?#]+)/i);
    if (!match) return null;
    const handle = match[1].toLowerCase();
    if (handle.includes('share') || handle === '') return null;
    return `${u.origin.replace(/\/$/, '')}/products/${handle}`;
  } catch {
    return null;
  }
}

export function productHandleFromUrl(url: string): string | null {
  try {
    const match = new URL(url).pathname.match(/\/products\/([^/?#]+)/i);
    return match ? match[1].toLowerCase() : null;
  } catch {
    return null;
  }
}

export function isAllowedProductUrl(url: string, targetOrigin: string): boolean {
  try {
    const u = new URL(url);
    const target = new URL(targetOrigin);
    if (u.origin !== target.origin) return false;
    if (!/\/products\/[^/]+/i.test(u.pathname)) return false;
    const blockedHosts = ['facebook.com', 'twitter.com', 'pinterest.com', 'linkedin.com'];
    if (blockedHosts.some((h) => u.hostname.includes(h))) return false;
    return true;
  } catch {
    return false;
  }
}

/** Force USD presentation on Shopify storefronts */
export function withUsdCurrency(url: string): string {
  const u = new URL(url);
  u.searchParams.set('currency', 'USD');
  return u.href;
}

function parseShopifyVariantPrice(raw: string | number): number | null {
  if (typeof raw === 'number') {
    return raw >= 1000 ? raw / 100 : raw;
  }
  const text = String(raw).trim();
  if (!text) return null;
  if (text.includes('.')) {
    const dollars = parseFloat(text.replace(/,/g, ''));
    return Number.isFinite(dollars) ? dollars : null;
  }
  const cents = parseInt(text, 10);
  return Number.isFinite(cents) ? cents / 100 : null;
}

/** Shopify public product JSON — prices in dollars as strings (e.g. "396.00"). */
export async function fetchShopifyProductJson(
  productUrl: string
): Promise<ShopifyProductData | null> {
  const handle = productHandleFromUrl(productUrl);
  if (!handle) return null;

  const origin = new URL(productUrl).origin.replace(/\/$/, '');
  const res = await fetch(
    `${origin}/products/${handle}.json?currency=USD`,
    { headers: { Accept: 'application/json', 'Accept-Language': 'en-US' } }
  );
  if (!res.ok) return null;

  const body = (await res.json()) as { product?: Record<string, unknown> };
  const data = body.product;
  if (!data) return null;

  const variants = (data.variants as Array<Record<string, unknown>>) ?? [];
  const v0 =
    variants.find((v) => v.available !== false) ?? variants[0];
  if (!v0) return null;

  const variantCurrency = String(
    v0.price_currency ?? 'USD'
  ).toUpperCase();
  if (variantCurrency !== 'USD') return null;

  const priceUsd = parseShopifyVariantPrice(
    v0.price as string | number
  );
  if (priceUsd == null) return null;

  const compareUsd = v0.compare_at_price
    ? parseShopifyVariantPrice(v0.compare_at_price as string | number)
    : null;

  const images: string[] = [];
  const imgList = (data.images as Array<{ src?: string }>) ?? [];
  for (const img of imgList) {
    if (img.src && !images.includes(img.src)) images.push(img.src);
  }

  const options = (data.options as Array<{ name?: string }>) ?? [];
  const variantList: RawVariant[] = variants.slice(0, 20).map((v) => {
    const vp = parseShopifyVariantPrice(v.price as string | number) ?? priceUsd;
    return {
      name:  options[0]?.name ?? 'Option',
      value: String(v.option1 ?? v.title ?? 'Default'),
      price: vp - priceUsd,
    };
  });

  const descHtml = (data.body_html ?? data.description) as string | undefined;
  const description = descHtml
    ? descHtml.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 3000)
    : null;

  const tagsRaw = data.tags;
  const tags =
    typeof tagsRaw === 'string'
      ? tagsRaw.split(',').map((t) => t.trim()).filter(Boolean)
      : Array.isArray(tagsRaw)
        ? tagsRaw.map(String)
        : [];

  return {
    name:         String(data.title ?? ''),
    description,
    priceUsd,
    compareAtUsd: compareUsd,
    currency:     'USD',
    sku:          v0.sku != null ? String(v0.sku) : null,
    productType:  data.product_type ? String(data.product_type).trim() : null,
    tags,
    images,
    variants:     variantList,
    inStock:      v0.available !== false,
  };
}

/**
 * DOM / inline JSON fallback (prices in cents in theme scripts).
 */
export async function extractShopifyProduct(page: Page): Promise<ShopifyProductData | null> {
  return runInPage<ShopifyProductData | null>(
    page,
    loadPageScript('extract-shopify-product.js')
  );
}

/** Collection page title + description (for category rows in Supabase) */
export async function extractCollectionPageMeta(
  page: Page,
  collectionUrl: string
): Promise<ShopifyCollectionMeta | null> {
  const slug = collectionHandleFromUrl(collectionUrl);
  if (!slug) return null;

  const data = await page.evaluate(() => {
    const h1 =
      document.querySelector('h1.collection-hero__title')?.textContent?.trim() ??
      document.querySelector('.collection-hero h1')?.textContent?.trim() ??
      document.querySelector('h1')?.textContent?.trim() ??
      null;

    const desc =
      document.querySelector('.collection-hero__description')?.textContent?.trim() ??
      document.querySelector('[class*="collection"][class*="description"]')?.textContent?.trim() ??
      document.querySelector('.rte')?.textContent?.trim() ??
      null;

    return { h1, desc: desc ? desc.slice(0, 2000) : null };
  });

  const name = data.h1 && data.h1.length > 1 ? data.h1 : collectionSlugToDisplayName(slug);

  return {
    slug,
    name,
    description: data.desc,
    sourceUrl:   collectionUrl.split('?')[0].replace(/\/$/, ''),
  };
}

/**
 * Product gallery from DOM (thumbnails, media carousel) — supplements JSON.
 */
export async function extractProductGalleryImages(page: Page): Promise<string[]> {
  return runInPage<string[]>(page, loadPageScript('extract-gallery-images.js'));
}

/** Breadcrumb / product-type fallback on PDP */
export async function extractProductCategoryFromPage(page: Page): Promise<string | null> {
  return runInPage<string | null>(page, loadPageScript('extract-product-category.js'));
}
