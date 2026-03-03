#!/bin/bash
# test-skills-agents.sh — Structural validation for all 6 skills and 3 agents
#
# Skills: auto-triggered context providers in skills/
# Agents: heavy-lift task handlers in agents/

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SKILLS_DIR="$REPO_ROOT/skills"
AGENTS_DIR="$REPO_ROOT/agents"

PASS=0
FAIL=0

pass() { echo "  ✅ PASS: $1"; PASS=$((PASS + 1)); }
fail() { echo "  ❌ FAIL: $1"; FAIL=$((FAIL + 1)); }

echo "═══════════════════════════════════════════════════════════════"
echo "TEST SUITE: Skills & Agents (structural validation)"
echo "Skills dir: $SKILLS_DIR"
echo "Agents dir: $AGENTS_DIR"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# ═══════════════════════════════════════════
# SKILLS
# ═══════════════════════════════════════════

echo "── Skills ──────────────────────────────────────────────────────"

EXPECTED_SKILLS=(
  "lesson-capture"
  "kg-recall"
  "session-wrap"
  "adr-guide"
  "gov-execute-plan"
  "knowledge-graph-usage"
)

# Test 1: Skills directory exists
if [ -d "$SKILLS_DIR" ]; then
  pass "skills/ directory exists"
else
  fail "skills/ directory not found at $SKILLS_DIR"
  echo "  Cannot continue skills tests"
  SKILLS_DIR=""
fi

