#!/bin/bash
# test-extraction-rebuild.sh — proves --rebuild (ENH-043) repairs a
# pre-fix-shaped output file: stale header count, leftover ## Session N
# block, and a uuid present in the source .jsonl but missing from the
# pre-seeded output. Also covers four edge cases a thorough suite needs:
#   Gap 1: clearing a stale YYYY-MM-DD/ split subfolder + get_output_path
#          falling back to the flat-file path afterward.
#   Gap 2: a --project that matches zero project directories (graceful, no crash).
#   Gap 3: --rebuild + --incremental passed together (rebuild takes precedence).
#   Gap 5: a malformed/truncated pre-existing output file (rebuild ignores it
#          entirely and cleanly overwrites, never choking on parse).
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
mkdir -p "$PROJECT_DIR"
cp "$FIXTURES_DIR/sample-claude-rebuild-source.jsonl" "$PROJECT_DIR/main-session.jsonl"

OUTPUT_DIR="$TEST_DIR/output"
mkdir -p "$OUTPUT_DIR/2026-07"
OUTPUT_FILE="$OUTPUT_DIR/2026-07/${DATE}-claude.md"

echo "── Seed a pre-fix-shaped output file (stale count, leftover Session-N block, missing uuid) ──"
cat > "$OUTPUT_FILE" <<'EOF'
# Complete Chat Session Export
## Full Conversation from Claude Code

**Date:** 2026-07-03
**Platform:** Claude Code
**Total Messages:** 2

---

## Session 1 (Started: 090000)

### Message 1: User
<!-- uuid: rebuild-001 -->
**Timestamp:** 2026-07-03T09:00:00

**Content:**

Start the investigation.

---
EOF
# Note: rebuild-002, rebuild-003, rebuild-004 are deliberately absent from
# this seeded file, simulating messages the pre-fix code dropped.

echo "── Run WITHOUT --rebuild (incremental append) — expect it does NOT clean up the old block ──"
HOME="$FAKE_HOME" python3 "$EXTRACTION_SCRIPT" \
  --source claude --output-dir "$OUTPUT_DIR" --date "$DATE" --incremental --confirm-unscoped \
  > "$TEST_DIR/no-rebuild.log" 2>&1 || true

if grep -q "^## Session 1 (Started:" "$OUTPUT_FILE"; then
  pass "baseline confirmed: a plain incremental run does not repair the old Session-N block (proves rebuild is needed)"
else
  fail "baseline unexpected: old Session-N block already gone without --rebuild -- test setup invalid"
fi

echo "── Re-seed the same broken file, then run WITH --rebuild ──"
cat > "$OUTPUT_FILE" <<'EOF'
# Complete Chat Session Export
## Full Conversation from Claude Code

**Date:** 2026-07-03
**Platform:** Claude Code
**Total Messages:** 2

---

## Session 1 (Started: 090000)

### Message 1: User
<!-- uuid: rebuild-001 -->
**Timestamp:** 2026-07-03T09:00:00

**Content:**

Start the investigation.

---
EOF

HOME="$FAKE_HOME" python3 "$EXTRACTION_SCRIPT" \
  --source claude --output-dir "$OUTPUT_DIR" --date "$DATE" --rebuild --confirm-unscoped \
  > "$TEST_DIR/rebuild.log" 2>&1 || true

SESSION_BLOCKS=$(grep -c "^## Session" "$OUTPUT_FILE" 2>/dev/null || true)
SESSION_BLOCKS=${SESSION_BLOCKS:-0}
if [ "$SESSION_BLOCKS" = "0" ]; then
  pass "rebuild removes the leftover ## Session N block"
else
  fail "expected 0 Session-N blocks after rebuild, got $SESSION_BLOCKS"
fi

HEADER_COUNT=$(grep -oE '\*\*Total Messages:\*\* [0-9]+' "$OUTPUT_FILE" | grep -oE '[0-9]+')
ACTUAL_COUNT=$(grep -c "^### Message" "$OUTPUT_FILE" 2>/dev/null || echo 0)
if [ "$HEADER_COUNT" = "$ACTUAL_COUNT" ] && [ "$ACTUAL_COUNT" = "4" ]; then
  pass "rebuild recovers all 4 messages and header count matches actual (was 2/2 stale, now 4/4 correct)"
else
  fail "expected header=4 actual=4, got header=$HEADER_COUNT actual=$ACTUAL_COUNT"
fi

for uuid in rebuild-001 rebuild-002 rebuild-003 rebuild-004; do
  if grep -q "<!-- uuid: $uuid -->" "$OUTPUT_FILE"; then
    pass "rebuild includes previously-dropped uuid $uuid"
  else
    fail "rebuild missing uuid $uuid"
  fi
done

