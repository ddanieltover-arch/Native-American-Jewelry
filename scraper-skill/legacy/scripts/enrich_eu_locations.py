"""
Patch SalesNotification.tsx with EU locations + EU first names.

Reads `assets/eu_locations.json` and `assets/eu_first_names.json`, then rewrites
the constants block of `precision-health-store/apps/storefront/src/components/SalesNotification.tsx`
in place. Idempotent — re-run any time the assets change.

Why patch directly instead of import a JSON file? See references/frontend.md.
Short version: keeps the runtime simpler; assets don't need to ship to the
client; the dataset is curated, not dynamic.

Usage:
    # Preview what would change
    python scripts/enrich_eu_locations.py

    # Apply the patch
    python scripts/enrich_eu_locations.py --apply
"""

from __future__ import annotations

import argparse
import json
import logging
import re
import sys
from pathlib import Path
from typing import Any

# Side-effect: ensure stdout is UTF-8 so the preview diff renders city names correctly.
import _env  # noqa: F401  (importing for the module-level force_utf8_stdio() call)

log = logging.getLogger("enrich_eu_locations")

_SCRIPT_DIR = Path(__file__).resolve().parent
_SKILL_DIR = _SCRIPT_DIR.parent
_WORKSPACE_ROOT = _SKILL_DIR.parent
_TARGET_FILE = (
    _WORKSPACE_ROOT
    / "precision-health-store"
    / "apps"
    / "storefront"
    / "src"
    / "components"
    / "SalesNotification.tsx"
)


# Sentinel comments mark the auto-generated block. We only rewrite between them
# so any styling/logic the user adds outside survives a re-run.
BEGIN_MARKER = "// === BEGIN: scraper-skill enrich_eu_locations.py (DO NOT EDIT BY HAND) ==="
END_MARKER = "// === END: scraper-skill enrich_eu_locations.py ==="


def _build_block(*, locations: dict[str, Any], first_names: dict[str, Any]) -> str:
    """Render the TS constants block from the JSON assets.

    Output is plain TypeScript — the existing `getRandomItem` helper and the
    `useNotificationStore` hook in SalesNotification.tsx still work as-is.
    """
    weights = locations.get("weights", {})
    countries = locations.get("countries", {})

    # Build a flat weighted list of (countryCode, country, city, name) candidates.
    # Each country contributes `int(weight * 1000)` entries — gives enough
    # resolution for plausible distribution without being huge.
    weighted: list[dict[str, str]] = []
    for code, weight in weights.items():
        country = countries.get(code)
        if not country:
            continue
        cities = country.get("cities") or []
        names = first_names.get(code) or first_names.get("_fallback") or ["Alex"]
        country_name = country.get("name") or code
        # Roughly preserve weights: each country contributes len(cities) entries
        # and we'll sample the whole pool uniformly. Better resolution would need
        # a runtime weighted picker, but the existing component does a uniform
        # pick so we approximate weights via repetition.
        repeats = max(1, int(round(weight * 100)))
        for _ in range(repeats):
            for city in cities:
                weighted.append({
                    "city": city,
                    "country": country_name,
                    "code": code,
                })

    # Distinct city/country pairs (order preserved per first occurrence)
    seen_pairs: set[tuple[str, str]] = set()
    unique_locations: list[dict[str, str]] = []
    for entry in weighted:
        key = (entry["city"], entry["country"])
        if key in seen_pairs:
            continue
        seen_pairs.add(key)
        unique_locations.append(entry)

    # Names by country code for natural pairing
    names_by_country: dict[str, list[str]] = {}
    for code in countries:
        names_by_country[code] = first_names.get(code) or first_names.get("_fallback") or ["Alex"]

    def js_str(value: str) -> str:
        return json.dumps(value, ensure_ascii=False)

    def js_array(values: list[str]) -> str:
        return "[" + ", ".join(js_str(v) for v in values) + "]"

    locations_ts = "[\n" + ",\n".join(
        f"  {{ city: {js_str(e['city'])}, country: {js_str(e['country'])}, code: {js_str(e['code'])} }}"
        for e in unique_locations
    ) + "\n]"

    names_ts = (
        "{\n"
        + ",\n".join(f"  {js_str(code)}: {js_array(names)}" for code, names in names_by_country.items())
        + ',\n  "_fallback": '
        + js_array(first_names.get("_fallback") or ["Alex"])
        + "\n}"
    )

    return f"""{BEGIN_MARKER}
// Generated from scraper-skill/assets/eu_locations.json + eu_first_names.json
// To regenerate: python scraper-skill/scripts/enrich_eu_locations.py --apply

const EU_LOCATIONS: ReadonlyArray<{{ city: string; country: string; code: string }}> = {locations_ts};

const EU_FIRST_NAMES_BY_COUNTRY: Record<string, ReadonlyArray<string>> = {names_ts};

function pickEULocation() {{
  return EU_LOCATIONS[Math.floor(Math.random() * EU_LOCATIONS.length)];
}}

function pickEUName(code: string): string {{
  const pool = EU_FIRST_NAMES_BY_COUNTRY[code] || EU_FIRST_NAMES_BY_COUNTRY["_fallback"];
  return pool[Math.floor(Math.random() * pool.length)];
}}
{END_MARKER}"""


