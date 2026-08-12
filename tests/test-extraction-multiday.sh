#!/bin/bash
# test-extraction-multiday.sh — proves per-message date bucketing (ENH-047):
# a single session .jsonl spanning multiple calendar days must fan out into
# one output file per real date, with untimestamped records carried forward
# to the nearest preceding date, and --date filtering must not leak content
# from a later day. Also covers the MANDATORY ADR-044 interaction: a
# multi-day source landing on an already-split date must still union
# uuid-dedup across all split parts (the exact regression ENH-038 fixed and
# ENH-047's fan-out must not reintroduce).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
EXTRACTION_SCRIPT="$REPO_ROOT/core/scripts/run_extraction.py"
FIXTURES_DIR="$SCRIPT_DIR/fixtures"
FIXTURE="$FIXTURES_DIR/sample-claude-multiday-session.jsonl"

PASS=0
FAIL=0
pass() { echo "  PASS: $1"; PASS=$((PASS + 1)); }
fail() { echo "  FAIL: $1"; FAIL=$((FAIL + 1)); }

TEST_DIR=$(mktemp -d)
cleanup() { rm -rf "$TEST_DIR"; }
trap cleanup EXIT

# Derive expected per-day counts from the fixture itself, not hardcoded.
DAY1_COUNT=$(grep -c '"uuid":"day1-' "$FIXTURE")
DAY3_COUNT=$(grep -c '"uuid":"day3-' "$FIXTURE")

FAKE_HOME="$TEST_DIR/fake-home"
PROJECT_DIR="$FAKE_HOME/.claude/projects/-Users-test-my-project"
mkdir -p "$PROJECT_DIR"
cp "$FIXTURE" "$PROJECT_DIR/main-session.jsonl"

# ── Step 2: fan-out into one file per real date ──────────────────────────────
echo "── Step 2: multi-day fan-out ──"
OUTPUT_DIR="$TEST_DIR/output"
mkdir -p "$OUTPUT_DIR"

HOME="$FAKE_HOME" python3 "$EXTRACTION_SCRIPT" \
  --source claude --output-dir "$OUTPUT_DIR" --confirm-unscoped \
  > "$TEST_DIR/fanout.log" 2>&1 || true

DAY1_FILE=$(find "$OUTPUT_DIR" -name "2026-06-01-claude.md" | head -1)
DAY3_FILE=$(find "$OUTPUT_DIR" -name "2026-06-03-claude.md" | head -1)

if [ -n "$DAY1_FILE" ]; then
  pass "one output file created for 2026-06-01"
else
  fail "no output file created for 2026-06-01"
fi

if [ -n "$DAY3_FILE" ]; then
  pass "one output file created for 2026-06-03"
else
  fail "no output file created for 2026-06-03"
fi

if [ -n "$DAY1_FILE" ]; then
  DAY1_ACTUAL=$(grep -c '^### Message' "$DAY1_FILE" 2>/dev/null || echo 0)
  if [ "$DAY1_ACTUAL" = "$DAY1_COUNT" ]; then
    pass "2026-06-01 output has exactly its $DAY1_COUNT day's messages"
  else
    fail "2026-06-01 expected $DAY1_COUNT messages, got $DAY1_ACTUAL"
  fi
  if grep -q '<!-- uuid: day3-' "$DAY1_FILE"; then
    fail "2026-06-01 output leaked a 2026-06-03 uuid"
  else
    pass "2026-06-01 output contains no 2026-06-03 content"
  fi
fi

if [ -n "$DAY3_FILE" ]; then
  DAY3_ACTUAL=$(grep -c '^### Message' "$DAY3_FILE" 2>/dev/null || echo 0)
  if [ "$DAY3_ACTUAL" = "$DAY3_COUNT" ]; then
    pass "2026-06-03 output has exactly its $DAY3_COUNT day's messages"
  else
    fail "2026-06-03 expected $DAY3_COUNT messages, got $DAY3_ACTUAL"
  fi
  if grep -q '<!-- uuid: day3-003-fallback -->' "$DAY3_FILE"; then
    pass "untimestamped record carried forward and filed under 2026-06-03 (fallback works)"
  else
    fail "untimestamped record missing from 2026-06-03 output -- carry-forward fallback broken"
  fi
fi

# ── Step 3: --date filter correctness ────────────────────────────────────────
echo "── Step 3: --date=2026-06-03 filter correctness ──"
FILTER_OUT="$TEST_DIR/output-filtered"
mkdir -p "$FILTER_OUT"

HOME="$FAKE_HOME" python3 "$EXTRACTION_SCRIPT" \
  --source claude --output-dir "$FILTER_OUT" --date=2026-06-03 --confirm-unscoped \
  > "$TEST_DIR/filtered.log" 2>&1 || true

