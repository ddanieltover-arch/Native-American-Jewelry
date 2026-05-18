"""
Canonical URL reconciler for PeptidePeak products.

Problem this solves:
- Some products share the same name/slug across multiple PDP URLs (`.../slug/` and `.../slug-2/`).
- A later scrape of the alternate URL can overwrite base_price/source_url and clear variants.

This script re-scrapes from the canonical URL when present and restores variants/pricing.

Canonical URL rule per product slug:
  https://peptidepeak.online/product/{slug}/

If that exact URL exists in source_tracking for the product, use it. Otherwise keep current source_url.
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
from urllib.parse import urlparse

from playwright.async_api import async_playwright

import _env  # noqa: F401
from _supabase import get_client, upsert_normalized_product
from run_scrape import _new_context, scrape_one

log = logging.getLogger("reconcile_canonical")


def canon(url: str) -> str:
    p = urlparse(url)
    return f"https://{(p.hostname or '').lower()}{(p.path or '/').rstrip('/')}/".lower()


def rows_for_domain(domain: str) -> list[dict]:
    sb = get_client()
    return (
        sb.table("products")
        .select("id,slug,name,source_url,base_price")
        .ilike("source_url", f"%{domain}%")
        .execute()
        .data
        or []
    )


def tracking_urls(product_id: str) -> list[str]:
    sb = get_client()
    rows = (
        sb.table("source_tracking")
        .select("source_url")
        .eq("product_id", product_id)
        .order("scraped_at", desc=True)
        .limit(200)
        .execute()
        .data
        or []
    )
    out: list[str] = []
    seen: set[str] = set()
    for r in rows:
        u = r.get("source_url")
        if not u:
            continue
        cu = canon(u)
        if cu in seen:
            continue
        seen.add(cu)
        out.append(u)
    return out


def variant_count(product_id: str) -> int:
    sb = get_client()
    rows = (
        sb.table("variants")
        .select("id")
        .eq("product_id", product_id)
        .limit(1000)
        .execute()
        .data
        or []
    )
    return len(rows)


def pick_canonical(slug: str, current: str, tracked: list[str]) -> str:
    expected = f"https://peptidepeak.online/product/{slug}/"
    expected_canon = canon(expected)
    for u in tracked:
        if canon(u) == expected_canon:
            return u
    return current


async def run(args: argparse.Namespace) -> dict:
    started_at = datetime.now(timezone.utc).isoformat()
    session_id = args.session_id or str(uuid.uuid4())

    rows = rows_for_domain(args.domain)
    if args.slug:
        rows = [r for r in rows if (r.get("slug") or "") == args.slug]

    checked = 0
    updated = 0
    skipped = 0
    failed = 0
    details: list[dict] = []

    async with async_playwright() as pw:
        browser = await pw.chromium.launch(
            headless=True,
            args=["--disable-blink-features=AutomationControlled", "--no-sandbox"],
        )
        try:
            ctx = await _new_context(browser, ua_mode=args.ua)
            page = await ctx.new_page()

            for row in rows:
                checked += 1
                pid = row["id"]
                slug = row.get("slug") or ""
                current_url = row.get("source_url") or ""
                tracked = tracking_urls(pid)
                prefer = pick_canonical(slug, current_url, tracked)
                v_before = variant_count(pid)

                needs = args.all or (v_before == 0) or (prefer != current_url) or current_url.rstrip('/').endswith('-2')
                if not needs:
                    skipped += 1
                    continue

                try:
                    product, confidence = await scrape_one(page, prefer)
                except Exception as exc:
                    failed += 1
                    details.append({"slug": slug, "url": prefer, "error": f"scrape_exc:{exc}"})
                    continue

                if not product:
                    failed += 1
                    details.append({"slug": slug, "url": prefer, "error": "no_product"})
                    continue

                product.slug = slug or product.slug

                if args.dry_run:
                    details.append({
                        "slug": slug,
                        "currentUrl": current_url,
                        "preferredUrl": prefer,
                        "basePriceBefore": row.get("base_price"),
                        "basePriceAfter": product.base_price,
                        "variantsAfter": len(product.variants),
                    })
                    continue

                try:
                    upsert_normalized_product(
                        product,
                        scrape_session_id=session_id,
                        confidence_score=confidence,
                    )
                    updated += 1
                    details.append({
                        "slug": slug,
                        "currentUrl": current_url,
                        "preferredUrl": prefer,
                        "basePriceBefore": row.get("base_price"),
                        "basePriceAfter": product.base_price,
                        "variantsBefore": v_before,
                        "variantsAfter": len(product.variants),
                    })
                except Exception as exc:
                    failed += 1
                    details.append({"slug": slug, "url": prefer, "error": f"upsert:{exc}"})
        finally:
            await browser.close()

    completed_at = datetime.now(timezone.utc).isoformat()
    result = {
        "sessionId": session_id,
        "startedAt": started_at,
        "completedAt": completed_at,
        "domain": args.domain,
        "checked": checked,
        "updated": updated,
        "skipped": skipped,
        "failed": failed,
        "dryRun": args.dry_run,
        "details": details[:200],
    }

    workspace_root = Path(__file__).resolve().parent.parent.parent
    session_dir = workspace_root / ".tmp" / "scrape-sessions"
    session_dir.mkdir(parents=True, exist_ok=True)
    (session_dir / f"{session_id}.json").write_text(json.dumps(result, indent=2), encoding="utf-8")
    return result


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Reconcile product records from canonical source URLs.")
    parser.add_argument("--domain", default="peptidepeak.online")
    parser.add_argument("--slug", default=None, help="Only reconcile one slug")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--all", action="store_true", help="Re-scrape every product for the domain")
    parser.add_argument("--ua", choices=("default", "chrome"), default="default")
    parser.add_argument("--session-id", default=None)
    parser.add_argument("--log-level", default="INFO", choices=("DEBUG", "INFO", "WARNING", "ERROR"))
    args = parser.parse_args(argv)

    logging.basicConfig(level=getattr(logging, args.log_level), format="[%(name)s] %(levelname)s %(message)s")

    try:
        out = asyncio.run(run(args))
    except Exception as exc:
        print(f"RESULT: {json.dumps({'error': str(exc)})}")
        return 1

    print(f"RESULT: {json.dumps({k: v for k, v in out.items() if k != 'details'})}")
    return 0 if out.get("failed", 0) == 0 else (0 if out.get("updated", 0) > 0 else 1)


if __name__ == "__main__":
    sys.exit(main())
