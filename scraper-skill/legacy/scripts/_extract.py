"""
Extraction primitives — JSON-LD first, then platform-aware DOM, then generic DOM.

This is the heart of the "generic" scraper. Site-specific adapters in
scripts/adapters/ override pieces of this; everything else falls through here.

We try hard NOT to be clever. Clever extraction breaks on the next site. Boring
extraction with explicit fallbacks is what survives.
"""

from __future__ import annotations

import json
import logging
import re
from typing import Any, Optional

from playwright.async_api import Page

from _normalize import (
    clean_text,
    dedup_urls,
    parse_price_text,
    resolve_image_url,
)

log = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# JSON-LD extraction
# ---------------------------------------------------------------------------


async def extract_json_ld(page: Page) -> list[dict[str, Any]]:
    """Return all JSON-LD blocks on the page, flattened across @graph wrappers.

    Malformed blocks are skipped, not raised — JSON-LD in the wild is messy.
    """
    raw = await page.evaluate(
        """() => {
            const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
            return scripts.map(s => s.textContent || '').filter(Boolean);
        }"""
    )
    out: list[dict[str, Any]] = []
    for blob in raw:
        try:
            value = json.loads(blob)
        except Exception:
            continue
        if isinstance(value, list):
            for item in value:
                if isinstance(item, dict):
                    out.extend(_flatten_ld(item))
        elif isinstance(value, dict):
            out.extend(_flatten_ld(value))
    return out


def _flatten_ld(node: dict[str, Any]) -> list[dict[str, Any]]:
    graph = node.get("@graph")
    if isinstance(graph, list):
        return [n for n in graph if isinstance(n, dict)]
    return [node]


def _type_includes_product(node: dict[str, Any]) -> bool:
    t = node.get("@type")
    if isinstance(t, list):
        joined = " ".join(str(x) for x in t)
    else:
        joined = str(t or "")
    return "product" in joined.lower()


def _coerce_image(value: Any) -> Optional[str]:
    if isinstance(value, str):
        return value
    if isinstance(value, dict):
        for key in ("url", "contentUrl", "@id"):
            v = value.get(key)
            if isinstance(v, str):
                return v
    return None


def _price_from_offer(offer: Any) -> Optional[float]:
    """Walk schema.org Offer / AggregateOffer shapes and return the lowest price."""
    if offer is None:
        return None
    if isinstance(offer, list):
        nums = [_price_from_offer(o) for o in offer]
        nums = [n for n in nums if n is not None]
        return min(nums) if nums else None
    if not isinstance(offer, dict):
        return None
    spec = offer.get("priceSpecification")
    from_spec = _price_from_offer(spec) if spec is not None else None
    if from_spec is not None:
        return from_spec
    nested = offer.get("offers")
    if nested is not None:
        return _price_from_offer(nested)
    for key in ("lowPrice", "price", "minPrice", "highPrice"):
        v = parse_price_text(offer.get(key))
        if v is not None:
            return v
    return None


def _currency_from_offer(offer: Any) -> Optional[str]:
    if isinstance(offer, list):
        for item in offer:
            c = _currency_from_offer(item)
            if c:
                return c
        return None
    if not isinstance(offer, dict):
        return None
    c = offer.get("priceCurrency")
    if isinstance(c, str) and c.strip():
        return c.upper().strip()
    nested = offer.get("offers")
    if nested:
        return _currency_from_offer(nested)
    spec = offer.get("priceSpecification")
    if spec:
        return _currency_from_offer(spec)
    return None


def _variants_from_offer(offer: Any) -> list[dict[str, Any]]:
    """Pull variant offers out of an AggregateOffer.offers[] list."""
    if not isinstance(offer, dict):
        return []
    inner = offer.get("offers")
    if not isinstance(inner, list):
        return []
    out: list[dict[str, Any]] = []
    for entry in inner:
        if not isinstance(entry, dict):
            continue
        name = (entry.get("name") or entry.get("sku") or "").strip()
        price = _price_from_offer(entry)
        weight_match = re.search(r"(\d+(?:\.\d+)?\s*(?:mg|ml|g|kg|iu))", name, re.IGNORECASE)
        if weight_match:
            out.append({
                "name": "Weight",
                "value": weight_match.group(1).lower().replace(" ", ""),
                "price": price,
            })
        elif name:
            out.append({"name": "Option", "value": name, "price": price})
    return out


def product_from_json_ld(blocks: list[dict[str, Any]], page_url: str) -> Optional[dict[str, Any]]:
    """Pick the first Product node from JSON-LD blocks and convert to RawProduct dict.

    Returns None if no usable Product node is present.
    """
    product_node = next((b for b in blocks if _type_includes_product(b)), None)
    if not product_node:
        return None

    name = clean_text(str(product_node.get("name") or ""))
    if not name:
        return None

    description = clean_text(str(product_node.get("description") or ""))
    raw_images = product_node.get("image")
    if raw_images is None:
        image_list = []
    elif isinstance(raw_images, list):
        image_list = [_coerce_image(i) for i in raw_images]
    else:
        image_list = [_coerce_image(raw_images)]
    image_list = [resolve_image_url(i, page_url) for i in image_list if i]
    image_list = dedup_urls([i for i in image_list if i])

    offer = product_node.get("offers")
    price = _price_from_offer(offer)
    currency = _currency_from_offer(offer) or "EUR"
    variants = _variants_from_offer(offer)

    return {
        "name": name,
        "description": description,
        "price": price,
        "currency": currency,
        "thumbnail_url": image_list[0] if image_list else None,
        "gallery_images": image_list,
        "variants": variants,
        "_source": "json-ld",
    }