# ── Gap 5: a malformed/truncated pre-existing file is still cleanly overwritten ──
# (missing **Total Messages:** header, truncated mid-message). The rebuild path
# sets last_ts=None directly and never calls parse_metadata_from_file on it, so
# nothing should choke regardless of how broken the prior file is.
echo "── Gap 5: --rebuild over a malformed/truncated existing file ──"
rm -rf "$OUTPUT_DIR"; mkdir -p "$OUTPUT_DIR/2026-07"
printf '# Complete Chat Session Export\n## Full Conversation from Claude Code\n\n**Date:** 2026-07-03\n\n### Message 1: User\n<!-- uuid: rebuild-001 -->\n**Timestamp:** 2026-07-03T09:00:00\n\n**Content:**\n\nStart the inv' > "$OUTPUT_FILE"
HOME="$FAKE_HOME" python3 "$EXTRACTION_SCRIPT" \
  --source claude --output-dir "$OUTPUT_DIR" --date "$DATE" --rebuild --confirm-unscoped \
  > "$TEST_DIR/rebuild-malformed.log" 2>&1 || true
if ! grep -qi "Traceback" "$TEST_DIR/rebuild-malformed.log"; then
  pass "rebuild over a malformed/truncated file does not crash (no traceback)"
else
  fail "rebuild crashed on a malformed pre-existing file -- see rebuild-malformed.log"
fi
MAL_HEADER=$(grep -oE '\*\*Total Messages:\*\* [0-9]+' "$OUTPUT_FILE" | grep -oE '[0-9]+' || echo missing)
MAL_ACTUAL=$(grep -c "^### Message" "$OUTPUT_FILE" 2>/dev/null || echo 0)
if [ "$MAL_HEADER" = "4" ] && [ "$MAL_ACTUAL" = "4" ]; then
  pass "rebuild cleanly overwrites malformed file to correct 4/4 output (ignores corrupted prior state)"
else
  fail "expected 4/4 after rebuilding malformed file, got header=$MAL_HEADER actual=$MAL_ACTUAL"
fi

# ── Gap 1: --rebuild clears a stale split subfolder; get_output_path falls back to the flat path ──
echo "── Gap 1: --rebuild clears a stale YYYY-MM-DD/ split subfolder ──"
rm -rf "$OUTPUT_DIR"; mkdir -p "$OUTPUT_DIR/2026-07-03"
# Seed a split subfolder (get_output_path routes here FIRST when it exists),
# with NO flat file present — simulating a previously oversized/split date.
cat > "$OUTPUT_DIR/2026-07-03/2026-07-03-claude-part-01.md" <<'EOF'
# Complete Chat Session Export — Part 1

**Total Messages:** 1

### Message 1: User
<!-- uuid: stale-part-001 -->
**Timestamp:** 2026-07-03T08:00:00

**Content:**

stale split content

---
EOF
cat > "$OUTPUT_DIR/2026-07-03/2026-07-03-claude-part-02.md" <<'EOF'
# Complete Chat Session Export — Part 2

### Message 2: Assistant
<!-- uuid: stale-part-002 -->
**Timestamp:** 2026-07-03T08:00:05

**Content:**

more stale split content

---
EOF

# Precondition: get_output_path routes INTO the split subfolder while it exists.
PRE_PATH=$(HOME="$FAKE_HOME" KG_OUTPUT_DIR="$OUTPUT_DIR" python3 -c \
  "import sys; sys.path.insert(0, '$REPO_ROOT/core/scripts'); from chat_extractor_base import get_output_path; print(get_output_path('2026-07-03-claude.md'))")
case "$PRE_PATH" in
  *"/2026-07-03/2026-07-03-claude-part"*) pass "precondition: get_output_path routes into the split subfolder while it exists" ;;
  *) fail "precondition failed: get_output_path did not route into split subfolder (got $PRE_PATH)" ;;
esac

HOME="$FAKE_HOME" python3 "$EXTRACTION_SCRIPT" \
  --source claude --output-dir "$OUTPUT_DIR" --date "$DATE" --rebuild --confirm-unscoped \
  > "$TEST_DIR/rebuild-split.log" 2>&1 || true

if [ ! -d "$OUTPUT_DIR/2026-07-03" ]; then
  pass "rebuild removes the stale split subfolder"
else
  fail "split subfolder still present after rebuild"
fi

POST_PATH=$(HOME="$FAKE_HOME" KG_OUTPUT_DIR="$OUTPUT_DIR" python3 -c \
  "import sys; sys.path.insert(0, '$REPO_ROOT/core/scripts'); from chat_extractor_base import get_output_path; print(get_output_path('2026-07-03-claude.md'))")
case "$POST_PATH" in
  *"/2026-07-03/"*) fail "get_output_path still routes into the (deleted) split subfolder after rebuild: $POST_PATH" ;;
  *"/2026-07/2026-07-03-claude.md") pass "get_output_path falls back to the flat-file path after rebuild" ;;
  *) fail "get_output_path returned unexpected path after rebuild: $POST_PATH" ;;
esac

