import pLimit from 'p-limit';
import { createStealthContext, createPage, safeGoto, scrollToBottom, closeBrowser } from './browser';
import { extractProductData, extractProductLinks, extractCatalogLinks, extractShopifyVariants } from './extractor';
import { transformProduct } from './transformer';
import { saveProduct, saveVariants, createScrapeLog, completeScrapeLog, resolveCategoryId } from '../db/supabase';
import { imageQueue } from '../queues';
import { logger, createJobLogger } from '../utils/logger';
import { throttleDelay, generateJobId } from '../utils/helpers';
import { config } from '../config';
import type { RawProduct, ScrapeError, ScrapeResult, TransformedProduct } from '../types';

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
    // ── Step 1: Discover catalog pages ──────────────────────
    const catalogUrls = await discoverCatalogUrls(context, targetUrl, jobId);
    jLog.info(`Found ${catalogUrls.length} catalog pages`);

    // Add the root shop/collections all page
    const allUrls = [
      ...new Set([
        `${targetUrl}/collections/all`,
        `${targetUrl}/collections/jewelry`,
        `${targetUrl}/shop`,
        ...catalogUrls,
      ]),
    ];

    // ── Step 2: Collect all product URLs from each catalog page
    const allProductUrls = new Set<string>();
    const pageLimiter = pLimit(1); // one catalog page at a time (polite)

    await Promise.all(
      allUrls.map((catUrl) =>
        pageLimiter(async () => {
          const links = await collectProductUrlsFromPage(context, catUrl, jobId);
          links.forEach((l) => allProductUrls.add(l));
          await throttleDelay();
        })
      )
    );

    jLog.info(`Discovered ${allProductUrls.size} unique product URLs`);

    // ── Step 3: Scrape each product page ────────────────────
    const productLimiter = pLimit(config.SCRAPE_CONCURRENCY);

    await Promise.all(
      Array.from(allProductUrls).map((productUrl) =>
        productLimiter(async () => {
          try {
            const result = await scrapeProductPage(context, productUrl, jobId);

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

    await scrollToBottom(page, 15);

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
  context:    any,
  url:        string,
  jobId:      string
): Promise<{ saved: boolean; imageJobsQueued: number } | 'filtered' | 'error'> {
  const jLog = createJobLogger(jobId);
  const page = await createPage(context);

  try {
    const ok = await safeGoto(page, url);
    if (!ok) return 'error';

    // Wait for content
    await page.waitForLoadState('domcontentloaded');

    // Extract raw data
    const raw = await extractProductData(page, url);
    if (!raw) return 'error';

    // Try to enhance with Shopify variants if available
    const shopifyVariants = await extractShopifyVariants(page);
    if (shopifyVariants.length > raw.variants.length) {
      raw.variants = shopifyVariants;
    }

    // Transform (applies price filter + discount)
    const transformed = transformProduct(raw);
    if (!transformed) return 'filtered';

    // Save to Supabase
    const categoryId = await resolveCategoryId(transformed.category_name);
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

    // Queue image processing jobs
    let imageJobsQueued = 0;
    for (let i = 0; i < transformed.image_urls.length; i++) {
      await imageQueue.add('process-image', {
        productId,
        sourceUrl:   transformed.image_urls[i],
        position:    i,
        isPrimary:   i === 0,
        productName: transformed.name,
      }, {
        attempts: 5,
        backoff: { type: 'exponential', delay: 3000 },
      });
      imageJobsQueued++;
    }

    jLog.info('Product saved', {
      name:    transformed.name,
      price:   transformed.price,
      images:  imageJobsQueued,
    });

    return { saved: true, imageJobsQueued };
  } catch (err) {
    jLog.error('Product page scrape failed', { url, err });
    return 'error';
  } finally {
    await page.close();
  }
}
