#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CHECK="${SCRIPT_DIR}/check-numbering-collision.sh"
FAIL=0

pass() { printf 'ok   - %s\n' "$1"; }
fail() { printf 'FAIL - %s\n' "$1"; FAIL=1; }

FIX="$(mktemp -d)"
trap 'rm -rf "$FIX"' EXIT
mkdir -p "$FIX/knowledge/decisions" "$FIX/knowledge/enhancements" "$FIX/knowledge/issues"
export CLAUDE_PROJECT_DIR="$FIX"

# --- No collisions: distinct numbers across all three sequences ---
touch "$FIX/knowledge/decisions/ADR-001-first.md"
touch "$FIX/knowledge/decisions/ADR-002-second.md"
mkdir -p "$FIX/knowledge/enhancements/ENH-001" "$FIX/knowledge/enhancements/ENH-002"
mkdir -p "$FIX/knowledge/issues/issue-1" "$FIX/knowledge/issues/issue-2"

if "$CHECK" >/dev/null 2>&1; then pass "clean repo: report mode exits 0"; else fail "clean repo should exit 0"; fi
OUT="$("$CHECK" --findings 2>&1)"
[ -z "$OUT" ] && pass "clean repo: --findings prints nothing" || fail "clean repo --findings should be empty, got: $OUT"

# --- Collision: two ADRs claim 14, one zero-padded and one not (confirms numeric normalize) ---
touch "$FIX/knowledge/decisions/ADR-014-alpha.md"
touch "$FIX/knowledge/decisions/ADR-14-beta.md"
if "$CHECK" >/dev/null 2>&1; then fail "ADR collision should exit 1"; else pass "ADR collision exits 1 (report mode)"; fi
OUT="$("$CHECK" --findings 2>&1 || true)"
printf '%s' "$OUT" | grep -q 'decisions #14' && pass "findings name the colliding ADR number" || fail "findings missing ADR collision, got: $OUT"
printf '%s' "$OUT" | grep -q 'ADR-014-alpha.md' && pass "findings list padded colliding path" || fail "findings missing padded path"
printf '%s' "$OUT" | grep -q 'ADR-14-beta.md' && pass "findings list unpadded colliding path" || fail "findings missing unpadded path"
rm -f "$FIX/knowledge/decisions/ADR-14-beta.md"

# --- Non-collision: companion-doc exemption (real repo case — ADR-067-implementation-spec.md) ---
touch "$FIX/knowledge/decisions/ADR-020-something.md"
touch "$FIX/knowledge/decisions/ADR-020-implementation-spec.md"
if "$CHECK" >/dev/null 2>&1; then pass "companion-doc suffix does not trigger a false collision"; else
  fail "companion-doc exemption not working — ADR-020-implementation-spec.md was treated as a competing claim"
fi
rm -f "$FIX/knowledge/decisions/ADR-020-something.md" "$FIX/knowledge/decisions/ADR-020-implementation-spec.md"

exit $FAIL
