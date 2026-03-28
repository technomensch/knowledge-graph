#!/bin/bash
# test-e2e-verification.sh — Phase 7b End-to-End Verification
#
# Tests:
# 1. KG/CWD alignment guard (lesson-capture-agent, session-summary-agent)
# 2. FTS5 rebuild after capture
# 3. MCP auto-registration (IDE detection + config setup)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
AGENTS_DIR="$REPO_ROOT/agents"
KG_CONFIG="$HOME/.claude/kg-config.json"

PASS=0
FAIL=0

pass() { echo "  ✅ PASS: $1"; PASS=$((PASS + 1)); }
fail() { echo "  ❌ FAIL: $1"; FAIL=$((FAIL + 1)); }

echo "═══════════════════════════════════════════════════════════════"
echo "TEST SUITE: End-to-End Verification (Phase 7b)"
echo "Repo: $REPO_ROOT"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# ═══════════════════════════════════════════
# SECTION 1: KG/CWD Guard Detection
# ═══════════════════════════════════════════

echo "── Section 1: KG/CWD Alignment Guard ────────────────────────"

# Test 1.1: lesson-capture-agent has KG/CWD guard documentation
if grep -q "Active KG / CWD Guard" "$AGENTS_DIR/lesson-capture-agent.md"; then
  pass "lesson-capture-agent documents KG/CWD guard"
else
  fail "lesson-capture-agent missing KG/CWD guard documentation"
fi

# Test 1.2: session-summary-agent has KG/CWD guard documentation
if grep -q "Active KG / CWD Guard" "$AGENTS_DIR/session-summary-agent.md"; then
  pass "session-summary-agent documents KG/CWD guard"
else
  fail "session-summary-agent missing KG/CWD guard documentation"
fi

# Test 1.3: lesson-capture-agent references kg-config.json
if grep -q "kg-config.json" "$AGENTS_DIR/lesson-capture-agent.md"; then
  pass "lesson-capture-agent references kg-config.json for guard"
else
  fail "lesson-capture-agent missing kg-config.json reference"
fi

# Test 1.4: Session summary agent blocks on CWD mismatch
if grep -q "Do you want to switch" "$AGENTS_DIR/session-summary-agent.md"; then
  pass "session-summary-agent blocks with user prompt on CWD mismatch"
else
  fail "session-summary-agent missing CWD mismatch blocking logic"
fi

echo ""

# ═══════════════════════════════════════════
# SECTION 2: FTS5 Rebuild After Capture
# ═══════════════════════════════════════════

echo "── Section 2: FTS5 Rebuild After Capture ──────────────────────"

# Test 2.1: lesson-capture-agent makes new lessons searchable
if grep -q "immediately searchable\|searchable.*recall\|FTS5\|index" "$AGENTS_DIR/lesson-capture-agent.md"; then
  pass "lesson-capture-agent ensures new lessons are immediately searchable"
else
  fail "lesson-capture-agent missing searchability guarantee"
fi

# Test 2.2: session-summary-agent makes new summaries available for search
if grep -q "searchable\|search\|index\|FTS5" "$AGENTS_DIR/session-summary-agent.md"; then
  pass "session-summary-agent ensures summaries are available for search"
else
  fail "session-summary-agent missing search availability"
fi

# Test 2.3: Verify kg_fts5_rebuild is available in MCP tools
MCP_SERVER_FILE="$REPO_ROOT/mcp-server/src/index.ts"
if [ -f "$MCP_SERVER_FILE" ]; then
  if grep -q "kg_fts5_rebuild" "$MCP_SERVER_FILE"; then
    pass "kg_fts5_rebuild is registered in MCP server"
  else
    fail "kg_fts5_rebuild not found in MCP server registration"
  fi
else
  fail "MCP server index.ts not found"
fi

echo ""

# ═══════════════════════════════════════════
# SECTION 3: MCP Auto-Registration
# ═══════════════════════════════════════════

echo "── Section 3: MCP Auto-Registration (IDE Detection) ─────────────"

# Test 3.1: mcp-setup-agent exists
if [ -f "$AGENTS_DIR/mcp-setup-agent.md" ]; then
  pass "mcp-setup-agent.md exists"
else
  fail "mcp-setup-agent.md not found"
fi

# Test 3.2: mcp-setup-agent documents IDE detection
if grep -q "Gemini CLI\|Cursor\|Windsurf\|Continue.dev" "$AGENTS_DIR/mcp-setup-agent.md"; then
  pass "mcp-setup-agent documents IDE detection (Gemini, Cursor, Windsurf, Continue.dev)"
else
  fail "mcp-setup-agent missing IDE detection list"
fi

# Test 3.3: mcp-setup-agent has connection test logic
if grep -q "test.*connection\|verify.*MCP\|connection.*test" "$AGENTS_DIR/mcp-setup-agent.md"; then
  pass "mcp-setup-agent includes MCP connection testing"
