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

# pwd -P: canonicalize past macOS's /var → /private/var symlink, because
# git rev-parse --show-toplevel returns physical paths and Test 5 compares
# fixture paths against it byte-for-byte.
TEST_DIR=$(cd "$(mktemp -d)" && pwd -P)
TRANSCRIPT_FILE="$TEST_DIR/transcript.jsonl"
STARTHERE_FILE="$TEST_DIR/START-HERE.md"
INPUT="{\"session_id\": \"test-session-$$\", \"transcript_path\": \"${TRANSCRIPT_FILE}\", \"cwd\": \"${REPO_ROOT}\"}"

REPO_RELATIVE_FILE="$REPO_ROOT/.tmp-handoff-gate-test-$$.md"
cleanup() { rm -rf "$TEST_DIR"; rm -f "$REPO_RELATIVE_FILE"; }
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

# ── Test 4: real-world shape — manifest path is REPO_ROOT-relative (as
# commands/kmg-handoff.md actually writes it, via "./handoff-packages/...")
# but Read always records an absolute path in the transcript. The file WAS
# read; the exit-0 expectation catches a regression back to the exact-string
# bug this test suite's first 3 cases never exercised (their manifest paths
# were already absolute on both sides, masking the real mismatch). ─────────
touch "$REPO_RELATIVE_FILE"
REPO_RELATIVE_BASENAME="$(basename "$REPO_RELATIVE_FILE")"
cat > "$STARTHERE_FILE" << MDEOF
# Start Here — Project Handoff

<!-- kmgraph-handoff-manifest
\`\`\`json
["./${REPO_RELATIVE_BASENAME}"]
\`\`\`
-->
MDEOF

cat > "$TRANSCRIPT_FILE" << EOF
$(read_entry "$STARTHERE_FILE")
$(read_entry "$REPO_RELATIVE_FILE")
EOF
set +e
RESULT_OUTPUT=$(echo "$INPUT" | bash "$HOOK" 2>&1)
RESULT=$?
set -e
[ "$RESULT" -eq 0 ] && pass "REPO_ROOT-relative manifest path, absolute Read path, file read → exit 0" || fail "relative-vs-absolute path match → expected exit 0, got $RESULT ($RESULT_OUTPUT)"

# ── Test 5: issue-43 — session runs inside a git WORKTREE. Manifest paths are
# relative, transcript Read paths are absolute *inside the worktree*, and
# CLAUDE_PROJECT_DIR points at the MAIN checkout (its documented behavior in
# worktree sessions). Pre-fix, REPO_ROOT anchored at the main checkout, so
# the comparison could never match → false exit 2. Post-fix, git -C <cwd>
# rev-parse --show-toplevel resolves the worktree's own root → exit 0. ──────
FIXTURE_REPO="$TEST_DIR/fixture-repo"
WORKTREE_DIR="$TEST_DIR/fixture-worktree"
git init -q "$FIXTURE_REPO"
git -C "$FIXTURE_REPO" -c user.email=test@test -c user.name=test commit -q --allow-empty -m init
git -C "$FIXTURE_REPO" worktree add -q -b test-worktree-branch "$WORKTREE_DIR" > /dev/null 2>&1

mkdir -p "$WORKTREE_DIR/handoff-packages/2026-08-10"
WT_LINKED_FILE="$WORKTREE_DIR/handoff-packages/2026-08-10/DOCUMENTATION-MAP.md"
touch "$WT_LINKED_FILE"
WT_STARTHERE="$WORKTREE_DIR/handoff-packages/2026-08-10/START-HERE.md"
cat > "$WT_STARTHERE" << 'MDEOF'
# Start Here — Project Handoff

<!-- kmgraph-handoff-manifest
```json
["./handoff-packages/2026-08-10/DOCUMENTATION-MAP.md"]
```
-->
MDEOF

WT_TRANSCRIPT="$TEST_DIR/worktree-transcript.jsonl"
cat > "$WT_TRANSCRIPT" << EOF
$(read_entry "$WT_STARTHERE")
$(read_entry "$WT_LINKED_FILE")
EOF
WT_INPUT="{\"session_id\": \"test-session-$$\", \"transcript_path\": \"${WT_TRANSCRIPT}\", \"cwd\": \"${WORKTREE_DIR}\"}"

set +e
RESULT_OUTPUT=$(echo "$WT_INPUT" | CLAUDE_PROJECT_DIR="$FIXTURE_REPO" bash "$HOOK" 2>&1)
RESULT=$?
set -e
[ "$RESULT" -eq 0 ] && pass "worktree session: relative manifest path, in-worktree absolute Read, CLAUDE_PROJECT_DIR=main checkout → exit 0" || fail "worktree anchor resolution → expected exit 0, got $RESULT ($RESULT_OUTPUT)"

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "RESULTS: $PASS passed, $FAIL failed"
echo "═══════════════════════════════════════════════════════════════"
[ "$FAIL" -eq 0 ] && exit 0 || exit 1
