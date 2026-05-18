"""
Resume scrape for listing URLs that never received a `source_tracking` row.

Catalog mode merges dosage variants before upsert, so only the canonical URL per
merged slug gets written once — sibling PDP URLs (same peptide, different mg URL)
never appear in `source_tracking`. Re-running full catalog with merge would skip
re-processing those rows intelligibly; this script fills the gap.

Flow:
  1. Discover all `/product/` URLs from the shop listing (same as run_scrape).
  2. Load every distinct `source_tracking.source_url` for `source_domain`.
  3. Canonicalise URLs and diff → missing.
  4. Scrape each missing URL with `scrape_one` (no merge) and upsert.

Usage:
    python scripts/resume_missing.py --url https://peptidepeak.online/shop/ --max-pages 22
    python scripts/resume_missing.py --url https://peptidepeak.online/shop/ --dry-run
"""

from __future__ import annotations

import argparse
import asyncio
import json
import logging
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

from playwright.async_api import async_playwright

import _env  # noqa: F401  — UTF-8 stdio

from _robots import assert_allowed
from _supabase import get_client, upsert_normalized_product

from run_scrape import discover_product_urls, scrape_one, _new_context

log = logging.getLogger("resume_missing")


def canon_product_url(url: str) -> str:
    """Normalise URL so listing vs DB comparisons match."""
    raw = url.strip().split("#")[0].strip()
    p = urlparse(raw)
    scheme = "https" if p.scheme in ("http", "https") else (p.scheme or "https")
    host = (p.hostname or "").lower()
    path = (p.path or "/").rstrip("/") + "/"
    return f"{scheme}://{host}{path}".lower()


def fetch_tracked_urls(source_domain: str) -> set[str]:
    """All source URLs we've ever recorded for this domain."""
    sb = get_client()
    out: set[str] = set()
    batch = 1000
    start = 0
    while True:
        res = (
            sb.table("source_tracking")
            .select("source_url")
            .eq("source_domain", source_domain)
            .range(start, start + batch - 1)
            .execute()
        )
        rows = res.data or []
        for row in rows:
            out.add(canon_product_url(row["source_url"]))
        if len(rows) < batch:
            break
        start += batch
    return out


async def run(args: argparse.Namespace) -> dict[str, Any]:
    started_at = datetime.now(timezone.utc).isoformat()
    session_id = args.session_id or str(uuid.uuid4())

    base_url = args.url
    parsed = urlparse(base_url)
    source_domain = (parsed.hostname or "").lower()
    if not source_domain:
        raise ValueError("Could not parse hostname from --url")

    if not args.skip_robots:
        assert_allowed(base_url, skip=False)

    tracked = fetch_tracked_urls(source_domain)
    log.info("tracked_urls domain=%s count=%d", source_domain, len(tracked))

    upserted = 0
    failed = 0
    failed_urls: list[str] = []
    preview: list[dict[str, Any]] = []

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

            discovered_raw = await discover_product_urls(
                page,
                base_url,
                max_pages=args.max_pages,
                rate_limit_ms=args.rate_limit_ms,
            )
            missing_raw = [u for u in discovered_raw if canon_product_url(u) not in tracked]

            log.info(
                "discovered=%d tracked_canon=%d missing=%d",
                len(discovered_raw),
                len(tracked),
                len(missing_raw),
            )

            for product_url in missing_raw:
                try:
                    product, confidence = await scrape_one(page, product_url)
                except Exception as exc:
                    log.warning("scrape_one_threw url=%s err=%s", product_url, exc)
                    failed += 1
                    failed_urls.append(product_url)
                    await asyncio.sleep(args.rate_limit_ms / 1000)
                    continue
                if not product:
                    log.warning("scrape_empty url=%s", product_url)
                    failed += 1
                    failed_urls.append(product_url)
                    await asyncio.sleep(args.rate_limit_ms / 1000)
                    continue

                if args.dry_run:
                    preview.append(
                        {
                            "name": product.name,
                            "slug": product.slug,
                            "sourceUrl": product.source_url,
                            "basePriceEur": product.base_price,
                            "confidence": confidence,
                        }
                    )
                else:
                    try:
                        upsert_normalized_product(
                            product,
                            scrape_session_id=session_id,
                            confidence_score=confidence,
                        )
                        upserted += 1
                        log.info("upserted slug=%s url=%s", product.slug, product_url)
                    except Exception as exc:
                        log.warning("upsert_failed slug=%s err=%s", product.slug, exc)
                        failed += 1
                        failed_urls.append(product_url)

                await asyncio.sleep(args.rate_limit_ms / 1000)
        finally:
            await browser.close()

    completed_at = datetime.now(timezone.utc).isoformat()
    result: dict[str, Any] = {
        "sessionId": session_id,
        "startedAt": started_at,
        "completedAt": completed_at,
        "sourceDomain": source_domain,
        "listingUrl": base_url,
        "discoveredUrls": len(discovered_raw),
        "trackedUrls": len(tracked),
        "missingUrls": len(missing_raw),
        "upserted": upserted,
        "failed": failed,
        "failedUrls": failed_urls[:50],
        "dryRun": args.dry_run,
    }
    if args.dry_run:
        result["preview"] = preview[:20]

    workspace_root = Path(__file__).resolve().parent.parent.parent
    session_dir = workspace_root / ".tmp" / "scrape-sessions"
    session_dir.mkdir(parents=True, exist_ok=True)
    (session_dir / f"{session_id}.json").write_text(json.dumps(result, indent=2), encoding="utf-8")

    return result


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Scrape listing URLs missing from source_tracking (post-catalog-merge gap fill)."
    )
    parser.add_argument("--url", required=True, help="Shop listing root (same as catalog scrape).")
    parser.add_argument("--max-pages", type=int, default=22)
    parser.add_argument("--rate-limit-ms", type=int, default=1200)
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--skip-robots", action="store_true")
    parser.add_argument("--ua", choices=("default", "chrome"), default="default")
    parser.add_argument("--session-id", default=None)
    parser.add_argument("--log-level", default="INFO", choices=("DEBUG", "INFO", "WARNING", "ERROR"))
    args = parser.parse_args(argv)

    logging.basicConfig(level=getattr(logging, args.log_level), format="[%(name)s] %(levelname)s %(message)s")

    try:
        result = asyncio.run(run(args))
    except Exception as exc:
        log.exception("resume_missing crashed")
        print(f"RESULT: {json.dumps({'error': str(exc)})}")
        return 1

    print(f"RESULT: {json.dumps(result)}")
    return 0 if result.get("failed", 0) == 0 else (0 if result.get("upserted", 0) > 0 else 1)


if __name__ == "__main__":
    sys.exit(main())
