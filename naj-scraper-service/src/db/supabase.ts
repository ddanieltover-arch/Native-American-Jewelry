import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from '../config';
import { logger } from '../utils/logger';
import { makeSlug } from '../utils/helpers';
import { productHandleFromUrl } from '../scraper/shopify';
import type { ScrapeLog, ScrapeError } from '../types';

// ─── Singleton client ─────────────────────────────────────
let _client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!_client) {
    _client = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return _client;
}

// ─── Scrape log helpers ───────────────────────────────────
export async function createScrapeLog(
  jobId: string,
  targetUrl: string
): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.from('scrape_logs').insert({
    job_id:            jobId,
    target_url:        targetUrl,
    status:            'running',
    products_found:    0,
    products_filtered: 0,
    products_imported: 0,
    errors:            null,
    started_at:        new Date().toISOString(),
  });

  if (error) logger.error('Failed to create scrape log', { error, jobId });
}

export async function updateScrapeLog(
  jobId: string,
  updates: Partial<ScrapeLog>
): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from('scrape_logs')
    .update(updates)
    .eq('job_id', jobId);

  if (error) logger.error('Failed to update scrape log', { error, jobId });
}

export async function completeScrapeLog(
  jobId: string,
  data: {
    productsFound:    number;
    productsFiltered: number;
    productsImported: number;
    errors:           ScrapeError[];
    durationMs:       number;
    status:           'completed' | 'failed' | 'partial';
  }
): Promise<void> {
  await updateScrapeLog(jobId, {
    status:            data.status,
    products_found:    data.productsFound,
    products_filtered: data.productsFiltered,
    products_imported: data.productsImported,
    errors:            data.errors.length ? data.errors : null,
    duration_ms:       data.durationMs,
    completed_at:      new Date().toISOString(),
  });
}

// ─── Resolve or create category by scraped name ─────────────
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

  const supabase = getSupabase();

  const { data: existing } = await supabase
    .from('categories')
    .select('id, description')
    .eq('slug', slug)
    .maybeSingle();

  if (existing?.id) {
    if (options?.description && !existing.description) {
      await supabase
        .from('categories')
        .update({ description: options.description })
        .eq('id', existing.id);
    }
    return existing.id;
  }

  const { data: created, error } = await supabase
    .from('categories')
    .insert({
      name,
      slug,
      description: options?.description ?? null,
      featured:    false,
      sort_order:  99,
    })
    .select('id')
    .single();

  if (error) {
    const { data: retry } = await supabase
      .from('categories')
      .select('id')
      .eq('slug', slug)
      .maybeSingle();
    if (retry?.id) return retry.id;
    logger.warn('Failed to resolve category', { name, slug, error });
    return null;
  }

  logger.info('Category synced', { name, slug });
  return created?.id ?? null;
}

/** Upsert many Shopify collections as categories before product import */
export async function syncCollectionCategories(
  collections: Array<{ name: string; slug: string; description?: string | null }>
): Promise<number> {
  let synced = 0;
  for (const col of collections) {
    const id = await resolveCategoryId(col.name, {
      collectionSlug: col.slug,
      description:    col.description,
    });
    if (id) synced++;
  }
  return synced;
}

// ─── Product save ─────────────────────────────────────────
export async function saveProduct(product: {
  name:         string;
  slug:         string;
  description:  string | null;
  source_price: number;
  price:        number;
  sku:          string | null;
  tags:         string[];
  in_stock:     boolean;
  source_url:   string;
  status:       'pending';
  category_id?: string | null;
}): Promise<string | null> {
  const supabase = getSupabase();

  // Duplicate by exact source_url
  const { data: existingByUrl } = await supabase
    .from('products')
    .select('id')
    .eq('source_url', product.source_url)
    .maybeSingle();

  if (existingByUrl?.id) {
    logger.debug('Product already exists (source_url)', { sourceUrl: product.source_url });
    return null;
  }

  // Duplicate by Shopify handle (blocks copy-1 / copy-2 URLs for same item)
  const handle = productHandleFromUrl(product.source_url);
  if (handle) {
    const { data: existingByHandle } = await supabase
      .from('products')
      .select('id')
      .ilike('source_url', `%/products/${handle}%`)
      .limit(1)
      .maybeSingle();

    if (existingByHandle?.id) {
      logger.debug('Product already exists (handle)', { handle, sourceUrl: product.source_url });
      return null;
    }

    // Stable slug from handle — skip if slug taken by another product
    const { data: existingSlug } = await supabase
      .from('products')
      .select('id')
      .eq('slug', product.slug)
      .maybeSingle();

    if (existingSlug?.id) {
      logger.debug('Product slug already exists', { slug: product.slug });
      return null;
    }
  }

  const { data, error } = await supabase
    .from('products')
    .insert(product)
    .select('id')
    .single();

  if (error) {
    logger.error('Failed to save product', { error, product: product.name });
    return null;
  }

  return data.id;
}

// ─── Save product variants ────────────────────────────────
export async function saveVariants(
  productId: string,
  variants: Array<{
    name:           string;
    value:          string;
    price_modifier: number;
    stock_quantity: number;
  }>
): Promise<void> {
  if (!variants.length) return;
  const supabase = getSupabase();

  const { error } = await supabase.from('product_variants').insert(
    variants.map((v) => ({ ...v, product_id: productId }))
  );

  if (error) logger.error('Failed to save variants', { error, productId });
}

// ─── Save product image record (after processing) ─────────
export async function saveProductImage(image: {
  product_id: string;
  url:        string;
  alt?:       string;
  is_primary: boolean;
  position:   number;
}): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.from('product_images').insert(image);
  if (error) logger.error('Failed to save product image', { error });
}

// ─── Upload image buffer to Supabase Storage ──────────────
export async function uploadImageToStorage(
  buffer:   Buffer,
  filePath: string,
  mimeType: string = 'image/webp'
): Promise<string | null> {
  const supabase = getSupabase();

  const { error } = await supabase.storage
    .from(config.SUPABASE_STORAGE_BUCKET)
    .upload(filePath, buffer, {
      contentType: mimeType,
      upsert:      true,
    });

  if (error) {
    logger.error('Failed to upload image to storage', { error, filePath });
    return null;
  }

  const { data } = supabase.storage
    .from(config.SUPABASE_STORAGE_BUCKET)
    .getPublicUrl(filePath);

  return data.publicUrl;
}
