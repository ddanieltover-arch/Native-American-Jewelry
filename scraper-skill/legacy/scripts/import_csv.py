"""
CSV / Excel manual product import.

Reads a CSV or XLSX, validates each row, normalises (slug, FX→EUR), and writes
to Supabase via the same upsert path the scraper uses. Records a row in
`import_jobs` with success/failure counts and a per-row error report.

Expected columns (case-insensitive, flexible):
  Required: name, base_price
  Optional: slug, description, short_desc, category, category_path,
            compare_price, cost_price, stock, currency, thumbnail_url,
            gallery_urls (semicolon-delimited), variants (JSON or
            'name1=value1@modifier1;name2=value2@modifier2'),
            is_active, is_featured, source_url, meta_title, meta_desc

`category_path` takes precedence over `category`. Use ` > ` (with spaces) or
` / ` to separate hierarchy levels: 'Peptides > Cognitive > Nootropics'.

Usage:
    python scripts/import_csv.py --file ./.tmp/products.csv
    python scripts/import_csv.py --file ./.tmp/products.xlsx --dry-run
    python scripts/import_csv.py --file ./.tmp/products.csv --currency USD  (override; default EUR)

CSV template lives at assets/csv_import_template.csv.
"""

from __future__ import annotations

import argparse
import json
import logging
import sys
import uuid
from pathlib import Path
from typing import Any, Optional

import pandas as pd

from _normalize import clean_text, dedup_urls, slug as slugify, validate_required
from _supabase import (
    NormalizedProduct,
    NormalizedVariant,
    close_import_job,
    open_import_job,
    upsert_normalized_product,
)

log = logging.getLogger("import_csv")


# Column synonyms — let people import sloppy real-world spreadsheets.
COLUMN_ALIASES = {
    "name": ["name", "product", "product name", "title"],
    "slug": ["slug", "handle", "url slug"],
    "description": ["description", "long description", "details", "long_description"],
    "short_desc": ["short_desc", "short description", "summary", "tagline"],
    "category": ["category", "product category"],
    "category_path": ["category_path", "category path", "path", "categories"],
    "base_price": ["base_price", "base price", "price", "msrp", "amount"],
    "compare_price": ["compare_price", "compare price", "list price", "rrp"],
    "cost_price": ["cost_price", "cost price", "cost", "wholesale"],
    "stock": ["stock", "inventory", "qty", "quantity"],
    "currency": ["currency", "ccy"],
    "thumbnail_url": ["thumbnail_url", "thumbnail", "main image", "primary image"],
    "gallery_urls": ["gallery_urls", "images", "gallery", "image urls"],
    "variants": ["variants", "options"],
    "is_active": ["is_active", "active", "live"],
    "is_featured": ["is_featured", "featured"],
    "source_url": ["source_url", "source", "reference url", "supplier url"],
    "meta_title": ["meta_title", "seo title"],
    "meta_desc": ["meta_desc", "seo description"],
}


def _normalize_columns(df: pd.DataFrame) -> pd.DataFrame:
    """Rename columns to canonical names. Lowercases + strips, then maps via COLUMN_ALIASES."""
    canonical_by_alias: dict[str, str] = {}
    for canon, aliases in COLUMN_ALIASES.items():
        for a in aliases:
            canonical_by_alias[a.lower()] = canon

    rename_map: dict[str, str] = {}
    for col in df.columns:
        key = str(col).strip().lower()
        canon = canonical_by_alias.get(key)
        if canon and col != canon:
            rename_map[col] = canon
    return df.rename(columns=rename_map)


def _read_table(path: Path) -> pd.DataFrame:
    suffix = path.suffix.lower()
    if suffix in (".xlsx", ".xls"):
        return pd.read_excel(path, dtype=object)
    if suffix == ".csv":
        return pd.read_csv(path, dtype=object)
    if suffix == ".tsv":
        return pd.read_csv(path, sep="\t", dtype=object)
    raise ValueError(f"Unsupported file type: {suffix}. Expected .csv, .tsv, .xlsx, or .xls.")


def _split_path(value: Any) -> list[str]:
    """Split 'A > B > C' or 'A/B/C' into ['A','B','C']. Returns [] for empty."""
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return []
    text = str(value).strip()
    if not text:
        return []
    for sep in (" > ", ">", " / ", "/"):
        if sep in text:
            return [p.strip() for p in text.split(sep) if p.strip()]
    return [text]


