#!/usr/bin/env bash
# check-github-issue-sync.test.sh — self-contained test for the sync invariant (issue-11).
# Builds a temp fixture tree, drives check-github-issue-sync.sh against it, asserts outcomes.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CHECK="${SCRIPT_DIR}/check-github-issue-sync.sh"
FAIL=0

pass() { printf 'ok   - %s\n' "$1"; }
fail() { printf 'FAIL - %s\n' "$1"; FAIL=1; }

FIX="$(mktemp -d)"
trap 'rm -rf "$FIX"' EXIT
mkdir -p "$FIX/scripts" "$FIX/knowledge/issues" "$FIX/knowledge/enhancements"

mkspec() { # <dir> <specname> <frontmatter-line-or-empty>
  local d="$FIX/$1"; mkdir -p "$d"
  { printf -- '---\n'; [ -n "${3:-}" ] && printf '%s\n' "$3"; printf 'title: x\n---\n'; } > "$d/$2"
}

# Real issue (number) → OK
mkspec knowledge/enhancements/ENH-900 ENH-900-specification.md 'github_issue: 130'
# null → GAP
mkspec knowledge/enhancements/ENH-901 ENH-901-specification.md 'github_issue: null'
# pending → PENDING (advisory)
mkspec knowledge/enhancements/ENH-902 ENH-902-specification.md 'github_issue: pending'
# missing field entirely → GAP
mkspec knowledge/enhancements/ENH-903 ENH-903-specification.md ''
# issues/ hyphen spelling, placeholder "#N" → GAP
mkspec knowledge/issues/issue-900 issue-900-description.md 'github-issue: "#N"'
# issues/ hyphen spelling, real "#124" → OK
mkspec knowledge/issues/issue-901 issue-901-description.md 'github-issue: "#124"'

export CLAUDE_PROJECT_DIR="$FIX"

# --- Generate baseline: exempts the three current GAP folders (ENH-901, ENH-903, issue-900) ---
"$CHECK" --generate-baseline >/dev/null
grep -qxF 'knowledge/enhancements/ENH-901' "$FIX/scripts/.github-issue-sync-baseline.txt" \
  && pass "baseline lists existing GAP ENH-901" || fail "baseline missing ENH-901"

# --- With everything exempt, report mode is clean (exit 0) ---
if "$CHECK" >/dev/null 2>&1; then pass "clean when all gaps exempt"; else fail "should be clean"; fi

# --- Add a NEW post-baseline GAP folder → hard failure (exit 1) ---
mkspec knowledge/enhancements/ENH-904 ENH-904-specification.md 'github_issue: null'
if "$CHECK" >/dev/null 2>&1; then fail "new leak should exit 1"; else pass "new leak fails (exit 1)"; fi

# --- --findings names the new leak but not the exempt gaps ---
OUT="$("$CHECK" --findings)"
printf '%s' "$OUT" | grep -q 'ENH-904' && pass "findings names new leak ENH-904" || fail "findings missing ENH-904"
printf '%s' "$OUT" | grep -q 'ENH-901' && fail "findings should not name exempt ENH-901" || pass "exempt gap not in findings"

# --- pending surfaces as awaiting-sync, never a failure ---
printf '%s' "$OUT" | grep -qi 'pending\|awaiting' && pass "pending surfaced as awaiting sync" || fail "pending not surfaced"
# ENH-902 pending is not a leak even though it is not in the baseline
printf '%s' "$OUT" | grep -q 'STOP.*ENH-902\|leak.*ENH-902' && fail "pending wrongly treated as leak" || pass "pending is not a leak"

exit $FAIL
