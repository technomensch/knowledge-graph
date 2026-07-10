#!/bin/bash
# test-extraction-gemini-project-filter.sh — proves --project scopes
# Gemini extraction correctly (ENH-044): a session from a differently
# named project directory must NOT appear in filtered output. Also covers:
#   Gap 2: --project matching zero directories (graceful, no crash, no output).
#   Gap 4: the documented ENH-044 substring over-match limitation — a
#          'project-alpha' filter also pulls 'project-alpha-old'. This is
#          pinned (asserted true), NOT fixed: ENH-044 §"Out of Scope" keeps
#          fragment-match fixing out of scope, so this assertion is a
#          deliberate-decision tripwire that fails loudly if the behavior
#          ever changes silently.
#   Extra: threading project_filter through the .pb path must not break
#          Gemini extraction (guards the Task 6 Step 3/4 signature contract).
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

FAKE_HOME="$TEST_DIR/fake-home"
mkdir -p "$FAKE_HOME/.gemini/tmp/project-alpha/chats"
mkdir -p "$FAKE_HOME/.gemini/tmp/project-beta/chats"
cp "$FIXTURES_DIR/sample-gemini-project-a-session.jsonl" \
   "$FAKE_HOME/.gemini/tmp/project-alpha/chats/session-2026-07-01T10-00-aaaa.jsonl"
cp "$FIXTURES_DIR/sample-gemini-project-b-session.jsonl" \
   "$FAKE_HOME/.gemini/tmp/project-beta/chats/session-2026-07-01T11-00-bbbb.jsonl"

OUTPUT_DIR="$TEST_DIR/output"
mkdir -p "$OUTPUT_DIR"

echo "── Run with --project=project-alpha ──"
HOME="$FAKE_HOME" python3 "$EXTRACTION_SCRIPT" \
  --source gemini --output-dir "$OUTPUT_DIR" --project=project-alpha --date 2026-07-01 \
  > "$TEST_DIR/filtered.log" 2>&1 || true

OUTPUT_FILE=$(find "$OUTPUT_DIR" -name "2026-07-01-gemini.md" | head -1)
if [ -n "$OUTPUT_FILE" ] && grep -q "project A content" "$OUTPUT_FILE"; then
  pass "filtered run includes project-alpha's own content"
else
  fail "filtered run missing project-alpha content entirely -- output file: ${OUTPUT_FILE:-none}"
fi

if [ -n "$OUTPUT_FILE" ] && grep -q "project B content" "$OUTPUT_FILE"; then
  fail "filtered run incorrectly includes project-beta content -- contamination not fixed"
else
  pass "filtered run correctly excludes project-beta content"
fi

# ── Gap 2: --project matching zero directories is graceful (no crash, no output) ──
echo "── Gap 2: Gemini --project with zero matching directories ──"
NOMATCH_OUT="$TEST_DIR/output-nomatch"; mkdir -p "$NOMATCH_OUT"
HOME="$FAKE_HOME" python3 "$EXTRACTION_SCRIPT" \
  --source gemini --output-dir "$NOMATCH_OUT" --project=zzz-nonexistent --date 2026-07-01 \
  > "$TEST_DIR/gemini-nomatch.log" 2>&1 || true
if ! grep -qi "Traceback" "$TEST_DIR/gemini-nomatch.log"; then
  pass "zero-match Gemini --project does not crash"
else
  fail "zero-match Gemini --project crashed -- see gemini-nomatch.log"
fi
if [ -z "$(find "$NOMATCH_OUT" -name '*-gemini.md' 2>/dev/null)" ]; then
  pass "zero-match Gemini --project writes no output file (graceful empty result)"
else
  fail "zero-match Gemini --project unexpectedly wrote an output file"
fi

# ── Gap 4: documented substring over-match limitation (ENH-044 §Out of Scope) ──
# 'project-alpha' is a substring of 'project-alpha-old', so the fragment match
# pulls BOTH. This is the KNOWN, documented limitation — the assertion PINS it
# (asserts it still over-matches) so that a future change to the match logic is
# a deliberate, visible decision rather than a silent behavior shift.
echo "── Gap 4: substring over-match (pinned limitation, not fixed) ──"
mkdir -p "$FAKE_HOME/.gemini/tmp/project-alpha-old/chats"
cp "$FIXTURES_DIR/sample-gemini-project-a-old-session.jsonl" \
   "$FAKE_HOME/.gemini/tmp/project-alpha-old/chats/session-2026-07-01T12-00-cccc.jsonl"
