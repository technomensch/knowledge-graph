#!/bin/bash
# test-extraction-backup-recovery.sh — proves the two backup-recovery
# mechanisms added for ENH-043's first-run repair notice (Task 11):
#   (a) --claude-projects-dir lets run_extraction.py read from a restored
#       backup instead of the live ~/.claude/projects, without touching it.
#   (b) --source-root lets check_extraction_health.py report whether a
#       flagged date is repairable from a given backup directory.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
EXTRACTION_SCRIPT="$REPO_ROOT/core/scripts/run_extraction.py"
HEALTH_SCRIPT="$REPO_ROOT/core/scripts/check_extraction_health.py"

PASS=0
FAIL=0
pass() { echo "  PASS: $1"; PASS=$((PASS + 1)); }
fail() { echo "  FAIL: $1"; FAIL=$((FAIL + 1)); }

TEST_DIR=$(mktemp -d)
cleanup() { rm -rf "$TEST_DIR"; }
trap cleanup EXIT

echo "── (a) --claude-projects-dir reads from an override dir, not ~/.claude/projects ──"
FAKE_HOME="$TEST_DIR/fake-home"
REAL_LOOKING_PROJECT_DIR="$FAKE_HOME/.claude/projects/-Users-test-my-project"
mkdir -p "$REAL_LOOKING_PROJECT_DIR"
cat > "$REAL_LOOKING_PROJECT_DIR/live-session.jsonl" <<'EOF'
{"type":"user","uuid":"live-001","timestamp":"2026-07-01T09:00:00Z","message":{"role":"user","content":[{"type":"text","text":"This came from the live (default) directory."}]}}
EOF

BACKUP_DIR="$TEST_DIR/backup-projects/-Users-test-my-project"
mkdir -p "$BACKUP_DIR"
cat > "$BACKUP_DIR/backup-session.jsonl" <<'EOF'
{"type":"user","uuid":"backup-001","timestamp":"2026-07-01T09:00:00Z","message":{"role":"user","content":[{"type":"text","text":"This came from the restored backup directory."}]}}
EOF

OUTPUT_DIR="$TEST_DIR/output"
mkdir -p "$OUTPUT_DIR"

HOME="$FAKE_HOME" python3 "$EXTRACTION_SCRIPT" \
  --source claude --output-dir "$OUTPUT_DIR" --date 2026-07-01 \
  --claude-projects-dir "$TEST_DIR/backup-projects" \
  > "$TEST_DIR/override.log" 2>&1 || true

OUTPUT_FILE=$(find "$OUTPUT_DIR" -name "2026-07-01-claude.md" | head -1)
if [ -n "$OUTPUT_FILE" ] && grep -q "restored backup directory" "$OUTPUT_FILE"; then
  pass "--claude-projects-dir reads from the override directory"
else
  fail "expected content from the backup directory, output file: ${OUTPUT_FILE:-none}"
fi

if [ -n "$OUTPUT_FILE" ] && grep -q "live (default) directory" "$OUTPUT_FILE"; then
  fail "--claude-projects-dir incorrectly also pulled from the live directory"
else
  pass "--claude-projects-dir does not read from the live directory when overridden"
fi

echo "── (b) --source-root reports repairable vs needs-backup correctly ──"
CH="$TEST_DIR/chat-history"
mkdir -p "$CH/2026-07"

# A flagged (stale-header) file for a date that DOES have source in the backup.
cat > "$CH/2026-07/2026-07-05-claude.md" <<'EOF'
# Complete Chat Session Export

**Total Messages:** 2

### Message 1: User
**Timestamp:** 2026-07-05T09:00:00

**Content:**

only one message counted, header says 2

---
EOF

# A flagged (stale-header) file for a date with NO source anywhere.
cat > "$CH/2026-07/2026-07-06-claude.md" <<'EOF'
# Complete Chat Session Export

**Total Messages:** 2

### Message 1: User
**Timestamp:** 2026-07-06T09:00:00

**Content:**

only one message counted, header says 2, no source exists for this date

---
EOF

SOURCE_ROOT="$TEST_DIR/source-root-projects"
mkdir -p "$SOURCE_ROOT/-Users-test-my-project"
cat > "$SOURCE_ROOT/-Users-test-my-project/has-2026-07-05.jsonl" <<'EOF'
{"type":"user","uuid":"src-001","timestamp":"2026-07-05T09:00:00Z","message":{"role":"user","content":[{"type":"text","text":"source exists for this date"}]}}
EOF

REPORT=$(python3 "$HEALTH_SCRIPT" "$CH" --dates-only --source-root "$SOURCE_ROOT")

if echo "$REPORT" | grep -q "^2026-07-05	repairable$"; then
  pass "date with matching source in --source-root is reported repairable"
else
  fail "expected 2026-07-05 repairable, got: $REPORT"
fi

if echo "$REPORT" | grep -q "^2026-07-06	needs-backup$"; then
  pass "date with no matching source anywhere is reported needs-backup"
else
  fail "expected 2026-07-06 needs-backup, got: $REPORT"
fi

echo "── (b, continued) omitting --source-root keeps plain output unchanged ──"
PLAIN=$(python3 "$HEALTH_SCRIPT" "$CH" --dates-only)
if [ "$PLAIN" = "$(printf '2026-07-05\n2026-07-06')" ]; then
  pass "omitting --source-root produces the original unannotated date list"
else
  fail "expected plain unannotated dates, got: $PLAIN"
fi

echo ""
echo "BACKUP-RECOVERY: $PASS passed, $FAIL failed (total: $((PASS + FAIL)))"
[ $FAIL -eq 0 ] && exit 0 || exit 1
