"""
USD/GBP/CHF/...→EUR conversion with cached daily rates.

Source priority:
  1. ECB (European Central Bank) — authoritative, free, no key, daily updates.
  2. exchangerate.host — fallback if ECB is down.

Cache lives at .tmp/fx_rates.json (workspace-root .tmp/, per CLAUDE.md). TTL is 24h —
that matches ECB's once-daily update cadence; tighter wastes API calls, looser
risks pricing drift.

Usage:
    # As a module (called by run_scrape.py and import_csv.py)
    from fx_rates import quote_eur
    eur = quote_eur(29.99, "USD")

    # As a CLI
    python scripts/fx_rates.py                  # show current rates
    python scripts/fx_rates.py --refresh        # force refresh
    python scripts/fx_rates.py --convert 29.99 USD
"""

from __future__ import annotations

import argparse
import json
import logging
import sys
import time
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Optional

import httpx

from _env import load_env

log = logging.getLogger(__name__)

# Cache path: workspace .tmp/ (per CLAUDE.md "Intermediates" convention).
# We resolve from this script's location to find the workspace root.
_SCRIPT_DIR = Path(__file__).resolve().parent
_WORKSPACE_ROOT = _SCRIPT_DIR.parent.parent  # scraper-skill/scripts → workspace root
_CACHE_PATH = _WORKSPACE_ROOT / ".tmp" / "fx_rates.json"
_CACHE_TTL = timedelta(hours=24)

ECB_URL = "https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml"
FALLBACK_URL = "https://api.exchangerate.host/latest?base=EUR"

# Currencies we expect to encounter on peptide / supplement / health storefronts.
# Anything not in this list still works — we just don't validate it.
COMMON_CURRENCIES = {
    "EUR", "USD", "GBP", "CHF", "CAD", "AUD", "JPY",
    "SEK", "NOK", "DKK", "PLN", "CZK", "HUF", "RON",
}


def _load_cache() -> Optional[dict]:
    if not _CACHE_PATH.is_file():
        return None
    try:
        return json.loads(_CACHE_PATH.read_text(encoding="utf-8"))
    except Exception as exc:
        log.warning("fx_cache_load_failed err=%s", exc)
        return None


def _save_cache(data: dict) -> None:
    _CACHE_PATH.parent.mkdir(parents=True, exist_ok=True)
    _CACHE_PATH.write_text(json.dumps(data, indent=2, sort_keys=True), encoding="utf-8")


def _fetch_ecb() -> dict:
    """Fetch the ECB daily reference rates. Rates are EUR-base, i.e. 'how many X for 1 EUR'."""
    with httpx.Client(timeout=15.0, follow_redirects=True) as client:
        response = client.get(ECB_URL)
        response.raise_for_status()

    root = ET.fromstring(response.text)
    ns = {"gesmes": "http://www.gesmes.org/xml/2002-08-01",
          "ecb": "http://www.ecb.int/vocabulary/2002-08-01/eurofxref"}
    cube = root.find("ecb:Cube/ecb:Cube", ns)
    if cube is None:
        raise RuntimeError("ECB feed shape unexpected — no Cube/Cube element")

    rates: dict[str, float] = {"EUR": 1.0}
    for entry in cube.findall("ecb:Cube", ns):
        currency = entry.attrib.get("currency")
        rate = entry.attrib.get("rate")
        if currency and rate:
            try:
                rates[currency] = float(rate)
            except ValueError:
                continue

    return {
        "source": "ecb",
        "base": "EUR",
        "fetched_at": datetime.now(timezone.utc).isoformat(),
        "as_of_date": cube.attrib.get("time"),
        "rates": rates,
    }


def _fetch_fallback() -> dict:
    """exchangerate.host fallback. Same shape as ECB output for downstream simplicity."""
    with httpx.Client(timeout=15.0, follow_redirects=True) as client:
        response = client.get(FALLBACK_URL)
        response.raise_for_status()
    payload = response.json()
    rates = payload.get("rates") or {}
    rates["EUR"] = 1.0
    return {
        "source": "exchangerate.host",
        "base": "EUR",
        "fetched_at": datetime.now(timezone.utc).isoformat(),
        "as_of_date": payload.get("date"),
        "rates": rates,
    }


