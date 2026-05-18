"""
Shared Supabase client + catalog upsert helpers.

All scripts that talk to Supabase go through this module so the schema mapping
lives in exactly one place. If `precision-health-store/supabase/schema.sql`
changes, this is the only file that needs updating.

We use the service role key — these scripts run server-side / from the
workspace and need to bypass RLS for ingestion. Never expose this client
or its key to anything browser-facing.
"""

from __future__ import annotations

import json
import logging
import os
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Iterable, Optional

from supabase import Client, create_client

from _env import load_env, require

log = logging.getLogger(__name__)

_CLIENT: Client | None = None


def get_client() -> Client:
    """Singleton Supabase admin client. Loads env on first call."""
    global _CLIENT
    if _CLIENT is not None:
        return _CLIENT
    load_env()
    url = require("SUPABASE_URL", fallback="NEXT_PUBLIC_SUPABASE_URL")
    key = require("SUPABASE_SERVICE_ROLE_KEY")
    _CLIENT = create_client(url, key)
    return _CLIENT


# ---------------------------------------------------------------------------
# Data shape — mirrors services/scraper/src/types.ts NormalizedProduct so the
# Node and Python scrapers can interoperate (e.g., snapshots written by one
# can be read by the other for re-ingestion).
# ---------------------------------------------------------------------------


@dataclass
class NormalizedVariant:
    name: str
    value: str
    price_modifier: float = 0.0
    stock: int = 0
    sku: Optional[str] = None


@dataclass
class NormalizedProduct:
    """Currency-agnostic at the type level; price fields below are EUR after FX conversion."""

    source_url: str
    source_domain: str
    slug: str
    name: str
    base_price: float                                # EUR
    description: Optional[str] = None
    short_desc: Optional[str] = None
    category_path: list[str] = field(default_factory=list)
    compare_price: Optional[float] = None            # EUR
    cost_price: Optional[float] = None               # EUR
    stock: int = 100
    is_active: bool = True
    is_featured: bool = False
    meta_title: Optional[str] = None
    meta_desc: Optional[str] = None
    thumbnail_url: Optional[str] = None
    gallery_images: list[str] = field(default_factory=list)
    variants: list[NormalizedVariant] = field(default_factory=list)

    # Provenance — preserved through the pipeline for audit; written into product_snapshots.raw_payload.
    source_currency: str = "EUR"
    source_base_price: Optional[float] = None        # original currency, pre-FX
    source_compare_price: Optional[float] = None     # original currency, pre-FX
    fx_rate_used: Optional[float] = None             # multiplier applied to source price


# ---------------------------------------------------------------------------
# Upsert helpers
# ---------------------------------------------------------------------------


def _category_slug(path: list[str]) -> str:
    """Slugify a hierarchical category path. Mirrors the Node scraper's behaviour."""
    from slugify import slugify

    return slugify(" ".join(path), lowercase=True, separator="-")


def upsert_category_path(path: list[str]) -> Optional[str]:
    """Upsert a category hierarchy. Returns the leaf category id (or None for empty path).

    Categories are flat-keyed by slug. Hierarchy via `parent_id` is preserved when
    multiple levels are provided.
    """
    if not path:
        return None
    sb = get_client()
    parent_id: Optional[str] = None
    leaf_id: Optional[str] = None

    for depth, name in enumerate(path):
        slug = _category_slug(path[: depth + 1])
        payload: dict[str, Any] = {"name": name, "slug": slug}
        if parent_id is not None:
            payload["parent_id"] = parent_id

        result = sb.table("categories").upsert(payload, on_conflict="slug").execute()
        if not result.data:
            raise RuntimeError(f"category upsert returned no row for slug={slug}")
        leaf_id = result.data[0]["id"]
        parent_id = leaf_id

    return leaf_id


def fetch_all_product_slugs() -> set[str]:
    """Load every product slug from `products` (paginated).

    Used by `run_scrape.py --skip-if-slug-exists` so secondary sources can ingest
    only net-new SKUs without clobbering existing rows on matching slug.
    """
    sb = get_client()
    batch_size = 1000
    offset = 0
    slugs: set[str] = set()
    while True:
        res = (
            sb.table("products")
            .select("slug")
            .range(offset, offset + batch_size - 1)
            .execute()
        )
        rows = res.data or []
        for row in rows:
            s = row.get("slug")
            if s:
                slugs.add(str(s))
        if len(rows) < batch_size:
            break
        offset += batch_size
    return slugs


