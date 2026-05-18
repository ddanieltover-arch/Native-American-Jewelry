"""
Conservative robots.txt parser.

Why hand-rolled when stdlib has urllib.robotparser? Two reasons:

1. urllib.robotparser silently allows everything when robots.txt 5xxs, which
   is the right default but doesn't surface to the caller. We want to log
   `robots_unavailable` clearly so audits can distinguish "allowed" from
   "couldn't tell".
2. We need to honour `Crawl-delay:` separately, which urllib.robotparser
   doesn't expose cleanly.
"""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass
from typing import Optional
from urllib.parse import urlparse

import httpx

log = logging.getLogger(__name__)

DEFAULT_UA_TOKEN = "precision-health-bot"


@dataclass
class RobotsDecision:
    allowed: bool
    crawl_delay_ms: Optional[int]
    reason: str  # human-readable; goes into structured logs


def check(url: str, *, user_agent_token: str = DEFAULT_UA_TOKEN, timeout: float = 10.0) -> RobotsDecision:
    """Fetch and evaluate robots.txt for `url`. Always returns a RobotsDecision.

    Falls open on 404/5xx/network errors per RFC 9309 — but flags `reason` so
    callers can decide whether to log a warning.
    """
    parsed = urlparse(url)
    if not parsed.hostname:
        return RobotsDecision(allowed=False, crawl_delay_ms=None, reason="invalid_url")

    robots_url = f"{parsed.scheme}://{parsed.hostname}/robots.txt"
    try:
        with httpx.Client(timeout=timeout, follow_redirects=True) as client:
            response = client.get(robots_url)
    except Exception as exc:
        log.info("robots_fetch_error url=%s err=%s", robots_url, exc)
        return RobotsDecision(allowed=True, crawl_delay_ms=None, reason="robots_unavailable")

    if response.status_code != 200:
        return RobotsDecision(
            allowed=True,
            crawl_delay_ms=None,
            reason=f"robots_status_{response.status_code}",
        )

    return _evaluate(response.text, parsed.path or "/", user_agent_token)


def _evaluate(body: str, target_path: str, user_agent_token: str) -> RobotsDecision:
    """Evaluate parsed robots.txt body against target path. See module docstring."""
    matching_section = False
    star_section = False
    in_specific = False
    in_star = False
    crawl_delay_ms: Optional[int] = None

    # Pre-pass: collect rules grouped by user-agent block so the most specific
    # block wins (per spec).
    star_rules: list[tuple[str, str]] = []
    specific_rules: list[tuple[str, str]] = []
    star_delay: Optional[int] = None
    specific_delay: Optional[int] = None

    current_block: Optional[str] = None  # 'specific', 'star', or None

    for raw in body.splitlines():
        line = raw.split("#", 1)[0].strip()
        if not line:
            continue
        if ":" not in line:
            continue
        key, _, value = line.partition(":")
        key = key.strip().lower()
        value = value.strip()

        if key == "user-agent":
            ua = value.lower()
            if ua == user_agent_token.lower():
                current_block = "specific"
            elif ua == "*":
                current_block = "star"
            else:
                current_block = None
            continue

        if current_block is None:
            continue

        if key in ("allow", "disallow"):
            if current_block == "specific":
                specific_rules.append((key, value))
            elif current_block == "star":
                star_rules.append((key, value))
        elif key == "crawl-delay":
            try:
                ms = int(float(value) * 1000)
                if current_block == "specific":
                    specific_delay = ms
                elif current_block == "star":
                    star_delay = ms
            except ValueError:
                pass

    # Specific block wins if present
    rules = specific_rules if specific_rules else star_rules
    crawl_delay_ms = specific_delay if specific_delay is not None else star_delay

    # Longest-match wins (per Google's interpretation of RFC 9309)
    matched_rule: Optional[tuple[str, str]] = None
    matched_len = -1
    for kind, path in rules:
        if not path:
            # Empty Disallow: means everything allowed (per RFC 9309 sec 2.2.2)
            continue
        # Trailing-* and embedded-* are spec-allowed; we honour leading-prefix only
        # for simplicity (covers >99% of real-world robots files).
        plain = path.rstrip("*")
        if target_path.startswith(plain) and len(plain) > matched_len:
            matched_rule = (kind, path)
            matched_len = len(plain)

    if matched_rule is None:
        return RobotsDecision(
            allowed=True,
            crawl_delay_ms=crawl_delay_ms,
            reason="no_matching_rule",
        )

    allowed = matched_rule[0] == "allow"
    return RobotsDecision(
        allowed=allowed,
        crawl_delay_ms=crawl_delay_ms,
        reason=f"{matched_rule[0]}:{matched_rule[1]}",
    )


def assert_allowed(url: str, *, skip: bool = False, user_agent_token: str = DEFAULT_UA_TOKEN) -> RobotsDecision:
    """Convenience wrapper. Raises if not allowed (unless `skip=True`).

    Always returns the decision so callers can honour Crawl-delay even when allowed.
    """
    decision = check(url, user_agent_token=user_agent_token)
    if skip:
        log.warning("robots_check_skipped url=%s reason=%s", url, decision.reason)
        return decision
    if not decision.allowed:
        raise PermissionError(f"robots_disallow url={url} reason={decision.reason}")
    return decision