OVERMATCH_OUT="$TEST_DIR/output-overmatch"; mkdir -p "$OVERMATCH_OUT"
HOME="$FAKE_HOME" python3 "$EXTRACTION_SCRIPT" \
  --source gemini --output-dir "$OVERMATCH_OUT" --project=project-alpha --date 2026-07-01 \
  > "$TEST_DIR/overmatch.log" 2>&1 || true
OM_FILE=$(find "$OVERMATCH_OUT" -name "2026-07-01-gemini.md" | head -1)
if [ -n "$OM_FILE" ] && grep -q "project A content" "$OM_FILE" && grep -q "project A-OLD overmatch content" "$OM_FILE"; then
  pass "documents known limitation: --project=project-alpha over-matches project-alpha-old (plain substring match; ENH-044 out-of-scope to fix)"
else
  fail "over-match behavior CHANGED -- ENH-044's documented substring limitation no longer holds; treat as a deliberate-decision tripwire, not a silent pass"
fi

# ── Extra (ENH-044 signature contract): threading project_filter through the
# .pb path must not break Gemini extraction, even though .pb itself may not be
# filtered. Seeds a minimal .pb-shaped file with clean readable text so the
# fallback extractor exercises the .pb code path under a --project run. ──
echo "── Extra: project_filter threaded through the .pb path without breaking it ──"
mkdir -p "$FAKE_HOME/.gemini/antigravity/conversations"
printf 'the user asked that you have this content for the project and not that other thing\n' \
  > "$FAKE_HOME/.gemini/antigravity/conversations/conv-smoke.pb"
PB_OUT="$TEST_DIR/output-pb"; mkdir -p "$PB_OUT"
HOME="$FAKE_HOME" python3 "$EXTRACTION_SCRIPT" \
  --source gemini --output-dir "$PB_OUT" --project=project-alpha --date 2026-07-01 \
  > "$TEST_DIR/gemini-pb.log" 2>&1 || true
if ! grep -qiE "Traceback|unexpected keyword argument 'project_filter'|TypeError" "$TEST_DIR/gemini-pb.log"; then
  pass ".pb path accepts the new project_filter parameter without error (Task 6 Step 3 must add the param to extract_gemini_pb_sessions even if .pb is not filtered)"
else
  fail ".pb path broke when project_filter was threaded through -- extract_gemini_pb_sessions signature likely missing project_filter (see Task 6 Step 3/4 contract)"
fi

# ── Step 1 (ENH-044/ADR-062): foreign .pb content is excluded, not vacuously
# passed. First prove the fixture is real (unfiltered run must show its
# marker via the raw-heuristic fallback, since blackboxprotobuf is not
# installed in this environment) -- then prove --project excludes it. ──
echo "── Step 1: foreign .pb exclusion (fail-closed, ADR-062) ──"
cp "$FIXTURES_DIR/sample-gemini-foreign-conversation.pb" \
   "$FAKE_HOME/.gemini/antigravity/conversations/foreign-conversation.pb"

# No --date filter here: the foreign .pb fixture has no embedded epoch hint,
# so its session date falls back to file mtime (today's date), not the fake
# 2026-07-01 fixture date used elsewhere -- filtering by --date would hide it
# regardless of project scoping and make the baseline assertion meaningless.
# Output splits across a date-named subfolder per merged day (today's mtime
# date for this fixture, plus 2026-07-01 for the other fixtures already
# seeded above) -- search recursively across the whole output tree rather
# than picking a single file, or the wrong day's file could be checked.
PB_BASELINE_OUT="$TEST_DIR/output-pb-baseline"; mkdir -p "$PB_BASELINE_OUT"
HOME="$FAKE_HOME" python3 "$EXTRACTION_SCRIPT" \
  --source gemini --output-dir "$PB_BASELINE_OUT" \
  > "$TEST_DIR/gemini-pb-baseline.log" 2>&1 || true
if grep -rq "FOREIGN-PB-CONTENT-MARKER-9f3a" "$PB_BASELINE_OUT"; then
  pass "unfiltered baseline includes the foreign .pb fixture's content (fixture is real, not vacuous)"
else
  fail "unfiltered baseline did NOT include the foreign .pb fixture -- assertion below would pass vacuously; see gemini-pb-baseline.log"
fi

PB_FILTERED_OUT="$TEST_DIR/output-pb-filtered"; mkdir -p "$PB_FILTERED_OUT"
HOME="$FAKE_HOME" python3 "$EXTRACTION_SCRIPT" \
  --source gemini --output-dir "$PB_FILTERED_OUT" --project=project-alpha \
  > "$TEST_DIR/gemini-pb-filtered.log" 2>&1 || true
