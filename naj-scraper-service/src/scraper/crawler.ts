import pLimit from 'p-limit';
import { createStealthContext, createPage, safeGoto, scrollToBottom, closeBrowser } from './browser';
import { extractProductData, extractProductLinks, extractCatalogLinks } from './extractor';
import {
  collectionHandleFromUrl,
  collectionSlugToDisplayName,
  extractCollectionPageMeta,
  isCollectionUrl,
  normalizeShopifyProductUrl,
  withUsdCurrency,
  type ShopifyCollectionMeta,
} from './shopify';
import { transformProduct } from './transformer';
import {
  saveProduct,
  saveVariants,
  saveProductImage,
  createScrapeLog,
  completeScrapeLog,
  resolveCategoryId,
  syncCollectionCategories,
} from '../db/supabase';
import { imageQueue } from '../queues';
import { processImage } from '../image/processor';
import { logger, createJobLogger } from '../utils/logger';
import { throttleDelay, generateJobId } from '../utils/helpers';
import { config } from '../config';
import type { RawProduct, ScrapeError, ScrapeResult, TransformedProduct } from '../types';

type ProductCategoryRef = { name: string; slug: string };

// ─── Main crawl entry point ───────────────────────────────
export async function crawlSite(
  targetUrl: string,
  jobId:     string
): Promise<ScrapeResult> {
  const jLog    = createJobLogger(jobId);
  const errors:  ScrapeError[] = [];
  const startMs = Date.now();

  let totalFound    = 0;
  let totalFiltered = 0;
  let totalImported = 0;
  let totalImgJobs  = 0;

  await createScrapeLog(jobId, targetUrl);
  jLog.info(`Starting crawl`, { target: targetUrl });

  const context = await createStealthContext();

  try {
    // Seed Shopify session with USD (avoids ₦ / regional pricing in product JSON)
    const seedPage = await createPage(context);
    await safeGoto(seedPage, withUsdCurrency(targetUrl));
    await seedPage.close();

    // ── Step 1: Discover catalog pages ──────────────────────
    const catalogUrls = await discoverCatalogUrls(context, targetUrl, jobId);
    jLog.info(`Found ${catalogUrls.length} catalog pages`);

    const collectionUrls = [
      ...new Set(
        catalogUrls.filter((u) => isCollectionUrl(u) && !u.includes('/collections/all'))
      ),
    ];

    // ── Step 2: Sync Shopify collections → categories + map products to collections
    const { categoryByProductUrl, collectionsSynced } = await buildProductCategoryMap(
      context,
      targetUrl,
      collectionUrls,
      jobId
    );
    jLog.info(`Synced ${collectionsSynced} categories; mapped ${categoryByProductUrl.size} product→category links`);

    const allUrls = [
      ...new Set([
        `${targetUrl}/collections/all`,
        `${targetUrl}/shop`,
        ...collectionUrls,
      ]),
    ];

    // ── Step 3: Collect all product URLs (ensure full catalog coverage)
    const allProductUrls = new Set<string>(categoryByProductUrl.keys());
    const pageLimiter = pLimit(1);

    await Promise.all(
      allUrls.map((catUrl) =>
        pageLimiter(async () => {
          const links = await collectProductUrlsFromCatalog(context, catUrl, jobId);
          links.forEach((l) => allProductUrls.add(l));
          await throttleDelay();
        })
      )
    );

    jLog.info(`Discovered ${allProductUrls.size} unique product URLs`);

    let productUrls = Array.from(allProductUrls);
    if (config.MAX_PRODUCTS_PER_RUN > 0 && productUrls.length > config.MAX_PRODUCTS_PER_RUN) {
      productUrls = productUrls.slice(0, config.MAX_PRODUCTS_PER_RUN);
      jLog.info(`Capped to MAX_PRODUCTS_PER_RUN=${config.MAX_PRODUCTS_PER_RUN}`);
    }

    // ── Step 4: Scrape each product page ────────────────────
    const productLimiter = pLimit(config.SCRAPE_CONCURRENCY);

    await Promise.all(
      productUrls.map((productUrl) =>
        productLimiter(async () => {
          try {
            const categoryRef = categoryByProductUrl.get(
              normalizeShopifyProductUrl(productUrl, targetUrl) ?? productUrl
            );
            const result = await scrapeProductPage(context, productUrl, jobId, categoryRef);

            if (result === 'filtered') {
              totalFiltered++;
            } else if (result === 'error') {
              errors.push({ url: productUrl, message: 'Extraction failed', stage: 'extract' });
            } else if (result) {
              totalFound++;
              totalImported += result.saved ? 1 : 0;
              totalImgJobs  += result.imageJobsQueued;
            }

            await throttleDelay();
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            errors.push({ url: productUrl, message: msg, stage: 'crawl' });
            jLog.error(`Failed to scrape product`, { url: productUrl, err });
          }
        })
      )
    );

  } finally {
    await context.close();
  }

  const durationMs  = Date.now() - startMs;
  const finalStatus = errors.length > totalImported ? 'partial' : 'completed';

  await completeScrapeLog(jobId, {
    productsFound:    totalFound,
    productsFiltered: totalFiltered,
    productsImported: totalImported,
    errors,
    durationMs,
    status: finalStatus,
  });

  const result: ScrapeResult = {
    jobId,
    totalFound,
    totalFiltered,
    totalImported,
    totalImageJobs: totalImgJobs,
    errors,
    durationMs,
    completedAt: new Date().toISOString(),
  };

  jLog.info('Crawl complete', {
    found:    totalFound,
    filtered: totalFiltered,
    imported: totalImported,
    imgJobs:  totalImgJobs,
    errors:   errors.length,
    duration: `${(durationMs / 1000).toFixed(1)}s`,
  });

  return result;
}