# ---------------------------------------------------------------------------
# Platform detection
# ---------------------------------------------------------------------------


PLATFORMS = ("woocommerce", "shopify", "magento", "bigcommerce", "generic")


async def detect_platform(page: Page) -> str:
    """Return the detected platform name or 'generic'."""
    return await page.evaluate(
        """() => {
            const body = document.body;
            if (!body) return 'generic';
            if (body.classList.contains('woocommerce') || document.querySelector('.woocommerce-product-gallery')) return 'woocommerce';
            if (window.Shopify || document.querySelector('meta[name="shopify-checkout-api-token"]')) return 'shopify';
            if (body.classList.contains('catalog-product-view') || document.querySelector('.product-info-main')) return 'magento';
            if (document.querySelector('[data-product-id].productView')) return 'bigcommerce';
            return 'generic';
        }"""
    )


# ---------------------------------------------------------------------------
# DOM extraction (platform-aware)
# ---------------------------------------------------------------------------


async def extract_dom(page: Page, page_url: str, platform: str) -> Optional[dict[str, Any]]:
    """Platform-aware DOM extraction. Returns None when nothing usable found."""
    selectors = _SELECTORS_BY_PLATFORM.get(platform, _SELECTORS_BY_PLATFORM["generic"])
    extracted = await page.evaluate(_DOM_EXTRACT_JS, selectors)
    if not extracted or not extracted.get("name"):
        return None

    image_list = [resolve_image_url(i, page_url) for i in extracted.get("images", []) if i]
    image_list = dedup_urls([i for i in image_list if i])

    return {
        "name": clean_text(extracted.get("name")),
        "description": clean_text(extracted.get("description")),
        "price": parse_price_text(extracted.get("priceText")),
        "currency": extracted.get("currency") or "EUR",
        "thumbnail_url": image_list[0] if image_list else None,
        "gallery_images": image_list,
        "variants": extracted.get("variants", []),
        "_source": f"dom:{platform}",
    }


# CSS selectors per platform — kept as data so adapter authors can override
# without forking the JS extraction logic.
_SELECTORS_BY_PLATFORM = {
    "woocommerce": {
        "name": "h1.product_title, h1.entry-title",
        "description": ".woocommerce-product-details__short-description, .product .summary p",
        "price": ".summary .price .woocommerce-Price-amount, .summary .price",
        "images": ".woocommerce-product-gallery img",
        "breadcrumbs": ".woocommerce-breadcrumb a, .breadcrumbs a",
    },
    "shopify": {
        "name": "h1.product__title, h1[class*='product-title']",
        "description": ".product__description, [class*='product-description']",
        "price": ".product__price, .price__regular, [class*='price']",
        "images": ".product__media img, .product-gallery img",
        "breadcrumbs": ".breadcrumb a, nav[aria-label='breadcrumb'] a",
    },
    "magento": {
        "name": ".product-info-main .page-title, h1.page-title",
        "description": ".product.info.detailed .value, .description .value",
        "price": ".price-box .price, .product-info-price .price",
        "images": ".gallery-placeholder img, .fotorama__img",
        "breadcrumbs": ".breadcrumbs a",
    },
    "bigcommerce": {
        "name": ".productView-title, h1.productView-title",
        "description": ".productView-description-tabContent, .productView-info",
        "price": ".productView-price .price, .price--withoutTax",
        "images": ".productView-image img, .productView-thumbnail img",
        "breadcrumbs": ".breadcrumbs a, nav[aria-label='breadcrumb'] a",
    },
    "generic": {
        "name": "h1[itemprop='name'], h1.product-title, h1.product-name, h1",
        "description": "[itemprop='description'], .product-description, [class*='description']",
        "price": "[itemprop='price'], .product-price, [class*='price']",
        "images": "[itemprop='image'], img[class*='product'], img[class*='gallery']",
        "breadcrumbs": "nav[aria-label='breadcrumb'] a, .breadcrumb a, .breadcrumbs a",
    },
}


