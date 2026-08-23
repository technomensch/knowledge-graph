#!/usr/bin/env bash
# check-numbering-collision.sh — detects two entries independently claiming
# the same sequential ID in knowledge/decisions (ADR-NNN), knowledge/enhancements
# (ENH-NNN), or knowledge/issues (issue-N). See ADR-067 § "Mechanism resolved
# 2026-08-23" for why this exists and why it's mechanical (not a skill).
#
# Modes:
#   (default)   report: human-readable summary; exit 1 if any collision found.
#   --findings  print only finding lines (empty if none), always exit 0.
#               Consumed by pre-push-gate.sh (Gate 7).
#
# Pure read — never writes. Fixing a detected collision is a separate,
# explicitly-invoked script: scripts/fix-numbering-collision.sh.

# NOTE: knowledge/enhancements/ENH-NNN and knowledge/issues/issue-N are exact-name
# directories with no slug, so a real cross-branch collision (two branches each
# adding different files inside their own same-numbered folder) merges silently
# with NO git conflict and is NOT detected by this script's number-matching check
# — accepted gap, not solved here. The ADR check above is what actually catches a
# live collision today, because ADR filenames carry a distinguishing slug that
# makes two competing claims survive a merge as two distinguishable files. The
# ENH/issue checks remain as a narrower safety net for the case they CAN still
# catch: two same-numbered folders with genuinely different padding (e.g. a
# malformed issue-01 next to issue-1).

set -euo pipefail

REPO_ROOT="${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"

MODE="report"
case "${1:-}" in
  --findings) MODE="findings" ;;
  "")         MODE="report" ;;
  *) echo "usage: $(basename "$0") [--findings]" >&2; exit 2 ;;
esac

FINDINGS=""

# check_area <label> <dir> <id-regex-with-one-capture-group> <find-args...>
check_area() {
  local label="$1" dir="$2" id_regex="$3"
  shift 3
  local listing=""
  [ -d "$dir" ] || return 0

  while IFS= read -r path; do
    [ -n "$path" ] || continue
    local base id
    base=$(basename "$path")
    id=$(printf '%s\n' "$base" | sed -nE "s/${id_regex}/\\1/p")
    [ -n "$id" ] || continue
    listing="${listing}$((10#$id))"$'\t'"${path}"$'\n'
  done < <(find "$dir" "$@" 2>/dev/null | sort)

  [ -n "$listing" ] || return 0

  local dupes
  dupes=$(printf '%s' "$listing" | cut -f1 | sort -n | uniq -d)
  [ -n "$dupes" ] || return 0

  while IFS= read -r num; do
    [ -n "$num" ] || continue
    local paths
    paths=$(printf '%s' "$listing" | awk -F'\t' -v n="$num" '$1 == n { print $2 }')
    FINDINGS="${FINDINGS}NUMBERING COLLISION: ${label} #${num} claimed by more than one entry:
$(printf '%s\n' "$paths" | sed 's/^/  - /')
Run scripts/fix-numbering-collision.sh ${label} ${num} to resolve.
"
  done <<< "$dupes"
}

# Companion-doc exemption: files matching one of these suffixes are a
# supplementary doc for an existing decision, not a competing numbering
# claim (real example in this repo: ADR-067-implementation-spec.md alongside
# ADR-067-mutable-active-switch-....md). Extend this list if new companion
# suffix patterns are introduced.
check_area "decisions"    "${REPO_ROOT}/knowledge/decisions"    '^ADR-([0-9]+)-.*\.md$'  -maxdepth 1 -iname 'ADR-*.md' -not -iname '*-implementation-spec.md'
check_area "enhancements" "${REPO_ROOT}/knowledge/enhancements" '^ENH-([0-9]+)$'         -maxdepth 1 -type d -iname 'ENH-*'
check_area "issues"       "${REPO_ROOT}/knowledge/issues"       '^issue-([0-9]+)$'       -maxdepth 1 -type d -iname 'issue-*'

FINDINGS=$(printf '%s' "$FINDINGS" | sed 's/[[:space:]]*$//')

if [ "$MODE" = "findings" ]; then
  printf '%s' "$FINDINGS"
  exit 0
fi

if [ -n "$FINDINGS" ]; then
  echo "check-numbering-collision: FAIL"
  printf '%s\n' "$FINDINGS"
  exit 1
fi
echo "check-numbering-collision: OK — no numbering collisions found"
exit 0
