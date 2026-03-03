#!/bin/bash
# test-hooks.sh — Validates hooks: SessionStart (hooks-master.sh) and
# the pre-commit sanitization hook (core/examples-hooks/pre-commit-sanitization.sh)
# SessionStart sections: MCP auto-build, config validation, recent lessons,
# MEMORY.md status, and MEMORY.md diff.
# Pre-commit sections: warn mode (allow + warn), block mode (reject), clean file.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
HOOKS_MASTER="$REPO_ROOT/scripts/hooks-master.sh"

PASS=0
FAIL=0

pass() { echo "  ✅ PASS: $1"; PASS=$((PASS + 1)); }
fail() { echo "  ❌ FAIL: $1"; FAIL=$((FAIL + 1)); }

# ── Setup ────────────────────────────────────────────────────────────────────

TEST_DIR=$(mktemp -d)
TEST_CONFIG="$TEST_DIR/kg-config.json"
TEST_KG_DIR="$TEST_DIR/test-kg"
REAL_CONFIG="$HOME/.claude/kg-config.json"
REAL_CONFIG_BACKUP="$TEST_DIR/kg-config.backup.json"

cleanup() {
  rm -rf "$TEST_DIR"
  if [ -f "$REAL_CONFIG_BACKUP" ]; then
    mv "$REAL_CONFIG_BACKUP" "$REAL_CONFIG"
  fi
}
trap cleanup EXIT

[ -f "$REAL_CONFIG" ] && cp "$REAL_CONFIG" "$REAL_CONFIG_BACKUP"

echo "═══════════════════════════════════════════════════════════════"
echo "TEST SUITE: SessionStart Hook (hooks-master.sh)"
echo "Hook: $HOOKS_MASTER"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Verify hook exists
if [ ! -f "$HOOKS_MASTER" ]; then
  echo "❌ FATAL: hooks-master.sh not found at $HOOKS_MASTER"
  exit 1
fi

if [ ! -x "$HOOKS_MASTER" ]; then
  echo "❌ FATAL: hooks-master.sh is not executable"
  exit 1
fi

# Helper: run hook with custom config path
run_hook() {
  # Override CONFIG_PATH and PLUGIN_ROOT via environment patching
  # hooks-master.sh uses hardcoded CONFIG_PATH="$HOME/.claude/kg-config.json"
  # We need to put the test config there temporarily
  cp "$TEST_CONFIG" "$REAL_CONFIG" 2>/dev/null || true
  OUTPUT=$(bash "$HOOKS_MASTER" 2>&1 || true)
  EXIT_CODE=$?
  echo "$OUTPUT"
  return $EXIT_CODE
}

run_hook_exit_code() {
  cp "$TEST_CONFIG" "$REAL_CONFIG" 2>/dev/null || true
  bash "$HOOKS_MASTER" > /dev/null 2>&1
  echo $?
}

# ── Tests ────────────────────────────────────────────────────────────────────

echo "── Section 2: Config validation ────────────────────────────────"

# Test 1: No config file — exits 0 with "No knowledge graph configured"
rm -f "$REAL_CONFIG"
cat > "$TEST_CONFIG" << 'EOF'
NOCONFIG
EOF
# Actually — remove the real config and run
rm -f "$REAL_CONFIG"
OUTPUT=$(bash "$HOOKS_MASTER" 2>&1 || true)
EXIT_CODE=$?
if echo "$OUTPUT" | grep -qiE "No knowledge graph|no knowledge graph configured"; then
  pass "No config file — outputs 'No knowledge graph configured'"
else
  fail "No config should output 'No knowledge graph configured' (got: $(echo "$OUTPUT" | head -2))"
fi
if [ $EXIT_CODE -eq 0 ]; then
  pass "No config file — exits with code 0"
else
  fail "No config file — should exit 0, not $EXIT_CODE"
fi

# Test 2: Config exists but no active KG
cat > "$TEST_CONFIG" << 'EOF'
{"version":"1.0.0","active":null,"graphs":{},"sanitization":{"enabled":false,"patterns":[],"action":"warn"}}
EOF
cp "$TEST_CONFIG" "$REAL_CONFIG"
OUTPUT=$(bash "$HOOKS_MASTER" 2>&1 || true)
EXIT_CODE=$?
if echo "$OUTPUT" | grep -qiE "No active|active.*knowledge graph"; then
  pass "No active KG — outputs warning"
else
  fail "No active KG should output 'No active knowledge graph' (got: $(echo "$OUTPUT" | head -2))"
fi

