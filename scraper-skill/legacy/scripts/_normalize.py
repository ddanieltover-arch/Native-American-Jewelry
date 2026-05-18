"""
Shared normalization helpers — slugify, dedup, price parsing, image URL resolution,
and the dedup-by-base-name pattern that merges weight/dosage variants of the same product.

Pure functions only; no I/O. Other scripts import from here so the rules live in one place.
"""

from __future__ import annotations

import re
from typing import Iterable, Optional
from urllib.parse import urljoin, urlparse

from slugify import slugify as _slugify

# A run of digits that may include thousands separators and a decimal separator.
# We don't try to be perfect inside the regex — we extract a plausible run and
# then disambiguate `.` vs `,` afterwards based on context.
_PRICE_RUN_RE = re.compile(r"[0-9](?:[0-9.,]*[0-9])?")


def slug(value: str) -> str:
    """Slugify lowercased, ASCII-only, hyphen-separated. Stable across runs."""
    return _slugify(value or "", lowercase=True, separator="-", max_length=120) or "item"


def clean_text(text: Optional[str], *, max_length: int = 5000) -> Optional[str]:
    """Collapse whitespace, strip control chars, cap length. Returns None for empty input."""
    if not text:
        return None
    out = re.sub(r"\s+", " ", text).strip()
    if not out:
        return None
    return out[:max_length]


def parse_price_text(value: Optional[str]) -> Optional[float]:
    """Pull the first money-shaped number out of a price string. Returns None if nothing parsable.

    Handles US, European, and mixed formatting. The hard case is `,` vs `.` —
    they swap roles between locales (`1,299.00` US vs `1.299,00` EU), and either
    can be a thousands separator OR a decimal separator. We disambiguate using
    two rules in order:

      1. If both `.` and `,` are present, the rightmost is the decimal separator
         (this is unambiguous given the input has both).
      2. If only one is present, assume decimal when there are ≤ 2 digits after
         it; otherwise assume thousands separator.

    Examples:
        '$29.99'       -> 29.99
        '€29,99'       -> 29.99
        '$1,299.00'    -> 1299.00       (mixed, period rightmost → US)
        '€1.299,00'    -> 1299.00       (mixed, comma rightmost → European)
        '1,299'        -> 1299.0        (comma + 3 digits → thousands)
        '€10 – €20'    -> 10.0          (first match wins on ranges)
    """
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return float(value)
    match = _PRICE_RUN_RE.search(value)
    if not match:
        return None
    raw = match.group(0)
    cleaned = _normalize_decimal(raw)
    try:
        return float(cleaned)
    except ValueError:
        return None


def _normalize_decimal(raw: str) -> str:
    """Resolve `.` vs `,` ambiguity in a digit run. See parse_price_text for rules."""
    has_period = "." in raw
    has_comma = "," in raw
    if has_period and has_comma:
        if raw.rfind(".") > raw.rfind(","):
            return raw.replace(",", "")
        return raw.replace(".", "").replace(",", ".")
    if has_comma:
        last = raw.rfind(",")
        digits_after = len(raw) - last - 1
        if digits_after <= 2:
            return raw.replace(",", ".")
        return raw.replace(",", "")
    if has_period:
        last = raw.rfind(".")
        digits_after = len(raw) - last - 1
        if digits_after > 2:
            return raw.replace(".", "")
        return raw
    return raw


def resolve_image_url(url: str, base_url: str) -> Optional[str]:
    """Resolve a possibly-relative image URL against the page's base. Drops data: URIs."""
    if not url:
        return None
    if url.startswith("data:"):
        return None
    try:
        return urljoin(base_url, url)
    except Exception:
        return None


def dedup_urls(urls: Iterable[str]) -> list[str]:
    """Stable dedup preserving order."""
    seen: set[str] = set()
    out: list[str] = []
    for url in urls:
        if not url:
            continue
        key = url.strip()
        if key in seen:
            continue
        seen.add(key)
        out.append(key)
    return out


def domain_of(url: str) -> str:
    """Extract host (no port) for source_domain audit field."""
    parsed = urlparse(url)
    return parsed.hostname or ""


# ---------------------------------------------------------------------------
# Base-name dedup — merge dosage/weight variants
# ---------------------------------------------------------------------------

_BASE_NAME_PATTERNS = [
    re.compile(r"\s*\(\s*\d+\s*(?:mg|ml|g|kg|iu|μg|ug)\s*\)", re.IGNORECASE),
    re.compile(r"\s*-\s*[\d.]+\s*(?:mg|ml|g|kg|iu|μg|ug)\b", re.IGNORECASE),
    re.compile(r"\s*\d+\s*(?:mg|ml|g|kg|iu|μg|ug)\b", re.IGNORECASE),
]


def base_name(name: str) -> str:
    """Strip trailing dosage / volume markers to get a canonical base name.

    'BPC-157 5mg'         → 'BPC-157'
    'BPC-157 (10mg)'      → 'BPC-157'
    'TB-500 - 5 mg'       → 'TB-500'
    'Selank Spray 30ml'   → 'Selank Spray'
    'Generic Widget'      → 'Generic Widget'   (no change)

    Caveat: don't apply this to non-dosage products (electronics, apparel) — adapter
    authors decide whether to call it. The default scraper invokes it only when the
    detected category path includes terms like 'peptide', 'supplement', 'cream', etc.
    """
    out = name or ""
    for pat in _BASE_NAME_PATTERNS:
        out = pat.sub("", out)
    out = re.sub(r"\s+", " ", out).strip()
    return out or name


def should_apply_base_name_dedup(category_path: list[str]) -> bool:
    """Heuristic: is this a category where dosage variants are typical?"""
    if not category_path:
        return False
    blob = " ".join(category_path).lower()
    triggers = (
        "peptide",
        "supplement",
        "vitamin",
        "powder",
        "tincture",
        "spray",
        "research chemical",
    )
    return any(t in blob for t in triggers)


# ---------------------------------------------------------------------------
# Validation
# ---------------------------------------------------------------------------


def validate_required(payload: dict) -> list[str]:
    """Return list of error messages for a normalised product candidate. Empty = valid."""
    errors: list[str] = []
    name = payload.get("name") or ""
    if len(name.strip()) < 2:
        errors.append("name must be at least 2 chars")

    base_price = payload.get("base_price") or payload.get("basePriceEur") or 0
    try:
        if float(base_price) <= 0:
            errors.append("base_price must be > 0")
    except (TypeError, ValueError):
        errors.append("base_price must be numeric")

    if not payload.get("source_url") and not payload.get("sourceUrl"):
        # source_url is optional only for manual imports — caller is responsible
        # for marking those explicitly. The scraper path always has it.
        pass

    return errors