def _split_urls(value: Any) -> list[str]:
    """Split semicolon-, comma-, or pipe-delimited URLs."""
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return []
    text = str(value).strip()
    if not text:
        return []
    for sep in (";", "|", "\n"):
        if sep in text:
            return [u.strip() for u in text.split(sep) if u.strip()]
    if text.count(",") >= 1 and text.count("http") >= 2:
        return [u.strip() for u in text.split(",") if u.strip()]
    return [text]


def _parse_variants(value: Any) -> list[NormalizedVariant]:
    """Two formats supported:

      JSON: [{"name":"Size","value":"5mg","price_modifier":0},{...}]
      Compact: 'name=value@modifier;name=value@modifier'
        e.g. 'Weight=5mg@0;Weight=10mg@10;Weight=20mg@25'
    """
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return []
    text = str(value).strip()
    if not text:
        return []

    if text.startswith("[") or text.startswith("{"):
        try:
            data = json.loads(text)
        except Exception:
            return []
        if not isinstance(data, list):
            return []
        out: list[NormalizedVariant] = []
        for entry in data:
            if not isinstance(entry, dict):
                continue
            name = str(entry.get("name") or "Option").strip()
            val = str(entry.get("value") or "Default").strip()
            mod = entry.get("price_modifier") or entry.get("priceModifier") or 0
            try:
                mod = float(mod)
            except (TypeError, ValueError):
                mod = 0.0
            out.append(NormalizedVariant(name=name, value=val, price_modifier=mod))
        return out

    out_compact: list[NormalizedVariant] = []
    for chunk in text.split(";"):
        chunk = chunk.strip()
        if not chunk:
            continue
        if "=" not in chunk:
            continue
        name_part, _, value_part = chunk.partition("=")
        modifier = 0.0
        if "@" in value_part:
            value_part, _, mod_part = value_part.partition("@")
            try:
                modifier = float(mod_part)
            except ValueError:
                modifier = 0.0
        out_compact.append(NormalizedVariant(
            name=name_part.strip() or "Option",
            value=value_part.strip() or "Default",
            price_modifier=modifier,
        ))
    return out_compact


def _bool(value: Any, default: bool = True) -> bool:
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return default
    text = str(value).strip().lower()
    if text in ("true", "1", "yes", "y", "active", "on"):
        return True
    if text in ("false", "0", "no", "n", "inactive", "off"):
        return False
    return default


