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

# Test 1: commands/kmg-create-adr.md exists
echo "Test 1: Command file exists"
if [ -f "$REPO_ROOT/commands/kmg-create-adr.md" ]; then
  pass "commands/kmg-create-adr.md exists"
else
  fail "commands/kmg-create-adr.md not found"
fi

# Test 2: agents/create-adr-agent.md exists
echo ""
echo "Test 2: Agent file exists"
if [ -f "$REPO_ROOT/agents/create-adr-agent.md" ]; then
  pass "agents/create-adr-agent.md exists"
else
  fail "agents/create-adr-agent.md not found"
fi

# Test 3: kmg-create-adr.md dispatches to create-adr-agent, which owns "implements"
# ADR-017 (four-layer-architecture-thin-commands) made kmg-create-adr.md a thin
# dispatcher — it no longer handles the implements field itself; Test 4 below
# already confirms create-adr-agent.md (which it dispatches to) owns that field.
echo ""
echo "Test 3: Command dispatches to the agent that owns the implements field"
set +e
grep -q "create-adr-agent" "$REPO_ROOT/commands/kmg-create-adr.md"
result=$?
set -e
if [ $result -eq 0 ]; then
  pass "commands/kmg-create-adr.md dispatches to create-adr-agent"
else
  fail "commands/kmg-create-adr.md does not dispatch to create-adr-agent"
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

# Test 7: implements field coverage (informational — field is documented Optional)
# knowledge/templates/ADR-template.md:27 marks this field
# `[MANUAL] Optional`, not required. Older ADRs predate the field/process
# change that introduced it, and backfilling them was a deliberate choice not
# to do (confirmed) — so a hard "all ADRs must have it" requirement is wrong,
# not just historically incomplete. Report coverage without failing the suite.
echo ""
echo "Test 7: implements field coverage (informational, non-blocking — field is Optional)"
ADR_DIR="$REPO_ROOT/knowledge/decisions"
MISSING=0
TOTAL=0
if [ -d "$ADR_DIR" ]; then
  for adr_file in "$ADR_DIR"/ADR-*.md; do
    [ -f "$adr_file" ] || continue
    TOTAL=$((TOTAL + 1))
    set +e
    grep -q "implements:" "$adr_file"
    result=$?
    set -e
    if [ $result -ne 0 ]; then
      MISSING=$((MISSING + 1))
    fi
  done
fi
pass "implements field present on $((TOTAL - MISSING))/$TOTAL ADRs (optional field — $MISSING pre-date the field/process change, not backfilled by choice)"

echo ""
echo "==========================================="
echo "Results: $PASS passed, $FAIL failed"
echo ""

if [ $FAIL -eq 0 ]; then
  exit 0
else
  exit 1
fi
