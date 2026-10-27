/**
 * Scraper data layer — Neon Postgres + Cloudflare R2
 * (filename kept for import compatibility)
 */
import { getSql } from './neon';
import { uploadToR2 } from './r2';
import { config } from '../config';
import { logger } from '../utils/logger';
import { makeSlug } from '../utils/helpers';
import { productHandleFromUrl } from '../scraper/shopify';
import type { ScrapeLog, ScrapeError } from '../types';

export async function createScrapeLog(jobId: string, targetUrl: string): Promise<void> {
  const sql = getSql();
  try {
    await sql`
      INSERT INTO scrape_logs (
        job_id, target_url, status, products_found, products_filtered, products_imported, errors, started_at
      ) VALUES (
        ${jobId}, ${targetUrl}, 'running', 0, 0, 0, NULL, NOW()
      )
    `;
  } catch (error) {
    logger.error('Failed to create scrape log', { error, jobId });
  }
}

export async function updateScrapeLog(
  jobId: string,
  updates: Partial<ScrapeLog>
): Promise<void> {
  const sql = getSql();
  try {
    const current = (await sql`
      SELECT * FROM scrape_logs WHERE job_id = ${jobId} ORDER BY started_at DESC LIMIT 1
    `) as Record<string, unknown>[];
    if (!current[0]) return;
    const c = current[0];
    await sql`
      UPDATE scrape_logs SET
        status = ${updates.status ?? (c.status as string)},
        products_found = ${updates.products_found ?? Number(c.products_found)},
        products_filtered = ${updates.products_filtered ?? Number(c.products_filtered)},
        products_imported = ${updates.products_imported ?? Number(c.products_imported)},
        errors = ${
          updates.errors !== undefined
            ? updates.errors
              ? JSON.stringify(updates.errors)
              : null
            : c.errors
              ? JSON.stringify(c.errors)
              : null
        }::jsonb,
        duration_ms = ${updates.duration_ms ?? (c.duration_ms as number | null)},
        completed_at = ${updates.completed_at ?? (c.completed_at as string | null)}
      WHERE job_id = ${jobId}
    `;
  } catch (error) {
    logger.error('Failed to update scrape log', { error, jobId });
  }
}

export async function completeScrapeLog(
  jobId: string,
  data: {
    productsFound: number;
    productsFiltered: number;
    productsImported: number;
    errors: ScrapeError[];
    durationMs: number;
    status: 'completed' | 'failed' | 'partial';
  }
): Promise<void> {
  await updateScrapeLog(jobId, {
    status: data.status,
    products_found: data.productsFound,
    products_filtered: data.productsFiltered,
    products_imported: data.productsImported,
    errors: data.errors.length ? data.errors : null,
    duration_ms: data.durationMs,
    completed_at: new Date().toISOString(),
  });
}

export async function resolveCategoryId(
  categoryName: string | null | undefined,
  options?: { description?: string | null; collectionSlug?: string }
): Promise<string | null> {
  if (!categoryName?.trim()) return null;

  const name = categoryName.trim();
  const slug = options?.collectionSlug
    ? makeSlug(options.collectionSlug)
    : makeSlug(name);
  if (!slug) return null;

  const sql = getSql();

  const existing = (await sql`
    SELECT id, description FROM categories WHERE slug = ${slug} LIMIT 1
  `) as { id: string; description: string | null }[];

  if (existing[0]?.id) {
    if (options?.description && !existing[0].description) {
      await sql`
        UPDATE categories SET description = ${options.description} WHERE id = ${existing[0].id}
      `;
    }
    return existing[0].id;
  }

  try {
    const created = (await sql`
      INSERT INTO categories (name, slug, description, featured, sort_order)
      VALUES (${name}, ${slug}, ${options?.description ?? null}, false, 99)
      RETURNING id
    `) as { id: string }[];
    logger.info('Category synced', { name, slug });
    return created[0]?.id ?? null;
  } catch {
    const retry = (await sql`
      SELECT id FROM categories WHERE slug = ${slug} LIMIT 1
    `) as { id: string }[];
    if (retry[0]?.id) return retry[0].id;
    logger.warn('Failed to resolve category', { name, slug });
    return null;
  }
}

