"""
Fallback search — fill catalog gaps when the primary source is sparse.

Two modes:

  --mode search       Search the public web (DuckDuckGo HTML) for product candidates,
                      then scrape them via run_scrape.py's extractor. Real sources,
                      confidence 0.40.

  --mode synthetic    Generate plausible product listings via Claude API.
                      Synthetic, confidence 0.20, marked is_fallback=true.
                      Requires ANTHROPIC_API_KEY. Always shows preview before committing.

We default to `search` because real sources are always preferable. `synthetic`
is a last resort when nothing real surfaces — useful for niche categories where
the open web is thin.

Usage:
    # Find more cognitive peptides via web search
    python scripts/fallback_search.py --category "Cognitive Peptides" --niche "research peptides" --count 5

    # Synthetic fallback (requires ANTHROPIC_API_KEY)
    python scripts/fallback_search.py --category "GHK-Cu derivatives" --niche "skincare peptides" \
        --count 3 --mode synthetic --confirm
"""

from __future__ import annotations

import argparse
import asyncio
import json
import logging
import os
import re
import sys
import uuid
from typing import Any
from urllib.parse import quote_plus, urlparse

import httpx
from playwright.async_api import async_playwright

from _env import load_env
from _normalize import clean_text, dedup_urls, domain_of, slug as slugify
from _robots import assert_allowed
from _supabase import (
    NormalizedProduct,
    NormalizedVariant,
    upsert_normalized_product,
)

log = logging.getLogger("fallback_search")


DDG_HTML = "https://html.duckduckgo.com/html/"
USER_AGENT = (
    "Mozilla/5.0 (compatible; precision-health-bot/1.0; "
    "+https://www.ph-research.store/bot)"
)

# Domains we won't scrape regardless of search ranking — adversarial, paywalled, or off-topic.
DOMAIN_DENYLIST = {
    "amazon.com", "amazon.co.uk", "ebay.com", "alibaba.com", "aliexpress.com",
    "wikipedia.org", "youtube.com", "facebook.com", "instagram.com", "reddit.com",
    "twitter.com", "x.com", "linkedin.com", "pinterest.com",
    "google.com", "bing.com", "duckduckgo.com",
}


def _is_useful_result(url: str) -> bool:
    host = urlparse(url).hostname or ""
    if not host:
        return False
    if any(host.endswith(d) for d in DOMAIN_DENYLIST):
        return False
    # Heuristic: prefer URLs that look like product pages
    path = urlparse(url).path.lower()
    if any(token in path for token in ("/product/", "/products/", "/shop/", "/peptides/", "/p/")):
        return True
    # Allow root domain hits — sometimes the homepage links to category listings
    return True


def _ddg_search(query: str, limit: int = 20) -> list[str]:
    """Scrape DuckDuckGo HTML for result URLs. Best-effort; DDG occasionally rate-limits."""
    with httpx.Client(timeout=15.0, follow_redirects=True, headers={"User-Agent": USER_AGENT}) as client:
        response = client.post(DDG_HTML, data={"q": query})
        response.raise_for_status()

    body = response.text
    # DDG HTML has links of shape: <a class="result__a" href="https://...">
    raw_urls = re.findall(r'<a[^>]+class="result__a"[^>]+href="([^"]+)"', body)

    cleaned: list[str] = []
    for url in raw_urls:
        # DDG sometimes wraps URLs as /l/?uddg=<encoded>
        if url.startswith("/l/?"):
            match = re.search(r"uddg=([^&]+)", url)
            if not match:
                continue
            from urllib.parse import unquote
            url = unquote(match.group(1))
        if not url.startswith("http"):
            continue
        if _is_useful_result(url):
            cleaned.append(url)
        if len(cleaned) >= limit:
            break

    return dedup_urls(cleaned)


# ---------------------------------------------------------------------------
# Scrape mode (real sources)
# ---------------------------------------------------------------------------