if ! grep -rq "FOREIGN-PB-CONTENT-MARKER-9f3a" "$PB_FILTERED_OUT"; then
  pass "filtered run (--project=project-alpha) excludes foreign .pb content"
else
  fail "filtered run incorrectly includes foreign .pb content -- fail-closed .pb scoping broken (ADR-062)"
fi
if grep -q "not attributable to project" "$TEST_DIR/gemini-pb-filtered.log"; then
  pass "filtered run prints a visible skip notice for excluded .pb sessions (never silent, ADR-062)"
else
  fail "filtered run excluded .pb content without a visible skip notice -- silent exclusion violates ADR-062"
fi

# ── Step 2 (ENH-044/ADR-062): hash-named ~/.gemini/tmp/ directories cannot
# fragment-match a human-readable --project string, so they are excluded the
# same fail-closed way. Prove the fixture is real (unfiltered baseline),
# then prove --project excludes it with a visible skip notice. ──
echo "── Step 2: hash-named directory exclusion (fail-closed, ADR-062) ──"
HASH_DIR="$FAKE_HOME/.gemini/tmp/26f813b7a1b2c3d4e5f6"
mkdir -p "$HASH_DIR/chats"
cp "$FIXTURES_DIR/sample-gemini-hashdir-session.jsonl" \
   "$HASH_DIR/chats/session-2026-07-01T13-00-dddd.jsonl"

HASH_BASELINE_OUT="$TEST_DIR/output-hashdir-baseline"; mkdir -p "$HASH_BASELINE_OUT"
HOME="$FAKE_HOME" python3 "$EXTRACTION_SCRIPT" \
  --source gemini --output-dir "$HASH_BASELINE_OUT" --date 2026-07-01 \
  > "$TEST_DIR/gemini-hashdir-baseline.log" 2>&1 || true
if grep -rq "HASHDIR unattributable content marker" "$HASH_BASELINE_OUT"; then
  pass "unfiltered baseline includes the hash-named directory's content (fixture is real, not vacuous)"
else
  fail "unfiltered baseline did NOT include the hash-dir fixture -- assertion below would pass vacuously; see gemini-hashdir-baseline.log"
fi

HASH_FILTERED_OUT="$TEST_DIR/output-hashdir-filtered"; mkdir -p "$HASH_FILTERED_OUT"
HOME="$FAKE_HOME" python3 "$EXTRACTION_SCRIPT" \
  --source gemini --output-dir "$HASH_FILTERED_OUT" --project=project-alpha --date 2026-07-01 \
  > "$TEST_DIR/gemini-hashdir-filtered.log" 2>&1 || true
if ! grep -rq "HASHDIR unattributable content marker" "$HASH_FILTERED_OUT"; then
  pass "filtered run (--project=project-alpha) excludes hash-named directory content"
else
  fail "filtered run incorrectly includes hash-named directory content -- fail-closed hash-dir scoping broken (ADR-062)"
fi
if grep -rq "project A content" "$HASH_FILTERED_OUT"; then
  pass "filtered run still includes project-alpha's own content alongside hash-dir exclusion"
else
  fail "filtered run lost project-alpha's own content -- hash-dir exclusion over-excluded"
fi
if grep -q "hash-named ~/.gemini/tmp/" "$TEST_DIR/gemini-hashdir-filtered.log"; then
  pass "filtered run prints a visible skip notice for excluded hash-named directories (never silent, ADR-062)"
else
  fail "filtered run excluded hash-dir content without a visible skip notice -- silent exclusion violates ADR-062"
fi

# ── Step 3 (ENH-044): don't pass vacuously. The two exclusion assertions
# above do NOT require blackboxprotobuf -- extract_gemini_pb_sessions()
# returns early on project_filter BEFORE any decode attempt (ADR-062), and
# the hash-dir exclusion lives in _filter_project_dirs(), which never touches
# .pb decoding at all. So no SKIP marker is needed for these assertions: on
# a machine where blackboxprotobuf IS installed, the same fixture bytes
# (invalid protobuf) still hit the decode-exception fallback path, keeping
# both the baseline and filtered assertions meaningful either way. ──

echo ""
echo "GEMINI-PROJECT-FILTER: $PASS passed, $FAIL failed (total: $((PASS + FAIL)))"
[ $FAIL -eq 0 ] && exit 0 || exit 1