_DOM_EXTRACT_JS = r"""
(selectors) => {
    const text = (el) => (el?.textContent || '').trim();
    const firstText = (sel) => {
        const el = document.querySelector(sel);
        return el ? text(el) : '';
    };
    const collectText = (sel) => {
        const els = Array.from(document.querySelectorAll(sel));
        return els.map(text).filter(Boolean);
    };
    const collectImageUrls = (sel) => {
        const els = Array.from(document.querySelectorAll(sel));
        const urls = [];
        for (const el of els) {
            const src = el.getAttribute('src') || el.getAttribute('data-src') || el.getAttribute('data-lazy-src') || el.getAttribute('content');
            if (src) urls.push(src);
        }
        return urls;
    };

    const name = firstText(selectors.name);
    const description = firstText(selectors.description);
    const priceText = firstText(selectors.price);

    const images = collectImageUrls(selectors.images);
    const breadcrumbs = collectText(selectors.breadcrumbs).filter(t => !['Home', 'Shop', 'Products'].includes(t));

    // Try meta currency hint
    const metaCurrency = document.querySelector('meta[itemprop="priceCurrency"]')?.getAttribute('content')
        || document.querySelector('meta[property="product:price:currency"]')?.getAttribute('content')
        || null;

    // Variant extraction fallback:
    // 1) WooCommerce/Shopify option selects (e.g., weight, size, concentration)
    // 2) Additional information tables that expose single fixed attributes
    const variants = [];
    const pushVariant = (name, value) => {
        const n = (name || '').trim();
        const v = (value || '').trim();
        if (!n || !v) return;
        if (/choose an option/i.test(v)) return;
        if (/^(n\/a|-|—)$/i.test(v)) return;
        variants.push({ name: n, value: v, price: null });
    };

    // <select> option variants
    const selects = Array.from(document.querySelectorAll(
        'form.variations_form select, form[action*="add-to-cart"] select, .variations_form select'
    ));
    for (const sel of selects) {
        const attr = (sel.getAttribute('name') || '').replace(/^attribute_/, '');
        const label = sel.closest('tr')?.querySelector('label')?.textContent
            || sel.closest('.value')?.previousElementSibling?.textContent
            || attr
            || 'Option';
        const opts = Array.from(sel.querySelectorAll('option'))
            .map(o => (o.textContent || '').trim())
            .filter(Boolean)
            .filter(t => !/choose an option/i.test(t));
        for (const opt of opts) pushVariant(label, opt);
    }

    // Additional information table variants (often single fixed values)
    const rows = Array.from(document.querySelectorAll(
        'table.shop_attributes tr, table.woocommerce-product-attributes tr, table tr'
    ));
    for (const row of rows) {
        const key = row.querySelector('th')?.textContent || '';
        const val = row.querySelector('td')?.textContent || '';
        if (!key || !val) continue;
        if (/(weight|size|dose|dosage|strength|concentration|volume|format)/i.test(key)) {
            pushVariant(key, val.replace(/\s+/g, ' ').trim());
        }
    }

    // Dedup variants by (name,value)
    const seen = new Set();
    const uniqVariants = [];
    for (const v of variants) {
        const k = `${v.name}::${v.value}`.toLowerCase();
        if (seen.has(k)) continue;
        seen.add(k);
        uniqVariants.push(v);
    }

    return { name, description, priceText, images, breadcrumbs, currency: metaCurrency, variants: uniqVariants };
}
"""


# ---------------------------------------------------------------------------
# Combined extractor — JSON-LD first, fall through to DOM
# ---------------------------------------------------------------------------


async def extract_product(page: Page, page_url: str) -> tuple[Optional[dict[str, Any]], float]:
    """Run the full extraction pipeline and return (raw_product_dict, confidence).

    Confidence:
      1.00 = JSON-LD with all fields
      0.85 = JSON-LD with description filled in from DOM
      0.70 = DOM-only
      0.00 = nothing found (caller should skip)
    """
    blocks = await extract_json_ld(page)
    ld_product = product_from_json_ld(blocks, page_url)

    platform = await detect_platform(page)
    dom_product = await extract_dom(page, page_url, platform)

    breadcrumbs = await page.evaluate(
        """(sel) => Array.from(document.querySelectorAll(sel))
              .map(a => (a.textContent || '').trim())
              .filter(t => t && !['Home','Shop','Products'].includes(t))""",
        _SELECTORS_BY_PLATFORM.get(platform, _SELECTORS_BY_PLATFORM["generic"])["breadcrumbs"],
    )

    if ld_product:
        # Fill missing description from DOM if needed
        if not ld_product.get("description") and dom_product and dom_product.get("description"):
            ld_product["description"] = dom_product["description"]
        ld_product["category_path"] = breadcrumbs
        if not ld_product.get("price") and dom_product and dom_product.get("price"):
            ld_product["price"] = dom_product["price"]
        # JSON-LD often omits variant options even when the page is variable.
        # If DOM extraction found variants and JSON-LD did not, inherit them.
        if (not ld_product.get("variants")) and dom_product and dom_product.get("variants"):
            ld_product["variants"] = dom_product.get("variants") or []
        if not ld_product.get("gallery_images") and dom_product:
            ld_product["gallery_images"] = dom_product.get("gallery_images") or []
            ld_product["thumbnail_url"] = ld_product["thumbnail_url"] or dom_product.get("thumbnail_url")
        confidence = 1.0 if ld_product.get("price") and ld_product.get("gallery_images") else 0.85
        return ld_product, confidence

    if dom_product and dom_product.get("price"):
        dom_product["category_path"] = breadcrumbs
        return dom_product, 0.70

    return None, 0.0