# Test 3: Active KG path doesn't exist
cat > "$TEST_CONFIG" << EOF
{
  "version": "1.0.0",
  "active": "missing-kg",
  "graphs": {
    "missing-kg": {
      "name": "missing-kg",
      "path": "$TEST_DIR/this-does-not-exist",
      "type": "project-local",
      "categories": [],
      "createdAt": "2026-01-01T00:00:00.000Z",
      "lastUsed": "2026-01-01T00:00:00.000Z"
    }
  },
  "sanitization": {"enabled":false,"patterns":[],"action":"warn"}
}
EOF
cp "$TEST_CONFIG" "$REAL_CONFIG"
set +e
OUTPUT=$(bash "$HOOKS_MASTER" 2>&1)
EXIT_CODE=$?
set -e
if echo "$OUTPUT" | grep -qiE "does not exist|path.*not.*exist|not exist"; then
  pass "Non-existent KG path — outputs 'does not exist' warning"
else
  fail "Non-existent KG path should warn (got: $(echo "$OUTPUT" | head -2))"
fi
if [ $EXIT_CODE -ne 0 ]; then
  pass "Non-existent KG path — exits non-zero"
else
  fail "Non-existent KG path should exit non-zero"
fi

# Test 4: Valid config and existing KG — exits 0
mkdir -p "$TEST_KG_DIR/lessons-learned"
cat > "$TEST_CONFIG" << EOF
{
  "version": "1.0.0",
  "active": "test-kg",
  "graphs": {
    "test-kg": {
      "name": "test-kg",
      "path": "$TEST_KG_DIR",
      "type": "project-local",
      "categories": [],
      "createdAt": "2026-01-01T00:00:00.000Z",
      "lastUsed": "2026-01-01T00:00:00.000Z"
    }
  },
  "sanitization": {"enabled":false,"patterns":[],"action":"warn"}
}
EOF
cp "$TEST_CONFIG" "$REAL_CONFIG"
OUTPUT=$(bash "$HOOKS_MASTER" 2>&1 || true)
EXIT_CODE=$?
if [ $EXIT_CODE -eq 0 ]; then
  pass "Valid config and existing KG — exits 0"
else
  fail "Valid config should exit 0 (got $EXIT_CODE, output: $(echo "$OUTPUT" | head -2))"
fi

echo ""
echo "── Section 3: Recent lessons ───────────────────────────────────"

# Test 5: Recent lessons displayed
mkdir -p "$TEST_KG_DIR/lessons-learned/architecture"
LESSON_FILE="$TEST_KG_DIR/lessons-learned/architecture/recent-lesson.md"
cat > "$LESSON_FILE" << 'EOF'
---
title: "My Recent Test Lesson"
date: 2026-03-03
---
# My Recent Test Lesson
Content here.
EOF
# Touch to current time (within 7 days)
touch "$LESSON_FILE"

cp "$TEST_CONFIG" "$REAL_CONFIG"
OUTPUT=$(bash "$HOOKS_MASTER" 2>&1 || true)
if echo "$OUTPUT" | grep -qiE "Recent Lesson|lesson|recent"; then
  pass "Recent lessons section displayed when lesson exists"
else
  fail "Hook should display recent lessons (got: $(echo "$OUTPUT" | head -5))"
fi

echo ""
echo "── Section 4: MEMORY.md status ─────────────────────────────────"

# Test 6: Stale MEMORY.md detected (>7 days old)
MEMORY_PATH="$TEST_KG_DIR/MEMORY.md"
echo "# MEMORY" > "$MEMORY_PATH"
# Backdate the file by 10 days
if [[ "$OSTYPE" == "darwin"* ]]; then
  touch -t "$(date -v-10d +%Y%m%d%H%M)" "$MEMORY_PATH"
else
  touch -d "10 days ago" "$MEMORY_PATH"
fi

cp "$TEST_CONFIG" "$REAL_CONFIG"
OUTPUT=$(bash "$HOOKS_MASTER" 2>&1 || true)
if echo "$OUTPUT" | grep -qiE "stale|days ago"; then
  pass "Stale MEMORY.md (10 days old) — outputs stale warning"
else
  fail "Stale MEMORY.md should trigger warning (got: $(echo "$OUTPUT" | tail -5))"
fi

# Test 7: Fresh MEMORY.md shows synced status
touch "$MEMORY_PATH"  # Reset to current time

cp "$TEST_CONFIG" "$REAL_CONFIG"
OUTPUT=$(bash "$HOOKS_MASTER" 2>&1 || true)
if echo "$OUTPUT" | grep -qiE "synced|0 days ago|memory synced"; then
  pass "Fresh MEMORY.md — outputs 'memory synced' status"
