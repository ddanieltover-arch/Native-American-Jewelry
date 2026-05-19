import { Page } from 'playwright';
import { loadPageScript } from './in-browser/load-script';
import { runInPage } from './page-eval';
import { logger } from '../utils/logger';
import { parsePrice, normalizeText, stripHtml } from '../utils/helpers';
import { resolveUsdPrice, isPlausibleUsdPrice } from '../utils/price';
import { mergeProductImageUrls } from '../utils/product-images';
import {
  extractShopifyProduct,
  fetchShopifyProductJson,
  extractProductGalleryImages,
  extractProductCategoryFromPage,
  normalizeShopifyProductUrl,
  isAllowedProductUrl,
} from './shopify';
import type { RawProduct, RawVariant } from '../types';

export type ExtractOutcome = RawProduct | 'filtered' | 'error';

// ─── Main extraction entry point ──────────────────────────
export async function extractProductData(
  page: Page,
  url:  string,
  categoryHint?: string | null
): Promise<ExtractOutcome> {
  try {
    const canonicalUrl =
      normalizeShopifyProductUrl(url) ??
      normalizeShopifyProductUrl(page.url()) ??
      url;

    const shopify =
      (await fetchShopifyProductJson(canonicalUrl)) ??
      (await extractShopifyProduct(page));
    const jsonLd  = await extractJsonLd(page);
    const ogDom   = await extractOpenGraph(page, url);

    const price = resolveUsdPrice({
      shopifyUsd:      shopify?.priceUsd ?? null,
      shopifyCurrency: shopify?.currency ?? null,
      jsonLdPrice:     jsonLd?.price ?? null,
      jsonLdCurrency:  jsonLd?.currency ?? null,
      domPriceText:    ogDom?.domPriceText ?? null,
    });

    if (price == null || !isPlausibleUsdPrice(price)) {
      logger.debug('Filtered — no valid USD price', {
        url:      canonicalUrl,
        shopify:  shopify?.priceUsd,
        currency: shopify?.currency,
      });
      return 'filtered';
    }

    const name =
      normalizeText(shopify?.name ?? jsonLd?.name ?? ogDom?.name ?? '');
    if (!name || name.length < 3) return 'filtered';

    const galleryDom = (await extractProductGalleryImages(page)) ?? [];
    const images = mergeProductImageUrls([
      ...(shopify?.images ?? []),
      ...galleryDom,
      ...(jsonLd?.images ?? []),
      ...(ogDom?.images ?? []),
    ]);

    const variants =
      shopify?.variants?.length ? shopify.variants : (jsonLd?.variants ?? []);

    const inStock = shopify?.inStock ?? jsonLd?.inStock ?? ogDom?.inStock ?? true;

    const breadcrumbCategory = await extractProductCategoryFromPage(page);
    const categoryName =
      categoryHint?.trim() ||
      shopify?.productType?.trim() ||
      breadcrumbCategory ||
      jsonLd?.categoryName ||
      inferCategoryFromTags(shopify?.tags ?? jsonLd?.tags ?? []) ||
      null;

    logger.debug('Extracted product (USD)', {
      url:      canonicalUrl,
      price,
      name,
      category: categoryName,
      images:   images.length,
    });

    return {
      name,
      description:  shopify?.description ?? jsonLd?.description ?? ogDom?.description ?? null,
      price,
      images,
      variants,
      sku:          shopify?.sku ?? jsonLd?.sku ?? null,
      tags:         [...(shopify?.tags ?? []), ...(jsonLd?.tags ?? [])],
      inStock,
      sourceUrl:    canonicalUrl,
      categoryName,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const stack   = err instanceof Error ? err.stack : undefined;
    logger.error('Extraction error', { url, message, stack });
    return 'error';
  }
}

// ─── Strategy 1: JSON-LD ──────────────────────────────────
async function extractJsonLd(
  page: Page
): Promise<(RawProduct & { currency?: string | null }) | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw = await runInPage<any | null>(page, loadPageScript('extract-json-ld.js'));

    if (!raw) return null;

    // Parse price from offers
    let price: number | null = null;
    let inStock = true;

    let currency: string | null = null;
    if (raw.offers) {
      const offer = Array.isArray(raw.offers) ? raw.offers[0] : raw.offers;
      price    = parsePrice(offer?.price?.toString());
      currency = offer?.priceCurrency?.toString()?.toUpperCase() ?? null;
      inStock  = offer?.availability?.includes('InStock') ?? true;
    }

    if (!price) return null;

    // Parse images
    let images: string[] = [];
    if (raw.image) {
      if (Array.isArray(raw.image)) {
        images = raw.image.map((img: any) =>
          typeof img === 'string' ? img : img.url ?? img.contentUrl ?? ''
        ).filter(Boolean);
      } else if (typeof raw.image === 'string') {
        images = [raw.image];
      } else if (raw.image?.url) {
        images = [raw.image.url];
      }
    }

    // Parse variants from sku/mpn if available
    const variants: RawVariant[] = [];
    if (raw.offers && Array.isArray(raw.offers) && raw.offers.length > 1) {
      raw.offers.forEach((offer: any) => {
        if (offer.name && offer.price) {
          const basePrice = parsePrice(raw.offers[0]?.price?.toString()) ?? price!;
          const offerPrice = parsePrice(offer.price?.toString()) ?? price!;
          variants.push({
            name:  'Option',
            value: offer.name,
            price: offerPrice - basePrice,
          });
        }
      });
    }

    const keywords = raw.keywords;
    const tags =
      typeof keywords === 'string'
        ? keywords.split(',').map((t: string) => t.trim())
        : [];

    return {
      name:         normalizeText(String(raw.name ?? '')),
      description:  raw.description ? stripHtml(String(raw.description)) : null,
      price,
      currency,
      images,
      variants,
      sku:          raw.sku ?? raw.mpn ?? null,
      tags,
      inStock,
      sourceUrl:    page.url(),
      categoryName: raw.category != null ? String(raw.category) : null,
    };
  } catch {
    return null;
  }
}