/**
 * Visit each /collections/{slug} page, upsert categories in Supabase,
 * and record which products belong to which collection.
 */
async function buildProductCategoryMap(
  context:         any,
  targetUrl:       string,
  collectionUrls:  string[],
  jobId:           string
): Promise<{ categoryByProductUrl: Map<string, ProductCategoryRef>; collectionsSynced: number }> {
  const jLog = createJobLogger(jobId);
  const categoryByProductUrl = new Map<string, ProductCategoryRef>();
  const collectionMetas: ShopifyCollectionMeta[] = [];

  const pageLimiter = pLimit(1);

  await Promise.all(
    collectionUrls.map((collectionUrl) =>
      pageLimiter(async () => {
        const slug = collectionHandleFromUrl(collectionUrl);
        if (!slug) return;

        const page = await createPage(context);
        try {
          const ok = await safeGoto(page, withUsdCurrency(collectionUrl));
          if (!ok) return;

          const meta =
            (await extractCollectionPageMeta(page, collectionUrl)) ?? {
              slug,
              name:        collectionSlugToDisplayName(slug),
              description: null,
              sourceUrl:   collectionUrl.split('?')[0],
            };

          collectionMetas.push(meta);

          const productLinks = await collectShopifyCollectionProducts(
            context,
            meta.sourceUrl,
            jobId
          );

          for (const productUrl of productLinks) {
            const canonical =
              normalizeShopifyProductUrl(productUrl, targetUrl) ?? productUrl;
            if (!categoryByProductUrl.has(canonical)) {
              categoryByProductUrl.set(canonical, {
                name: meta.name,
                slug: meta.slug,
              });
            }
          }

          jLog.debug(`Collection "${meta.name}": ${productLinks.length} products`);
        } finally {
          await page.close();
        }
        await throttleDelay();
      })
    )
  );

  const uniqueMetas = [...new Map(collectionMetas.map((c) => [c.slug, c])).values()];
  const collectionsSynced = await syncCollectionCategories(
    uniqueMetas.map((c) => ({
      name:        c.name,
      slug:        c.slug,
      description: c.description,
    }))
  );

  return { categoryByProductUrl, collectionsSynced };
}

// ─── Discover category / collection URLs ─────────────────
async function discoverCatalogUrls(
  context:   any,
  targetUrl: string,
  jobId:     string
): Promise<string[]> {
  const jLog = createJobLogger(jobId);
  const page = await createPage(context);

  try {
    const ok = await safeGoto(page, targetUrl);
    if (!ok) return [];

    const links = await extractCatalogLinks(page, targetUrl);
    jLog.debug(`Found ${links.length} catalog links on homepage`);
    return links.filter((l) => l.startsWith(targetUrl));
  } catch (err) {
    jLog.error('Failed to discover catalog URLs', { err });
    return [];
  } finally {
    await page.close();
  }
}

// ─── Collect product URLs (Shopify collections use ?page= pagination) ──
async function collectProductUrlsFromCatalog(
  context: any,
  url:     string,
  jobId:   string
): Promise<string[]> {
  const normalized = url.split('?')[0].replace(/\/$/, '');
  if (normalized.includes('/collections/')) {
    return collectShopifyCollectionProducts(context, normalized, jobId);
  }
  return collectProductUrlsFromPage(context, url, jobId);
}

