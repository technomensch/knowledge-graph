#!/bin/bash
# test-extraction-gemini-stream.sh — verifies extract_gemini_stream_sessions()
# parses the post-2026-05-13 Gemini/Antigravity streaming .jsonl format:
# dedup by turn id (last-write-wins), resultDisplay/toolCalls fallback for
# empty content, and no regression on the pre-existing .json path.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
FIXTURES_DIR="$SCRIPT_DIR/fixtures"

PASS=0
FAIL=0
pass() { echo "  PASS: $1"; PASS=$((PASS + 1)); }
fail() { echo "  FAIL: $1"; FAIL=$((FAIL + 1)); }

TEST_DIR=$(mktemp -d)
cleanup() { rm -rf "$TEST_DIR"; }
trap cleanup EXIT

FAKE_HOME="$TEST_DIR/fake-home"
mkdir -p "$FAKE_HOME/.gemini/tmp/proj1/chats"
cp "$FIXTURES_DIR/sample-gemini-stream-session.jsonl" "$FAKE_HOME/.gemini/tmp/proj1/chats/session-test.jsonl"
mkdir -p "$FAKE_HOME/.gemini/tmp/proj2/chats"
cp "$FIXTURES_DIR/sample-gemini-session.json" "$FAKE_HOME/.gemini/tmp/proj2/chats/session-test.json"

OUTPUT_DIR="$TEST_DIR/output"
mkdir -p "$OUTPUT_DIR"

RESULT=$(HOME="$FAKE_HOME" python3 -c "
import sys, os
sys.path.insert(0, '$REPO_ROOT/core/scripts')
os.environ['KG_OUTPUT_DIR'] = '$OUTPUT_DIR'
os.environ['HOME'] = '$FAKE_HOME'
import importlib
import chat_extractor_base
importlib.reload(chat_extractor_base)
import extract_gemini
importlib.reload(extract_gemini)
extract_gemini.GEMINI_TMP_DIR = os.path.expanduser('~/.gemini/tmp')

stream_sessions = extract_gemini.extract_gemini_stream_sessions()
assert len(stream_sessions) == 1, f'expected 1 stream session, got {len(stream_sessions)}'
msgs = stream_sessions[0]['messages']
print(f'MSG_COUNT:{len(msgs)}')
for m in msgs:
    print(f'ROLE:{m[\"role\"]}|CONTENT:{m[\"content\"]}')

json_sessions = extract_gemini.extract_gemini_json_sessions()
assert len(json_sessions) == 1, f'expected 1 json session, got {len(json_sessions)}'
print(f'JSON_MSG_COUNT:{len(json_sessions[0][\"messages\"])}')
" 2>&1)

echo "$RESULT"

MSG_COUNT=$(echo "$RESULT" | grep -oE '^MSG_COUNT:[0-9]+' | cut -d: -f2)
if [ "$MSG_COUNT" = "2" ]; then
  pass "(a) stream fixture's 3 raw turns resolve to exactly 2 messages (turn-001 user, turn-002 deduped gemini)"
else
  fail "(a) expected 2 messages, got $MSG_COUNT"
fi

FINAL_CONTENT=$(echo "$RESULT" | grep 'ROLE:assistant' | sed -E 's/^ROLE:assistant\|CONTENT://')
if [ "$FINAL_CONTENT" = "The extension has been installed and is ready to use." ]; then
  pass "(b) turn-002 resolves to the final non-empty text (last-write-wins over empty/toolCalls-only occurrences)"
else
  fail "(b) expected final turn-002 text, got: $FINAL_CONTENT"
fi

JSON_MSG_COUNT=$(echo "$RESULT" | grep -oE 'JSON_MSG_COUNT:[0-9]+' | cut -d: -f2)
if [ "$JSON_MSG_COUNT" = "2" ]; then
  pass "(c) existing .json-format fixture still extracts correctly (no regression)"
else
  fail "(c) expected 2 json messages, got $JSON_MSG_COUNT"
fi

echo ""
echo "GEMINI-STREAM: $PASS passed, $FAIL failed (total: $((PASS + FAIL)))"
[ $FAIL -eq 0 ] && exit 0 || exit 1
