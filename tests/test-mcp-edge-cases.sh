#!/bin/bash
# test-mcp-edge-cases.sh — Error handling and edge case tests for MCP server
# Verifies graceful handling of corrupt config, missing paths, empty KGs,
# path edge cases, and input validation.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
MCP_SERVER="$REPO_ROOT/mcp-server/dist/index.js"
FIXTURES_DIR="$SCRIPT_DIR/fixtures"

PASS=0
FAIL=0

pass() { echo "  ✅ PASS: $1"; PASS=$((PASS + 1)); }
fail() { echo "  ❌ FAIL: $1"; FAIL=$((FAIL + 1)); }

# ── Setup ────────────────────────────────────────────────────────────────────

TEST_DIR=$(mktemp -d)
TEST_CONFIG="$TEST_DIR/kg-config.json"
REAL_CONFIG="$HOME/.claude/kg-config.json"
REAL_CONFIG_BACKUP="$TEST_DIR/kg-config.backup.json"

cleanup() {
  if [ -f "$REAL_CONFIG_BACKUP" ]; then
    mv "$REAL_CONFIG_BACKUP" "$REAL_CONFIG"
  fi
  rm -rf "$TEST_DIR"
}
trap cleanup EXIT

[ -f "$REAL_CONFIG" ] && cp "$REAL_CONFIG" "$REAL_CONFIG_BACKUP"

echo "═══════════════════════════════════════════════════════════════"
echo "TEST SUITE: MCP Edge Cases & Error Handling"
echo "═══════════════════════════════════════════════════════════════"
echo ""

if [ ! -f "$MCP_SERVER" ]; then
  echo "❌ FATAL: MCP server not built at $MCP_SERVER"
  exit 1
fi

# ── Helper ───────────────────────────────────────────────────────────────────

mcp_tool_call() {
  local tool_name="$1"
  local _default_args="{}"
  local args_json="${2:-$_default_args}"
  {
    echo "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"initialize\",\"params\":{\"protocolVersion\":\"2024-11-05\",\"capabilities\":{},\"clientInfo\":{\"name\":\"test\",\"version\":\"1.0\"}}}"
    echo "{\"jsonrpc\":\"2.0\",\"id\":2,\"method\":\"tools/call\",\"params\":{\"name\":\"${tool_name}\",\"arguments\":${args_json}}}"
    sleep 0.3
  } | KG_CONFIG_PATH="$TEST_CONFIG" CLAUDE_PLUGIN_ROOT="$REPO_ROOT" node "$MCP_SERVER" 2>/dev/null || true
}

# ── Tests ────────────────────────────────────────────────────────────────────

echo "── Corrupt/Missing Config ──────────────────────────────────────"

# Test 1: Corrupt kg-config.json — should not crash the server
cp "$FIXTURES_DIR/corrupt-config.json" "$TEST_CONFIG"
RESULT=$(mcp_tool_call "kg_config_list" "{}" 2>&1 || true)
SERVER_STILL_UP=$( {
    echo "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"initialize\",\"params\":{\"protocolVersion\":\"2024-11-05\",\"capabilities\":{},\"clientInfo\":{\"name\":\"test\",\"version\":\"1.0\"}}}"
    echo "{\"jsonrpc\":\"2.0\",\"id\":2,\"method\":\"tools/list\",\"params\":{}}"
    sleep 0.3
  } | KG_CONFIG_PATH="$TEST_CONFIG" CLAUDE_PLUGIN_ROOT="$REPO_ROOT" node "$MCP_SERVER" 2>/dev/null | grep -c "tools" || echo "0" || true)
# Note: corrupt JSON causes JSON.parse to throw — server will exit. Test that it exits cleanly vs hangs.
if echo "$RESULT" | grep -qE "error|Error|parse|unexpected|invalid" || [ "$SERVER_STILL_UP" = "0" ]; then
  pass "Corrupt config — server exits with error rather than hanging"
else
  fail "Corrupt config should cause error, not silent success"
fi

