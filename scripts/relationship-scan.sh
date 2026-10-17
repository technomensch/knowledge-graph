#!/usr/bin/env bash
# relationship-scan.sh — ENH-062: flag issue/ENH doc pairs that reference the same
# file but declare no relationship in their frontmatter. Flags only: never edits
# anything and always exits 0 ("trigger, not verdict", ENH-052).
set -uo pipefail
export LC_ALL=C

ROOT="${1:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"
KG="${KG_DIR:-$ROOT/knowledge}"
if [ ! -d "$KG/issues" ] && [ ! -d "$KG/enhancements" ]; then
  echo "relationship-scan: no issues/ or enhancements/ under $KG (pass the repo root, or set KG_DIR); nothing was scanned" >&2
fi
IGNORE_RE='^(README\.md|CHANGELOG\.md|package\.json|CLAUDE\.md|AGENTS\.md|knowledge/rules\.md)$'

id_of() { basename "$1" | grep -oE '^(issue-[0-9]+|ENH-[0-9]+)' | head -1; }

frontmatter() {
  awk 'NR==1 && $0!="---"{exit} NR>1 && $0=="---"{exit} NR>1{print}' "$1"
}

# declared FILE OTHER_ID: true when FILE's frontmatter mentions OTHER_ID
declared() {
  frontmatter "$1" | grep -qE "(^|[^A-Za-z0-9])$2([^0-9]|$)"
}

TMP="$(mktemp)"
trap 'rm -f "$TMP"' EXIT

find "$KG/issues" "$KG/enhancements" -type f \( -name 'issue-*-description.md' -o -name 'ENH-*-specification.md' \) 2>/dev/null \
  | sort | while read -r f; do
    id="$(id_of "$f")"
    [ -n "$id" ] || continue
    grep -oE '`[A-Za-z0-9_./-]+\.(md|ts|sh|json|ya?ml)`' "$f" 2>/dev/null | tr -d '`' | sort -u | while read -r p; do
      if [[ "$p" =~ $IGNORE_RE ]]; then continue; fi
      printf '%s\t%s\t%s\n' "$p" "$id" "$f"
    done
  done > "$TMP"

# A path shared by more than HUB_MAX docs is a hub (many docs legitimately touch it),
# and a bare filename with no directory is too generic to identify one file: neither
# says anything about two specific docs being related, so neither produces pairs.
HUB_MAX="${REL_SCAN_HUB_MAX:-4}"

sort -t "$(printf '\t')" -k1,1 -k2,2 "$TMP" | awk -F '\t' -v hub="$HUB_MAX" '
  function flush(   i, j) {
    if (n >= 2 && n <= hub && index(cur, "/") > 0)
      for (i = 1; i <= n; i++) for (j = i + 1; j <= n; j++)
        if (id[i] != id[j]) print id[i] "\t" id[j] "\t" cur "\t" file[i] "\t" file[j]
  }
  { if ($1 != cur) { flush(); n = 0; cur = $1 }
    n++; id[n] = $2; file[n] = $3 }
  END { flush() }
' | sort -u -t "$(printf '\t')" -k1,2 | while IFS="$(printf '\t')" read -r a b p fa fb; do
  if declared "$fa" "$b" || declared "$fb" "$a"; then continue; fi
  echo "UNDECLARED: $a <-> $b (shared: $p)"
done

exit 0