FILTER_DAY1_FILE=$(find "$FILTER_OUT" -name "2026-06-01-claude.md" 2>/dev/null | head -1)
FILTER_DAY3_FILE=$(find "$FILTER_OUT" -name "2026-06-03-claude.md" 2>/dev/null | head -1)

if [ -z "$FILTER_DAY1_FILE" ]; then
  pass "--date=2026-06-03 produces no 2026-06-01 output at all"
else
  fail "--date=2026-06-03 unexpectedly produced a 2026-06-01 output file"
fi

if [ -n "$FILTER_DAY3_FILE" ]; then
  FILTER_ACTUAL=$(grep -c '^### Message' "$FILTER_DAY3_FILE" 2>/dev/null || echo 0)
  if [ "$FILTER_ACTUAL" = "$DAY3_COUNT" ]; then
    pass "--date=2026-06-03 output has exactly the $DAY3_COUNT 2026-06-03 messages (including fallback)"
  else
    fail "--date=2026-06-03 expected $DAY3_COUNT messages, got $FILTER_ACTUAL"
  fi
  if grep -q '<!-- uuid: day3-003-fallback -->' "$FILTER_DAY3_FILE" \
     && grep -q '<!-- uuid: day3-001 -->' "$FILTER_DAY3_FILE" \
     && grep -q '<!-- uuid: day3-002 -->' "$FILTER_DAY3_FILE"; then
    pass "--date=2026-06-03 output includes all 3 day-3 uuids (fallback + both timestamped)"
  else
    fail "--date=2026-06-03 output missing one or more expected day-3 uuids"
  fi
  if grep -q '<!-- uuid: day1-' "$FILTER_DAY3_FILE"; then
    fail "--date=2026-06-03 output leaked 2026-06-01 content -- the direct ENH-047 regression"
  else
    pass "--date=2026-06-03 output correctly excludes all 2026-06-01 content"
  fi
else
  fail "--date=2026-06-03 produced no output file at all"
fi

# ── Step 4 (MANDATORY): ADR-044 split-day interaction ────────────────────────
# Pre-seed the output dir with an already-split 2026-06-03 date: uuids are
# spread across BOTH parts. Feed the same multi-day source again -- day3-001
# lives in part1, day3-002 lives in part2, day3-003-fallback is new. Prove
# get_output_path() reroutes into the split subfolder, uuid-dedup unions
# across both parts (ENH-038's exact regression class), the new message is
# appended, and nothing is lost or duplicated.
echo "── Step 4 (MANDATORY): ADR-044 split-day interaction ──"
SPLIT_OUT="$TEST_DIR/output-split"
mkdir -p "$SPLIT_OUT/2026-06-03"

cat > "$SPLIT_OUT/2026-06-03/2026-06-03-claude-part-01.md" <<'EOF'
# Complete Chat Session Export — Part 1

**Total Messages:** 1

### Message 1: User
<!-- uuid: day3-001 -->
**Timestamp:** 2026-06-03T14:00:00

**Content:**

Day three, message one.

---
EOF

cat > "$SPLIT_OUT/2026-06-03/2026-06-03-claude-part-02.md" <<'EOF'
# Complete Chat Session Export — Part 2

### Message 2: Assistant
<!-- uuid: day3-002 -->
**Timestamp:** 2026-06-03T14:00:05

**Content:**

Day three, response one.

---
EOF

# Precondition: get_output_path routes into the split subfolder (last part).
PRE_PATH=$(HOME="$FAKE_HOME" KG_OUTPUT_DIR="$SPLIT_OUT" python3 -c \
  "import sys; sys.path.insert(0, '$REPO_ROOT/core/scripts'); from chat_extractor_base import get_output_path; print(get_output_path('2026-06-03-claude.md'))")
case "$PRE_PATH" in
  *"/2026-06-03/2026-06-03-claude-part-02.md") pass "precondition: get_output_path reroutes into the split subfolder's last part" ;;
  *) fail "precondition failed: get_output_path did not reroute into split part2 (got $PRE_PATH)" ;;
esac

HOME="$FAKE_HOME" python3 "$EXTRACTION_SCRIPT" \
  --source claude --output-dir "$SPLIT_OUT" --date=2026-06-03 --incremental --confirm-unscoped \
  > "$TEST_DIR/split.log" 2>&1 || true

# (a) no stray flat file created alongside the split subfolder
if [ -z "$(find "$SPLIT_OUT" -maxdepth 2 -name '2026-06-03-claude.md' 2>/dev/null)" ]; then
  pass "no stray flat 2026-06-03-claude.md created alongside the split subfolder"
else
  fail "a stray flat 2026-06-03-claude.md was created alongside the split subfolder"
fi

