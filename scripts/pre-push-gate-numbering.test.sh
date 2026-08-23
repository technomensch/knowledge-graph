#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GATE="${SCRIPT_DIR}/pre-push-gate.sh"
FAIL=0
pass() { printf 'ok   - %s\n' "$1"; }
fail() { printf 'FAIL - %s\n' "$1"; FAIL=1; }

FIX="$(mktemp -d)"
trap 'rm -rf "$FIX"' EXIT
mkdir -p "$FIX/knowledge/decisions"
cp "${SCRIPT_DIR}/check-numbering-collision.sh" "$FIX/scripts_check_numbering_collision.sh" 2>/dev/null || true
mkdir -p "$FIX/scripts"
cp "${SCRIPT_DIR}/check-numbering-collision.sh" "$FIX/scripts/check-numbering-collision.sh"
chmod +x "$FIX/scripts/check-numbering-collision.sh"

touch "$FIX/knowledge/decisions/ADR-005-a.md"
touch "$FIX/knowledge/decisions/ADR-005-b.md"

export CLAUDE_PROJECT_DIR="$FIX"
cd "$FIX"
git init -q
git config user.email test@test.com
git config user.name test

INPUT='{"tool_input":{"command":"git push origin main"}}'
OUT=$(printf '%s' "$INPUT" | "$GATE")

printf '%s' "$OUT" | grep -q 'decisions #5' && pass "gate surfaces numbering collision" || fail "gate output missing collision finding, got: $OUT"

exit $FAIL
