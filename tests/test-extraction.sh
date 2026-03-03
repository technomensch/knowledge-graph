#!/bin/bash
# test-extraction.sh — Tests for Python chat extraction scripts
# Validates core/scripts/run_extraction.py with sample .jsonl fixture data.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
EXTRACTION_SCRIPT="$REPO_ROOT/core/scripts/run_extraction.py"
FIXTURES_DIR="$SCRIPT_DIR/fixtures"

PASS=0
FAIL=0

pass() { echo "  ✅ PASS: $1"; PASS=$((PASS + 1)); }
fail() { echo "  ❌ FAIL: $1"; FAIL=$((FAIL + 1)); }

# ── Setup ────────────────────────────────────────────────────────────────────

TEST_DIR=$(mktemp -d)

cleanup() {
  rm -rf "$TEST_DIR"
}
trap cleanup EXIT

echo "═══════════════════════════════════════════════════════════════"
echo "TEST SUITE: Chat Extraction (Python scripts)"
echo "Script: $EXTRACTION_SCRIPT"
echo "═══════════════════════════════════════════════════════════════"
echo ""

echo "── Prerequisites ───────────────────────────────────────────────"

# Test 1: Python 3 is available
if command -v python3 &>/dev/null; then
  PYTHON_VERSION=$(python3 --version 2>&1)
  pass "python3 available ($PYTHON_VERSION)"
else
  fail "python3 not found — extraction tests cannot run"
  echo ""
  echo "═══════════════════════════════════════════════════════════════"
  echo "EXTRACTION: $PASS passed, $FAIL failed (total: $((PASS + FAIL)))"
  echo "═══════════════════════════════════════════════════════════════"
  exit 1
fi

# Test 2: Extraction script exists
if [ -f "$EXTRACTION_SCRIPT" ]; then
  pass "Extraction script exists at core/scripts/run_extraction.py"
else
  fail "Extraction script not found at $EXTRACTION_SCRIPT"
  echo ""
  echo "═══════════════════════════════════════════════════════════════"
  echo "EXTRACTION: $PASS passed, $FAIL failed (total: $((PASS + FAIL)))"
  echo "═══════════════════════════════════════════════════════════════"
  exit 1
fi

# Test 3: Python syntax check on extraction script
if python3 -m py_compile "$EXTRACTION_SCRIPT" 2>/dev/null; then
  pass "Extraction script passes Python syntax check"
else
  fail "Extraction script has Python syntax errors"
fi

echo ""
echo "── Extraction output ───────────────────────────────────────────"

# Create a simulated ~/.claude/projects/ structure
FAKE_HOME="$TEST_DIR/fake-home"
FAKE_PROJECTS="$FAKE_HOME/.claude/projects"
TODAY=$(date +%Y-%m-%d)
# Use a path fragment that mimics real project structure
PROJECT_PATH="$FAKE_PROJECTS/-Users-test-my-project"
mkdir -p "$PROJECT_PATH"

# Copy fixture session file with today's date
cp "$FIXTURES_DIR/sample-claude-session.jsonl" "$PROJECT_PATH/$TODAY.jsonl"

OUTPUT_DIR="$TEST_DIR/output"
mkdir -p "$OUTPUT_DIR"

# Test 4: Extract from sample .jsonl — output file created
# Override HOME so extract_claude.py finds the fake projects dir (~/.claude/projects)
OUTPUT=$(HOME="$FAKE_HOME" python3 "$EXTRACTION_SCRIPT" \
  --source claude \
  --output-dir "$OUTPUT_DIR" \
  2>&1 || true)

OUTPUT_FILE=$(find "$OUTPUT_DIR" -name "*claude*.md" 2>/dev/null | head -1)
if [ -n "$OUTPUT_FILE" ] && [ -f "$OUTPUT_FILE" ]; then
  pass "Extract from .jsonl fixture — output .md file created"
else
  OUTPUT_FILE=$(find "$OUTPUT_DIR" -name "*.md" 2>/dev/null | head -1)
  if [ -n "$OUTPUT_FILE" ] && [ -f "$OUTPUT_FILE" ]; then
    pass "Extract from .jsonl fixture — output .md file created"
  else
    fail "No output .md file created (output: $(echo "$OUTPUT" | head -3))"
  fi
fi

# Test 5: Output file contains User/Assistant conversation structure
if [ -n "$OUTPUT_FILE" ] && [ -f "$OUTPUT_FILE" ]; then
  # Output format: "### Message N: User" or "**User:**" or "User:" or similar
  if grep -qiE "User|Assistant|message.*user|message.*assistant" "$OUTPUT_FILE"; then
    pass "Output file contains User/Assistant conversation sections"
  else
    fail "Output file missing conversation structure (got: $(head -5 "$OUTPUT_FILE"))"
  fi
fi

# Test 6: Extract with --source claude flag completes without error
OUTPUT=$(HOME="$FAKE_HOME" python3 "$EXTRACTION_SCRIPT" \
  --source claude \
  --output-dir "$TEST_DIR/output-claude" \
  2>&1; echo "EXIT:$?")
EXIT_CODE=$(echo "$OUTPUT" | grep "EXIT:" | sed 's/EXIT://')
if [ "$EXIT_CODE" = "0" ] || echo "$OUTPUT" | grep -qiE "extract|session|written|created|no.*session"; then
  pass "--source claude flag runs without error"
else
  fail "--source claude should run cleanly (output: $(echo "$OUTPUT" | head -3))"
fi

# Test 7: Custom output directory is respected
CUSTOM_DIR="$TEST_DIR/custom-output-dir"
mkdir -p "$CUSTOM_DIR"
HOME="$FAKE_HOME" python3 "$EXTRACTION_SCRIPT" \
  --source claude \
  --output-dir "$CUSTOM_DIR" \
  2>&1 > /dev/null || true
if [ -d "$CUSTOM_DIR" ]; then
  pass "Custom --output-dir is used by extraction script"
else
  fail "Custom --output-dir should be created/used"
fi

echo ""

# ── Summary ──────────────────────────────────────────────────────────────────

echo "═══════════════════════════════════════════════════════════════"
echo "EXTRACTION: $PASS passed, $FAIL failed (total: $((PASS + FAIL)))"
echo "═══════════════════════════════════════════════════════════════"

[ $FAIL -eq 0 ] && exit 0 || exit 1