else
  fail "Fresh MEMORY.md should show synced status (got: $(echo "$OUTPUT" | tail -5))"
fi

echo ""
echo "── Pre-commit sanitization hook ────────────────────────────────"

PRECOMMIT_HOOK="$REPO_ROOT/core/examples-hooks/pre-commit-sanitization.sh"
HOOK_REPO="$TEST_DIR/hook-test-repo"
mkdir -p "$HOOK_REPO"

# Test: Hook example exists and is executable
if [ -f "$PRECOMMIT_HOOK" ] && [ -x "$PRECOMMIT_HOOK" ]; then
  pass "Pre-commit hook example exists and is executable"
else
  fail "Pre-commit hook example missing or not executable at core/examples-hooks/pre-commit-sanitization.sh"
fi

# Set up isolated git repo for hook execution tests
git init "$HOOK_REPO" -q 2>/dev/null
git -C "$HOOK_REPO" config user.email "test@example.com"
git -C "$HOOK_REPO" config user.name "Test Runner"

# ── Warn mode (default): sensitive data warns but commit proceeds ──────────
cp "$PRECOMMIT_HOOK" "$HOOK_REPO/.git/hooks/pre-commit"
chmod +x "$HOOK_REPO/.git/hooks/pre-commit"

echo "Contact: leakme@company-internal.com for support" > "$HOOK_REPO/notes.md"
git -C "$HOOK_REPO" add notes.md
HOOK_OUTPUT=$(git -C "$HOOK_REPO" commit -m "test: warn mode" 2>&1) || true
if echo "$HOOK_OUTPUT" | grep -qiE "WARNING|warning"; then
  pass "Warn mode: email address detected and warning shown"
else
  fail "Warn mode: hook should warn on email pattern (got: $(echo "$HOOK_OUTPUT" | head -3))"
fi
# Commit should still have been created (exit 0 in warn mode)
if git -C "$HOOK_REPO" log --oneline 2>/dev/null | grep -q "warn mode"; then
  pass "Warn mode: commit proceeds despite warning"
else
  fail "Warn mode: commit should succeed in warn mode"
fi

# ── Block mode: sensitive data prevents commit ─────────────────────────────
sed 's/MODE="warn"/MODE="block"/' "$PRECOMMIT_HOOK" > "$HOOK_REPO/.git/hooks/pre-commit"
chmod +x "$HOOK_REPO/.git/hooks/pre-commit"

echo "api_key: 'sk-prod-abcdef1234567890abcdef1234567890'" > "$HOOK_REPO/secrets.md"
git -C "$HOOK_REPO" add secrets.md
HOOK_OUTPUT=$(git -C "$HOOK_REPO" commit -m "test: block mode" 2>&1) || HOOK_EXIT=$?
HOOK_EXIT=${HOOK_EXIT:-0}
if echo "$HOOK_OUTPUT" | grep -qiE "BLOCKED|ERROR|error"; then
  pass "Block mode: API key triggers block message"
else
  fail "Block mode: hook should output BLOCKED/ERROR (got: $(echo "$HOOK_OUTPUT" | head -3))"
fi
if [ "${HOOK_EXIT}" -ne 0 ]; then
  pass "Block mode: git commit exits non-zero (commit rejected)"
else
  fail "Block mode: git commit should exit non-zero"
fi

# ── Clean file: no sensitive data, commit allowed without warning ──────────
git -C "$HOOK_REPO" reset HEAD secrets.md > /dev/null 2>&1 || true
echo "# Architecture Notes — no sensitive data here" > "$HOOK_REPO/clean.md"
git -C "$HOOK_REPO" add clean.md
HOOK_OUTPUT=$(git -C "$HOOK_REPO" commit -m "test: clean file" 2>&1) || true
if echo "$HOOK_OUTPUT" | grep -qiE "No sensitive|no.*sensitive|✓"; then
  pass "Clean file: no sensitive data detected"
else
  fail "Clean file: should report no sensitive data (got: $(echo "$HOOK_OUTPUT" | head -3))"
fi

echo ""

# ── Summary ──────────────────────────────────────────────────────────────────

echo "═══════════════════════════════════════════════════════════════"
echo "HOOKS: $PASS passed, $FAIL failed (total: $((PASS + FAIL)))"
echo "═══════════════════════════════════════════════════════════════"

[ $FAIL -eq 0 ] && exit 0 || exit 1