def _rewrite_component(source: str, generated_block: str) -> str:
    """Insert/replace the generated block in the component, and adapt the trigger.

    Strategy:
      1. If sentinel markers exist, replace everything between them.
      2. Else, insert the block right after the last `import` line.
      3. Replace the existing `USA_LOCATIONS` / `FIRST_NAMES` literal arrays with
         delegating constants that reference EU_LOCATIONS / EU_FIRST_NAMES_BY_COUNTRY,
         so the rest of the component code keeps working unchanged.
      4. Adjust the `state` field to `country` in the trigger() call site.

    This is intentionally conservative — we don't rewrite the JSX. If the user
    has customised the JSX template, the agent should update it manually
    (frontend.md describes the expected template).
    """
    # 1 / 2: place the generated block
    if BEGIN_MARKER in source and END_MARKER in source:
        pattern = re.compile(re.escape(BEGIN_MARKER) + r".*?" + re.escape(END_MARKER), re.DOTALL)
        source = pattern.sub(generated_block, source)
    else:
        # Insert after last top-of-file import statement
        import_lines = list(re.finditer(r"^import .*?;\s*$", source, re.MULTILINE))
        if import_lines:
            insert_at = import_lines[-1].end()
            source = source[:insert_at] + "\n\n" + generated_block + "\n" + source[insert_at:]
        else:
            source = generated_block + "\n\n" + source

    # 3a: replace USA_LOCATIONS literal block with a delegating constant
    source = re.sub(
        r"const\s+USA_LOCATIONS\s*=\s*\[[^\]]*\];",
        "const USA_LOCATIONS = EU_LOCATIONS.map(l => `${l.city}, ${l.country}`); // legacy alias",
        source,
        count=1,
        flags=re.DOTALL,
    )

    # 3b: replace FIRST_NAMES literal with a flattened EU pool (order preserved per country)
    source = re.sub(
        r"const\s+FIRST_NAMES\s*=\s*\[[^\]]*\];",
        ("const FIRST_NAMES: ReadonlyArray<string> = "
         "Object.values(EU_FIRST_NAMES_BY_COUNTRY).flat(); "
         "// generated from EU_FIRST_NAMES_BY_COUNTRY"),
        source,
        count=1,
        flags=re.DOTALL,
    )

    # 4: adapt the trigger() to populate country instead of state
    # Existing shape (US):
    #   const location = getRandomItem(USA_LOCATIONS);
    #   const [city, state] = location.split(', ');
    #   show({ id: ..., name: getRandomItem(FIRST_NAMES), city, state, product: ..., minutesAgo: ... });
    #
    # New shape (EU): pick from EU_LOCATIONS, get name from same country.
    new_trigger = """const trigger = () => {
      const location = pickEULocation();
      const name = pickEUName(location.code);

      show({
        id: Date.now().toString(),
        name,
        city: location.city,
        state: location.country, // store carries 'state' field; we put the country in for back-compat
        product: getRandomItem(PRODUCTS),
        minutesAgo: Math.floor(Math.random() * 30) + 1,
      });

      setTimeout(() => hide(), 5000);
    };"""

    source = re.sub(
        r"const\s+trigger\s*=\s*\(\)\s*=>\s*\{[\s\S]*?setTimeout\(\(\)\s*=>\s*hide\(\),\s*\d+\);[\s\S]*?\};",
        new_trigger,
        source,
        count=1,
    )

    return source


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Patch SalesNotification.tsx with EU locations + EU names.")
    parser.add_argument("--apply", action="store_true", help="Write changes to disk. Without this, dry-run preview only.")
    parser.add_argument("--target", help="Override target file path (debugging).")
    parser.add_argument("--log-level", default="INFO", choices=("DEBUG", "INFO", "WARNING", "ERROR"))
    args = parser.parse_args(argv)

    logging.basicConfig(level=getattr(logging, args.log_level), format="[%(name)s] %(levelname)s %(message)s")

    target_path = Path(args.target).resolve() if args.target else _TARGET_FILE
    if not target_path.is_file():
        print(f"RESULT: {json.dumps({'error': f'Target file not found: {target_path}'})}")
        return 1

    locations_path = _SKILL_DIR / "assets" / "eu_locations.json"
    names_path = _SKILL_DIR / "assets" / "eu_first_names.json"
    try:
        locations = json.loads(locations_path.read_text(encoding="utf-8"))
        first_names = json.loads(names_path.read_text(encoding="utf-8"))
    except Exception as exc:
        print(f"RESULT: {json.dumps({'error': f'asset_load_failed: {exc}'})}")
        return 1

    block = _build_block(locations=locations, first_names=first_names)
    original = target_path.read_text(encoding="utf-8")
    rewritten = _rewrite_component(original, block)

    if rewritten == original:
        log.info("no_changes_needed target=%s", target_path)

    if not args.apply:
        # Show a small unified diff-style preview without external deps
        from difflib import unified_diff
        diff = "\n".join(
            unified_diff(
                original.splitlines(),
                rewritten.splitlines(),
                fromfile=f"a/{target_path.name}",
                tofile=f"b/{target_path.name}",
                lineterm="",
                n=2,
            )
        )
        print("--- PREVIEW (use --apply to commit) ---")
        if not diff.strip():
            print("(no changes)")
        else:
            # Cap at 4000 chars so the agent's stdout doesn't explode
            print(diff[:4000])
            if len(diff) > 4000:
                print(f"\n... (truncated, total diff {len(diff)} chars)")
        result = {
            "applied": False,
            "target": str(target_path),
            "diffChars": len(diff),
            "locationsCount": sum(len(c.get("cities", [])) for c in locations.get("countries", {}).values()),
            "namesCount": sum(len(v) for v in first_names.values() if isinstance(v, list)),
        }
        print(f"RESULT: {json.dumps(result)}")
        return 0

    target_path.write_text(rewritten, encoding="utf-8")
    log.info("patched target=%s", target_path)
    print(f"RESULT: {json.dumps({'applied': True, 'target': str(target_path)})}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
