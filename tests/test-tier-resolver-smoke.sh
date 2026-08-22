#!/bin/bash
# test-tier-resolver-smoke.sh — Smoke tests for ai-model-tier-resolver module

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

PASS=0
FAIL=0

pass() { echo "  ✅ PASS: $1"; PASS=$((PASS + 1)); }
fail() { echo "  ❌ FAIL: $1"; FAIL=$((FAIL + 1)); }

echo "═══════════════════════════════════════════════════════════════"
echo "TEST SUITE: AI Model Tier Resolver (Smoke Tests)"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Test 1: Resolver file exists at expected path
RESOLVER_FILE="$REPO_ROOT/commands/kmg-init-shared/kmg-ai-model-tier-resolver.md"
if [ -f "$RESOLVER_FILE" ]; then
  pass "Resolver file exists at commands/kmg-init-shared/kmg-ai-model-tier-resolver.md"
else
  fail "Resolver file not found at $RESOLVER_FILE"
fi

# Test 2: Alias map contains model names (Haiku, Sonnet, Opus)
if grep -q "Haiku" "$RESOLVER_FILE" && \
   grep -q "Sonnet" "$RESOLVER_FILE" && \
   grep -q "Opus" "$RESOLVER_FILE"; then
  pass "Alias map contains Haiku, Sonnet, Opus model names"
else
  fail "Alias map missing one or more model names (Haiku, Sonnet, Opus)"
fi

# Test 3: Tier labels present (fast-tier, standard-tier, powerful-tier)
if grep -q "fast-tier" "$RESOLVER_FILE" && \
   grep -q "standard-tier" "$RESOLVER_FILE" && \
   grep -q "powerful-tier" "$RESOLVER_FILE"; then
  pass "All tier labels present (fast-tier, standard-tier, powerful-tier)"
else
  fail "One or more tier labels missing"
fi

# Test 4: Collapse chain behavior documented (grep for "collapse")
if grep -q "collapse" "$RESOLVER_FILE"; then
  pass "Collapse chain behavior documented (R-3C section)"
else
  fail "Collapse chain behavior not documented"
fi

# Test 5: Validation gate documented (grep for "validation")
if grep -q "validation" "$RESOLVER_FILE"; then
  pass "Validation gate documented (R-4 section)"
else
  fail "Validation gate not documented"
fi

# Test 6: Deprecation warning documented (grep for deprecat pattern)
if grep -q "deprecat" "$RESOLVER_FILE"; then
  pass "Deprecation warning documented in alias handling"
else
  fail "Deprecation warning not documented"
fi

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "TIER-RESOLVER: $PASS passed, $FAIL failed (total: $((PASS + FAIL)))"
echo "═══════════════════════════════════════════════════════════════"
[ $FAIL -eq 0 ] && exit 0 || exit 1
