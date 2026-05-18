"""
Environment loader — finds and loads `.env.local` from the precision-health-store
storefront, mirroring the lookup pattern used by the Node scraper at
`services/scraper/src/config.ts`.

Side effect: importing this module reconfigures stdout/stderr to UTF-8 so the
RESULT lines and preview diffs render correctly on Windows (where Python's
console defaults to cp1252 and mangles non-ASCII characters in city names like
"Düsseldorf"). All scripts in the skill import this module, so it's a single
place to fix.

Walks upward from the script directory looking for any of:
  - <root>/precision-health-store/apps/storefront/.env.local
  - <root>/.env.local
  - <root>/.env

The first match wins. We intentionally prefer the storefront `.env.local` because
that's where SUPABASE_SERVICE_ROLE_KEY lives in this workspace (see DEPLOYMENT.md).

Usage:
    from _env import load_env
    load_env()  # idempotent, safe to call multiple times
"""

from __future__ import annotations

import os
import sys
from pathlib import Path
from typing import Iterable

from dotenv import load_dotenv


_LOADED = False


def force_utf8_stdio() -> None:
    """Make stdout/stderr UTF-8 so non-ASCII characters survive console + pipe redirects.

    Idempotent. On Windows, Python's default console encoding is cp1252, which
    mangles characters like "ü" or "ç" in our preview diffs and JSON results.
    Call this at the top of every entry script (CLI main).
    """
    for stream in (sys.stdout, sys.stderr):
        try:
            stream.reconfigure(encoding="utf-8", errors="replace")  # type: ignore[attr-defined]
        except Exception:
            pass


force_utf8_stdio()


def _candidate_paths(start: Path) -> Iterable[Path]:
    """Yield .env file candidates ordered by preference (storefront first)."""
    cur = start.resolve()
    seen: set[Path] = set()
    while True:
        if cur in seen:
            break
        seen.add(cur)
        yield cur / "precision-health-store" / "apps" / "storefront" / ".env.local"
        yield cur / "apps" / "storefront" / ".env.local"
        yield cur / ".env.local"
        yield cur / ".env"
        if cur.parent == cur:
            break
        cur = cur.parent


def load_env(start: Path | None = None, *, override: bool = False) -> Path | None:
    """Load environment variables from the nearest .env.local going upward.

    Returns the path that was loaded (or None if nothing was found). Idempotent
    — repeat calls with the same `start` are a no-op unless `override=True`.

    Resolution order matches the Node scraper:
      1. precision-health-store/apps/storefront/.env.local (preferred)
      2. .env.local in any parent
      3. .env in any parent

    The first existing file wins. We don't merge multiple files — that produced
    confusing precedence bugs in the Node scraper history.
    """
    global _LOADED
    if _LOADED and not override:
        return None

    here = (start or Path(__file__)).resolve()
    if here.is_file():
        here = here.parent

    for candidate in _candidate_paths(here):
        if candidate.is_file():
            load_dotenv(candidate, override=override)
            _LOADED = True
            return candidate

    _LOADED = True
    return None


def require(name: str, *, fallback: str | None = None) -> str:
    """Fetch an env var, raising a friendly error if missing.

    `fallback` lets one var name fall back to another (e.g.
    SUPABASE_URL → NEXT_PUBLIC_SUPABASE_URL) — same convention the Node service uses.
    """
    val = os.environ.get(name) or (os.environ.get(fallback) if fallback else None)
    if not val or not val.strip():
        msg = f"Missing required env var: {name}"
        if fallback:
            msg += f" (also tried fallback {fallback})"
        msg += (
            "\nLooked in: precision-health-store/apps/storefront/.env.local "
            "and parent directories. Copy .env.example and fill it in."
        )
        raise RuntimeError(msg)
    return val.strip()