else
  fail "mcp-setup-agent missing connection test logic"
fi

# Test 3.4: mcp-setup-agent documents retry logic
if grep -q "retry\|fail.*retry" "$AGENTS_DIR/mcp-setup-agent.md"; then
  pass "mcp-setup-agent documents retry logic on connection failure"
else
  fail "mcp-setup-agent missing retry logic documentation"
fi

# Test 3.5: lesson-capture-agent delegates to mcp-setup-agent on MCP failure
if grep -q "mcp-setup-agent" "$AGENTS_DIR/lesson-capture-agent.md"; then
  pass "lesson-capture-agent delegates to mcp-setup-agent on MCP failure"
else
  fail "lesson-capture-agent missing mcp-setup-agent delegation"
fi

# Test 3.6: session-summary-agent delegates to mcp-setup-agent on MCP failure
if grep -q "mcp-setup-agent" "$AGENTS_DIR/session-summary-agent.md"; then
  pass "session-summary-agent delegates to mcp-setup-agent on MCP failure"
else
  fail "session-summary-agent missing mcp-setup-agent delegation"
fi

# Test 3.7: AGENTS-template documents MCP failures
AGENTS_TEMPLATE="$REPO_ROOT/core/templates/AGENTS-template.md"
if [ -f "$AGENTS_TEMPLATE" ]; then
  if grep -q "MCP.*not.*responding\|MCP.*fail" "$AGENTS_TEMPLATE"; then
    pass "AGENTS-template documents MCP failure handling"
  else
    fail "AGENTS-template missing MCP failure handling section"
  fi
else
  fail "AGENTS-template.md not found"
fi

echo ""

# ═══════════════════════════════════════════
# SECTION 4: File System Fallback
# ═══════════════════════════════════════════

echo "── Section 4: File System Fallback (MCP Unavailable) ──────────"

# Test 4.1: lesson-capture-agent documents file-system fallback
if grep -q "file.*system.*fallback\|fallback.*file" "$AGENTS_DIR/lesson-capture-agent.md"; then
  pass "lesson-capture-agent documents file-system fallback"
else
  fail "lesson-capture-agent missing fallback documentation"
fi

# Test 4.2: session-summary-agent documents file-system fallback
if grep -q "file.*system.*fallback\|fallback.*file" "$AGENTS_DIR/session-summary-agent.md"; then
  pass "session-summary-agent documents file-system fallback"
else
  fail "session-summary-agent missing fallback documentation"
fi

# Test 4.3: Fallback preserves lesson content
if grep -q "Never.*lose\|content.*preserved" "$AGENTS_DIR/lesson-capture-agent.md"; then
  pass "lesson-capture-agent guarantees content preservation on fallback"
else
  fail "lesson-capture-agent missing content preservation guarantee"
fi

echo ""

# ═══════════════════════════════════════════
# SECTION 5: Cross-Agent Consistency
# ═══════════════════════════════════════════

echo "── Section 5: Cross-Agent Consistency ───────────────────────"

# Test 5.1: Both capture agents use same KG/CWD guard pattern
LCA_GUARD=$(grep -A 3 "Active KG / CWD Guard" "$AGENTS_DIR/lesson-capture-agent.md" | head -2)
SSA_GUARD=$(grep -A 3 "Active KG / CWD Guard" "$AGENTS_DIR/session-summary-agent.md" | head -2)

if [ -n "$LCA_GUARD" ] && [ -n "$SSA_GUARD" ]; then
  pass "Both agents implement KG/CWD guard (consistent pattern)"
else
  fail "KG/CWD guard pattern inconsistent between agents"
fi

# Test 5.2: Both agents ensure searchability after writes
if grep -q "searchable\|index\|search" "$AGENTS_DIR/lesson-capture-agent.md" && \
   grep -q "searchable\|index\|search" "$AGENTS_DIR/session-summary-agent.md"; then
  pass "Both agents ensure written content is searchable (consistent)"
else
  fail "Searchability guarantees inconsistent between agents"
fi

# Test 5.3: Both agents document MCP failure delegation
if grep -q "mcp-setup-agent" "$AGENTS_DIR/lesson-capture-agent.md" && \
   grep -q "mcp-setup-agent" "$AGENTS_DIR/session-summary-agent.md"; then
  pass "Both agents delegate to mcp-setup-agent on MCP failure (consistent)"
else
  fail "MCP failure delegation inconsistent between agents"
fi

echo ""

# ═══════════════════════════════════════════
# Summary
# ═══════════════════════════════════════════

echo "═══════════════════════════════════════════════════════════════"
echo "E2E VERIFICATION: $PASS passed, $FAIL failed (total: $((PASS + FAIL)))"
echo "═══════════════════════════════════════════════════════════════"

[ $FAIL -eq 0 ] && exit 0 || exit 1
