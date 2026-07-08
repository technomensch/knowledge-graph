#!/bin/bash
# test-extraction-codex-incremental.sh — proves the ENH-045 fix: an
# --incremental Codex extraction run against a file modified less than an
# hour ago still re-extracts (does not silently skip) when new source
# content exists for that date.
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

# The fixtures' session_meta timestamp is a fixed UTC instant
# (2026-07-08T14:00:00.000Z), but extract_codex.py buckets sessions by LOCAL
# date (_utc_to_local_date: datetime.fromtimestamp(epoch), machine-timezone).
# Hardcoding "2026-07-08" as the expected date assumes UTC 14:00 stays on the
# same calendar day locally -- false at UTC+11 and beyond (rolls to 07-09).
# Derive the expected local date the same way the extractor does, so this
# test is correct in any timezone.
LOCAL_DATE=$(python3 -c "
from datetime import datetime
epoch = datetime.fromisoformat('2026-07-08T14:00:00.000Z'.replace('Z', '+00:00')).timestamp()
print(datetime.fromtimestamp(epoch).strftime('%Y-%m-%d'))
")

FAKE_HOME="$TEST_DIR/fake-home"
SESSION_DIR="$FAKE_HOME/.codex/sessions/2026/07/08"
mkdir -p "$SESSION_DIR"
cp "$FIXTURES_DIR/sample-codex-rollout.jsonl" "$SESSION_DIR/rollout-test-session.jsonl"

OUTPUT_DIR="$TEST_DIR/output"
mkdir -p "$OUTPUT_DIR"

echo "── First extraction: 2 messages ──"
HOME="$FAKE_HOME" python3 "$EXTRACTION_SCRIPT" \
  --source codex --output-dir "$OUTPUT_DIR" --date "$LOCAL_DATE" --incremental \
  > "$TEST_DIR/first.log" 2>&1 || true

OUTPUT_FILE=$(find "$OUTPUT_DIR" -name "${LOCAL_DATE}-codex.md" | head -1)
COUNT_1=$(grep -c "^### Message" "$OUTPUT_FILE" 2>/dev/null || true)
COUNT_1=${COUNT_1:-0}
if [ "$COUNT_1" = "2" ]; then
  pass "first extraction captures 2 messages"
else
  fail "expected 2 messages on first extraction, got $COUNT_1"
fi

echo "── Update the source file with 2 more turns, re-run --incremental immediately (same hour) ──"
cp "$FIXTURES_DIR/sample-codex-rollout-updated.jsonl" "$SESSION_DIR/rollout-test-session.jsonl"

SECOND_LOG=$(HOME="$FAKE_HOME" python3 "$EXTRACTION_SCRIPT" \
  --source codex --output-dir "$OUTPUT_DIR" --date "$LOCAL_DATE" --incremental 2>&1)

if echo "$SECOND_LOG" | grep -qi "Skipped.*already current"; then
  fail "incremental re-run inside the same hour was silently skipped (ENH-045 bug still present)"
else
  pass "incremental re-run inside the same hour was NOT skipped"
fi

COUNT_2=$(grep -c "^### Message" "$OUTPUT_FILE" 2>/dev/null || true)
COUNT_2=${COUNT_2:-0}
if [ "$COUNT_2" = "4" ]; then
  pass "second extraction picks up all 4 messages (2 original + 2 new)"
else
  fail "expected 4 messages after re-run, got $COUNT_2"
fi

echo ""
echo "CODEX-INCREMENTAL: $PASS passed, $FAIL failed (total: $((PASS + FAIL)))"
[ $FAIL -eq 0 ] && exit 0 || exit 1
