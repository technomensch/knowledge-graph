#!/usr/bin/env bash
# test-decision-governance.sh — Validates ENH-015 decision governance protocol
# Tests: brainstorm-recall skill, adr-guide extensions, gov-execute-plan gate,
#        pre-skill-rules-inject.sh HARD BLOCKs, and knowledge/rules.md page list

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
HOOK="$REPO_ROOT/scripts/pre-skill-rules-inject.sh"

PASS=0
FAIL=0

pass() { echo "  PASS: $1"; PASS=$((PASS + 1)); }
fail() { echo "  FAIL: $1"; FAIL=$((FAIL + 1)); }

echo "═══════════════════════════════════════════════════════════════"
echo "TEST SUITE: Decision Governance (ENH-015)"
echo "Repo: $REPO_ROOT"
echo "═══════════════════════════════════════════════════════════════"

# ── Structural checks (grep-based) ───────────────────────────────────────────

echo ""
echo "── Skill file existence ──"

# Test 1: kmg-brainstorm-recall skill exists
if [[ -f "$REPO_ROOT/skills/kmg-brainstorm-recall/SKILL.md" ]]; then
  pass "Test 01: skills/kmg-brainstorm-recall/SKILL.md exists"
else
  fail "Test 01: skills/kmg-brainstorm-recall/SKILL.md missing"
fi

echo ""
echo "── kmg-brainstorm-recall content ──"

BRAINSTORM="$REPO_ROOT/skills/kmg-brainstorm-recall/SKILL.md"

# Test 2: kmg-brainstorm-recall contains required trigger keywords (5+)
KEYWORD_COUNT=$(grep -c -E "brainstorm|design|option|approach|alternative" "$BRAINSTORM" 2>/dev/null || echo 0)
if [[ "$KEYWORD_COUNT" -ge 5 ]]; then
  pass "Test 02: kmg-brainstorm-recall has 5+ trigger keywords ($KEYWORD_COUNT found)"
else
  fail "Test 02: kmg-brainstorm-recall has fewer than 5 trigger keywords ($KEYWORD_COUNT found)"
fi

# Test 3: kmg-brainstorm-recall contains "Prior Art" heading reference
if grep -q "Prior Art" "$BRAINSTORM" 2>/dev/null; then
  pass "Test 03: kmg-brainstorm-recall contains 'Prior Art' heading"
else
  fail "Test 03: kmg-brainstorm-recall missing 'Prior Art' heading"
fi

# Test 4: kmg-brainstorm-recall dispatches a real recall mechanism
# (the old check required the literal string "kmgraph:recall" — itself the
# exact dead skill reference issue-36 fixed elsewhere; that string being
# ABSENT is now correct, so check for a real recall reference instead)
if grep -qE "kmg-recall|kmg-auto-recall|kg_search" "$BRAINSTORM" 2>/dev/null; then
  pass "Test 04: kmg-brainstorm-recall dispatches a real recall command/skill/tool"
else
  fail "Test 04: kmg-brainstorm-recall missing a real recall dispatch"
fi

echo ""
echo "── adr-guide extensions ──"

ADR_GUIDE="$REPO_ROOT/skills/kmg-adr-guide/SKILL.md"

# Test 5: adr-guide contains "Project-wide cascade" text
if grep -qi "project-wide cascade\|project.wide cascade" "$ADR_GUIDE" 2>/dev/null; then
  pass "Test 05: adr-guide contains project-wide cascade text"
else
  fail "Test 05: adr-guide missing project-wide cascade text"
fi

# Test 6: adr-guide contains "In-plan cascade" text
if grep -qi "in-plan cascade\|in.plan cascade" "$ADR_GUIDE" 2>/dev/null; then
  pass "Test 06: adr-guide contains in-plan cascade text"
else
  fail "Test 06: adr-guide missing in-plan cascade text"
fi