FLAT_FILE="$OUTPUT_DIR/2026-07/2026-07-03-claude.md"
if [ -f "$FLAT_FILE" ] && [ "$(grep -c '^### Message' "$FLAT_FILE")" = "4" ] && ! grep -q "stale split content" "$FLAT_FILE"; then
  pass "rebuild writes a fresh 4-message flat file and drops the stale split content"
else
  fail "expected fresh 4-message flat file free of stale split content"
fi

# ── Gap 3: --rebuild takes precedence over --incremental when both are passed ──
echo "── Gap 3: --rebuild + --incremental together — rebuild wins ──"
rm -rf "$OUTPUT_DIR"; mkdir -p "$OUTPUT_DIR/2026-07"
cat > "$OUTPUT_FILE" <<'EOF'
# Complete Chat Session Export
## Full Conversation from Claude Code

**Date:** 2026-07-03
**Platform:** Claude Code
**Total Messages:** 2

---

## Session 1 (Started: 090000)

### Message 1: User
<!-- uuid: rebuild-001 -->
**Timestamp:** 2026-07-03T09:00:00

**Content:**

Start the investigation.

---
EOF
HOME="$FAKE_HOME" python3 "$EXTRACTION_SCRIPT" \
  --source claude --output-dir "$OUTPUT_DIR" --date "$DATE" --rebuild --incremental --confirm-unscoped \
  > "$TEST_DIR/rebuild-incremental.log" 2>&1 || true
PREC_SESSIONS=$(grep -c "^## Session" "$OUTPUT_FILE" 2>/dev/null || true)
PREC_SESSIONS=${PREC_SESSIONS:-0}
if ! grep -q "Incremental Update" "$OUTPUT_FILE" && [ "$PREC_SESSIONS" = "0" ]; then
  pass "with --rebuild --incremental, rebuild wins: overwrite branch runs (no '[Incremental Update]' separator, no Session-N block)"
else
  fail "with both flags, the incremental append branch ran instead of the rebuild overwrite branch"
fi
PREC_HEADER=$(grep -oE '\*\*Total Messages:\*\* [0-9]+' "$OUTPUT_FILE" | grep -oE '[0-9]+' || echo missing)
if [ "$PREC_HEADER" = "4" ]; then
  pass "with both flags, header count is the clean rebuilt 4 (not the stale 2 an append would have left)"
else
  fail "expected header=4 under --rebuild --incremental, got $PREC_HEADER"
fi

# ── Gap 2: --project matching zero directories is graceful (no crash, no output) ──
echo "── Gap 2: --rebuild --project with zero matching directories ──"
rm -rf "$OUTPUT_DIR"; mkdir -p "$OUTPUT_DIR"
HOME="$FAKE_HOME" python3 "$EXTRACTION_SCRIPT" \
  --source claude --output-dir "$OUTPUT_DIR" --date "$DATE" --rebuild --project=zzz-nonexistent-project \
  > "$TEST_DIR/rebuild-nomatch.log" 2>&1 || true
if ! grep -qi "Traceback" "$TEST_DIR/rebuild-nomatch.log"; then
  pass "zero-match --project does not crash"
else
  fail "zero-match --project crashed -- see rebuild-nomatch.log"
fi
if [ -z "$(find "$OUTPUT_DIR" -name '*-claude.md' 2>/dev/null)" ]; then
  pass "zero-match --project writes no output file (graceful empty result)"
else
  fail "zero-match --project unexpectedly wrote an output file"
fi

# ── Gap 6: --rebuild warns explicitly when source is gone but output already exists ──
echo "── Gap 6: --rebuild warns when source is gone but output already exists ──"
rm -rf "$OUTPUT_DIR"; mkdir -p "$OUTPUT_DIR/2026-07"
cat > "$OUTPUT_FILE" <<'EOF'
# Complete Chat Session Export
**Total Messages:** 1

### Message 1: User
<!-- uuid: orphan-001 -->
**Timestamp:** 2026-07-03T09:00:00

**Content:**

orphaned content, source no longer exists

---
EOF
EMPTY_PROJECT_DIR="$FAKE_HOME/.claude/projects/-Users-test-empty-project"
mkdir -p "$EMPTY_PROJECT_DIR"
NOSOURCE_LOG=$(HOME="$FAKE_HOME" python3 "$EXTRACTION_SCRIPT" \
  --source claude --output-dir "$OUTPUT_DIR" --date "$DATE" --project=test-empty-project --rebuild 2>&1)
if echo "$NOSOURCE_LOG" | grep -q "WARNING:.*0 source sessions for $DATE"; then
  pass "rebuild warns explicitly when source is gone but output file already exists"
else
  fail "expected a WARNING about missing source, got: $NOSOURCE_LOG"
fi
if grep -q "orphaned content" "$OUTPUT_FILE"; then
  pass "existing output is left untouched when source is unavailable (not deleted/blanked)"
else
  fail "existing output was modified even though no source was found"
fi

echo ""
echo "REBUILD-MODE: $PASS passed, $FAIL failed (total: $((PASS + FAIL)))"
[ $FAIL -eq 0 ] && exit 0 || exit 1