def _is_fresh(cache: dict | None) -> bool:
    if not cache:
        return False
    fetched_at = cache.get("fetched_at")
    if not fetched_at:
        return False
    try:
        when = datetime.fromisoformat(fetched_at)
    except ValueError:
        return False
    return datetime.now(timezone.utc) - when < _CACHE_TTL


def get_rates(*, refresh: bool = False) -> dict:
    """Return current rates dict (EUR-base). Auto-refreshes when stale.

    Cache shape:
        {
          "source": "ecb" | "exchangerate.host",
          "base": "EUR",
          "fetched_at": "<iso8601>",
          "as_of_date": "<YYYY-MM-DD>",
          "rates": { "USD": 1.08, "GBP": 0.85, ... }
        }
    """
    load_env()
    cache = _load_cache()
    if not refresh and _is_fresh(cache):
        return cache  # type: ignore[return-value]

    last_error: Exception | None = None
    for fetcher in (_fetch_ecb, _fetch_fallback):
        try:
            payload = fetcher()
            _save_cache(payload)
            return payload
        except Exception as exc:
            last_error = exc
            log.warning("fx_fetch_failed source=%s err=%s", fetcher.__name__, exc)
            time.sleep(0.5)

    if cache:
        log.warning("fx_using_stale_cache reason=%s", last_error)
        return cache  # type: ignore[return-value]

    raise RuntimeError(
        f"Could not fetch FX rates from any source and no cache exists. Last error: {last_error}"
    )


def quote_eur(amount: float, source_currency: str, *, refresh: bool = False) -> float:
    """Convert `amount` from `source_currency` to EUR. Rounded to 2 decimal places.

    'EUR' inputs pass through unchanged (still rounded to 2dp). Unknown currencies
    raise ValueError — better to fail loudly than silently mis-price a catalog.
    """
    code = (source_currency or "EUR").upper().strip()
    if code == "EUR":
        return round(float(amount), 2)

    payload = get_rates(refresh=refresh)
    rate = payload.get("rates", {}).get(code)
    if rate is None or rate <= 0:
        raise ValueError(
            f"No FX rate for {code}. Available: "
            f"{sorted(payload.get('rates', {}).keys())[:20]}..."
        )

    # ECB rates are 'X per 1 EUR' → to convert X to EUR: amount / rate
    return round(float(amount) / float(rate), 2)


def _print_table(payload: dict) -> None:
    print(f"Source:     {payload.get('source')}")
    print(f"As of:      {payload.get('as_of_date')}")
    print(f"Fetched at: {payload.get('fetched_at')}")
    print()
    rates = payload.get("rates", {})
    width = max(len(k) for k in rates) if rates else 3
    interesting = [c for c in COMMON_CURRENCIES if c in rates]
    other = [c for c in sorted(rates) if c not in interesting]
    for code in interesting + other:
        print(f"  1 EUR = {rates[code]:.4f} {code:<{width}}")


def main() -> int:
    parser = argparse.ArgumentParser(description="USD/GBP/...→EUR FX rate cache.")
    parser.add_argument("--refresh", action="store_true", help="Force refresh from ECB.")
    parser.add_argument("--convert", nargs=2, metavar=("AMOUNT", "CURRENCY"),
                        help="Convert AMOUNT in CURRENCY to EUR and print the result.")
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO, format="[fx] %(message)s")

    if args.convert:
        amount, currency = args.convert
        try:
            eur = quote_eur(float(amount), currency, refresh=args.refresh)
        except Exception as exc:
            print(f"RESULT: {json.dumps({'error': str(exc)})}")
            return 1
        print(f"{amount} {currency.upper()} = €{eur}")
        print(f"RESULT: {json.dumps({'amount': float(amount), 'from': currency.upper(), 'eur': eur})}")
        return 0

    payload = get_rates(refresh=args.refresh)
    _print_table(payload)
    print(f"\nRESULT: {json.dumps({'source': payload.get('source'), 'as_of_date': payload.get('as_of_date'), 'currencies': len(payload.get('rates', {}))})}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