if [ -n "$SKILLS_DIR" ]; then

  # Test 2: All 6 skill directories present
  MISSING_SKILLS=0
  for skill in "${EXPECTED_SKILLS[@]}"; do
    if [ ! -d "$SKILLS_DIR/$skill" ]; then
      echo "    Missing skill directory: $skill"
      MISSING_SKILLS=$((MISSING_SKILLS + 1))
    fi
  done
  if [ $MISSING_SKILLS -eq 0 ]; then
    pass "All 6 skill directories present"
  else
    fail "$MISSING_SKILLS skill director(ies) missing"
  fi

  # Test 3: Exact count is 6
  ACTUAL_COUNT=$(find "$SKILLS_DIR" -mindepth 1 -maxdepth 1 -type d | wc -l | tr -d ' ')
  if [ "$ACTUAL_COUNT" -eq 6 ]; then
    pass "Exact skill count is 6"
  else
    fail "Skill count is $ACTUAL_COUNT (expected 6)"
  fi

  # Test 4: No empty skill directories
  EMPTY_SKILLS=0
  for skill in "${EXPECTED_SKILLS[@]}"; do
    if [ -d "$SKILLS_DIR/$skill" ]; then
      FILE_COUNT=$(find "$SKILLS_DIR/$skill" -type f | wc -l | tr -d ' ')
      if [ "$FILE_COUNT" -eq 0 ]; then
        echo "    Empty skill directory: $skill"
        EMPTY_SKILLS=$((EMPTY_SKILLS + 1))
      fi
    fi
  done
  if [ $EMPTY_SKILLS -eq 0 ]; then
    pass "No empty skill directories"
  else
    fail "$EMPTY_SKILLS skill director(ies) are empty"
  fi

  # Test 5: No deprecated /knowledge: namespace
  DEPRECATED=$(grep -rn "/knowledge:" "$SKILLS_DIR" 2>/dev/null | grep -v "^Binary" || true)
  if [ -z "$DEPRECATED" ]; then
    pass "No deprecated /knowledge: namespace in skills"
  else
    fail "Deprecated /knowledge: namespace found in skills:"
    echo "$DEPRECATED" | head -5 | sed 's/^/    /'
  fi

  echo ""
  echo "── Skill content checks ────────────────────────────────────────"

  # Test 6: lesson-capture references /kmgraph:capture-lesson
  if [ -d "$SKILLS_DIR/lesson-capture" ]; then
    CONTENT=$(cat "$SKILLS_DIR/lesson-capture"/* 2>/dev/null)
    if echo "$CONTENT" | grep -q "capture-lesson\|kmgraph"; then
      pass "lesson-capture skill references /kmgraph:capture-lesson"
    else
      fail "lesson-capture skill should reference capture-lesson command"
    fi
  else
    fail "lesson-capture skill directory not found"
  fi

  # Test 7: kg-recall references recall or kg_search
  if [ -d "$SKILLS_DIR/kg-recall" ]; then
    CONTENT=$(cat "$SKILLS_DIR/kg-recall"/* 2>/dev/null)
    if echo "$CONTENT" | grep -qE "recall|kg_search|kmgraph"; then
      pass "kg-recall skill references recall command or kg_search tool"
    else
      fail "kg-recall skill should reference recall or kg_search"
    fi
  else
    fail "kg-recall skill directory not found"
  fi

  # Test 8: session-wrap references /kmgraph:session-summary
  if [ -d "$SKILLS_DIR/session-wrap" ]; then
    CONTENT=$(cat "$SKILLS_DIR/session-wrap"/* 2>/dev/null)
    if echo "$CONTENT" | grep -q "session-summary\|kmgraph"; then
      pass "session-wrap skill references /kmgraph:session-summary"
    else
      fail "session-wrap skill should reference session-summary command"
    fi
  else
    fail "session-wrap skill directory not found"
  fi

  # Test 9: adr-guide references /kmgraph:create-adr
  if [ -d "$SKILLS_DIR/adr-guide" ]; then
    CONTENT=$(cat "$SKILLS_DIR/adr-guide"/* 2>/dev/null)
    if echo "$CONTENT" | grep -q "create-adr\|kmgraph"; then
      pass "adr-guide skill references /kmgraph:create-adr"
    else
      fail "adr-guide skill should reference create-adr command"
    fi
  else
    fail "adr-guide skill directory not found"
  fi

fi  # end if SKILLS_DIR

# ═══════════════════════════════════════════
# AGENTS
# ═══════════════════════════════════════════

echo ""
echo "── Agents ──────────────────────────────────────────────────────"

EXPECTED_AGENTS=(
  "knowledge-extractor"
  "session-documenter"
  "knowledge-reviewer"
)

# Test 10: Agents directory exists
if [ -d "$AGENTS_DIR" ]; then
  pass "agents/ directory exists"
else
  fail "agents/ directory not found at $AGENTS_DIR"
  echo "  Cannot continue agents tests"
  echo ""
  echo "═══════════════════════════════════════════════════════════════"
  echo "SKILLS & AGENTS: $PASS passed, $FAIL failed (total: $((PASS + FAIL)))"
  echo "═══════════════════════════════════════════════════════════════"
  [ $FAIL -eq 0 ] && exit 0 || exit 1
fi

# Test 11: All 3 agent files present (agents are .md files, not directories)
MISSING_AGENTS=0
for agent in "${EXPECTED_AGENTS[@]}"; do
  if [ ! -f "$AGENTS_DIR/$agent.md" ]; then
    echo "    Missing agent: $agent.md"
    MISSING_AGENTS=$((MISSING_AGENTS + 1))
  fi
done
if [ $MISSING_AGENTS -eq 0 ]; then
  pass "All 3 agent files present"
else
  fail "$MISSING_AGENTS agent file(s) missing"
fi

# Test 12: Exact count is 3
ACTUAL_COUNT=$(find "$AGENTS_DIR" -name "*.md" -maxdepth 1 -type f | wc -l | tr -d ' ')
if [ "$ACTUAL_COUNT" -eq 3 ]; then
  pass "Exact agent count is 3"
else
  fail "Agent count is $ACTUAL_COUNT (expected 3)"
fi

# Test 13: No empty agent files
EMPTY_AGENTS=0
for agent in "${EXPECTED_AGENTS[@]}"; do
  if [ -f "$AGENTS_DIR/$agent.md" ] && [ ! -s "$AGENTS_DIR/$agent.md" ]; then
    echo "    Empty agent file: $agent.md"
    EMPTY_AGENTS=$((EMPTY_AGENTS + 1))
  fi
done
if [ $EMPTY_AGENTS -eq 0 ]; then
  pass "No empty agent files"
else
  fail "$EMPTY_AGENTS agent file(s) are empty"
fi

# Test 14: No deprecated /knowledge: namespace in agents
DEPRECATED=$(grep -rn "/knowledge:" "$AGENTS_DIR" 2>/dev/null | grep -v "^Binary" || true)
if [ -z "$DEPRECATED" ]; then
  pass "No deprecated /knowledge: namespace in agents"
else
  fail "Deprecated /knowledge: namespace found in agents:"
  echo "$DEPRECATED" | head -5 | sed 's/^/    /'
fi

echo ""
echo "── Agent content checks ────────────────────────────────────────"

# Test 15: knowledge-extractor documents read-only constraint
if [ -f "$AGENTS_DIR/knowledge-extractor.md" ]; then
  CONTENT=$(cat "$AGENTS_DIR/knowledge-extractor.md")
  if echo "$CONTENT" | grep -qiE "read.only|approval|approval.gated|read only"; then
    pass "knowledge-extractor documents read-only / approval-gated constraint"
  else
    fail "knowledge-extractor should document read-only constraint"
  fi
else
  fail "knowledge-extractor.md not found"
fi

# Test 16: session-documenter mentions approval-gating for git operations
if [ -f "$AGENTS_DIR/session-documenter.md" ]; then
  CONTENT=$(cat "$AGENTS_DIR/session-documenter.md")
  if echo "$CONTENT" | grep -qiE "approval|approval.gated|commit|push"; then
    pass "session-documenter mentions approval-gated git operations"
  else
    fail "session-documenter should mention approval-gated commits/pushes"
  fi
else
  fail "session-documenter.md not found"
fi

# Test 17: knowledge-reviewer references sonnet model
if [ -f "$AGENTS_DIR/knowledge-reviewer.md" ]; then
  CONTENT=$(cat "$AGENTS_DIR/knowledge-reviewer.md")
  if echo "$CONTENT" | grep -qi "sonnet"; then
    pass "knowledge-reviewer references sonnet model"
  else
    fail "knowledge-reviewer should specify sonnet model"
  fi
else
  fail "knowledge-reviewer.md not found"
fi

echo ""

# ── Summary ──────────────────────────────────────────────────────────────────

echo "═══════════════════════════════════════════════════════════════"
echo "SKILLS & AGENTS: $PASS passed, $FAIL failed (total: $((PASS + FAIL)))"
echo "═══════════════════════════════════════════════════════════════"

[ $FAIL -eq 0 ] && exit 0 || exit 1
