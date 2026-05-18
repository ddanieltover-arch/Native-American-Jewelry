"""
URL-parametric scraper. Three modes:

  --mode product       Scrape a single product page.
  --mode catalog       Scrape a listing/category root and walk pagination.
  --reprice-only       Skip scraping; recompute EUR prices for existing products.

Always idempotent. Always emits a single `RESULT:` JSON line to stdout for the
agent to parse.

Examples:
    python scripts/run_scrape.py --url https://example.com/product/x --mode product
    python scripts/run_scrape.py --url https://example.com/shop/   --mode catalog --max-pages 10
    python scripts/run_scrape.py --reprice-only

See SKILL.md for the decision tree on when to use each mode.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import logging
import os
import re
import sys
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional
from urllib.parse import urljoin, urlparse

from playwright.async_api import Browser, BrowserContext, Page, async_playwright

from _extract import extract_product
from _normalize import (
    base_name,
    clean_text,
    dedup_urls,
    domain_of,
    should_apply_base_name_dedup,
    slug as slugify,
)
from _robots import assert_allowed
from _supabase import (
    NormalizedProduct,
    NormalizedVariant,
    already_seen_domain,
    fetch_all_product_slugs,
    reprice_existing_products,
    upsert_normalized_product,
)
from fx_rates import quote_eur
log = logging.getLogger("run_scrape")

DEFAULT_UA = (
    "Mozilla/5.0 (compatible; precision-health-bot/1.0; "
    "+https://www.ph-research.store/bot)"
)
CHROME_UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
)


# ---------------------------------------------------------------------------
# Browser plumbing
# ---------------------------------------------------------------------------


async def _new_context(browser: Browser, *, ua_mode: str) -> BrowserContext:
    ua = CHROME_UA if ua_mode == "chrome" else DEFAULT_UA
    return await browser.new_context(
        user_agent=ua,
        viewport={"width": 1366, "height": 900},
        locale="en-US",
    )


async def _dismiss_modals(page: Page) -> None:
    """Best-effort dismissal of common cookie banners, age gates, newsletter popups."""
    try:
        await page.get_by_role("button", name=lambda n: bool(n) and any(
            w in n.lower() for w in ("accept", "agree", "close", "ok", "continue")
        )).first.click(timeout=2000)
    except Exception:
        pass
    for selector in (
        'text="I am over 18"',
        'text="Browse All Products"',
        'text="I\'ll look around first"',
        '[aria-label="Close"]',
    ):
        try:
            await page.click(selector, timeout=1500)
        except Exception:
            pass


# ---------------------------------------------------------------------------
# Catalog: discover product URLs
# ---------------------------------------------------------------------------


async def discover_product_urls(
    page: Page,
    base_url: str,
    *,
    max_pages: int,
    rate_limit_ms: int,
) -> list[str]:
    """Walk listing pages and return deduped product URLs.

    Tries `?page=N` first, then `/page/N/` (WooCommerce convention).
    Stops as soon as a page returns zero new product URLs.
    """
    seen: set[str] = set()
    base_clean = base_url.rstrip("/")
    for page_number in range(1, max_pages + 1):
        if page_number == 1:
            list_url = base_url
        else:
            # Try both common pagination patterns; first that works wins.
            candidates = [f"{base_clean}/page/{page_number}/", f"{base_clean}?page={page_number}"]
            list_url = candidates[0]
            for cand in candidates:
                try:
                    response = await page.goto(cand, wait_until="domcontentloaded", timeout=60_000)
                    if response and response.status == 200:
                        list_url = cand
                        break
                except Exception:
                    continue
            else:
                break
        if page_number == 1:
            try:
                await page.goto(list_url, wait_until="domcontentloaded", timeout=60_000)
            except Exception as exc:
                log.warning("listing_load_failed url=%s err=%s", list_url, exc)
                break
        await _dismiss_modals(page)
        await page.wait_for_timeout(800)

        raw_urls = await page.evaluate(
            """(rootHost) => {
                const out = new Set();
                const sels = [
                    'a[href*="/product/"]',
                    'a[href*="/products/"]',
                    '.product a',
                    '.product-small a',
                    '.products a',
                ];
                for (const sel of sels) {
                    document.querySelectorAll(sel).forEach((a) => {
                        const href = a.href;
                        if (!href) return;
                        try {
                            const u = new URL(href);
                            if (u.host !== rootHost) return;
                            if (u.pathname.includes('/cart') || u.pathname.includes('/checkout')) return;
                            out.add(u.href.split('#')[0]);
                        } catch {}
                    });
                }
                return Array.from(out);
            }""",
            urlparse(base_url).hostname,
        )

        def _is_product_detail_url(url: str) -> bool:
            """WooCommerce listing grids often link to ?add-to-cart=… or the shop root — skip those."""
            p = urlparse(url)
            path = p.path.lower()
            q = (p.query or "").lower()
            if "add-to-cart" in q:
                return False
            return "/product/" in path or "/products/" in path

        new_urls = [u for u in raw_urls if _is_product_detail_url(u)]

        before = len(seen)
        for url in new_urls:
            seen.add(url)
        if len(seen) == before:
            log.info("pagination_done page=%d total_urls=%d", page_number, len(seen))
            break

        log.info("listing_page_done page=%d new_urls=%d total=%d", page_number, len(seen) - before, len(seen))
        await asyncio.sleep(rate_limit_ms / 1000)

    return sorted(seen)


# ---------------------------------------------------------------------------
# Single product → NormalizedProduct
# ---------------------------------------------------------------------------


async def scrape_one(page: Page, url: str) -> tuple[Optional[NormalizedProduct], float]:
    """Visit a single product URL and return (NormalizedProduct or None, confidence)."""
    try:
        await page.goto(url, wait_until="domcontentloaded", timeout=60_000)
    except Exception as exc:
        log.warning("product_goto_failed url=%s err=%s", url, exc)
        return None, 0.0

    await _dismiss_modals(page)
    await page.wait_for_timeout(600)

    raw, confidence = await extract_product(page, url)
    if not raw:
        log.warning("extract_empty url=%s", url)
        return None, 0.0

    name = raw.get("name") or ""
    if len(name.strip()) < 2:
        log.warning("extract_no_name url=%s", url)
        return None, 0.0

    source_currency = (raw.get("currency") or "USD").upper()
    source_base = raw.get("price")
    if source_base is None or source_base <= 0:
        log.warning("extract_no_price url=%s", url)
        return None, 0.0

    # Keep reference-site price exactly as shown (no FX conversion).
    source_base_price = float(source_base)

    variants_raw = raw.get("variants") or []
    # Some WooCommerce themes render variable attributes inside tabbed "Additional information"
    # content as plain text/markdown-like rows (e.g. "| weight | 50mg/cap |"), which our
    # DOM selectors can miss. Parse a lightweight fallback from visible page text only when
    # no variants were detected from JSON-LD/DOM extraction.
    if not variants_raw:
        try:
            body_text = await page.evaluate("() => document.body?.innerText || ''")
            weight_matches = re.findall(
                r"(?:^|\n)\s*(?:\|\s*)?(weight|size|dose|dosage|strength)\s*(?:\|\s*|:\s*)([^\n|]{2,64})",
                body_text,
                flags=re.IGNORECASE,
            )
            for attr, val in weight_matches:
                value = val.strip().strip("|").strip()
                if not value:
                    continue
                if re.search(r"choose an option|clear|add to cart", value, flags=re.IGNORECASE):
                    continue
                variants_raw.append({"name": attr.title(), "value": value, "price": None})
        except Exception:
            pass
    variants: list[NormalizedVariant] = []
    for v in variants_raw:
        v_price = v.get("price")
        modifier_source = 0.0
        if v_price is not None:
            try:
                modifier_source = max(0.0, float(v_price) - source_base_price)
            except Exception:
                modifier_source = 0.0
        variants.append(NormalizedVariant(
            name=v.get("name") or "Option",
            value=str(v.get("value") or "Default"),
            price_modifier=modifier_source,
        ))

    return (
        NormalizedProduct(
            source_url=url,
            source_domain=domain_of(url),
            slug=slugify(name),
            name=name.strip(),
            description=clean_text(raw.get("description")),
            short_desc=None,
            category_path=raw.get("category_path", []) or [],
            base_price=source_base_price,
            compare_price=None,
            stock=100,
            thumbnail_url=raw.get("thumbnail_url"),
            gallery_images=dedup_urls(raw.get("gallery_images") or []),
            variants=variants,
            source_currency=source_currency,
            source_base_price=source_base_price,
            source_compare_price=None,
            fx_rate_used=1.0,
        ),
        confidence,
    )


# ---------------------------------------------------------------------------
# base-name dedup across multiple URLs (catalog mode)
# ---------------------------------------------------------------------------


def merge_by_base_name(products: list[NormalizedProduct]) -> list[NormalizedProduct]:
    """Merge dosage variants of the same base product (e.g., BPC-157 5mg + 10mg → 1 product, 2 variants).

    Only applied when category context suggests dosage variants (peptide/supplement domains).
    Keeps the cheapest variant as the base price; everything else becomes priceModifier > 0.
    """
    by_key: dict[str, NormalizedProduct] = {}
    for product in products:
        if not should_apply_base_name_dedup(product.category_path):
            by_key[product.slug] = product
            continue
        key = slugify(base_name(product.name))
        existing = by_key.get(key)
        if not existing:
            existing = NormalizedProduct(
                source_url=product.source_url,
                source_domain=product.source_domain,
                slug=key,
                name=base_name(product.name),
                description=product.description,
                category_path=product.category_path,
                base_price=product.base_price,
                thumbnail_url=product.thumbnail_url,
                gallery_images=list(product.gallery_images),
                variants=list(product.variants),
                source_currency=product.source_currency,
                source_base_price=product.source_base_price,
                fx_rate_used=product.fx_rate_used,
            )
            # Promote the per-page name into a Weight variant
            weight = product.name[len(base_name(product.name)):].strip(" -")
            if weight:
                existing.variants.append(NormalizedVariant(
                    name="Weight",
                    value=weight,
                    price_modifier=0.0,
                ))
            by_key[key] = existing
            continue

        # Merge images
        existing.gallery_images = dedup_urls([*existing.gallery_images, *product.gallery_images])
        if not existing.thumbnail_url and product.thumbnail_url:
            existing.thumbnail_url = product.thumbnail_url
        # Cheapest base wins; promote all higher prices to variants
        if product.base_price < existing.base_price:
            # Demote previous base into a variant
            existing.variants.append(NormalizedVariant(
                name="Weight",
                value=existing.name[len(base_name(existing.name)):].strip(" -") or "Default",
                price_modifier=existing.base_price - product.base_price,
            ))
            existing.base_price = product.base_price
            existing.source_url = product.source_url  # cheapest URL becomes canonical
        else:
            existing.variants.append(NormalizedVariant(
                name="Weight",
                value=product.name[len(base_name(product.name)):].strip(" -") or "Default",
                price_modifier=product.base_price - existing.base_price,
            ))
        # Carry through any per-page variants
        for v in product.variants:
            existing.variants.append(v)
    # Dedup variants by (name, value) keeping the lowest priceModifier
    for prod in by_key.values():
        seen: dict[tuple[str, str], NormalizedVariant] = {}
        for v in prod.variants:
            key2 = (v.name, v.value)
            if key2 not in seen or v.price_modifier < seen[key2].price_modifier:
                seen[key2] = v
        prod.variants = list(seen.values())
    return list(by_key.values())


# ---------------------------------------------------------------------------
# Session orchestration
# ---------------------------------------------------------------------------


async def run_session(args: argparse.Namespace) -> dict[str, Any]:
    session_id = args.session_id or str(uuid.uuid4())
    started_at = datetime.now(timezone.utc).isoformat()
    source_domain = domain_of(args.url)

    # Default dry-run for unseen domains unless user explicitly disabled it
    dry_run = args.dry_run
    if not args.no_default_dryrun and dry_run is False:
        try:
            if not already_seen_domain(source_domain):
                log.info("first_contact_domain=%s defaulting_to_dry_run", source_domain)
                dry_run = True
        except Exception as exc:
            log.warning("seen_domain_check_failed err=%s", exc)

    if not args.skip_robots:
        try:
            decision = assert_allowed(args.url, skip=False)
            log.info("robots_check decision=%s delay=%s", decision.reason, decision.crawl_delay_ms)
        except PermissionError as exc:
            return {
                "sessionId": session_id,
                "startedAt": started_at,
                "completedAt": datetime.now(timezone.utc).isoformat(),
                "error": str(exc),
                "discovered": 0,
                "upserted": 0,
                "failed": 0,
            }
    else:
        log.warning("robots_check_skipped url=%s", args.url)

    discovered = 0
    upserted = 0
    failed = 0
    skipped_existing_slug = 0
    failed_urls: list[str] = []
    sample_products: list[dict[str, Any]] = []

    existing_slugs: set[str] = set()
    if args.skip_if_slug_exists:
        try:
            existing_slugs = fetch_all_product_slugs()
            log.info("skip_if_slug_exists loaded_existing_slugs=%d", len(existing_slugs))
        except Exception as exc:
            log.error("fetch_product_slugs_failed err=%s", exc)
            return {
                "sessionId": session_id,
                "startedAt": started_at,
                "completedAt": datetime.now(timezone.utc).isoformat(),
                "error": f"fetch_product_slugs_failed:{exc}",
                "discovered": 0,
                "upserted": 0,
                "skippedExistingSlug": 0,
                "failed": 0,
                "dryRun": dry_run,
            }

    async with async_playwright() as pw:
        browser = await pw.chromium.launch(
            headless=True,
            args=[
                "--disable-blink-features=AutomationControlled",
                "--no-sandbox",
            ],
        )
        try:
            context = await _new_context(browser, ua_mode=args.ua)
            page = await context.new_page()

            if args.mode == "product":
                urls = [args.url]
            else:
                urls = await discover_product_urls(
                    page,
                    args.url,
                    max_pages=args.max_pages,
                    rate_limit_ms=args.rate_limit_ms,
                )
                if not urls:
                    log.warning("zero_products_discovered url=%s", args.url)

            discovered = len(urls)
            collected: list[tuple[NormalizedProduct, float]] = []

            for idx, product_url in enumerate(urls):
                try:
                    product, confidence = await scrape_one(page, product_url)
                except Exception as exc:
                    log.warning("scrape_one_threw url=%s err=%s", product_url, exc)
                    failed += 1
                    failed_urls.append(product_url)
                    continue
                if not product:
                    failed += 1
                    failed_urls.append(product_url)
                    continue
                collected.append((product, confidence))
                await asyncio.sleep(args.rate_limit_ms / 1000)

            # Merge dosage variants only in catalog mode
            if args.mode == "catalog":
                merged = merge_by_base_name([p for p, _ in collected])
                # Re-attach a representative confidence (min across merged inputs)
                conf_by_slug = {p.slug: c for p, c in collected}
                collected = [(p, conf_by_slug.get(p.slug, 0.85)) for p in merged]

            for product, confidence in collected:
                if args.skip_if_slug_exists and product.slug in existing_slugs:
                    skipped_existing_slug += 1
                    log.info("skip_existing_slug slug=%s url=%s", product.slug, product.source_url)
                    if dry_run:
                        sample_products.append({
                            "name": product.name,
                            "slug": product.slug,
                            "basePriceEur": product.base_price,
                            "thumbnailUrl": product.thumbnail_url,
                            "categoryPath": product.category_path,
                            "variantCount": len(product.variants),
                            "imageCount": len(product.gallery_images),
                            "confidence": confidence,
                            "sourceUrl": product.source_url,
                            "skippedExistingSlug": True,
                        })
                    continue
                if dry_run:
                    sample_products.append({
                        "name": product.name,
                        "slug": product.slug,
                        "basePriceEur": product.base_price,
                        "thumbnailUrl": product.thumbnail_url,
                        "categoryPath": product.category_path,
                        "variantCount": len(product.variants),
                        "imageCount": len(product.gallery_images),
                        "confidence": confidence,
                        "sourceUrl": product.source_url,
                    })
                    continue
                try:
                    upsert_normalized_product(
                        product,
                        scrape_session_id=session_id,
                        confidence_score=confidence,
                    )
                    upserted += 1
                    existing_slugs.add(product.slug)
                except Exception as exc:
                    log.warning("upsert_failed slug=%s err=%s", product.slug, exc)
                    failed += 1
                    failed_urls.append(product.source_url)
        finally:
            await browser.close()

    completed_at = datetime.now(timezone.utc).isoformat()
    result: dict[str, Any] = {
        "sessionId": session_id,
        "startedAt": started_at,
        "completedAt": completed_at,
        "sourceRootUrl": args.url,
        "sourceDomain": source_domain,
        "discovered": discovered,
        "upserted": upserted,
        "skippedExistingSlug": skipped_existing_slug,
        "failed": failed,
        "failedUrls": failed_urls[:20],
        "dryRun": dry_run,
    }
    if dry_run:
        result["preview"] = sample_products[:5]

    # Persist a session record for offline review (per CLAUDE.md `.tmp/`).
    workspace_root = Path(__file__).resolve().parent.parent.parent
    session_dir = workspace_root / ".tmp" / "scrape-sessions"
    session_dir.mkdir(parents=True, exist_ok=True)
    (session_dir / f"{session_id}.json").write_text(
        json.dumps(result, indent=2), encoding="utf-8"
    )

    return result


async def run_reprice(args: argparse.Namespace) -> dict[str, Any]:
    started_at = datetime.now(timezone.utc).isoformat()
    summary = reprice_existing_products(fx_quote_fn=quote_eur, dry_run=args.dry_run)
    summary["startedAt"] = started_at
    summary["completedAt"] = datetime.now(timezone.utc).isoformat()
    summary["mode"] = "reprice-only"
    return summary


# ---------------------------------------------------------------------------
# CLI entrypoint
# ---------------------------------------------------------------------------


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="URL-parametric scraper for the Precision Health catalog.")
    parser.add_argument("--url", help="Source URL (product page or listing/category root).")
    parser.add_argument("--mode", choices=("product", "catalog"), default="catalog",
                        help="product = single page; catalog = walk pagination. Default: catalog.")
    parser.add_argument("--reprice-only", action="store_true",
                        help="Skip scraping. Reprice existing products from snapshot source prices.")
    parser.add_argument("--max-pages", type=int, default=20, help="Pagination cap for catalog mode (default 20).")
    parser.add_argument("--rate-limit-ms", type=int, default=1200,
                        help="Delay between requests in ms (default 1200).")
    parser.add_argument("--dry-run", action="store_true",
                        help="Don't write to Supabase; print preview only.")
    parser.add_argument("--no-default-dryrun", action="store_true",
                        help="Skip the auto-dry-run on first-contact domains.")
    parser.add_argument("--skip-robots", action="store_true",
                        help="Skip robots.txt check. Use only with explicit user reason.")
    parser.add_argument("--ua", choices=("default", "chrome"), default="default",
                        help="User-Agent strategy. 'chrome' for sites that block bot UAs.")
    parser.add_argument("--session-id", help="Override the auto-generated scrape session ID.")
    parser.add_argument(
        "--skip-if-slug-exists",
        action="store_true",
        help=(
            "Do not upsert when products.slug already exists (secondary sources: add-only, "
            "no overwrite)."
        ),
    )
    parser.add_argument("--log-level", default="INFO", choices=("DEBUG", "INFO", "WARNING", "ERROR"))
    args = parser.parse_args(argv)

    logging.basicConfig(
        level=getattr(logging, args.log_level),
        format="[%(name)s] %(levelname)s %(message)s",
    )

    # Mode validation
    if args.reprice_only:
        if args.url:
            log.warning("--url ignored in --reprice-only mode")
        result = asyncio.run(run_reprice(args))
        print(f"RESULT: {json.dumps(result)}")
        return 0

    if not args.url:
        parser.error("--url is required unless --reprice-only is set")

    try:
        result = asyncio.run(run_session(args))
    except KeyboardInterrupt:
        log.warning("interrupted by user")
        return 130
    except Exception as exc:
        log.exception("scrape session crashed")
        print(f"RESULT: {json.dumps({'error': str(exc)})}")
        return 1

    print(f"RESULT: {json.dumps(result)}")
    return 0 if result.get("failed", 0) == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