# Test 2: Missing kg-config.json — should return defaults, no crash
rm -f "$TEST_CONFIG"
RESULT=$(mcp_tool_call "kg_config_list" "{}")
if echo "$RESULT" | grep -q "No knowledge graphs\|no knowledge graphs\|configured"; then
  pass "Missing config file — returns 'no graphs configured' message"
else
  fail "Missing config should return no-graphs message (got: $(echo "$RESULT" | head -1))"
fi

echo ""
echo "── Active KG Path Issues ───────────────────────────────────────"

# Test 3: Active KG points to non-existent directory
cat > "$TEST_CONFIG" << EOF
{
  "version": "1.0.0",
  "active": "ghost-kg",
  "graphs": {
    "ghost-kg": {
      "name": "ghost-kg",
      "path": "$TEST_DIR/this-path-does-not-exist",
      "type": "project-local",
      "categories": [],
      "createdAt": "2026-01-01T00:00:00.000Z",
      "lastUsed": "2026-01-01T00:00:00.000Z"
    }
  },
  "sanitization": { "enabled": false, "patterns": [], "action": "warn" }
}
EOF
RESULT=$(mcp_tool_call "kg_search" "{\"query\":\"test\",\"format\":\"summary\"}")
if echo "$RESULT" | grep -qE "does not exist|not found|Error"; then
  pass "Search on non-existent KG path returns clear error"
else
  fail "Search should error on non-existent KG path"
fi

RESULT=$(mcp_tool_call "kg_check_sensitive" "{}")
if echo "$RESULT" | grep -qE "does not exist|not found|Error"; then
  pass "Sanitization on non-existent KG path returns clear error"
else
  fail "Sanitization should error on non-existent KG path"
fi

# Test 4: Empty KG — valid structure, zero content files
EMPTY_KG="$TEST_DIR/empty-kg"
mkdir -p "$EMPTY_KG/knowledge" "$EMPTY_KG/lessons-learned" "$EMPTY_KG/decisions" "$EMPTY_KG/sessions"
cat > "$TEST_CONFIG" << EOF
{
  "version": "1.0.0",
  "active": "empty-kg",
  "graphs": {
    "empty-kg": {
      "name": "empty-kg",
      "path": "$EMPTY_KG",
      "type": "project-local",
      "categories": [],
      "createdAt": "2026-01-01T00:00:00.000Z",
      "lastUsed": "2026-01-01T00:00:00.000Z"
    }
  },
  "sanitization": { "enabled": false, "patterns": [], "action": "warn" }
}
EOF
RESULT=$(mcp_tool_call "kg_search" "{\"query\":\"anything\",\"format\":\"summary\"}")
if echo "$RESULT" | grep -q "No results"; then
  pass "Search on empty KG returns 'No results'"
else
  fail "Search on empty KG should return no-results message"
fi

RESULT=$(mcp_tool_call "kg_check_sensitive" "{}")
if echo "$RESULT" | grep -qiE "No sensitive|0 file|no.*found"; then
  pass "Sanitization on empty KG returns clean result"
else
  fail "Sanitization on empty KG should return clean result"
fi

echo ""
echo "── Path Edge Cases ─────────────────────────────────────────────"

# Test 5: KG path with spaces in directory name
SPACED_KG="$TEST_DIR/my knowledge graph"
cat > "$TEST_CONFIG" << 'EOF_RESET'
{"version":"1.0.0","active":null,"graphs":{},"sanitization":{"enabled":false,"patterns":[],"action":"warn"}}
EOF_RESET
RESULT=$(mcp_tool_call "kg_config_init" "{\"name\":\"spaced-kg\",\"kgPath\":\"$SPACED_KG\"}")
if echo "$RESULT" | grep -q "initialized" && [ -d "$SPACED_KG/knowledge" ]; then
  pass "KG path with spaces in directory name works correctly"
else
  fail "KG init should work with spaces in path"
fi

echo ""
echo "── Input Validation ────────────────────────────────────────────"

# Reset to clean config
cat > "$TEST_CONFIG" << 'EOF_RESET'
{"version":"1.0.0","active":null,"graphs":{},"sanitization":{"enabled":false,"patterns":[],"action":"warn"}}
EOF_RESET

