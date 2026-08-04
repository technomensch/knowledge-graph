#!/bin/bash
# test-handoff-file-tracing-gate.sh — Validates handoff-file-tracing-gate.sh manifest-extraction/transcript-diff logic

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
HOOK="$REPO_ROOT/scripts/handoff-file-tracing-gate.sh"

PASS=0
FAIL=0

pass() { echo "  ✅ PASS: $1"; PASS=$((PASS + 1)); }
fail() { echo "  ❌ FAIL: $1"; FAIL=$((FAIL + 1)); }

TEST_DIR=$(mktemp -d)
TRANSCRIPT_FILE="$TEST_DIR/transcript.jsonl"
STARTHERE_FILE="$TEST_DIR/START-HERE.md"
INPUT="{\"session_id\": \"test-session-$$\", \"transcript_path\": \"${TRANSCRIPT_FILE}\"}"

cleanup() { rm -rf "$TEST_DIR"; }
trap cleanup EXIT INT TERM

# Real Claude Code transcript shape: tool calls nest under .message.content[].
# Confirmed against a live transcript file — NOT a flat {"type":..,"name":..} shape.
read_entry() {
  local path="$1"
  cat << EOF
{"message":{"role":"assistant","content":[{"type":"tool_use","name":"Read","input":{"file_path":"${path}"}}]}}
EOF
}

echo "═══════════════════════════════════════════════════════════════"
echo "TEST SUITE: Handoff File-Tracing Gate (handoff-file-tracing-gate.sh)"
echo "═══════════════════════════════════════════════════════════════"

if [ ! -f "$HOOK" ]; then
  echo "❌ FATAL: handoff-file-tracing-gate.sh not found at $HOOK"
  exit 1
fi

# ── Test 1: No START-HERE.md-pattern file read this session → exit 0 ───────
cat > "$TRANSCRIPT_FILE" << EOF
$(read_entry "$TEST_DIR/some-other-file.md")
EOF
set +e
echo "$INPUT" | bash "$HOOK" > /dev/null 2>&1
RESULT=$?
set -e
[ "$RESULT" -eq 0 ] && pass "no handoff file read → exit 0 (fail open)" || fail "no handoff file read → expected exit 0, got $RESULT"

# ── Test 2: START-HERE.md read, manifest embedded, all files also read ─────
cat > "$STARTHERE_FILE" << 'MDEOF'
# Start Here — Project Handoff

<!-- kmgraph-handoff-manifest
```json
["__A__", "__B__"]
```
-->
MDEOF
sed -i.bak "s|__A__|$TEST_DIR/a.md|; s|__B__|$TEST_DIR/b.md|" "$STARTHERE_FILE" && rm -f "$STARTHERE_FILE.bak"

cat > "$TRANSCRIPT_FILE" << EOF
$(read_entry "$STARTHERE_FILE")
$(read_entry "$TEST_DIR/a.md")
$(read_entry "$TEST_DIR/b.md")
EOF
set +e
echo "$INPUT" | bash "$HOOK" > /dev/null 2>&1
RESULT=$?
set -e
[ "$RESULT" -eq 0 ] && pass "all manifest files read → exit 0" || fail "all files read → expected exit 0, got $RESULT"

# ── Test 3: START-HERE.md read, manifest names a file NEVER read → exit 2 ──
cat > "$STARTHERE_FILE" << 'MDEOF'
# Start Here — Project Handoff

<!-- kmgraph-handoff-manifest
```json
["__A__", "__C__"]
```
-->
MDEOF
sed -i.bak "s|__A__|$TEST_DIR/a.md|; s|__C__|$TEST_DIR/c.md|" "$STARTHERE_FILE" && rm -f "$STARTHERE_FILE.bak"

cat > "$TRANSCRIPT_FILE" << EOF
$(read_entry "$STARTHERE_FILE")
$(read_entry "$TEST_DIR/a.md")
EOF
set +e
OUTPUT=$(echo "$INPUT" | bash "$HOOK" 2>&1)
RESULT=$?
set -e
[ "$RESULT" -eq 2 ] && pass "missing file → exit 2 (hard stop)" || fail "missing file → expected exit 2, got $RESULT"
echo "$OUTPUT" | grep -q "c.md" && pass "block message names the missing file" || fail "block message should name c.md"

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "RESULTS: $PASS passed, $FAIL failed"
echo "═══════════════════════════════════════════════════════════════"
[ "$FAIL" -eq 0 ] && exit 0 || exit 1
