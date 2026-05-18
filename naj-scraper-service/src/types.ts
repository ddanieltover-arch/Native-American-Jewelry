// ─── Raw scraped data (before any processing) ────────────
export interface RawProduct {
  name:        string;
  description: string | null;
  price:       number;
  images:      string[];           // original source URLs
  variants:    RawVariant[];
  sku:         string | null;
  tags:        string[];
  inStock:     boolean;
  sourceUrl:   string;
  categoryName:string | null;
}

export interface RawVariant {
  name:  string;   // e.g. "Size"
  value: string;   // e.g. "Medium"
  price: number | null;
}

// ─── Transformed (ready for Supabase) ────────────────────
export interface TransformedProduct {
  name:         string;
  slug:         string;
  description:  string | null;
  source_price: number;
  price:        number;            // source_price * (1 - DISCOUNT_RATE)
  sku:          string | null;
  tags:         string[];
  in_stock:     boolean;
  source_url:   string;
  status:       'pending';
  category_name:string | null;
  image_urls:   string[];          // original image URLs, processed later
  variants:     TransformedVariant[];
}

export interface TransformedVariant {
  name:           string;
  value:          string;
  price_modifier: number;
  stock_quantity: number;
}

// ─── Queue job payloads ───────────────────────────────────
export interface ScrapeJobData {
  jobId:      string;
  targetUrl:  string;
  triggeredBy:'scheduled' | 'manual' | 'api';
  triggeredAt:string;
}

export interface ImageJobData {
  productId:   string;
  sourceUrl:   string;
  position:    number;
  isPrimary:   boolean;
  productName: string;
}

export interface EmailJobData {
  type:    'scrape-complete' | 'scrape-error' | 'order-confirm' | 'payment-instruct';
  to:      string;
  payload: Record<string, unknown>;
}

// ─── Scrape results ───────────────────────────────────────
export interface ScrapeResult {
  jobId:            string;
  totalFound:       number;
  totalFiltered:    number;    // skipped (price < MIN or unavailable)
  totalImported:    number;    // successfully saved to Supabase
  totalImageJobs:   number;    // image processing jobs queued
  errors:           ScrapeError[];
  durationMs:       number;
  completedAt:      string;
}

export interface ScrapeError {
  url:     string;
  message: string;
  stage:   'crawl' | 'extract' | 'transform' | 'save' | 'image';
}

// ─── Image processing result ─────────────────────────────
export interface ImageResult {
  productId:  string;
  position:   number;
  storagePath:string;
  publicUrl:  string;
  width:      number;
  height:     number;
  sizeBytes:  number;
}

// ─── Scrape log (mirrors Supabase scrape_logs table) ─────
export interface ScrapeLog {
  id?:                string;
  job_id:             string;
  target_url:         string;
  status:             'running' | 'completed' | 'failed' | 'partial';
  products_found:     number;
  products_filtered:  number;
  products_imported:  number;
  errors:             ScrapeError[] | null;
  duration_ms:        number | null;
  started_at:         string;
  completed_at:       string | null;
}
