#!/bin/bash
# test-mcp-offload.sh — Verify MCP server works with KG data at any filesystem path
#
# This test validates the core MCP offloading claim:
# "When a graph outgrows project-local storage, the built-in MCP server provides
# structured read access to graph data from any configured path."
#
# KG data can live at /any/path and the MCP server reads it correctly.

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

# Simulate "local project" and "remote/external" paths
LOCAL_DIR="$TEST_DIR/local-project"
REMOTE_DIR="$TEST_DIR/external-storage"  # Outside any project

cleanup() {
  if [ -f "$REAL_CONFIG_BACKUP" ]; then
    mv "$REAL_CONFIG_BACKUP" "$REAL_CONFIG"
  fi
  rm -rf "$TEST_DIR"
}
trap cleanup EXIT

[ -f "$REAL_CONFIG" ] && cp "$REAL_CONFIG" "$REAL_CONFIG_BACKUP"

echo "═══════════════════════════════════════════════════════════════"
echo "TEST SUITE: MCP Offloading (KG at non-local paths)"
echo "Local dir:  $LOCAL_DIR"
echo "Remote dir: $REMOTE_DIR"
echo "═══════════════════════════════════════════════════════════════"
echo ""

if [ ! -f "$MCP_SERVER" ]; then
  echo "❌ FATAL: MCP server not built"
  exit 1
fi

# ── Helpers ──────────────────────────────────────────────────────────────────

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

# Start with empty config
cat > "$TEST_CONFIG" << 'EOF'
{"version":"1.0.0","active":null,"graphs":{},"sanitization":{"enabled":false,"patterns":[],"action":"warn"}}
EOF

# ── Tests ────────────────────────────────────────────────────────────────────

# Test 1: Init KG at remote (non-project) path
REMOTE_KG_PATH="$REMOTE_DIR/offloaded-kg"
RESULT=$(mcp_tool_call "kg_config_init" "{\"name\":\"offloaded\",\"kgPath\":\"$REMOTE_KG_PATH\"}")
if echo "$RESULT" | grep -q "initialized" && [ -d "$REMOTE_KG_PATH" ]; then
  pass "KG initialized at external/remote path ($REMOTE_DIR)"
else
  fail "KG init failed at remote path"
fi

# Test 2: Config points to remote path
CONFIGURED_PATH=$(python3 -c "
import json
with open('$TEST_CONFIG') as f:
    c = json.load(f)
print(c['graphs'].get('offloaded', {}).get('path', ''))
" 2>/dev/null)
if [ "$CONFIGURED_PATH" = "$REMOTE_KG_PATH" ]; then
  pass "Config correctly stores remote KG path"
else
  fail "Config should store remote path (got: $CONFIGURED_PATH)"
fi

# Test 3: Search works on offloaded KG
mkdir -p "$REMOTE_KG_PATH/lessons-learned/architecture"
cp "$FIXTURES_DIR/sample-lesson.md" "$REMOTE_KG_PATH/lessons-learned/architecture/offloaded-lesson.md"

RESULT=$(mcp_tool_call "kg_search" "{\"query\":\"MCP Server\",\"format\":\"summary\"}")
if echo "$RESULT" | grep -q -i "match\|found"; then
  pass "Search finds content in offloaded KG"
else
  fail "Search should work on offloaded KG path"
fi

# Test 4: Scaffold writes to offloaded KG path
OUTPUT_FILE="$REMOTE_KG_PATH/sessions/test-session.md"
RESULT=$(mcp_tool_call "kg_scaffold" "{\"template\":\"sessions/session-template.md\",\"variables\":{\"title\":\"Offload Test Session\"},\"outputPath\":\"$OUTPUT_FILE\"}")
if echo "$RESULT" | grep -q "Created" && [ -f "$OUTPUT_FILE" ]; then
  pass "Scaffold creates file at offloaded KG path"
else
  fail "Scaffold should write to offloaded KG path"
fi

# Test 5: Sanitization scans offloaded KG
RESULT=$(mcp_tool_call "kg_check_sensitive" "{\"kgPath\":\"$REMOTE_KG_PATH\"}")
if ! echo "$RESULT" | grep -q '"isError":true'; then
  pass "Sanitization scans offloaded KG without error"
else
  fail "Sanitization should work on offloaded path"
fi

# Test 6: Switch between local and remote KGs — search returns results only from active
LOCAL_KG_PATH="$LOCAL_DIR/local-kg"
mcp_tool_call "kg_config_init" "{\"name\":\"local\",\"kgPath\":\"$LOCAL_KG_PATH\"}" > /dev/null
mkdir -p "$LOCAL_KG_PATH/knowledge"
echo "# LOCAL ONLY CONTENT: unique-local-marker-xyz" > "$LOCAL_KG_PATH/knowledge/local.md"

# Active is now "local" — search for remote content should return nothing
RESULT=$(mcp_tool_call "kg_search" "{\"query\":\"offloaded-lesson\",\"format\":\"summary\"}")
if echo "$RESULT" | grep -q "No results"; then
  pass "Search on local KG does not return offloaded KG content"
else
  fail "Active KG isolation: search should only search active KG"
fi

# Switch to offloaded — now remote content should be found
mcp_tool_call "kg_config_switch" "{\"name\":\"offloaded\"}" > /dev/null
RESULT=$(mcp_tool_call "kg_search" "{\"query\":\"MCP Server\",\"format\":\"summary\"}")
if echo "$RESULT" | grep -q -i "match\|found"; then
  pass "Switch to offloaded KG — search returns remote content"
else
  fail "After switch, search should find offloaded KG content"
fi

echo ""

# ── Summary ──────────────────────────────────────────────────────────────────

echo "═══════════════════════════════════════════════════════════════"
echo "MCP OFFLOADING: $PASS passed, $FAIL failed (total: $((PASS + FAIL)))"
echo "═══════════════════════════════════════════════════════════════"

[ $FAIL -eq 0 ] && exit 0 || exit 1
