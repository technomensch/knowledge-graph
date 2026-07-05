#!/bin/bash
# test-extraction-subagent-repro.sh — reproduces the 2026-07-03 message-loss bug:
# incremental mode drops subagent messages whose timestamps precede a
# last_ts computed only from the main thread's prior output.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
EXTRACTION_SCRIPT="$REPO_ROOT/core/scripts/run_extraction.py"
FIXTURES_DIR="$SCRIPT_DIR/fixtures"

PASS=0
FAIL=0
pass() { echo "  PASS: $1"; PASS=$((PASS + 1)); }
fail() { echo "  FAIL: $1"; FAIL=$((FAIL + 1)); }

TEST_DIR=$(mktemp -d)
cleanup() { rm -rf "$TEST_DIR"; }
trap cleanup EXIT

DATE="2026-07-03"
FAKE_HOME="$TEST_DIR/fake-home"
PROJECT_DIR="$FAKE_HOME/.claude/projects/-Users-test-my-project"
mkdir -p "$PROJECT_DIR/subagents"

cp "$FIXTURES_DIR/sample-claude-subagent-main.jsonl" "$PROJECT_DIR/main-session.jsonl"
cp "$FIXTURES_DIR/sample-claude-subagent-child.jsonl" "$PROJECT_DIR/subagents/agent-1.jsonl"

OUTPUT_DIR="$TEST_DIR/output"
mkdir -p "$OUTPUT_DIR"

echo "── Pass 1: fresh extraction (non-incremental) ──"
HOME="$FAKE_HOME" python3 "$EXTRACTION_SCRIPT" \
  --source claude --output-dir "$OUTPUT_DIR" --date "$DATE" \
  > "$TEST_DIR/pass1.log" 2>&1 || true

OUTPUT_FILE="$OUTPUT_DIR/2026-07/${DATE}-claude.md"
COUNT_1=$(grep -c '^### Message' "$OUTPUT_FILE" 2>/dev/null || echo 0)
if [ "$COUNT_1" = "6" ]; then
  pass "fresh extraction captures all 6 messages (4 main + 2 subagent)"
else
  fail "fresh extraction expected 6 messages, got $COUNT_1"
fi

echo "── Pass 2: simulate a second extraction run later the same day ──"
# Add one more main-thread message with a later timestamp, simulating
# work continuing after the first sync. Do NOT touch the subagent file —
# it already ran once and produced no new content, matching the real
# same-day-continuation scenario.
cat >> "$PROJECT_DIR/main-session.jsonl" <<'EOF'
{"type":"user","uuid":"main-005","timestamp":"2026-07-03T09:20:00Z","message":{"role":"user","content":[{"type":"text","text":"Any other findings?"}]}}
{"type":"assistant","uuid":"main-006","timestamp":"2026-07-03T09:20:05Z","message":{"role":"assistant","content":[{"type":"text","text":"Yes, the output-dir fallback is unsafe too."}]}}
EOF

HOME="$FAKE_HOME" python3 "$EXTRACTION_SCRIPT" \
  --source claude --output-dir "$OUTPUT_DIR" --date "$DATE" --incremental \
  > "$TEST_DIR/pass2.log" 2>&1 || true

COUNT_2=$(grep -c '^### Message' "$OUTPUT_FILE" 2>/dev/null || echo 0)
if [ "$COUNT_2" = "8" ]; then
  pass "incremental re-run captures all 8 messages (no loss)"
else
  fail "incremental re-run expected 8 total messages, got $COUNT_2 -- THIS IS THE BUG (subagent/main cross-file timestamp comparison drops messages)"
fi

echo ""
echo "SUBAGENT-REPRO: $PASS passed, $FAIL failed (total: $((PASS + FAIL)))"
[ $FAIL -eq 0 ] && exit 0 || exit 1