def upsert_normalized_product(
    product: NormalizedProduct,
    *,
    scrape_session_id: str,
    confidence_score: float = 1.0,
    is_fallback: bool = False,
) -> str:
    """Idempotently write a product (+ variants/images/audit rows) to Supabase.

    Returns the product UUID. Variants and images are DELETE+INSERT so the
    catalog matches the latest scrape exactly — this is intentional and matches
    the Node service's behaviour (see services/scraper/src/supabase/upsertCatalog.ts).
    """
    sb = get_client()
    category_id = upsert_category_path(product.category_path)

    product_payload: dict[str, Any] = {
        "name": product.name,
        "slug": product.slug,
        "description": product.description,
        "short_desc": product.short_desc,
        "category_id": category_id,
        "thumbnail_url": product.thumbnail_url,
        "base_price": round(product.base_price, 2),
        "compare_price": (
            round(product.compare_price, 2) if product.compare_price is not None else None
        ),
        "cost_price": (
            round(product.cost_price, 2) if product.cost_price is not None else None
        ),
        "stock": product.stock,
        "is_active": product.is_active,
        "is_featured": product.is_featured,
        "meta_title": product.meta_title,
        "meta_desc": product.meta_desc,
        "source_url": product.source_url,
    }

    p_result = (
        sb.table("products")
        .upsert(product_payload, on_conflict="slug")
        .execute()
    )
    if not p_result.data:
        raise RuntimeError(f"product upsert returned no row for slug={product.slug}")
    product_id: str = p_result.data[0]["id"]

    # Replace images. We tolerate failures here as warnings rather than aborting
    # the whole product — the row is already saved and partial gallery is better
    # than no row.
    sb.table("images").delete().eq("product_id", product_id).execute()
    if product.gallery_images:
        image_rows = [
            {"product_id": product_id, "url": url, "sort_order": idx}
            for idx, url in enumerate(product.gallery_images)
        ]
        try:
            sb.table("images").insert(image_rows).execute()
        except Exception as exc:
            log.warning("images_insert_failed slug=%s err=%s", product.slug, exc)

    # Replace variants
    sb.table("variants").delete().eq("product_id", product_id).execute()
    if product.variants:
        variant_rows = [
            {
                "product_id": product_id,
                "name": v.name,
                "value": v.value,
                "price_modifier": round(v.price_modifier, 2),
                "stock": v.stock,
                "sku": v.sku,
            }
            for v in product.variants
        ]
        try:
            sb.table("variants").insert(variant_rows).execute()
        except Exception as exc:
            log.warning("variants_insert_failed slug=%s err=%s", product.slug, exc)

    try:
        sb.table("source_tracking").insert(
            {
                "product_id": product_id,
                "source_domain": product.source_domain,
                "source_url": product.source_url,
                "scrape_session_id": scrape_session_id,
                "confidence_score": round(confidence_score, 4),
                "is_fallback": is_fallback,
                "scraped_at": datetime.now(timezone.utc).isoformat(),
            }
        ).execute()
    except Exception as exc:
        log.warning("source_tracking_skipped slug=%s err=%s", product.slug, exc)

    try:
        sb.table("product_snapshots").insert(
            {
                "product_id": product_id,
                "scrape_session_id": scrape_session_id,
                "raw_payload": _product_to_jsonable(product),
            }
        ).execute()
    except Exception as exc:
        log.warning("product_snapshots_skipped slug=%s err=%s", product.slug, exc)

    return product_id


def _product_to_jsonable(p: NormalizedProduct) -> dict[str, Any]:
    """Serialise a NormalizedProduct dataclass to a JSON-safe dict for snapshots."""
    return {
        "sourceUrl": p.source_url,
        "sourceDomain": p.source_domain,
        "slug": p.slug,
        "name": p.name,
        "description": p.description,
        "categoryPath": p.category_path,
        "basePriceEur": round(p.base_price, 2),
        "comparePriceEur": (
            round(p.compare_price, 2) if p.compare_price is not None else None
        ),
        "thumbnailUrl": p.thumbnail_url,
        "galleryImages": p.gallery_images,
        "variants": [
            {
                "name": v.name,
                "value": v.value,
                "priceModifier": round(v.price_modifier, 2),
            }
            for v in p.variants
        ],
        "sourceCurrency": p.source_currency,
        "sourceBasePrice": p.source_base_price,
        "sourceComparePrice": p.source_compare_price,
        "fxRateUsed": p.fx_rate_used,
    }