// ─── Strategy 2: OpenGraph + DOM ─────────────────────────
async function extractOpenGraph(page: Page, _url: string): Promise<{
  name: string | null;
  description: string | null;
  images: string[];
  domPriceText: string | null;
  inStock: boolean;
} | null> {
  try {
    const data = await runInPage<{
      ogTitle: string | null;
      ogDesc: string | null;
      ogImage: string | null;
      ogImages: string[];
      ogPrice: string | null;
      domTitle: string | null;
      domDesc: string | null;
      domPrice: string | null;
      inStock: boolean;
    }>(page, loadPageScript('extract-open-graph.js'));

    const name = data.domTitle ?? data.ogTitle;
    if (!name) return null;

    const images = data.ogImages.length ? data.ogImages : (data.ogImage ? [data.ogImage] : []);
    const domPriceText = data.domPrice ?? data.ogPrice ?? null;

    return {
      name:         normalizeText(name),
      description:  data.domDesc ? stripHtml(data.domDesc) : (data.ogDesc ? stripHtml(data.ogDesc) : null),
      images,
      domPriceText,
      inStock:      data.inStock,
    };
  } catch {
    return null;
  }
}

// ─── Strategy 3: Pure DOM ─────────────────────────────────
async function extractFromDom(page: Page, url: string): Promise<RawProduct | null> {
  try {
    return await page.evaluate((pageUrl: string) => {
      // Price selectors in priority order
      const PRICE_SELECTORS = [
        '.product-price__amount',
        '.price-item--sale',
        '.price-item--regular',
        '[data-product-price]',
        '.product__price',
        '.price .money',
        '.woocommerce-Price-amount',
        '[class*="product"][class*="price"]',
        '.price',
      ];

      // Image selectors
      const IMAGE_SELECTORS = [
        '.product__media img',
        '.product-single__photo img',
        '.product-photo img',
        '[data-product-featured-image]',
        '.product-image img',
        '.gallery img',
        '[class*="product"][class*="image"] img',
        '[class*="product"] img',
      ];

      function getText(selector: string): string | null {
        return document.querySelector(selector)?.textContent?.trim() ?? null;
      }

      function parseNumber(str: string | null | undefined): number | null {
        if (!str) return null;
        const n = parseFloat(str.replace(/[^\d.]/g, ''));
        return isNaN(n) ? null : n;
      }

      // Get price
      let priceRaw: string | null = null;
      for (const sel of PRICE_SELECTORS) {
        const el = document.querySelector(sel);
        if (el) {
          priceRaw = el.textContent?.trim() ?? el.getAttribute('data-price') ?? null;
          if (priceRaw && priceRaw.match(/\d/)) break;
        }
      }

      // Get images
      const images: string[] = [];
      for (const sel of IMAGE_SELECTORS) {
        const els = document.querySelectorAll<HTMLImageElement>(sel);
        els.forEach((img) => {
          const src = img.getAttribute('data-src') ?? img.getAttribute('data-original') ?? img.src;
          if (src && src.startsWith('http') && !images.includes(src)) {
            images.push(src);
          }
        });
        if (images.length > 0) break;
      }

      const name  = document.querySelector('h1')?.textContent?.trim() ?? null;
      const price = parseNumber(priceRaw);

      if (!name || !price) return null;

      const descEl =
        document.querySelector('[class*="description"]') ??
        document.querySelector('[class*="product-body"]') ??
        document.querySelector('article');

      return {
        name,
        description: descEl?.textContent?.trim()?.slice(0, 2000) ?? null,
        price,
        images: images.slice(0, 8),
        variants: [],
        sku:     null,
        tags:    Array.from(document.querySelectorAll('[class*="tag"] a, .tags a'))
                   .map((el) => el.textContent?.trim() ?? '')
                   .filter(Boolean),
        inStock: !document.querySelector('.sold-out, .out-of-stock'),
        sourceUrl: pageUrl,
        categoryName: document.querySelector('[class*="breadcrumb"] li:nth-last-child(2)')
                        ?.textContent?.trim() ?? null,
      };
    }, url);
  } catch {
    return null;
  }
}

