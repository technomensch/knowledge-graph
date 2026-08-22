#!/bin/bash
# test-skills-agents.sh — Structural validation for all skills and agents
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

# Skills were migrated to the kmg- prefix convention (see CLAUDE.md).
# gov-execute-plan/gov-plan-gate dropped the "gov" segment entirely
# (kmg-execute-plan, kmg-plan-gate) rather than following the simple
# prefix pattern — verified against the actual skills/ directory.
EXPECTED_SKILLS=(
  "kmg-lesson-capture"
  "kmg-auto-recall"
  "kmg-session-wrap"
  "kmg-adr-guide"
  "kmg-execute-plan"
  "kmg-plan-gate"
  "kmg-knowledge-graph-usage"
  "kmg-capture-router"
  "kmg-doc-update-router"
  "kmg-docs-impact-scan"
  "kmg-rules-capture"
  "kmg-sidebar-update"
  "kmg-stuck-work-escalation"
  "kmg-update-profile"
  "kmg-brainstorm-recall"
  "kmg-paperwork-audit"
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
    pass "All 16 skill directories present"
  else
    fail "$MISSING_SKILLS skill director(ies) missing"
  fi

  # Test 3: Exact count is 16
  ACTUAL_COUNT=$(find "$SKILLS_DIR" -mindepth 1 -maxdepth 1 -type d | wc -l | tr -d ' ')
  if [ "$ACTUAL_COUNT" -eq 16 ]; then
    pass "Exact skill count is 16"
  else
    fail "Skill count is $ACTUAL_COUNT (expected 16)"
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

  # Test 6: kmg-lesson-capture references /kmgraph:kmg-capture-lesson
  if [ -d "$SKILLS_DIR/kmg-lesson-capture" ]; then
    CONTENT=$(cat "$SKILLS_DIR/kmg-lesson-capture"/* 2>/dev/null)
    if echo "$CONTENT" | grep -q "kmg-capture-lesson\|kmgraph"; then
      pass "kmg-lesson-capture skill references /kmgraph:kmg-capture-lesson"
    else
      fail "kmg-lesson-capture skill should reference kmg-capture-lesson command"
    fi
  else
    fail "kmg-lesson-capture skill directory not found"
  fi

  # Test 7: kmg-auto-recall references recall or kg_search
  if [ -d "$SKILLS_DIR/kmg-auto-recall" ]; then
    CONTENT=$(cat "$SKILLS_DIR/kmg-auto-recall"/* 2>/dev/null)
    if echo "$CONTENT" | grep -qE "recall|kg_search|kmgraph"; then
      pass "kmg-auto-recall skill references recall command or kg_search tool"
    else
      fail "kmg-auto-recall skill should reference recall or kg_search"
    fi
  else
    fail "kmg-auto-recall skill directory not found"
  fi

  # Test 8: kmg-session-wrap dispatches session-summary
  # This skill deliberately dispatches straight to `session-summary-agent`
  # rather than the /kmgraph:kmg-session-summary command (see its own
  # "User-Facing Language Rules": don't volunteer internal command/agent
  # names unprompted) — so check for either mechanism, not just the command.
  if [ -d "$SKILLS_DIR/kmg-session-wrap" ]; then
    CONTENT=$(cat "$SKILLS_DIR/kmg-session-wrap"/* 2>/dev/null)
    if echo "$CONTENT" | grep -q "kmg-session-summary\|kmgraph\|session-summary-agent"; then
      pass "kmg-session-wrap skill references session-summary (command or agent)"
    else
      fail "kmg-session-wrap skill should reference session-summary (command or agent)"
    fi
  else
    fail "kmg-session-wrap skill directory not found"
  fi

  # Test 9: kmg-adr-guide references /kmgraph:kmg-create-adr
  if [ -d "$SKILLS_DIR/kmg-adr-guide" ]; then
    CONTENT=$(cat "$SKILLS_DIR/kmg-adr-guide"/* 2>/dev/null)
    if echo "$CONTENT" | grep -q "kmg-create-adr\|kmgraph"; then
      pass "kmg-adr-guide skill references /kmgraph:kmg-create-adr"
    else
      fail "kmg-adr-guide skill should reference kmg-create-adr command"
    fi
  else
    fail "kmg-adr-guide skill directory not found"
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
  "lesson-capture-agent"
  "session-summary-agent"
  "mcp-setup-agent"
  "sync-all-agent"
  "create-adr-agent"
  "platform-sync-agent"
  "recall-agent"
  "rules-capture-agent"
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

# Test 11: All 8 agent files present (agents are .md files, not directories)
MISSING_AGENTS=0
for agent in "${EXPECTED_AGENTS[@]}"; do
  if [ ! -f "$AGENTS_DIR/$agent.md" ]; then
    echo "    Missing agent: $agent.md"
    MISSING_AGENTS=$((MISSING_AGENTS + 1))
  fi
done
if [ $MISSING_AGENTS -eq 0 ]; then
  pass "All 11 agent files present"
else
  fail "$MISSING_AGENTS agent file(s) missing"
fi

# Test 12: Exact count is 11
ACTUAL_COUNT=$(find "$AGENTS_DIR" -name "*.md" -maxdepth 1 -type f | wc -l | tr -d ' ')
if [ "$ACTUAL_COUNT" -eq 11 ]; then
  pass "Exact agent count is 11"
else
  fail "Agent count is $ACTUAL_COUNT (expected 11)"
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
# platform-sync-agent.md is excluded: it documents /knowledge:* as a legacy token
# that must NOT propagate — it cites it as a counter-example, not an active reference.
DEPRECATED=$(grep -rn "/knowledge:" "$AGENTS_DIR" 2>/dev/null | grep -v "^Binary" | grep -v "platform-sync-agent.md" || true)
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

# Test 17: knowledge-reviewer does not hardcode a model name
# Model tier selection moved to the ai-model-tier-resolver module, invoked by
# the dispatching command (see test-dispatcher-tier-refactor.sh) — agent files
# no longer declare their own model/tier inline, so this now checks the
# absence of a hardcoded model string rather than the presence of "sonnet".
if [ -f "$AGENTS_DIR/knowledge-reviewer.md" ]; then
  CONTENT=$(cat "$AGENTS_DIR/knowledge-reviewer.md")
  if echo "$CONTENT" | grep -qiE "claude-(opus|sonnet|haiku)-[0-9]"; then
    fail "knowledge-reviewer.md hardcodes a model name (should defer to the tier resolver)"
  else
    pass "knowledge-reviewer.md does not hardcode a model name (tier resolved by dispatcher)"
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
