import { config } from '../config';

/** Jewelry catalog: reject scraped amounts that cannot be USD retail */
export const MAX_USD_PRICE = 50_000;

export function parsePriceFromText(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const text = raw.trim();

  // Reject obvious non-USD symbols
  if (/₦|NGN|naira|€|EUR|£|GBP/i.test(text)) {
    return null;
  }

  // Prefer explicit USD
  const usdMatch = text.match(/\$\s*([\d,]+(?:\.\d{1,2})?)/);
  if (usdMatch) {
    const n = parseFloat(usdMatch[1].replace(/,/g, ''));
    return isNaN(n) ? null : n;
  }

  const cleaned = text.replace(/[^\d.]/g, '');
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : n;
}

/**
 * Validate price is plausible USD for NAJ ($150–$50k before discount).
 */
export function isPlausibleUsdPrice(price: number): boolean {
  if (!Number.isFinite(price) || price < config.MIN_PRICE_FILTER) return false;
  if (price > MAX_USD_PRICE) return false;
  return true;
}

/**
 * Pick USD price: Shopify JSON cents first, then JSON-LD if currency USD, else DOM $ only.
 */
export function resolveUsdPrice(candidates: {
  shopifyUsd?: number | null;
  shopifyCurrency?: string | null;
  jsonLdPrice?: number | null;
  jsonLdCurrency?: string | null;
  domPriceText?: string | null;
}): number | null {
  const { shopifyUsd, shopifyCurrency, jsonLdPrice, jsonLdCurrency, domPriceText } = candidates;

  if (shopifyUsd != null) {
    const cur = (shopifyCurrency ?? 'USD').toUpperCase();
    if (cur === 'USD' && isPlausibleUsdPrice(shopifyUsd)) {
      return shopifyUsd;
    }
  }

  if (jsonLdPrice != null && jsonLdCurrency?.toUpperCase() === 'USD' && isPlausibleUsdPrice(jsonLdPrice)) {
    return jsonLdPrice;
  }

  const dom = parsePriceFromText(domPriceText ?? null);
  if (dom != null && isPlausibleUsdPrice(dom)) return dom;

  return null;
}
