#!/bin/bash
# test-tier-resolver-edge.sh — Edge and negative tests for the ai-model-tier-resolver module

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

RESOLVER="$REPO_ROOT/commands/init-shared/ai-model-tier-resolver.md"
FIXTURE_DIR="$REPO_ROOT/tests/fixtures/tier-resolver"

PASS=0
FAIL=0

pass() { echo "  ✅ PASS: $1"; PASS=$((PASS + 1)); }
fail() { echo "  ❌ FAIL: $1"; FAIL=$((FAIL + 1)); }

echo "═══════════════════════════════════════════════════════════════"
echo "TEST SUITE: Tier Resolver — Edge & Negative Cases"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# ── Fixture sanity ──────────────────────────────────────────────────────────

echo "── Fixture files present ──"

[ -f "$FIXTURE_DIR/me-haiku-alias.md" ] \
  && pass "me-haiku-alias.md exists" \
  || fail "me-haiku-alias.md missing"

[ -f "$FIXTURE_DIR/me-invalid-tier.md" ] \
  && pass "me-invalid-tier.md exists" \
  || fail "me-invalid-tier.md missing"

echo ""

# ── Fixture content checks ──────────────────────────────────────────────────

echo "── me-haiku-alias.md content ──"

set +e
grep -q "fast-tier: Haiku" "$FIXTURE_DIR/me-haiku-alias.md"
[ $? -eq 0 ] && pass "fast-tier maps to Haiku alias" || fail "fast-tier does not map to Haiku"

grep -q "standard-tier: Sonnet" "$FIXTURE_DIR/me-haiku-alias.md"
[ $? -eq 0 ] && pass "standard-tier maps to Sonnet alias" || fail "standard-tier does not map to Sonnet"

grep -q "powerful-tier: Opus" "$FIXTURE_DIR/me-haiku-alias.md"
[ $? -eq 0 ] && pass "powerful-tier maps to Opus alias" || fail "powerful-tier does not map to Opus"
set -e

echo ""
echo "── me-invalid-tier.md content ──"

set +e
grep -q "fast-tier: fast-tier" "$FIXTURE_DIR/me-invalid-tier.md"
[ $? -eq 0 ] && pass "fast-tier maps to bare tier label (invalid)" || fail "fast-tier bare label not found"

grep -q "standard-tier: standard-tier" "$FIXTURE_DIR/me-invalid-tier.md"
[ $? -eq 0 ] && pass "standard-tier maps to bare tier label (invalid)" || fail "standard-tier bare label not found"

grep -q "powerful-tier: powerful-tier" "$FIXTURE_DIR/me-invalid-tier.md"
[ $? -eq 0 ] && pass "powerful-tier maps to bare tier label (invalid)" || fail "powerful-tier bare label not found"
set -e

echo ""

# ── Resolver documentation checks ──────────────────────────────────────────

echo "── Test 1: Legacy alias handling — resolver documents deprecation warning ──"

set +e
grep -qE "warn|deprecat" "$RESOLVER"
[ $? -eq 0 ] \
  && pass "Resolver documents warning/deprecation behavior for legacy alias use" \
  || fail "Resolver missing warn/deprecat documentation"
set -e

echo ""
echo "── Test 2: Bare label rejection — resolver rejects bare tier labels as model values ──"

set +e
grep -q "bare" "$RESOLVER"
[ $? -eq 0 ] \
  && pass "Resolver documents bare label rejection" \
  || fail "Resolver missing bare label rejection documentation"
set -e

echo ""
echo "── Test 3: Case-insensitive alias matching — documented in resolver ──"

set +e
grep -q "case" "$RESOLVER"
[ $? -eq 0 ] \
  && pass "Resolver documents case-insensitive alias matching" \
  || fail "Resolver missing case-insensitive matching documentation"
set -e

echo ""
echo "── Test 4: Platform not found — resolver documents halt behavior ──"

set +e
grep -q "Halt" "$RESOLVER"
[ $? -eq 0 ] \
  && pass "Resolver documents Halt behavior for platform not found" \
  || fail "Resolver missing Halt documentation"
set -e

echo ""
echo "── Test 5: Downward-only collapse — resolver prohibits upward collapse ──"

set +e
grep -q "downward" "$RESOLVER"
[ $? -eq 0 ] \
  && pass "Resolver documents downward-only collapse direction" \
  || fail "Resolver missing downward-only collapse documentation"
set -e

echo ""

# ── Alias fixture confirms validation gate catches bare alias names ──────────

echo "── Test 6: Alias fixture triggers validation gate (bare alias names) ──"

set +e
# me-haiku-alias.md uses bare alias names (Haiku/Sonnet/Opus) as model values.
# The resolver's validation gate should flag these as suspicious.
# Confirm the resolver documents rejection of bare alias names.
grep -q "Reject bare alias names" "$RESOLVER"
[ $? -eq 0 ] \
  && pass "Resolver explicitly rejects bare alias names (catches me-haiku-alias.md pattern)" \
  || fail "Resolver missing 'Reject bare alias names' rule"
set -e

echo ""

# ── Invalid-tier fixture confirms validation gate catches bare tier labels ───

echo "── Test 7: Invalid-tier fixture triggers validation gate (bare tier labels) ──"

set +e
# me-invalid-tier.md uses bare tier labels as model values (fast-tier → fast-tier).
# The resolver's validation gate should flag these as suspicious.
grep -q "Reject bare tier labels" "$RESOLVER"
[ $? -eq 0 ] \
  && pass "Resolver explicitly rejects bare tier labels (catches me-invalid-tier.md pattern)" \
  || fail "Resolver missing 'Reject bare tier labels' rule"
set -e

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "TIER-RESOLVER-EDGE: $PASS passed, $FAIL failed (total: $((PASS + FAIL)))"
echo "═══════════════════════════════════════════════════════════════"
[ $FAIL -eq 0 ] && exit 0 || exit 1