# ---------------------------------------------------------------------------
# import_jobs helpers (CSV/Excel manual import)
# ---------------------------------------------------------------------------


def open_import_job() -> str:
    """Open a new import_jobs row and return its id."""
    sb = get_client()
    res = sb.table("import_jobs").insert({"status": "PENDING"}).execute()
    if not res.data:
        raise RuntimeError("Failed to open import_job")
    return res.data[0]["id"]


def close_import_job(
    job_id: str,
    *,
    total_rows: int,
    success_rows: int,
    failed_rows: int,
    errors: list[dict[str, Any]],
) -> None:
    """Close an import_jobs row with final counts and error report."""
    if failed_rows == 0 and success_rows == total_rows:
        status = "SUCCESS"
    elif success_rows == 0:
        status = "FAILED"
    else:
        status = "PARTIAL"

    get_client().table("import_jobs").update(
        {
            "status": status,
            "total_rows": total_rows,
            "success_rows": success_rows,
            "failed_rows": failed_rows,
            "error_report": errors,
            "finished_at": datetime.now(timezone.utc).isoformat(),
        }
    ).eq("id", job_id).execute()


def reprice_existing_products(
    *,
    fx_quote_fn,
    dry_run: bool = False,
) -> dict[str, Any]:
    """Walk product_snapshots, recompute EUR price from source price + current FX, update products.

    `fx_quote_fn` is `fx_rates.quote_eur(amount, source_currency)` — passed in to avoid
    a circular import between _supabase.py and fx_rates.py.

    Only repriaces rows whose latest snapshot has a non-null sourceBasePrice — so manual
    imports without FX context are skipped.
    """
    sb = get_client()
    snapshots = (
        sb.table("product_snapshots")
        .select("product_id, raw_payload, created_at")
        .order("created_at", desc=True)
        .execute()
    )
    seen_ids: set[str] = set()
    repriced = 0
    skipped = 0
    failed = 0
    failed_slugs: list[str] = []

    for row in snapshots.data or []:
        pid = row["product_id"]
        if pid in seen_ids:
            continue
        seen_ids.add(pid)

        payload = row.get("raw_payload") or {}
        if isinstance(payload, str):
            try:
                payload = json.loads(payload)
            except Exception:
                skipped += 1
                continue

        src_currency = payload.get("sourceCurrency")
        src_base = payload.get("sourceBasePrice")
        src_compare = payload.get("sourceComparePrice")
        if not src_currency or src_base is None:
            skipped += 1
            continue

        try:
            new_base = fx_quote_fn(float(src_base), src_currency)
            new_compare = (
                fx_quote_fn(float(src_compare), src_currency) if src_compare is not None else None
            )
        except Exception as exc:
            failed += 1
            failed_slugs.append(payload.get("slug", pid))
            log.warning("reprice_fx_failed slug=%s err=%s", payload.get("slug", pid), exc)
            continue

        if dry_run:
            repriced += 1
            continue

        try:
            sb.table("products").update(
                {
                    "base_price": round(new_base, 2),
                    "compare_price": (
                        round(new_compare, 2) if new_compare is not None else None
                    ),
                }
            ).eq("id", pid).execute()
            repriced += 1
        except Exception as exc:
            failed += 1
            failed_slugs.append(payload.get("slug", pid))
            log.warning("reprice_update_failed slug=%s err=%s", payload.get("slug", pid), exc)

    return {
        "repriced": repriced,
        "skipped_no_fx_context": skipped,
        "failed": failed,
        "failedSlugs": failed_slugs,
        "dry_run": dry_run,
    }


def already_seen_domain(domain: str) -> bool:
    """True if any product has been scraped from this source_domain before.

    Used to decide whether to default to dry-run on first contact.
    """
    sb = get_client()
    res = (
        sb.table("source_tracking")
        .select("id", count="exact")
        .eq("source_domain", domain)
        .limit(1)
        .execute()
    )
    return bool(res.data) or (res.count or 0) > 0