# Test 7: adr-guide contains "supersede" text
if grep -qi "supersede" "$ADR_GUIDE" 2>/dev/null; then
  pass "Test 07: adr-guide contains supersede check"
else
  fail "Test 07: adr-guide missing supersede check"
fi

echo ""
echo "── kmg-execute-plan extensions ──"

# gov-execute-plan was renamed kmg-execute-plan (dropped the "gov" segment
# entirely, not just prefixed) — verified against the actual skills/ directory.
GOV="$REPO_ROOT/skills/kmg-execute-plan/SKILL.md"

# Test 8: kmg-execute-plan contains In-Plan Cascade gate text
if grep -q "In-Plan Cascade" "$GOV" 2>/dev/null; then
  pass "Test 08: kmg-execute-plan contains 'In-Plan Cascade' gate"
else
  fail "Test 08: kmg-execute-plan missing 'In-Plan Cascade' gate"
fi

# Test 9: kmg-execute-plan checks for kmgraph-adr-captured flag
if grep -q "kmgraph-adr-captured" "$GOV" 2>/dev/null; then
  pass "Test 09: kmg-execute-plan references kmgraph-adr-captured flag"
else
  fail "Test 09: kmg-execute-plan missing kmgraph-adr-captured flag reference"
fi

# Test 10: adr-guide touches kmgraph-adr-captured flag
if grep -q "kmgraph-adr-captured" "$ADR_GUIDE" 2>/dev/null; then
  pass "Test 10: adr-guide contains kmgraph-adr-captured flag instruction"
else
  fail "Test 10: adr-guide missing kmgraph-adr-captured flag instruction"
fi

echo ""
echo "── pre-skill-rules-inject.sh HARD BLOCKs (structural) ──"

# Test 11: hook contains Brainstorm Recall HARD BLOCK text
if grep -q "Brainstorm Recall (HARD BLOCK" "$HOOK" 2>/dev/null; then
  pass "Test 11: pre-skill-rules-inject.sh contains Brainstorm Recall HARD BLOCK"
else
  fail "Test 11: pre-skill-rules-inject.sh missing Brainstorm Recall HARD BLOCK"
fi

echo ""
echo "── knowledge/rules.md page list ──"

RULES="$REPO_ROOT/knowledge/rules.md"

# Test 12: knowledge/rules.md contains kmgraph affected pages list
if grep -q "kmgraph affected pages" "$RULES" 2>/dev/null; then
  pass "Test 12: knowledge/rules.md contains kmgraph affected pages list"
else
  fail "Test 12: knowledge/rules.md missing kmgraph affected pages list"
fi

echo ""
echo "── pre-skill-rules-inject.sh runtime behavior ──"

# Setup minimal fake HOME for runtime checks
TEST_DIR=$(mktemp -d 2>/dev/null || echo "/tmp/test-dg-$$")
mkdir -p "$TEST_DIR/.kmgraph"
printf '### Parallelism Analysis\ntest-parallelism-content\n' > "$TEST_DIR/.kmgraph/rules.md"
cleanup() { rm -rf "$TEST_DIR"; }
trap cleanup EXIT

# Test 13: subagent-driven-development routes to execution branch (ADR gate fires when flag present)
#           Structural check: hook contains ADR cascade check inside execution block
if grep -q "In-Plan Cascade Gate" "$HOOK" 2>/dev/null; then
  pass "Test 13: hook execution branch contains ADR cascade gate (superpowers:subagent-driven-development covered)"
else
  fail "Test 13: hook execution branch missing ADR cascade gate"
fi

# Test 14: systematic-debugging injects Debug Recall HARD BLOCK
OUTPUT_DEBUG=$(HOME="$TEST_DIR" echo '{"tool_input":{"skill":"superpowers:systematic-debugging"}}' | bash "$HOOK" 2>/dev/null || true)
if echo "$OUTPUT_DEBUG" | grep -q "Debug Recall (HARD BLOCK"; then
  pass "Test 14: systematic-debugging injects Debug Recall HARD BLOCK"
