import crypto from 'crypto';
import { config } from '../config';
import { parsePriceFromText } from './price';

// ─── Async delay ──────────────────────────────────────────
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Random delay between MIN and MAX (throttling) ───────
export async function throttleDelay(): Promise<void> {
  const ms =
    config.REQUEST_DELAY_MIN_MS +
    Math.random() * (config.REQUEST_DELAY_MAX_MS - config.REQUEST_DELAY_MIN_MS);
  await delay(Math.round(ms));
}

// ─── Random integer in [min, max] ─────────────────────────
export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ─── URL-safe slug ────────────────────────────────────────
export function makeSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}

// ─── Unique slug (append short hash if needed) ───────────
export function uniqueSlug(text: string): string {
  const base = makeSlug(text);
  const hash = crypto.createHash('sha1').update(text + Date.now()).digest('hex').slice(0, 6);
  return `${base}-${hash}`;
}

// ─── Apply 5% discount ────────────────────────────────────
export function applyDiscount(sourcePrice: number, rate = config.DISCOUNT_RATE): number {
  return parseFloat((sourcePrice * (1 - rate)).toFixed(2));
}

// ─── Parse price string → number (USD-safe; rejects ₦/€/£) ─
export function parsePrice(raw: string | null | undefined): number | null {
  return parsePriceFromText(raw);
}

// ─── Deduplicate array by key ─────────────────────────────
export function dedupBy<T>(arr: T[], key: keyof T): T[] {
  const seen = new Set();
  return arr.filter((item) => {
    const k = item[key];
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

// ─── Chunk array ──────────────────────────────────────────
export function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

// ─── Absolute URL resolution ──────────────────────────────
export function resolveUrl(base: string, href: string): string {
  try {
    return new URL(href, base).href;
  } catch {
    return href;
  }
}

// ─── Strip HTML tags from text ────────────────────────────
export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ─── Normalize whitespace ─────────────────────────────────
export function normalizeText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

// ─── Generate short unique ID for jobs ───────────────────
export function generateJobId(prefix = 'job'): string {
  const ts  = Date.now().toString(36);
  const rnd = Math.random().toString(36).slice(2, 6);
  return `${prefix}-${ts}-${rnd}`;
}

// ─── Safe JSON parse ─────────────────────────────────────
export function safeJsonParse<T>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

// ─── Format bytes to human-readable ──────────────────────
export function formatBytes(bytes: number): string {
  if (bytes < 1024)       return `${bytes} B`;
  if (bytes < 1024 ** 2)  return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3)  return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
}
