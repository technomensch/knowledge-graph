#!/bin/bash
# test-v050-misc.sh — Smoke tests for v0.5.0 hooks + me.md template changes

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

PASS=0
FAIL=0

pass() { echo "  ✅ PASS: $1"; PASS=$((PASS + 1)); }
fail() { echo "  ❌ FAIL: $1"; FAIL=$((FAIL + 1)); }

echo "═══════════════════════════════════════════════════════════════"
echo "TEST SUITE: v0.5.0 Hooks + me.md Template"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# ──────────────────────────────────────────────────────────────────
# HOOKS.JSON TESTS
# ──────────────────────────────────────────────────────────────────

echo "Testing hooks/hooks.json..."
echo ""

HOOKS_FILE="$REPO_ROOT/hooks/hooks.json"

# Test 1: hooks.json exists
if [ -f "$HOOKS_FILE" ]; then
  pass "hooks/hooks.json exists"
else
  fail "hooks/hooks.json exists"
fi

# Test 2: hooks.json is valid JSON
if python3 -c "import json; json.load(open('$HOOKS_FILE'))" 2>/dev/null; then
  pass "hooks/hooks.json is valid JSON"
else
  fail "hooks/hooks.json is valid JSON"
fi

# Test 3: hooks.json contains "PreToolUse"
if grep -q "PreToolUse" "$HOOKS_FILE"; then
  pass "hooks/hooks.json contains 'PreToolUse'"
else
  fail "hooks/hooks.json contains 'PreToolUse'"
fi

# Test 4: hooks.json contains "Skill" (the PreToolUse hook targets the Skill tool)
if grep -q '"matcher": "Skill"' "$HOOKS_FILE"; then
  pass "hooks/hooks.json contains Skill matcher in PreToolUse"
else
  fail "hooks/hooks.json contains Skill matcher in PreToolUse"
fi

echo ""

# ──────────────────────────────────────────────────────────────────
# ME.MD TEMPLATE TESTS
# ──────────────────────────────────────────────────────────────────

echo "Testing me.md template..."
echo ""

# Find me.md template
ME_TEMPLATE=""
if [ -f "$REPO_ROOT/core/default-templates/knowledge/templates/project/me.md" ]; then
  ME_TEMPLATE="$REPO_ROOT/core/default-templates/knowledge/templates/project/me.md"
elif [ -d "$REPO_ROOT/core/default-templates" ]; then
  ME_TEMPLATE=$(find "$REPO_ROOT/core/default-templates" -name "me.md" -path "*/project/*" 2>/dev/null | head -1 || true)
  if [ -z "$ME_TEMPLATE" ]; then
    ME_TEMPLATE=$(find "$REPO_ROOT/core/default-templates" -name "me.md" 2>/dev/null | head -1 || true)
  fi
fi

# Test 5: me.md template exists
if [ -n "$ME_TEMPLATE" ] && [ -f "$ME_TEMPLATE" ]; then
  pass "me.md template exists at $ME_TEMPLATE"
else
  fail "me.md template exists"
fi

# Test 6: Template contains "platforms" (the platforms[] example)
if [ -n "$ME_TEMPLATE" ] && [ -f "$ME_TEMPLATE" ]; then
  set +e
  grep -q "platforms" "$ME_TEMPLATE"
  grep_result=$?
  set -e
  if [ $grep_result -eq 0 ]; then
    pass "me.md template contains 'platforms'"
  else
    fail "me.md template contains 'platforms'"
  fi
else
  fail "me.md template contains 'platforms' (template not found)"
fi

# Test 7: Template contains "tier_map" (the tier_map example)
if [ -n "$ME_TEMPLATE" ] && [ -f "$ME_TEMPLATE" ]; then
  set +e
  grep -q "tier_map" "$ME_TEMPLATE"
  grep_result=$?
  set -e
  if [ $grep_result -eq 0 ]; then
    pass "me.md template contains 'tier_map'"
  else
    fail "me.md template contains 'tier_map'"
  fi
else
  fail "me.md template contains 'tier_map' (template not found)"
fi

# Test 8: Template has commented content (should contain # or <!-- for examples)
if [ -n "$ME_TEMPLATE" ] && [ -f "$ME_TEMPLATE" ]; then
  set +e
  grep -q "^[[:space:]]*#" "$ME_TEMPLATE"
  grep_result=$?
  set -e
  if [ $grep_result -eq 0 ]; then
    pass "me.md template contains commented content"
  else
    fail "me.md template contains commented content"
  fi
else
  fail "me.md template contains commented content (template not found)"
fi

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "HOOKS + TEMPLATE: $PASS passed, $FAIL failed (total: $((PASS + FAIL)))"
echo "═══════════════════════════════════════════════════════════════"
[ $FAIL -eq 0 ] && exit 0 || exit 1