else
  fail "Test 14: systematic-debugging missing Debug Recall HARD BLOCK"
fi

# Test 15: requesting-code-review injects the Review Audit Protocol HARD BLOCK
# (renamed from "Review Context Injection" — verified against the hook's
# actual review-request branch, which now also covers the full post-plan/
# pre-push audit flow, not just context injection).
OUTPUT_REVIEW=$(HOME="$TEST_DIR" echo '{"tool_input":{"skill":"superpowers:requesting-code-review"}}' | bash "$HOOK" 2>/dev/null || true)
if echo "$OUTPUT_REVIEW" | grep -q "Review Audit Protocol (HARD BLOCK"; then
  pass "Test 15: requesting-code-review injects Review Audit Protocol HARD BLOCK"
else
  fail "Test 15: requesting-code-review missing Review Audit Protocol HARD BLOCK"
fi

# Test 16: execution branch contains ADR flag check (structural — already covered by Test 13 runtime behavior)
if grep -q "ADR_CASCADE_BLOCK" "$HOOK" 2>/dev/null; then
  pass "Test 16: execution branch uses ADR_CASCADE_BLOCK variable"
else
  fail "Test 16: execution branch missing ADR_CASCADE_BLOCK variable"
fi

# Test 17: finishing branch contains kmgraph-adr-captured flag cleanup
if grep -A5 'SKILL_TYPE.*finishing' "$HOOK" 2>/dev/null | grep -q "kmgraph-adr-captured\|rm -f" || \
   grep -q 'kmgraph-adr-captured.*flag.*finishing\|finishing.*kmgraph-adr-captured' "$HOOK" 2>/dev/null || \
   awk '/SKILL_TYPE.*finishing/,/elif|^fi/' "$HOOK" 2>/dev/null | grep -q "kmgraph-adr-captured"; then
  pass "Test 17: finishing branch contains kmgraph-adr-captured flag cleanup"
else
  fail "Test 17: finishing branch missing kmgraph-adr-captured flag cleanup"
fi

# ── Test 18: planning branch injects Plan Recall HARD BLOCK ──────────────────
OUT_PLAN=$(bash "$HOOK" <<< '{"tool_input":{"skill":"superpowers:writing-plans"}}')
if echo "$OUT_PLAN" | grep -q "Plan Recall (HARD BLOCK"; then
  pass "Test 18: planning branch injects Plan Recall HARD BLOCK"
else
  fail "Test 18: planning branch missing Plan Recall HARD BLOCK"
fi

# ── Test 19: plan-execution-rules.md (or rules.md fallback) contains plan-mode recall directive
# The directive lives in plan-execution-rules.md, not plan-rules.md (which
# doesn't exist) — verified against the actual ~/.kmgraph/ dotfile layout.
PLAN_RULES_TARGET="$HOME/.kmgraph/plan-execution-rules.md"
[ -f "$PLAN_RULES_TARGET" ] || PLAN_RULES_TARGET="$HOME/.kmgraph/rules.md"
if [ -f "$PLAN_RULES_TARGET" ] && grep -q "Recall in Plan Mode" "$PLAN_RULES_TARGET"; then
  pass "Test 19: $(basename $PLAN_RULES_TARGET) contains Recall in Plan Mode directive"
else
  fail "Test 19: $(basename $PLAN_RULES_TARGET) missing Recall in Plan Mode directive"
fi

# ── Summary ──────────────────────────────────────────────────────────────────

echo ""
echo "═══════════════════════════════════════════════════════════════"
TOTAL=$((PASS + FAIL))
echo "RESULTS: $PASS/$TOTAL passed"
if [[ "$FAIL" -eq 0 ]]; then
  echo "STATUS: ALL GREEN ✅"
  exit 0
else
  echo "STATUS: $FAIL FAILED ❌"
  exit 1
fi
