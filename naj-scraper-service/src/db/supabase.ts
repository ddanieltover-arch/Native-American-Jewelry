import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from '../config';
import { logger } from '../utils/logger';
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
}): Promise<string | null> {
  const supabase = getSupabase();

  // Check for duplicate by source_url
  const { data: existing } = await supabase
    .from('products')
    .select('id')
    .eq('source_url', product.source_url)
    .single();

  if (existing?.id) {
    logger.debug('Product already exists, skipping', { sourceUrl: product.source_url });
    return null;
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