def _row_to_product(
    row: dict[str, Any],
    *,
    default_currency: str,
    job_id: str,
) -> tuple[NormalizedProduct, list[str]]:
    """Convert one CSV row to a NormalizedProduct preserving source price values."""
    errors: list[str] = []
    name = clean_text(str(row.get("name") or "")) or ""
    if len(name.strip()) < 2:
        errors.append("name missing or too short")

    currency = (str(row.get("currency") or default_currency)).upper().strip() or "EUR"

    base_raw = row.get("base_price")
    try:
        base_price = float(base_raw) if base_raw not in (None, "") else 0.0
    except Exception as exc:
        errors.append(f"base_price not numeric: {exc}")
        base_price = 0.0
    if base_price <= 0 and not errors:
        errors.append("base_price must be > 0")

    compare_price: Optional[float] = None
    compare_raw = row.get("compare_price")
    if compare_raw not in (None, "") and not (isinstance(compare_raw, float) and pd.isna(compare_raw)):
        try:
            compare_price = float(compare_raw)
        except Exception as exc:
            errors.append(f"compare_price not numeric: {exc}")

    cost_price: Optional[float] = None
    cost_raw = row.get("cost_price")
    if cost_raw not in (None, "") and not (isinstance(cost_raw, float) and pd.isna(cost_raw)):
        try:
            cost_price = float(cost_raw)
        except Exception as exc:
            errors.append(f"cost_price not numeric: {exc}")

    category_path = _split_path(row.get("category_path"))
    if not category_path:
        single = row.get("category")
        if single and not (isinstance(single, float) and pd.isna(single)):
            category_path = [str(single).strip()]

    gallery = dedup_urls(_split_urls(row.get("gallery_urls")))
    thumb = clean_text(str(row.get("thumbnail_url") or "")) or (gallery[0] if gallery else None)
    variants = _parse_variants(row.get("variants"))

    stock_raw = row.get("stock")
    try:
        stock = int(stock_raw) if stock_raw not in (None, "") else 100
    except (TypeError, ValueError):
        stock = 100

    given_slug = clean_text(str(row.get("slug") or "")) or None
    final_slug = given_slug or slugify(name)

    source_url = clean_text(str(row.get("source_url") or "")) or f"urn:import:{job_id}:{final_slug}"

    product = NormalizedProduct(
        source_url=source_url,
        source_domain="manual.import",
        slug=final_slug,
        name=name.strip(),
        description=clean_text(str(row.get("description") or "")),
        short_desc=clean_text(str(row.get("short_desc") or "")),
        category_path=category_path,
        base_price=base_price,
        compare_price=compare_price,
        cost_price=cost_price,
        stock=stock,
        is_active=_bool(row.get("is_active"), True),
        is_featured=_bool(row.get("is_featured"), False),
        meta_title=clean_text(str(row.get("meta_title") or "")),
        meta_desc=clean_text(str(row.get("meta_desc") or "")),
        thumbnail_url=thumb,
        gallery_images=gallery,
        variants=variants,
        source_currency=currency,
        source_base_price=float(base_raw) if base_raw not in (None, "") else None,
        source_compare_price=float(compare_raw) if compare_raw not in (None, "") and not (
            isinstance(compare_raw, float) and pd.isna(compare_raw)
        ) else None,
    )

    return product, errors


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Import a CSV/Excel file of products into Supabase.")
    parser.add_argument("--file", required=True, help="Path to the CSV or XLSX file.")
    parser.add_argument("--currency", default="EUR",
                        help="Default source currency for rows that don't specify one. (default EUR)")
    parser.add_argument("--dry-run", action="store_true",
                        help="Validate and preview but don't write to Supabase or import_jobs.")
    parser.add_argument("--limit", type=int, help="Only process the first N data rows (debugging).")
    parser.add_argument("--log-level", default="INFO", choices=("DEBUG", "INFO", "WARNING", "ERROR"))
    args = parser.parse_args(argv)

    logging.basicConfig(level=getattr(logging, args.log_level), format="[%(name)s] %(levelname)s %(message)s")

    path = Path(args.file).expanduser().resolve()
    if not path.is_file():
        print(f"RESULT: {json.dumps({'error': f'File not found: {path}'})}")
        return 1

    try:
        df = _read_table(path)
    except Exception as exc:
        print(f"RESULT: {json.dumps({'error': f'read_failed: {exc}'})}")
        return 1

    df = _normalize_columns(df)

    if "name" not in df.columns or "base_price" not in df.columns:
        print(f"RESULT: {json.dumps({'error': 'Missing required columns: name and base_price (or aliases)', 'detected_columns': list(df.columns)})}")
        return 1

    if args.limit:
        df = df.head(args.limit)

    job_id = str(uuid.uuid4()) if args.dry_run else open_import_job()
    success = 0
    failed = 0
    errors_report: list[dict[str, Any]] = []
    preview: list[dict[str, Any]] = []

    for row_idx, raw_row in enumerate(df.to_dict(orient="records"), start=2):  # row 1 = header
        try:
            product, row_errors = _row_to_product(raw_row, default_currency=args.currency, job_id=job_id)
        except Exception as exc:
            log.warning("row_parse_failed row=%d err=%s", row_idx, exc)
            failed += 1
            errors_report.append({"row": row_idx, "errors": [f"parse_failed: {exc}"]})
            continue

        if row_errors:
            failed += 1
            errors_report.append({"row": row_idx, "errors": row_errors, "name": raw_row.get("name")})
            continue

        if args.dry_run:
            success += 1
            if len(preview) < 5:
                preview.append({
                    "row": row_idx,
                    "name": product.name,
                    "slug": product.slug,
                    "basePriceEur": product.base_price,
                    "categoryPath": product.category_path,
                    "imageCount": len(product.gallery_images),
                    "variantCount": len(product.variants),
                })
            continue

        try:
            upsert_normalized_product(
                product,
                scrape_session_id=job_id,
                confidence_score=0.6,
                is_fallback=False,
            )
            success += 1
        except Exception as exc:
            failed += 1
            errors_report.append({"row": row_idx, "errors": [f"upsert_failed: {exc}"], "name": raw_row.get("name")})

    if not args.dry_run:
        close_import_job(
            job_id,
            total_rows=success + failed,
            success_rows=success,
            failed_rows=failed,
            errors=errors_report,
        )

    result = {
        "importJobId": job_id,
        "totalRows": success + failed,
        "successRows": success,
        "failedRows": failed,
        "dryRun": args.dry_run,
        "errors": errors_report[:20],
    }
    if args.dry_run:
        result["preview"] = preview

    print(f"RESULT: {json.dumps(result)}")
    return 0 if failed == 0 else (0 if success > 0 else 1)


if __name__ == "__main__":
    sys.exit(main())
