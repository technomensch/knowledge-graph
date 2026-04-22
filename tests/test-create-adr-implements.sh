#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

PASS=0
FAIL=0

pass() { echo "  ✅ PASS: $1"; PASS=$((PASS + 1)); }
fail() { echo "  ❌ FAIL: $1"; FAIL=$((FAIL + 1)); }

echo "Testing create-adr command implements field"
echo "==========================================="
echo ""

# Test 1: commands/create-adr.md exists
echo "Test 1: Command file exists"
if [ -f "$REPO_ROOT/commands/create-adr.md" ]; then
  pass "commands/create-adr.md exists"
else
  fail "commands/create-adr.md not found"
fi

# Test 2: agents/create-adr-agent.md exists
echo ""
echo "Test 2: Agent file exists"
if [ -f "$REPO_ROOT/agents/create-adr-agent.md" ]; then
  pass "agents/create-adr-agent.md exists"
else
  fail "agents/create-adr-agent.md not found"
fi

# Test 3: create-adr.md contains "implements"
echo ""
echo "Test 3: Command prompts for implements field"
set +e
grep -q "implements" "$REPO_ROOT/commands/create-adr.md"
result=$?
set -e
if [ $result -eq 0 ]; then
  pass "commands/create-adr.md contains 'implements'"
else
  fail "commands/create-adr.md does not contain 'implements'"
fi

# Test 4: create-adr-agent.md contains "implements"
echo ""
echo "Test 4: Agent handles implements field"
set +e
grep -q "implements" "$REPO_ROOT/agents/create-adr-agent.md"
result=$?
set -e
if [ $result -eq 0 ]; then
  pass "agents/create-adr-agent.md contains 'implements'"
else
  fail "agents/create-adr-agent.md does not contain 'implements'"
fi

# Test 5: create-adr-agent.md contains [[ (documents [[hash]] format)
echo ""
echo "Test 5: Agent documents [[hash]] format"
set +e
grep -q "\[\[" "$REPO_ROOT/agents/create-adr-agent.md"
result=$?
set -e
if [ $result -eq 0 ]; then
  pass "agents/create-adr-agent.md documents [[hash]] format"
else
  fail "agents/create-adr-agent.md does not document [[hash]] format"
fi

# Test 6: create-adr-agent.md contains "null" OR "design" (allows null for design-first)
echo ""
echo "Test 6: Agent allows null for design-first ADRs"
set +e
grep -qE "null|design" "$REPO_ROOT/agents/create-adr-agent.md"
result=$?
set -e
if [ $result -eq 0 ]; then
  pass "agents/create-adr-agent.md mentions null or design-first pattern"
else
  fail "agents/create-adr-agent.md does not mention null or design-first pattern"
fi

# Test 7: All real ADRs have implements field
echo ""
echo "Test 7: All real ADRs have implements field"
ADR_DIR="$REPO_ROOT/knowledge/adrs"
MISSING=0
if [ -d "$ADR_DIR" ]; then
  for adr_file in "$ADR_DIR"/ADR-*.md; do
    [ -f "$adr_file" ] || continue
    set +e
    grep -q "implements:" "$adr_file"
    result=$?
    set -e
    if [ $result -ne 0 ]; then
      echo "    MISSING implements: $(basename "$adr_file")"
      MISSING=$((MISSING + 1))
    fi
  done
fi
if [ $MISSING -eq 0 ]; then
  pass "All ADRs have implements field"
else
  fail "$MISSING ADR(s) missing implements field"
fi

echo ""
echo "==========================================="
echo "Results: $PASS passed, $FAIL failed"
echo ""

if [ $FAIL -eq 0 ]; then
  exit 0
else
  exit 1
fi