// ─── Extract all product links from a catalog page ────────
export async function extractProductLinks(
  page:    Page,
  baseUrl: string
): Promise<string[]> {
  const links = await page.evaluate((base: string) => {
    const anchors = Array.from(document.querySelectorAll<HTMLAnchorElement>(
      'a[href*="/products/"]'
    ));
    return [...new Set(anchors.map((a) => {
      try { return new URL(a.href, base).href; } catch { return ''; }
    }))].filter(Boolean);
  }, baseUrl);

  const origin = new URL(baseUrl).origin;
  const normalized = new Set<string>();

  for (const link of links) {
    const canon = normalizeShopifyProductUrl(link, origin);
    if (canon && isAllowedProductUrl(canon, origin)) {
      normalized.add(canon);
    }
  }

  return [...normalized];
}

/** Map Shopify product tags to NAJ category names when they match known jewelry types */
function inferCategoryFromTags(tags: string[] | string | undefined): string | null {
  const list = Array.isArray(tags)
    ? tags
    : typeof tags === 'string'
      ? tags.split(',').map((t) => t.trim()).filter(Boolean)
      : [];
  const joined = list.join(' ').toLowerCase();
  const rules: Array<[RegExp, string]> = [
    [/necklace|squash blossom|lariat|choker/i, 'Necklaces'],
    [/\bring\b|cuff ring|band\b/i, 'Rings'],
    [/bracelet|bangle/i, 'Bracelets'],
    [/earring|hoop|stud/i, 'Earrings'],
    [/concho belt|belt\b/i, 'Concho Belts'],
    [/\bcuff\b/i, 'Cuffs'],
    [/pendant|pin\b/i, 'Pendants'],
    [/bag|purse|clutch/i, 'Bags'],
    [/hat\b|cap\b/i, 'Hats'],
    [/jacket|coat|vest|apparel/i, 'Apparel'],
    [/strand|heishi/i, 'Strands'],
  ];
  for (const [re, label] of rules) {
    if (re.test(joined)) return label;
  }
  return null;
}

// ─── Extract category/collection navigation links ─────────
export async function extractCatalogLinks(
  page:    Page,
  baseUrl: string
): Promise<string[]> {
  const links = await page.evaluate((base: string) => {
    const selectors = [
      'a[href*="/collections/"]',
      'a[href*="/category/"]',
      'a[href*="/shop/"]',
    ];

    const found: string[] = [];
    for (const sel of selectors) {
      const anchors = document.querySelectorAll<HTMLAnchorElement>(sel);
      anchors.forEach((a) => {
        try { found.push(new URL(a.href, base).href); } catch {}
      });
    }
    return [...new Set(found)];
  }, baseUrl);

  return links.filter((l) => !l.includes('sort_by') && !l.includes('filter'));
}

// ─── Extract variants from a Shopify-style product page ──
export async function extractShopifyVariants(page: Page): Promise<RawVariant[]> {
  return page.evaluate(() => {
    // Shopify stores variants in window.ShopifyAnalytics or a JSON blob
    const scriptEl = document.querySelector<HTMLScriptElement>(
      'script[type="application/json"][data-product-json], #ProductJson-product-template'
    );
    if (!scriptEl?.textContent) return [];

    try {
      const data = JSON.parse(scriptEl.textContent);
      const options: string[] = data.options ?? [];
      const variants: any[] = data.variants ?? [];

      const basePrice = variants[0]?.price ? variants[0].price / 100 : 0;

      return variants.slice(0, 20).map((v: any) => ({
        name:  options[0] ?? 'Option',
        value: v.option1 ?? v.title,
        price: v.price ? (v.price / 100) - basePrice : null,
      }));
    } catch {
      return [];
    }
  });
}
