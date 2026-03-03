#!/bin/bash
# test-mcp-resources.sh — Tests for MCP resources
# Tests kg://config and kg://templates/{name}

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
MCP_SERVER="$REPO_ROOT/mcp-server/dist/index.js"

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
echo "TEST SUITE: MCP Resources (2 resources)"
echo "═══════════════════════════════════════════════════════════════"
echo ""

if [ ! -f "$MCP_SERVER" ]; then
  echo "❌ FATAL: MCP server not built at $MCP_SERVER"
  exit 1
fi

# ── Helper: read a resource ──────────────────────────────────────────────────

mcp_read_resource() {
  local uri="$1"
  {
    echo "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"initialize\",\"params\":{\"protocolVersion\":\"2024-11-05\",\"capabilities\":{},\"clientInfo\":{\"name\":\"test\",\"version\":\"1.0\"}}}"
    echo "{\"jsonrpc\":\"2.0\",\"id\":2,\"method\":\"resources/read\",\"params\":{\"uri\":\"${uri}\"}}"
    sleep 0.3
  } | KG_CONFIG_PATH="$TEST_CONFIG" CLAUDE_PLUGIN_ROOT="$REPO_ROOT" node "$MCP_SERVER" 2>/dev/null || true
}

mcp_list_resources() {
  {
    echo "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"initialize\",\"params\":{\"protocolVersion\":\"2024-11-05\",\"capabilities\":{},\"clientInfo\":{\"name\":\"test\",\"version\":\"1.0\"}}}"
    echo "{\"jsonrpc\":\"2.0\",\"id\":2,\"method\":\"resources/templates/list\",\"params\":{}}"
    sleep 0.3
  } | KG_CONFIG_PATH="$TEST_CONFIG" CLAUDE_PLUGIN_ROOT="$REPO_ROOT" node "$MCP_SERVER" 2>/dev/null || true
}

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

# ── kg://config resource ─────────────────────────────────────────────────────

echo "── kg://config ─────────────────────────────────────────────────"

# Test 1: Config resource when no config exists
rm -f "$TEST_CONFIG"
RESULT=$(mcp_read_resource "kg://config")
if echo "$RESULT" | grep -q "No configuration found\|error\|hint"; then
  pass "Config resource returns hint when no config file"
else
  fail "Config resource should return hint when no config file"
fi

# Test 2: Config resource with existing config
cat > "$TEST_CONFIG" << 'EOF'
{
  "version": "1.0.0",
  "active": "my-kg",
  "graphs": {
    "my-kg": {
      "name": "my-kg",
      "path": "/tmp/my-kg",
      "type": "project-local",
      "categories": [],
      "createdAt": "2026-01-01T00:00:00.000Z",
      "lastUsed": "2026-01-01T00:00:00.000Z"
    }
  },
  "sanitization": { "enabled": false, "patterns": [], "action": "warn" }
}
EOF
RESULT=$(mcp_read_resource "kg://config")
if echo "$RESULT" | grep -q "my-kg"; then
  pass "Config resource returns current configuration"
else
  fail "Config resource should return config contents"
fi

# Test 3: Config reflects changes after tool call
TEST_KG_PATH="$TEST_DIR/new-kg"
mcp_tool_call "kg_config_init" "{\"name\":\"new-kg\",\"kgPath\":\"$TEST_KG_PATH\"}" > /dev/null
RESULT=$(mcp_read_resource "kg://config")
if echo "$RESULT" | grep -q "new-kg"; then
  pass "Config resource reflects changes made by tool calls"
else
  fail "Config resource should reflect init result"
fi

# Test 4: Config is valid JSON
JSON_VALID=$(echo "$RESULT" | python3 -c "
import sys, json
data = sys.stdin.read()
# Extract text content from JSON-RPC response
try:
    outer = json.loads(data.split('\n')[1] if '\n' in data else data)
    text = outer.get('result', {}).get('contents', [{}])[0].get('text', '')
    json.loads(text)
    print('valid')
except:
    print('invalid')
" 2>/dev/null)
if [ "$JSON_VALID" = "valid" ]; then
  pass "Config resource returns valid JSON content"
else
  fail "Config resource content is not valid JSON"
fi

echo ""

# ── kg://templates/{name} resource ──────────────────────────────────────────

echo "── kg://templates/{name} ───────────────────────────────────────"

# Test 5: List templates returns URI template pattern
# MCP resources/templates/list returns URI templates (not expanded instances).
# The server correctly returns 1 URI template: kg://templates/{name}
RESULT=$(mcp_list_resources)
if echo "$RESULT" | grep -q "kg://templates/{name}"; then
  pass "Template list returns URI template pattern (kg://templates/{name})"
else
  fail "Template list should contain 'kg://templates/{name}' URI template"
fi

# Test 6: Read lesson template
RESULT=$(mcp_read_resource "kg://templates/lesson")
if echo "$RESULT" | grep -q "lesson\|title\|frontmatter\|---"; then
  pass "Lesson template returns markdown content"
else
  fail "Lesson template should contain markdown content"
fi

# Test 7: Read ADR template
RESULT=$(mcp_read_resource "kg://templates/adr")
if echo "$RESULT" | grep -q -i "decision\|status\|context\|ADR"; then
  pass "ADR template returns ADR structure"
else
  fail "ADR template should contain ADR structure"
fi

# Test 8: Invalid template name returns error with available list
RESULT=$(mcp_read_resource "kg://templates/does-not-exist")
if echo "$RESULT" | grep -q "Unknown template\|Available\|Error"; then
  pass "Invalid template name returns error with available list"
else
  fail "Invalid template name should return error"
fi

# Test 9: Template content matches source file
SOURCE_CONTENT=$(cat "$REPO_ROOT/core/templates/lessons-learned/lesson-template.md" 2>/dev/null)
RESULT=$(mcp_read_resource "kg://templates/lesson")
# Use a distinctive line from the template body (not "---" which macOS grep misparses as flags)
SOURCE_BODY=$(echo "$SOURCE_CONTENT" | grep -m1 "YAML\|title:\|lesson\|Lesson" | head -1)
if echo "$RESULT" | grep -qF -- "$SOURCE_BODY"; then
  pass "Template resource content matches source file"
else
  fail "Template resource content should match source file (looking for: $SOURCE_BODY)"
fi

echo ""

# ── Summary ──────────────────────────────────────────────────────────────────

echo "═══════════════════════════════════════════════════════════════"
echo "MCP RESOURCES: $PASS passed, $FAIL failed (total: $((PASS + FAIL)))"
echo "═══════════════════════════════════════════════════════════════"

[ $FAIL -eq 0 ] && exit 0 || exit 1
