// ═══════════════════════════════════════════════════════════
// Scraper Supabase helpers — replaces naj-scraper/src/db/supabase.ts
// All operations use service role key (server-only)
// ═══════════════════════════════════════════════════════════
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from '../config';
import { logger } from '../utils/logger';
import type { Database } from './database.types';
import type { ScrapeLog, ScrapeError } from '../types';

// ─── Singleton ────────────────────────────────────────────
let _client: SupabaseClient<Database> | null = null;

export function getSupabase(): SupabaseClient<Database> {
  if (!_client) {
    _client = createClient<Database>(
      config.SUPABASE_URL,
      config.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
  }
  return _client;
}

// ══════════════════════════════════════════════════════════
// SCRAPE LOGS
// ══════════════════════════════════════════════════════════

export async function createScrapeLog(jobId: string, targetUrl: string): Promise<void> {
  const { error } = await getSupabase()
    .from('scrape_logs')
    .insert({
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

export async function updateScrapeLog(jobId: string, updates: Partial<ScrapeLog>): Promise<void> {
  const { error } = await getSupabase()
    .from('scrape_logs')
    .update(updates as any)
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
    errors:            data.errors.length ? data.errors as any : null,
    duration_ms:       data.durationMs,
    completed_at:      new Date().toISOString(),
  });
}

// ══════════════════════════════════════════════════════════
// PRODUCTS
// ══════════════════════════════════════════════════════════

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
  category_name?:string | null;
}): Promise<string | null> {
  const supabase = getSupabase();

  // Duplicate check by source_url
  const { data: existing } = await supabase
    .from('products')
    .select('id')
    .eq('source_url', product.source_url)
    .maybeSingle();

  if (existing?.id) {
    logger.debug('Product already exists, skipping', { sourceUrl: product.source_url });
    return null;
  }

  // Resolve category by name if provided
  let categoryId: string | null = null;
  if (product.category_name) {
    const { data: cat } = await supabase
      .from('categories')
      .select('id')
      .ilike('name', product.category_name)
      .maybeSingle();
    categoryId = cat?.id ?? null;
  }

  const { data, error } = await supabase
    .from('products')
    .insert({
      name:         product.name,
      slug:         product.slug,
      description:  product.description,
      category_id:  categoryId,
      source_price: product.source_price,
      price:        product.price,
      sku:          product.sku,
      tags:         product.tags,
      in_stock:     product.in_stock,
      stock_quantity: 0,
      source_url:   product.source_url,
      status:       'pending',
    })
    .select('id')
    .single();

  if (error) {
    logger.error('Failed to save product', { error: error.message, name: product.name });
    return null;
  }

  logger.info('Product saved to DB', { id: data.id, name: product.name, price: product.price });
  return data.id;
}

export async function saveVariants(
  productId: string,
  variants:  Array<{ name: string; value: string; price_modifier: number; stock_quantity: number }>
): Promise<void> {
  if (!variants.length) return;

  const { error } = await getSupabase()
    .from('product_variants')
    .insert(variants.map((v) => ({ ...v, product_id: productId })));

  if (error) logger.error('Failed to save variants', { error: error.message, productId });
}

export async function saveProductImage(image: {
  product_id: string;
  url:        string;
  alt?:       string;
  is_primary: boolean;
  position:   number;
}): Promise<void> {
  const { error } = await getSupabase()
    .from('product_images')
    .insert({
      product_id: image.product_id,
      url:        image.url,
      alt:        image.alt ?? null,
      is_primary: image.is_primary,
      position:   image.position,
    });

  if (error) logger.error('Failed to save product image', { error: error.message });
}

// ══════════════════════════════════════════════════════════
// STORAGE
// ══════════════════════════════════════════════════════════

export async function uploadImageToStorage(
  buffer:   Buffer,
  filePath: string,
  mimeType: string = 'image/webp'
): Promise<string | null> {
  const supabase = getSupabase();

  const { error } = await supabase.storage
    .from(config.SUPABASE_STORAGE_BUCKET)
    .upload(filePath, buffer, { contentType: mimeType, upsert: true });

  if (error) {
    logger.error('Storage upload failed', { error: error.message, filePath });
    return null;
  }

  const { data: { publicUrl } } = supabase.storage
    .from(config.SUPABASE_STORAGE_BUCKET)
    .getPublicUrl(filePath);

  return publicUrl;
}

// ══════════════════════════════════════════════════════════
// HEALTHCHECK
// ══════════════════════════════════════════════════════════

export async function checkSupabaseConnection(): Promise<boolean> {
  try {
    const { error } = await getSupabase()
      .from('categories')
      .select('id')
      .limit(1);
    return !error;
  } catch {
    return false;
  }
}