async def _scrape_candidates(urls: list[str], *, count: int, rate_limit_ms: int = 1500) -> list[tuple[NormalizedProduct, float]]:
    """Visit candidate URLs, run the same extractor as run_scrape.py, return successful products."""
    from _extract import extract_product

    out: list[tuple[NormalizedProduct, float]] = []

    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        context = await browser.new_context(user_agent=USER_AGENT, locale="en-US")
        page = await context.new_page()

        try:
            for url in urls:
                if len(out) >= count:
                    break
                try:
                    decision = assert_allowed(url, skip=False)
                    log.info("robots_ok url=%s reason=%s", url, decision.reason)
                except PermissionError as exc:
                    log.info("skip_robots_blocked url=%s err=%s", url, exc)
                    continue

                try:
                    await page.goto(url, wait_until="domcontentloaded", timeout=45_000)
                except Exception as exc:
                    log.warning("goto_failed url=%s err=%s", url, exc)
                    continue

                await page.wait_for_timeout(800)
                raw, confidence = await extract_product(page, url)
                if not raw or not raw.get("name") or not raw.get("price"):
                    continue

                source_currency = (raw.get("currency") or "USD").upper()
                try:
                    base_price = float(raw["price"])
                except Exception:
                    continue

                product = NormalizedProduct(
                    source_url=url,
                    source_domain=domain_of(url),
                    slug=slugify(raw["name"]),
                    name=raw["name"].strip(),
                    description=clean_text(raw.get("description")),
                    category_path=raw.get("category_path") or [],
                    base_price=base_price,
                    thumbnail_url=raw.get("thumbnail_url"),
                    gallery_images=dedup_urls(raw.get("gallery_images") or []),
                    variants=[
                        NormalizedVariant(name=v.get("name") or "Option",
                                          value=str(v.get("value") or "Default"),
                                          price_modifier=0.0)
                        for v in (raw.get("variants") or [])
                    ],
                    source_currency=source_currency,
                    source_base_price=base_price,
                )
                # Fallback search products get a confidence floor of 0.4 regardless of extraction quality —
                # the source ranking by search is itself a quality signal we don't trust as highly.
                out.append((product, min(confidence, 0.40)))
                await asyncio.sleep(rate_limit_ms / 1000)
        finally:
            await browser.close()

    return out


# ---------------------------------------------------------------------------
# Synthetic mode (Claude API)
# ---------------------------------------------------------------------------


SYNTHETIC_PROMPT = """\
Generate {count} realistic product listings for a {niche} e-commerce store.
The listings should fit the category: "{category}".

Return JSON only — a single JSON array, no prose, no markdown fences. Each item:

{{
  "name": "Product name (concise, no marketing fluff)",
  "description": "2-3 sentence factual description; never include health claims or therapeutic indications",
  "base_price_eur": 19.99,
  "category_path": ["{category}"],
  "variants": [{{"name": "Weight", "value": "5mg", "price_modifier": 0}}, ...]
}}

Constraints:
- Prices in EUR, between €15 and €450, ending in .99 or .00
- 1-3 variants per product, all with price_modifier >= 0
- No images URLs (we don't make those up)
- No claims of safety, efficacy, or health benefits
- Names should be plausibly real but not copy actual trademarked products
"""


