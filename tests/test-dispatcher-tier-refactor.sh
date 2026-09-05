#!/bin/bash
# test-dispatcher-tier-refactor.sh — Verify dispatcher tier-resolver refactor (v0.5.0 Phase 3)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
COMMANDS_DIR="$REPO_ROOT/commands"
AGENTS_DIR="$REPO_ROOT/agents"

PASS=0
FAIL=0

pass() { echo "  ✅ PASS: $1"; PASS=$((PASS + 1)); }
fail() { echo "  ❌ FAIL: $1"; FAIL=$((FAIL + 1)); }

echo ""
echo "── Dispatcher Tier-Resolver Refactor Tests ─────────────────────"
echo ""

# Test 1: Resolver module exists
echo "Test 1: Resolver module exists"
if [ -f "$COMMANDS_DIR/kmg-init-shared/kmg-ai-model-tier-resolver.md" ]; then
  pass "commands/kmg-init-shared/kmg-ai-model-tier-resolver.md exists"
else
  fail "commands/kmg-init-shared/kmg-ai-model-tier-resolver.md does NOT exist"
fi

# Test 2: capture-lesson.md references tier resolver
echo "Test 2: capture-lesson.md references tier resolver"
set +e
grep -q "ai-model-tier-resolver" "$COMMANDS_DIR/kmg-capture-lesson.md"
result=$?
set -e
if [ $result -eq 0 ]; then
  pass "capture-lesson.md references ai-model-tier-resolver"
else
  fail "capture-lesson.md does NOT reference ai-model-tier-resolver"
fi

# Test 3: session-summary.md references tier resolver
echo "Test 3: session-summary.md references tier resolver"
set +e
grep -q "ai-model-tier-resolver" "$COMMANDS_DIR/kmg-session-summary.md"
result=$?
set -e
if [ $result -eq 0 ]; then
  pass "session-summary.md references ai-model-tier-resolver"
else
  fail "session-summary.md does NOT reference ai-model-tier-resolver"
fi

# Test 4: capture-lesson.md no hardcoded Opus model
echo "Test 4: capture-lesson.md no hardcoded Opus model"
set +e
grep -q "claude-opus-4-7" "$COMMANDS_DIR/kmg-capture-lesson.md"
result=$?
set -e
if [ $result -ne 0 ]; then
  pass "capture-lesson.md does not contain hardcoded claude-opus-4-7"
else
  fail "capture-lesson.md contains hardcoded model name claude-opus-4-7 (should use tier resolver)"
fi

# Test 5: session-summary.md no hardcoded Opus model
echo "Test 5: session-summary.md no hardcoded Opus model"
set +e
grep -q "claude-opus-4-7" "$COMMANDS_DIR/kmg-session-summary.md"
result=$?
set -e
if [ $result -ne 0 ]; then
  pass "session-summary.md does not contain hardcoded claude-opus-4-7"
else
  fail "session-summary.md contains hardcoded model name claude-opus-4-7 (should use tier resolver)"
fi

# Test 6: Agents with subagent dispatch reference tiers (warnings only)
echo ""
echo "── Agent tier reference check (warnings only) ──────────────────"
for agent_file in "$AGENTS_DIR"/*.md; do
  [ -f "$agent_file" ] || continue
  set +e
  grep -qiE "subagent|dispatch" "$agent_file"
  has_dispatch=$?
  grep -qiE "ai-model-tier-resolver|tier_map|tier-" "$agent_file"
  has_tier=$?
  set -e
  if [ $has_dispatch -eq 0 ] && [ $has_tier -ne 0 ]; then
    echo "  ⚠️  WARN: $(basename $agent_file) dispatches subagents but has no tier reference"
  fi
done
pass "Agent tier reference scan complete (warnings above if any)"

echo ""
echo "────────────────────────────────────────────────────────────────"
echo "Results: $PASS passed, $FAIL failed"
echo ""

if [ $FAIL -gt 0 ]; then
  exit 1
fi