export async function syncCollectionCategories(
  collections: Array<{ name: string; slug: string; description?: string | null }>
): Promise<number> {
  let synced = 0;
  for (const col of collections) {
    const id = await resolveCategoryId(col.name, {
      collectionSlug: col.slug,
      description: col.description,
    });
    if (id) synced++;
  }
  return synced;
}

export async function saveProduct(product: {
  name: string;
  slug: string;
  description: string | null;
  source_price: number;
  price: number;
  sku: string | null;
  tags: string[];
  in_stock: boolean;
  source_url: string;
  status: 'pending';
  category_id?: string | null;
}): Promise<string | null> {
  const sql = getSql();

  const existingByUrl = (await sql`
    SELECT id FROM products WHERE source_url = ${product.source_url} LIMIT 1
  `) as { id: string }[];
  if (existingByUrl[0]?.id) {
    logger.debug('Product already exists (source_url)', { sourceUrl: product.source_url });
    return null;
  }

  const handle = productHandleFromUrl(product.source_url);
  if (handle) {
    const existingByHandle = (await sql`
      SELECT id FROM products
      WHERE source_url ILIKE ${`%/products/${handle}%`}
      LIMIT 1
    `) as { id: string }[];
    if (existingByHandle[0]?.id) {
      logger.debug('Product already exists (handle)', { handle, sourceUrl: product.source_url });
      return null;
    }

    const existingSlug = (await sql`
      SELECT id FROM products WHERE slug = ${product.slug} LIMIT 1
    `) as { id: string }[];
    if (existingSlug[0]?.id) {
      logger.debug('Product slug already exists', { slug: product.slug });
      return null;
    }
  }

  try {
    const data = (await sql`
      INSERT INTO products (
        name, slug, description, source_price, price, sku, tags, in_stock, source_url, status, category_id
      ) VALUES (
        ${product.name},
        ${product.slug},
        ${product.description},
        ${product.source_price},
        ${product.price},
        ${product.sku},
        ${product.tags}::text[],
        ${product.in_stock},
        ${product.source_url},
        ${product.status},
        ${product.category_id ?? null}
      )
      RETURNING id
    `) as { id: string }[];
    return data[0]?.id ?? null;
  } catch (error) {
    logger.error('Failed to save product', { error, product: product.name });
    return null;
  }
}

export async function saveVariants(
  productId: string,
  variants: Array<{
    name: string;
    value: string;
    price_modifier: number;
    stock_quantity: number;
  }>
): Promise<void> {
  if (!variants.length) return;
  const sql = getSql();
  try {
    for (const v of variants) {
      await sql`
        INSERT INTO product_variants (product_id, name, value, price_modifier, stock_quantity)
        VALUES (${productId}, ${v.name}, ${v.value}, ${v.price_modifier}, ${v.stock_quantity})
      `;
    }
  } catch (error) {
    logger.error('Failed to save variants', { error, productId });
  }
}

export async function saveProductImage(image: {
  product_id: string;
  url: string;
  alt?: string;
  is_primary: boolean;
  position: number;
}): Promise<void> {
  const sql = getSql();
  try {
    await sql`
      INSERT INTO product_images (product_id, url, alt, is_primary, position)
      VALUES (
        ${image.product_id},
        ${image.url},
        ${image.alt ?? null},
        ${image.is_primary},
        ${image.position}
      )
    `;
  } catch (error) {
    logger.error('Failed to save product image', { error });
  }
}

export async function uploadImageToStorage(
  buffer: Buffer,
  filePath: string,
  mimeType: string = 'image/webp'
): Promise<string | null> {
  try {
    const { isR2Configured } = await import('./r2');
    if (!isR2Configured()) return null;
    const key = filePath.startsWith('product-images/')
      ? filePath
      : `product-images/${filePath}`;
    return await uploadToR2(key, buffer, mimeType);
  } catch (error) {
    logger.error('Failed to upload image to R2', { error, filePath });
    return null;
  }
}

/** @deprecated no longer used — kept for type compatibility */
export function getSupabase() {
  throw new Error('Supabase data client removed; use Neon via getSql()');
}

// silence unused config warning if bucket still referenced elsewhere
void config.R2_BUCKET;