/** Walk Shopify collection pages until no new /products/ links appear */
async function collectShopifyCollectionProducts(
  context: any,
  collectionUrl: string,
  jobId: string
): Promise<string[]> {
  const jLog = createJobLogger(jobId);
  const allLinks = new Set<string>();
  let pageNum = 1;
  let unchangedPages = 0;
  const maxPages = 250;

  while (pageNum <= maxPages && unchangedPages < 2) {
    const pageUrl = pageNum === 1 ? collectionUrl : `${collectionUrl}?page=${pageNum}`;
    const before = allLinks.size;
    const links = await collectProductUrlsFromPage(context, pageUrl, jobId);
    links.forEach((l) => allLinks.add(l));
    jLog.info(`Collection page ${pageNum}: +${links.length} links (${allLinks.size} total)`, {
      url: pageUrl,
    });

    if (allLinks.size === before) unchangedPages++;
    else unchangedPages = 0;

    pageNum++;
    await throttleDelay();
  }

  return [...allLinks];
}

// ─── Collect product URLs from a single catalog page ─────
async function collectProductUrlsFromPage(
  context: any,
  url:     string,
  jobId:   string
): Promise<string[]> {
  const jLog = createJobLogger(jobId);
  const page = await createPage(context);

  try {
    const ok = await safeGoto(page, url);
    if (!ok) return [];

    await scrollToBottom(page, 20);

    const links = await extractProductLinks(page, url);
    jLog.debug(`${links.length} product links on ${url}`);
    return links;
  } catch (err) {
    jLog.warn(`Failed to collect links from ${url}`, { err });
    return [];
  } finally {
    await page.close();
  }
}

// ─── Scrape a single product page ────────────────────────
async function scrapeProductPage(
  context:      any,
  url:          string,
  jobId:        string,
  categoryRef?: ProductCategoryRef
): Promise<{ saved: boolean; imageJobsQueued: number } | 'filtered' | 'error'> {
  const jLog = createJobLogger(jobId);
  const page = await createPage(context);

  const canonical = normalizeShopifyProductUrl(url, config.TARGET_URL) ?? url;
  const fetchUrl  = withUsdCurrency(canonical);

  try {
    const ok = await safeGoto(page, fetchUrl);
    if (!ok) return 'error';

    await page.waitForLoadState('domcontentloaded');

    const raw = await extractProductData(page, canonical, categoryRef?.name);
    if (raw === 'filtered') return 'filtered';
    if (raw === 'error') return 'error';

    // Transform (applies price filter + discount)
    const transformed = transformProduct(raw);
    if (!transformed) return 'filtered';

    // Save to Supabase
    const categoryId = await resolveCategoryId(transformed.category_name, {
      collectionSlug: categoryRef?.slug,
    });
    const productId = await saveProduct({
      name:         transformed.name,
      slug:         transformed.slug,
      description:  transformed.description,
      source_price: transformed.source_price,
      price:        transformed.price,
      sku:          transformed.sku,
      tags:         transformed.tags,
      in_stock:     transformed.in_stock,
      source_url:   transformed.source_url,
      status:       transformed.status,
      category_id:  categoryId,
    });

    // Duplicate (already exists) — skip silently
    if (!productId) return { saved: false, imageJobsQueued: 0 };

    // Save variants
    if (transformed.variants.length) {
      await saveVariants(productId, transformed.variants);
    }

    const inlineImages = process.env.SCRAPE_INLINE !== 'false';
    if (!transformed.image_urls.length) {
      jLog.warn('Product saved without gallery images', { name: transformed.name, url: canonical });
    }

    let imageJobsQueued = 0;
    for (let i = 0; i < transformed.image_urls.length; i++) {
      const imageJob = {
        productId,
        sourceUrl:   transformed.image_urls[i],
        position:    i,
        isPrimary:   i === 0,
        productName: transformed.name,
      };

      if (inlineImages) {
        const result = await processImage(imageJob);
        if (!result) {
          await saveProductImage({
            product_id: productId,
            url:        transformed.image_urls[i],
            alt:        transformed.name,
            is_primary: i === 0,
            position:   i,
          });
        }
      } else {
        await imageQueue.add('process-image', imageJob, {
          attempts: 5,
          backoff: { type: 'exponential', delay: 3000 },
        });
      }
      imageJobsQueued++;
    }

    jLog.info('Product saved', {
      name:     transformed.name,
      price:    transformed.price,
      category: transformed.category_name ?? categoryRef?.name,
      images:   imageJobsQueued,
    });

    return { saved: true, imageJobsQueued };
  } catch (err) {
    jLog.error('Product page scrape failed', { url, err });
    return 'error';
  } finally {
    await page.close();
  }
}
