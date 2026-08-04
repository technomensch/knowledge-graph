#!/bin/bash
# test-stop-hook.sh — Validates session-end-prompt.sh flag creation and dedup behavior

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
STOP_HOOK="$REPO_ROOT/scripts/session-end-prompt.sh"

PASS=0
FAIL=0

pass() { echo "  ✅ PASS: $1"; PASS=$((PASS + 1)); }
fail() { echo "  ❌ FAIL: $1"; FAIL=$((FAIL + 1)); }

# ── Setup ────────────────────────────────────────────────────────────────────

TEST_DIR=$(mktemp -d)
TEST_CONFIG="$TEST_DIR/kg-config.json"
TODAY="$(date +%Y%m%d)"

cleanup() {
  rm -rf "$TEST_DIR"
  rm -f "/tmp/.kg-session-summarized-test-kg-${TODAY}"
  rm -f "/tmp/.kg-session-summarized-other-kg-${TODAY}"
  rm -f "/tmp/.kg-session-summarized-default-${TODAY}"
}
trap cleanup EXIT INT TERM

echo "═══════════════════════════════════════════════════════════════"
echo "TEST SUITE: Stop Hook (session-end-prompt.sh)"
echo "Hook: $STOP_HOOK"
echo "═══════════════════════════════════════════════════════════════"
echo ""

if [ ! -f "$STOP_HOOK" ]; then
  echo "❌ FATAL: session-end-prompt.sh not found at $STOP_HOOK"
  exit 1
fi
if [ ! -x "$STOP_HOOK" ]; then
  echo "❌ FATAL: session-end-prompt.sh is not executable"
  exit 1
fi

# ── Setup: minimal KG dir ────────────────────────────────────────────────────

TEST_KG_DIR="$TEST_DIR/test-kg"
mkdir -p "$TEST_KG_DIR"

make_config() {
  local kg_name="$1"
  cat > "$TEST_CONFIG" << EOF
{
  "version": "1.0.0",
  "active": "${kg_name}",
  "graphs": {
    "${kg_name}": {
      "name": "${kg_name}",
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
}

echo "── Section 1: Flag creation ─────────────────────────────────────"

# Test 1: Flag is created with kg-name-date pattern (not PPID-date)
make_config "test-kg"
rm -f "/tmp/.kg-session-summarized-test-kg-${TODAY}"
KG_CONFIG_PATH="$TEST_CONFIG" bash "$STOP_HOOK" > /dev/null 2>&1 || true

EXPECTED_FLAG="/tmp/.kg-session-summarized-test-kg-${TODAY}"
if [ -f "$EXPECTED_FLAG" ]; then
  pass "Flag created at correct path: .kg-session-summarized-{kg-name}-{date}"
else
  fail "Flag not found at $EXPECTED_FLAG"
fi

# Test 2: Exactly one flag for today — no PPID-based extras
# Use realpath to resolve /tmp symlink on macOS (/tmp → /private/tmp)
TMP_REAL="$(realpath /tmp 2>/dev/null || echo /tmp)"
# Clear any pre-existing today flags so the count is environment-independent
find "$TMP_REAL" -maxdepth 1 -name ".kg-session-summarized-*-${TODAY}" -delete 2>/dev/null; KG_CONFIG_PATH="$TEST_CONFIG" bash "$STOP_HOOK" > /dev/null 2>&1 || true
TOTAL_FLAGS=$(find "$TMP_REAL" -maxdepth 1 -name ".kg-session-summarized-*-${TODAY}" 2>/dev/null | wc -l | tr -d ' ')
if [ "$TOTAL_FLAGS" -eq 1 ]; then
  pass "Exactly one flag created — no PPID-based extras"
else
  fail "Expected 1 flag for today, found $TOTAL_FLAGS — extra flags may be PPID-based"
fi

echo ""
echo "── Section 2: Deduplication ─────────────────────────────────────"

# Test 3: Second run exits 0 immediately (flag already exists)
# Test 4: Second run produces no output
make_config "test-kg"
if [ ! -f "$EXPECTED_FLAG" ]; then
  fail "precondition: test-kg flag missing before dedup check"
fi
set +e
OUTPUT=$(KG_CONFIG_PATH="$TEST_CONFIG" bash "$STOP_HOOK" 2>&1)
EXIT_CODE=$?
set -e
if [ $EXIT_CODE -eq 0 ]; then
  pass "Second run with existing flag exits 0 (dedup working)"
else
  fail "Second run should exit 0, got $EXIT_CODE"
fi
if [ -z "$OUTPUT" ]; then
  pass "Second run produces no output (early exit)"
else
  fail "Second run should produce no output (got: $OUTPUT)"
fi

echo ""
echo "── Section 3: Per-project isolation ─────────────────────────────"

# Test 5 & 6: Different KG name produces different flags; original unaffected
make_config "other-kg"
rm -f "/tmp/.kg-session-summarized-other-kg-${TODAY}"
KG_CONFIG_PATH="$TEST_CONFIG" bash "$STOP_HOOK" > /dev/null 2>&1 || true

OTHER_FLAG="/tmp/.kg-session-summarized-other-kg-${TODAY}"
if [ -f "$OTHER_FLAG" ]; then
  pass "Different KG creates its own flag (per-project isolation)"
else
  fail "Second KG flag not found at $OTHER_FLAG"
fi

# Test 6: test-kg flag was not removed by the other-kg run
if [ -f "$EXPECTED_FLAG" ]; then
  pass "Original test-kg flag still present after other-kg run"
else
  fail "test-kg flag should persist after running with a different KG"
fi

echo ""
echo "── Section 4: No-config fallback ────────────────────────────────"

# Test 7: When no config exists, hook exits 0 gracefully
NONEXISTENT_CONFIG="$TEST_DIR/nonexistent-config.json"
rm -f "/tmp/.kg-session-summarized-default-${TODAY}"
set +e
OUTPUT=$(KG_CONFIG_PATH="$NONEXISTENT_CONFIG" bash "$STOP_HOOK" 2>&1)
EXIT_CODE=$?
set -e
if [ $EXIT_CODE -eq 0 ]; then
  pass "No config file — hook exits 0 gracefully"
else
  fail "No config file — hook should exit 0, got $EXIT_CODE"
fi
if [ -z "$OUTPUT" ]; then
  pass "No config file — no output (silent early exit)"
else
  fail "No config file — should produce no output (got: $OUTPUT)"
fi

echo ""
echo "── Section 5: Default fallback (active key null) ─────────────────"

# Test 9: Config exists but active is null
cat > "$TEST_CONFIG" << 'NULLEOF'
{"version":"1.0.0","graphs":{},"sanitization":{"enabled":false,"patterns":[],"action":"warn"}}
NULLEOF
rm -f "/tmp/.kg-session-summarized-default-${TODAY}"
set +e
OUTPUT=$(KG_CONFIG_PATH="$TEST_CONFIG" bash "$STOP_HOOK" 2>&1)
EXIT_CODE=$?
set -e
if [ $EXIT_CODE -eq 0 ]; then
  pass "Null active KG — hook exits 0 gracefully"
else
  fail "Null active KG — should exit 0, got $EXIT_CODE"
fi
if [ ! -f "/tmp/.kg-session-summarized-default-${TODAY}" ]; then
  pass "Null active KG — no flag written (hook exits before touch)"
else
  fail "Null active KG — flag should not be written"
fi

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "STOP HOOK: $PASS passed, $FAIL failed (total: $((PASS + FAIL)))"
echo "═══════════════════════════════════════════════════════════════"

[ $FAIL -eq 0 ] && exit 0 || exit 1
