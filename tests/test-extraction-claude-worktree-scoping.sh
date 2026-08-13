#!/bin/bash
# test-extraction-claude-worktree-scoping.sh — proves ENH-061 / ADR-062
# amendment: (1) an unscoped extraction (no --project) fails closed instead
# of silently merging every project on the machine, and (2) when --project
# does match more than one distinct working directory (e.g. a repo and one
# of its git worktrees), the run proceeds but prints a visible composition
# notice attributed via each session's own `cwd` field -- not by parsing
# ~/.claude/projects/ directory-name conventions, which are confirmed to be
# inconsistent across real machines.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
EXTRACTION_SCRIPT="$REPO_ROOT/core/scripts/run_extraction.py"

PASS=0
FAIL=0
pass() { echo "  PASS: $1"; PASS=$((PASS + 1)); }
fail() { echo "  FAIL: $1"; FAIL=$((FAIL + 1)); }

TEST_DIR=$(mktemp -d)
cleanup() { rm -rf "$TEST_DIR"; }
trap cleanup EXIT

FAKE_HOME="$TEST_DIR/fake-home"
MAIN_DIR="$FAKE_HOME/.claude/projects/-Users-fake-mainrepo"
WORKTREE_DIR="$FAKE_HOME/.claude/projects/-Users-fake-mainrepo--claude-worktrees-featurebranch"
mkdir -p "$MAIN_DIR" "$WORKTREE_DIR"

cat > "$MAIN_DIR/session-main.jsonl" << 'EOF'
{"type":"user","cwd":"/Users/fake/mainrepo","uuid":"main-001","timestamp":"2026-08-01T10:00:00Z","message":{"role":"user","content":[{"type":"text","text":"main repo content"}]}}
EOF

cat > "$WORKTREE_DIR/session-worktree.jsonl" << 'EOF'
{"type":"user","cwd":"/Users/fake/mainrepo/.claude/worktrees/featurebranch","uuid":"wt-001","timestamp":"2026-08-01T11:00:00Z","message":{"role":"user","content":[{"type":"text","text":"worktree content"}]}}
EOF

OUTPUT_DIR="$TEST_DIR/output"
mkdir -p "$OUTPUT_DIR"

# ── Test A: unscoped, non-interactive -> hard-stop, no output written ──────
echo "── Test A: unscoped extraction fails closed (non-interactive) ──"
set +e
HOME="$FAKE_HOME" python3 "$EXTRACTION_SCRIPT" \
  --source claude --output-dir "$OUTPUT_DIR" --date 2026-08-01 \
  < /dev/null > "$TEST_DIR/unscoped.log" 2>"$TEST_DIR/unscoped.err"
RESULT=$?
set -e
[ "$RESULT" -ne 0 ] && pass "unscoped run exits non-zero" || fail "unscoped run should have exited non-zero, got $RESULT"
grep -q "No --project given" "$TEST_DIR/unscoped.err" && pass "explains what would happen" || fail "missing explanation in stderr"
grep -q -- "--confirm-unscoped" "$TEST_DIR/unscoped.err" && pass "advises the escape hatch" || fail "missing --confirm-unscoped guidance"
[ -z "$(find "$OUTPUT_DIR" -name '*-claude.md' 2>/dev/null)" ] && pass "no output file written on hard-stop" || fail "output file was written despite hard-stop"

# ── Test B: unscoped + --confirm-unscoped -> proceeds, includes everything ─
echo "── Test B: --confirm-unscoped overrides the gate ──"
OUTPUT_DIR_B="$TEST_DIR/output-b"; mkdir -p "$OUTPUT_DIR_B"
set +e
HOME="$FAKE_HOME" python3 "$EXTRACTION_SCRIPT" \
  --source claude --output-dir "$OUTPUT_DIR_B" --date 2026-08-01 --confirm-unscoped \
  < /dev/null > "$TEST_DIR/confirmed.log" 2>&1
RESULT=$?
set -e
[ "$RESULT" -eq 0 ] && pass "--confirm-unscoped run exits 0" || fail "expected exit 0, got $RESULT"
OUT_B=$(find "$OUTPUT_DIR_B" -name "2026-08-01-claude.md" | head -1)
if [ -n "$OUT_B" ] && grep -q "main repo content" "$OUT_B" && grep -q "worktree content" "$OUT_B"; then
  pass "--confirm-unscoped includes both directories' content"
else
  fail "--confirm-unscoped run missing expected content -- file: ${OUT_B:-none}"
fi

# ── Test C: --project matches both directories -> proceeds + composition notice ─
echo "── Test C: --project matching 2 directories prints composition notice ──"
OUTPUT_DIR_C="$TEST_DIR/output-c"; mkdir -p "$OUTPUT_DIR_C"
set +e
HOME="$FAKE_HOME" python3 "$EXTRACTION_SCRIPT" \
  --source claude --output-dir "$OUTPUT_DIR_C" --date 2026-08-01 --project=fake-mainrepo \
  < /dev/null > "$TEST_DIR/scoped-multi.log" 2>&1
RESULT=$?
set -e
[ "$RESULT" -eq 0 ] && pass "--project matching multiple dirs still exits 0 (no hard-stop)" || fail "expected exit 0, got $RESULT"
OUT_C=$(find "$OUTPUT_DIR_C" -name "2026-08-01-claude.md" | head -1)
if [ -n "$OUT_C" ] && grep -q "main repo content" "$OUT_C" && grep -q "worktree content" "$OUT_C"; then
  pass "both directories' content included (not silently dropped)"
else
  fail "expected both directories' content -- file: ${OUT_C:-none}"
fi
grep -q "distinct working directories" "$TEST_DIR/scoped-multi.log" && pass "composition notice printed" || fail "expected composition notice, none found"
grep -q "/Users/fake/mainrepo/.claude/worktrees/featurebranch" "$TEST_DIR/scoped-multi.log" && pass "notice names the worktree's real cwd" || fail "notice should name the worktree's actual cwd path"

# ── Test D: --project matches exactly one directory -> no composition notice ─
echo "── Test D: --project matching exactly 1 directory prints no notice ──"
OUTPUT_DIR_D="$TEST_DIR/output-d"; mkdir -p "$OUTPUT_DIR_D"
set +e
HOME="$FAKE_HOME" python3 "$EXTRACTION_SCRIPT" \
  --source claude --output-dir "$OUTPUT_DIR_D" --date 2026-08-01 --project=featurebranch \
  < /dev/null > "$TEST_DIR/scoped-single.log" 2>&1
RESULT=$?
set -e
[ "$RESULT" -eq 0 ] && pass "single-match --project run exits 0" || fail "expected exit 0, got $RESULT"
OUT_D=$(find "$OUTPUT_DIR_D" -name "2026-08-01-claude.md" | head -1)
if [ -n "$OUT_D" ] && grep -q "worktree content" "$OUT_D" && ! grep -q "main repo content" "$OUT_D"; then
  pass "only the matched worktree's content included"
else
  fail "expected only worktree content -- file: ${OUT_D:-none}"
fi
if grep -q "distinct working directories" "$TEST_DIR/scoped-single.log"; then
  fail "unexpected composition notice for a single-directory match"
else
  pass "no composition notice for a single-directory match (no false positive)"
fi

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "RESULTS: $PASS passed, $FAIL failed"
echo "═══════════════════════════════════════════════════════════════"
[ "$FAIL" -eq 0 ] && exit 0 || exit 1