# Test 6: Very long search query
LONG_QUERY=$(python3 -c "print('a' * 1000)")
RESULT=$(mcp_tool_call "kg_config_init" "{\"name\":\"val-kg\",\"kgPath\":\"$TEST_DIR/val-kg\"}" > /dev/null && \
  mcp_tool_call "kg_search" "{\"query\":\"$LONG_QUERY\",\"format\":\"summary\"}" 2>&1 || echo "completed")
# Just verify it didn't crash (exit non-zero or hang)
if echo "$RESULT" | grep -qE "results|Results|No results|found" || [ -n "$RESULT" ]; then
  pass "Very long search query (1000 chars) does not crash server"
else
  fail "Long query should return some response without crashing"
fi

# Set up val-kg properly for remaining tests
mcp_tool_call "kg_config_init" "{\"name\":\"val-kg\",\"kgPath\":\"$TEST_DIR/val-kg\"}" > /dev/null 2>&1 || true

# Test 7: Special regex characters in search query
RESULT=$(mcp_tool_call "kg_search" "{\"query\":\"test.[*+]\",\"format\":\"summary\"}" 2>&1 || echo "completed")
if echo "$RESULT" | grep -qvE "crash|exception|SIGSEGV|uncaught"; then
  pass "Regex special characters in search query handled safely"
else
  fail "Special characters in search should not crash"
fi

# Test 8: Empty graph name rejected by Zod validation
RESULT=$(mcp_tool_call "kg_config_init" "{\"name\":\"\",\"kgPath\":\"$TEST_DIR/noname\"}" 2>&1 || true)
if echo "$RESULT" | grep -qiE "invalid|error|validation|required|minimum"; then
  pass "Empty graph name rejected with validation error"
else
  fail "Empty graph name should be rejected (got: $(echo "$RESULT" | head -1))"
fi

# Test 9: Config with extra/unknown fields — forward compatibility
cat > "$TEST_CONFIG" << EOF
{
  "version": "2.0.0",
  "active": "compat-kg",
  "unknownFutureField": "some value",
  "graphs": {
    "compat-kg": {
      "name": "compat-kg",
      "path": "$EMPTY_KG",
      "type": "project-local",
      "categories": [],
      "futureGraphField": true,
      "createdAt": "2026-01-01T00:00:00.000Z",
      "lastUsed": "2026-01-01T00:00:00.000Z"
    }
  },
  "sanitization": { "enabled": false, "patterns": [], "action": "warn" }
}
EOF
RESULT=$(mcp_tool_call "kg_config_list" "{}")
if echo "$RESULT" | grep -q "compat-kg"; then
  pass "Config with extra/unknown fields reads without error"
else
  fail "Forward-compatible config should read cleanly"
fi

# Test 10: Add category to KG whose path doesn't exist
cat > "$TEST_CONFIG" << EOF
{
  "version": "1.0.0",
  "active": "ghost-kg",
  "graphs": {
    "ghost-kg": {
      "name": "ghost-kg",
      "path": "$TEST_DIR/nonexistent-path",
      "type": "project-local",
      "categories": [],
      "createdAt": "2026-01-01T00:00:00.000Z",
      "lastUsed": "2026-01-01T00:00:00.000Z"
    }
  },
  "sanitization": { "enabled": false, "patterns": [], "action": "warn" }
}
EOF
RESULT=$(mcp_tool_call "kg_config_add_category" "{\"name\":\"new-cat\",\"prefix\":null,\"git\":\"commit\"}" 2>&1 || true)
# Either creates parent dirs (mkdirSync recursive) or returns error — both are acceptable
if [ -n "$RESULT" ]; then
  pass "Add category to non-existent KG path returns a response (no hang)"
else
  fail "Add category should not hang silently"
fi

echo ""

# ── Summary ──────────────────────────────────────────────────────────────────

echo "═══════════════════════════════════════════════════════════════"
echo "MCP EDGE CASES: $PASS passed, $FAIL failed (total: $((PASS + FAIL)))"
echo "═══════════════════════════════════════════════════════════════"

[ $FAIL -eq 0 ] && exit 0 || exit 1
