import { Page } from 'playwright';
import type { RawVariant } from '../types';

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

/**
 * Primary price source: Shopify product JSON (prices in cents, store base currency).
 * Prefer when currency is USD or price is in a sane USD range after /100.
 */
export async function extractShopifyProduct(page: Page): Promise<ShopifyProductData | null> {
  return page.evaluate(() => {
    const win = window as any;
    const activeCurrency: string | null =
      win.Shopify?.currency?.active ??
      win.Shopify?.Checkout?.currency ??
      document.querySelector('meta[property="og:price:currency"]')?.getAttribute('content') ??
      null;

    const scriptEl = document.querySelector<HTMLScriptElement>(
      'script[type="application/json"][data-product-json], #ProductJson-product-template, script[id*="ProductJson"]'
    );

    let data: any = null;
    if (scriptEl?.textContent) {
      try {
        data = JSON.parse(scriptEl.textContent);
      } catch {
        /* ignore */
      }
    }

    if (!data && win.meta?.product) {
      data = win.meta.product;
    }

    if (!data) return null;

    const variants: any[] = data.variants ?? [];
    const v0 = variants.find((v) => v.available !== false) ?? variants[0];
    if (!v0?.price && v0?.price !== 0) return null;

    // Shopify stores price in cents (integer)
    const cents = typeof v0.price === 'string' ? parseInt(v0.price, 10) : v0.price;
    const priceUsd = cents / 100;

    const compareCents = v0.compare_at_price
      ? typeof v0.compare_at_price === 'string'
        ? parseInt(v0.compare_at_price, 10)
        : v0.compare_at_price
      : null;

    const images: string[] = [];
    const pushImg = (src: string | null | undefined) => {
      if (!src || typeof src !== 'string') return;
      const full = src.startsWith('//') ? `https:${src}` : src;
      if (full.startsWith('http') && !images.includes(full)) images.push(full);
    };

    if (Array.isArray(data.media)) {
      data.media.forEach((m: any) => {
        pushImg(m?.preview_image?.src ?? m?.src ?? m?.preview?.image?.src);
      });
    }
    if (Array.isArray(data.images)) {
      data.images.forEach((img: string) => pushImg(img));
    }
    pushImg(data.featured_image);
    if (data.featured_media?.preview?.image?.src) {
      pushImg(data.featured_media.preview.image.src);
    }

    const options: string[] = data.options ?? [];
    const baseCents = cents;
    const variantList = variants.slice(0, 20).map((v: any) => {
      const vc = typeof v.price === 'string' ? parseInt(v.price, 10) : v.price;
      return {
        name:  options[0] ?? 'Option',
        value: v.option1 ?? v.title ?? 'Default',
        price: vc ? vc / 100 - baseCents / 100 : 0,
      };
    });

    const descHtml = data.description ?? data.body_html ?? null;
    const description = descHtml
      ? String(descHtml).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 3000)
      : null;

    const tagsRaw = data.tags ?? '';
    const tags =
      typeof tagsRaw === 'string'
        ? tagsRaw.split(',').map((t: string) => t.trim()).filter(Boolean)
        : Array.isArray(tagsRaw)
          ? tagsRaw.map(String)
          : [];

    return {
      name:         data.title ?? null,
      description,
      priceUsd,
      compareAtUsd: compareCents ? compareCents / 100 : null,
      currency:     (activeCurrency ?? 'USD').toUpperCase(),
      sku:          v0.sku ?? data.id?.toString() ?? null,
      productType:  data.type ? String(data.type).trim() : null,
      tags,
      images,
      variants:     variantList,
      inStock:      v0.available !== false,
    };
  });
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
  return page.evaluate(() => {
    const selectors = [
      'media-gallery img',
      '.product__media-item img',
      '.product__media img',
      '.product-media img',
      '.product-media-container img',
      '[data-product-media] img',
      '.product-gallery img',
      '.product-single__photo img',
      '.product__modal-opener img',
      '.thumbnail-list img',
      '.product__thumbs img',
      'slideshow-component img',
      '.product-image-main img',
    ];

    const found: string[] = [];
    const push = (src: string | null | undefined) => {
      if (!src) return;
      let url = src;
      if (url.startsWith('//')) url = `https:${url}`;
      if (!url.startsWith('http')) return;
      if (/logo|icon|sprite|badge/i.test(url)) return;
      const size = url.match(/_(\d+)x(\d+)/i);
      if (size && parseInt(size[1], 10) < 80) return;
      if (!found.includes(url)) found.push(url);
    };

    for (const sel of selectors) {
      document.querySelectorAll<HTMLImageElement>(sel).forEach((img) => {
        push(
          img.getAttribute('data-src') ??
            img.getAttribute('data-srcset')?.split(/\s+/)[0] ??
            img.currentSrc ??
            img.src
        );
      });
    }

    document.querySelectorAll<HTMLAnchorElement>('a[href*="/cdn/shop/products/"]').forEach((a) => {
      push(a.href);
    });

    return found;
  });
}

/** Breadcrumb / product-type fallback on PDP */
export async function extractProductCategoryFromPage(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    const crumbs = Array.from(
      document.querySelectorAll(
        'nav[aria-label*="breadcrumb"] a, .breadcrumb a, [class*="breadcrumb"] a'
      )
    )
      .map((a) => a.textContent?.trim() ?? '')
      .filter((t) => t && !/home|shop|products?/i.test(t));

    if (crumbs.length >= 1) {
      const last = crumbs[crumbs.length - 1];
      if (last && last.length > 1 && last.length < 80) return last;
    }

    const typeEl = document.querySelector('[class*="product-type"], .product__type');
    const typeText = typeEl?.textContent?.trim();
    if (typeText && typeText.length > 1) return typeText;

    return null;
  });
}
