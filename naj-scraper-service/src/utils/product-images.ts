import { config } from '../config';

/** Normalize Shopify CDN URL to largest variant, drop tracking params */
export function cleanProductImageUrl(url: string): string | null {
  try {
    const parsed = new URL(url);

    if (!isValidProductImageUrl(parsed.href)) return null;

    // Upgrade width suffix to full size: file_300x300.jpg → file.jpg
    parsed.pathname = parsed.pathname.replace(
      /_(\d+)x(\d*)(?:@2x)?\.([a-z0-9]+)$/i,
      '.$3'
    );

    ['v', 'width', 'height', 'crop', 'quality', 'format'].forEach((p) =>
      parsed.searchParams.delete(p)
    );

    return parsed.href;
  } catch {
    return null;
  }
}

export function isValidProductImageUrl(url: string): boolean {
  if (!url.startsWith('http')) return false;
  if (/logo|icon|sprite|badge|avatar|placeholder|spinner/i.test(url)) return false;
  const sizeMatch = url.match(/_(\d+)x(\d+)/i);
  if (sizeMatch) {
    const w = parseInt(sizeMatch[1], 10);
    if (w > 0 && w < 80) return false;
  }
  return (
    url.includes('cdn.shopify.com') ||
    url.includes('/cdn/') ||
    url.includes('hippiecowgirl')
  );
}

/** Dedupe, clean, cap at MAX_IMAGES_PER_PRODUCT (default 2) */
export function mergeProductImageUrls(sources: string[]): string[] {
  const max = config.MAX_IMAGES_PER_PRODUCT;
  const seen = new Set<string>();
  const out: string[] = [];

  for (const raw of sources) {
    if (!raw) continue;
    const cleaned = cleanProductImageUrl(raw);
    if (!cleaned || seen.has(cleaned)) continue;
    seen.add(cleaned);
    out.push(cleaned);
    if (out.length >= max) break;
  }

  return out;
}
