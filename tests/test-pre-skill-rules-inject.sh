#!/usr/bin/env bash
# test-pre-skill-rules-inject.sh — Validates project-rules injection and HARD BLOCK promotion

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
HOOK="$REPO_ROOT/scripts/pre-skill-rules-inject.sh"

PASS=0
FAIL=0

pass() { echo "  PASS: $1"; PASS=$((PASS + 1)); }
fail() { echo "  FAIL: $1"; FAIL=$((FAIL + 1)); }

# ── Setup ────────────────────────────────────────────────────────────────────

TEST_DIR=$(mktemp -d)
FAKE_PROJECT="$TEST_DIR/fake-project"
mkdir -p "$FAKE_PROJECT/knowledge"

cleanup() { rm -rf "$TEST_DIR"; }
trap cleanup EXIT

cat > "$FAKE_PROJECT/knowledge/rules.md" << 'RULESEOF'
# Project Rules

## Plan Protocol

### Plan File Location

- Single-phase plans: `docs/plans/v{ver}-{description}.md` + mirror to `~/.claude/plans/`
- Multi-phase plans: `docs/plans/v{ver}-{description}.md` (master) + `docs/plans/phases/phase-{n}-{description}.md` per phase
- Never use `docs/superpowers/plans/`
- Never commit plan files

### Plan File Routing

- ENH parent  → `knowledge/ENH-NNN/vX-plan.md`
- Issue / bug → `knowledge/issues/issue-NNN/vX-plan.md`

### Other Rule

This rule must NOT appear in the injection.
RULESEOF

INPUT_PLANNING='{"tool_input":{"skill":"superpowers:writing-plans"}}'
INPUT_EXEC='{"tool_input":{"skill":"superpowers:executing-plans"}}'
INPUT_OTHER='{"tool_input":{"skill":"some-unrelated-skill"}}'

if [ ! -f "$HOOK" ]; then
  echo "FATAL: hook script missing at $HOOK"; exit 1
fi
if [ ! -x "$HOOK" ]; then
  echo "FATAL: hook script not executable at $HOOK"; exit 1
fi

echo "═══════════════════════════════════════════════════════════════"
echo "TEST SUITE: pre-skill-rules-inject.sh"
echo "Hook: $HOOK"
echo "═══════════════════════════════════════════════════════════════"

# ── Test 1: project Plan File Location is injected when CLAUDE_PROJECT_DIR is set
OUT=$(CLAUDE_PROJECT_DIR="$FAKE_PROJECT" bash "$HOOK" <<< "$INPUT_PLANNING")
if echo "$OUT" | grep -q "v{ver}-{description}"; then
  pass "Project Plan File Location is injected (v{ver}-{description} string present)"
else
  fail "Project Plan File Location not injected — v{ver}-{description} string missing"
fi

# ── Test 2: project Plan File Routing is injected
if echo "$OUT" | grep -q "knowledge/ENH-NNN/vX-plan.md"; then
  pass "Project Plan File Routing is injected (ENH path present)"
else
  fail "Project Plan File Routing not injected"
fi

# ── Test 3: HARD BLOCK named "Plan File Routing & Mirror Copy" is present
if echo "$OUT" | grep -q "Plan File Routing & Mirror Copy (HARD BLOCK"; then
  pass "HARD BLOCK for routing + mirror copy is present"
else
  fail "HARD BLOCK 'Plan File Routing & Mirror Copy' missing"
fi

# ── Test 4: HARD BLOCK names mirror copy step explicitly
if echo "$OUT" | grep -qi "mirror.*docs/plans\|copy.*docs/plans\|cp.*docs/plans"; then
  pass "HARD BLOCK names the mirror-copy step explicitly"
else
  fail "HARD BLOCK does not name the mirror-copy step"
fi

# ── Test 5: HARD BLOCK references the project naming convention explicitly
if echo "$OUT" | grep -q "Plan File Location\|naming convention\|v{ver}"; then
  pass "HARD BLOCK references the project naming convention"
else
  fail "HARD BLOCK does not reference project naming convention"
fi

# ── Test 6: unrelated section from project rules is NOT injected
if echo "$OUT" | grep -q "This rule must NOT appear"; then
  fail "Unrelated project section leaked into injection (over-broad capture)"
else
  pass "Unrelated project sections are not injected (scoped capture)"
fi

# ── Test 7: hook handles missing CLAUDE_PROJECT_DIR gracefully
OUT_NOPROJ=$(unset CLAUDE_PROJECT_DIR; bash "$HOOK" <<< "$INPUT_PLANNING")
if echo "$OUT_NOPROJ" | grep -q "Execution Handoff Override"; then
  pass "Hook produces well-formed injection when CLAUDE_PROJECT_DIR is unset"
else
  fail "Hook output broken when CLAUDE_PROJECT_DIR is unset"
fi

# ── Test 8: hook is silent for non-matching skill names
OUT_OTHER=$(CLAUDE_PROJECT_DIR="$FAKE_PROJECT" bash "$HOOK" <<< "$INPUT_OTHER")
if [ -z "$OUT_OTHER" ]; then
  pass "Hook produces no output for unrelated skill"
else
  fail "Hook leaked output for unrelated skill (got: ${OUT_OTHER:0:80})"
fi

# ── Test 9: execution-skill hook path still injects PR Gate Override
OUT_EXEC=$(CLAUDE_PROJECT_DIR="$FAKE_PROJECT" bash "$HOOK" <<< "$INPUT_EXEC")
if echo "$OUT_EXEC" | grep -q "PR Gate Override (HARD BLOCK"; then
  pass "Execution-skill path still injects PR Gate Override"
else
  fail "PR Gate Override missing for execution-skill path"
fi

echo "═══════════════════════════════════════════════════════════════"
echo "PRE-SKILL-RULES-INJECT: $PASS passed, $FAIL failed (total: $((PASS + FAIL)))"
echo "═══════════════════════════════════════════════════════════════"

[ $FAIL -eq 0 ] && exit 0 || exit 1