PART1="$SPLIT_OUT/2026-06-03/2026-06-03-claude-part-01.md"
PART2="$SPLIT_OUT/2026-06-03/2026-06-03-claude-part-02.md"

# (b) already-seen uuids from part1 AND part2 are not re-appended
COUNT_DAY3_001=$(cat "$PART1" "$PART2" 2>/dev/null | grep -c '<!-- uuid: day3-001 -->' || true)
COUNT_DAY3_002=$(cat "$PART1" "$PART2" 2>/dev/null | grep -c '<!-- uuid: day3-002 -->' || true)
if [ "${COUNT_DAY3_001:-0}" = "1" ]; then
  pass "day3-001 (seen in part1) not duplicated across parts"
else
  fail "day3-001 expected exactly 1 occurrence across both parts, got ${COUNT_DAY3_001:-0}"
fi
if [ "${COUNT_DAY3_002:-0}" = "1" ]; then
  pass "day3-002 (seen in part2) not duplicated across parts"
else
  fail "day3-002 expected exactly 1 occurrence across both parts, got ${COUNT_DAY3_002:-0}"
fi

# (c) genuinely new message is appended
if grep -q '<!-- uuid: day3-003-fallback -->' "$PART2" 2>/dev/null; then
  pass "genuinely new day3-003-fallback message is appended to the last part"
else
  fail "day3-003-fallback was not appended anywhere -- new message lost"
fi

# (d) no message loss: exactly DAY3_COUNT unique day-3 uuids total (duplication
# itself is caught by the exact-count checks above, not by this dedup'd count)
TOTAL_DAY3_MARKERS=$(cat "$PART1" "$PART2" 2>/dev/null | grep -oE '<!-- uuid: day3-[^[:space:]]+ -->' | sort -u | wc -l | tr -d ' ')
if [ "$TOTAL_DAY3_MARKERS" = "$DAY3_COUNT" ]; then
  pass "no message loss: exactly $DAY3_COUNT unique day-3 uuids across both parts"
else
  fail "expected $DAY3_COUNT unique day-3 uuids across both parts, got $TOTAL_DAY3_MARKERS"
fi

# ── Step 5: leading-untimestamped backfill path (Fix 5, v0.6.18) ─────────────
# A separate fixture, kept distinct from the Step 2–4 fixture above so those
# derived counts stay stable. This one STARTS with untimestamped records (no
# "timestamp" key at all), forcing them into pending_untimestamped before any
# date has been derived, then backfills them to the first timestamped
# record's date once it arrives -- the one branch the main fixture (which
# starts with a timestamped record) never exercises.
echo "── Step 5: leading-untimestamped backfill ──"
LEADING_FIXTURE="$FIXTURES_DIR/sample-claude-leading-untimestamped.jsonl"
LEADING_COUNT=$(grep -c '"uuid":"lead-' "$LEADING_FIXTURE")

LEADING_PROJECT_DIR="$FAKE_HOME/.claude/projects/-Users-test-leading-project"
mkdir -p "$LEADING_PROJECT_DIR"
cp "$LEADING_FIXTURE" "$LEADING_PROJECT_DIR/main-session.jsonl"

LEADING_OUT="$TEST_DIR/output-leading"
mkdir -p "$LEADING_OUT"

HOME="$FAKE_HOME" python3 "$EXTRACTION_SCRIPT" \
  --source claude --output-dir "$LEADING_OUT" --confirm-unscoped \
  > "$TEST_DIR/leading.log" 2>&1 || true

LEADING_FILE=$(find "$LEADING_OUT" -name "2026-06-10-claude.md" | head -1)

if [ -n "$LEADING_FILE" ]; then
  pass "output file created for 2026-06-10 (first timestamped record's date)"

  LEADING_ACTUAL=$(grep -c '^### Message' "$LEADING_FILE" 2>/dev/null || echo 0)
  if [ "$LEADING_ACTUAL" = "$LEADING_COUNT" ]; then
    pass "2026-06-10 output has all $LEADING_COUNT messages, none dropped"
  else
    fail "2026-06-10 expected $LEADING_COUNT messages, got $LEADING_ACTUAL"
  fi

  if grep -q '<!-- uuid: lead-001 -->' "$LEADING_FILE" && grep -q '<!-- uuid: lead-002 -->' "$LEADING_FILE"; then
    pass "leading untimestamped records (lead-001, lead-002) backfilled to 2026-06-10"
  else
    fail "leading untimestamped records missing from 2026-06-10 output -- backfill path broken"
  fi
else
  fail "no output file created for 2026-06-10 -- leading-untimestamped fixture produced nothing"
fi

echo ""
echo "MULTIDAY-EXTRACTION: $PASS passed, $FAIL failed (total: $((PASS + FAIL)))"
[ $FAIL -eq 0 ] && exit 0 || exit 1