def _synthesise_products(*, niche: str, category: str, count: int) -> list[NormalizedProduct]:
    """Call Claude API to generate plausible products. Requires ANTHROPIC_API_KEY."""
    load_env()
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        raise RuntimeError(
            "ANTHROPIC_API_KEY not set. Synthetic fallback requires Claude API access. "
            "Either set the key in apps/storefront/.env.local, or use --mode search."
        )

    try:
        from anthropic import Anthropic
    except ImportError as exc:
        raise RuntimeError(f"anthropic package not installed: {exc}. Run pip install -r requirements.txt") from exc

    client = Anthropic(api_key=api_key)
    prompt = SYNTHETIC_PROMPT.format(count=count, niche=niche, category=category)
    log.info("synthetic_request count=%d niche=%s category=%s", count, niche, category)

    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=2000,
        messages=[{"role": "user", "content": prompt}],
    )
    text = response.content[0].text  # type: ignore[index]
    # Be lenient about the model wrapping JSON in fences despite instructions
    cleaned = text.strip()
    cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
    cleaned = re.sub(r"\s*```$", "", cleaned)

    try:
        data = json.loads(cleaned)
    except Exception as exc:
        raise RuntimeError(f"Could not parse Claude output as JSON: {exc}\nOutput was: {cleaned[:500]}") from exc

    if not isinstance(data, list):
        raise RuntimeError(f"Expected JSON array; got {type(data).__name__}")

    products: list[NormalizedProduct] = []
    session_id = str(uuid.uuid4())
    for entry in data:
        if not isinstance(entry, dict):
            continue
        name = clean_text(str(entry.get("name") or ""))
        price = entry.get("base_price_eur")
        if not name or price is None:
            continue
        try:
            base_eur = round(float(price), 2)
        except (TypeError, ValueError):
            continue
        variants_raw = entry.get("variants") or []
        variants: list[NormalizedVariant] = []
        for v in variants_raw:
            if not isinstance(v, dict):
                continue
            try:
                mod = float(v.get("price_modifier") or 0)
            except (TypeError, ValueError):
                mod = 0.0
            variants.append(NormalizedVariant(
                name=str(v.get("name") or "Option"),
                value=str(v.get("value") or "Default"),
                price_modifier=max(0.0, mod),
            ))
        products.append(NormalizedProduct(
            source_url=f"urn:claude:claude-sonnet-4-20250514:{session_id}:{slugify(name)}",
            source_domain="synthetic.claude",
            slug=slugify(name),
            name=name,
            description=clean_text(entry.get("description")),
            category_path=entry.get("category_path") or [category],
            base_price=base_eur,
            stock=0,  # synthetic products start at 0 stock — they shouldn't ship until reviewed
            is_active=False,  # also inactive by default
            thumbnail_url=None,
            gallery_images=[],
            variants=variants,
            source_currency="EUR",
            source_base_price=base_eur,
            fx_rate_used=1.0,
        ))
    return products


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Fallback product enrichment via web search or Claude synthetic.")
    parser.add_argument("--category", required=True, help="Category name to fill (e.g. 'Cognitive Peptides').")
    parser.add_argument("--niche", default="research peptides",
                        help="Niche / brand context for search keywords or synthesis prompt.")
    parser.add_argument("--count", type=int, default=5, help="Target number of products (default 5).")
    parser.add_argument("--mode", choices=("search", "synthetic"), default="search",
                        help="search = real web sources; synthetic = Claude-generated. (default search)")
    parser.add_argument("--dry-run", action="store_true",
                        help="Show preview only; don't write to Supabase.")
    parser.add_argument("--confirm", action="store_true",
                        help="Required for --mode synthetic to actually commit (otherwise treated as dry-run).")
    parser.add_argument("--log-level", default="INFO", choices=("DEBUG", "INFO", "WARNING", "ERROR"))
    args = parser.parse_args(argv)

    logging.basicConfig(level=getattr(logging, args.log_level), format="[%(name)s] %(levelname)s %(message)s")

    session_id = str(uuid.uuid4())
    products: list[tuple[NormalizedProduct, float]] = []

    if args.mode == "search":
        query = f"{args.niche} {args.category} buy"
        try:
            urls = _ddg_search(query, limit=args.count * 4)
        except Exception as exc:
            print(f"RESULT: {json.dumps({'error': f'search_failed: {exc}'})}")
            return 1

        log.info("search_returned count=%d query=%s", len(urls), query)
        if not urls:
            print(f"RESULT: {json.dumps({'mode': 'search', 'query': query, 'discovered': 0, 'upserted': 0})}")
            return 0

        try:
            collected = asyncio.run(_scrape_candidates(urls, count=args.count))
        except Exception as exc:
            print(f"RESULT: {json.dumps({'error': f'scrape_failed: {exc}'})}")
            return 1
        products = collected

    else:  # synthetic
        if not args.confirm and not args.dry_run:
            log.warning("synthetic mode without --confirm; treating as --dry-run")
            args.dry_run = True
        try:
            synthetic = _synthesise_products(niche=args.niche, category=args.category, count=args.count)
        except Exception as exc:
            print(f"RESULT: {json.dumps({'error': str(exc)})}")
            return 1
        products = [(p, 0.20) for p in synthetic]

    upserted = 0
    failed = 0
    preview: list[dict[str, Any]] = []

    for product, confidence in products:
        if args.dry_run:
            preview.append({
                "name": product.name,
                "slug": product.slug,
                "basePriceEur": product.base_price,
                "sourceUrl": product.source_url,
                "sourceDomain": product.source_domain,
                "confidence": confidence,
                "categoryPath": product.category_path,
                "imageCount": len(product.gallery_images),
                "variantCount": len(product.variants),
            })
            continue
        try:
            upsert_normalized_product(
                product,
                scrape_session_id=session_id,
                confidence_score=confidence,
                is_fallback=True,
            )
            upserted += 1
        except Exception as exc:
            log.warning("upsert_failed slug=%s err=%s", product.slug, exc)
            failed += 1

    result = {
        "mode": args.mode,
        "category": args.category,
        "niche": args.niche,
        "sessionId": session_id,
        "discovered": len(products),
        "upserted": upserted,
        "failed": failed,
        "dryRun": args.dry_run,
    }
    if args.dry_run:
        result["preview"] = preview[:10]

    print(f"RESULT: {json.dumps(result)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
