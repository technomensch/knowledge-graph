#!/bin/bash
# test-extraction-discovery.sh — synthetic dry-run safety net for ENH-043's
# corrupted-file discovery (core/scripts/find_corrupted_chat_files.py).
# Proves the scanner flags stale-header-count and leftover-Session-N files,
# does NOT flag clean files, and skips .backup siblings — all against
# synthetic fixtures, so discovery is no longer only ever exercised against
# real production data.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DISCOVERY_SCRIPT="$REPO_ROOT/core/scripts/find_corrupted_chat_files.py"

PASS=0
FAIL=0
pass() { echo "  PASS: $1"; PASS=$((PASS + 1)); }
fail() { echo "  FAIL: $1"; FAIL=$((FAIL + 1)); }

TEST_DIR=$(mktemp -d)
cleanup() { rm -rf "$TEST_DIR"; }
trap cleanup EXIT

CH="$TEST_DIR/chat-history"
mkdir -p "$CH/2026-07"

# 1. Clean file: header count == actual, no Session-N block — must NOT be flagged.
cat > "$CH/2026-07/2026-07-01-claude.md" <<'EOF'
# Complete Chat Session Export

**Total Messages:** 2

### Message 1: User
**Timestamp:** 2026-07-01T09:00:00

**Content:**

hi

---

### Message 2: Assistant
**Timestamp:** 2026-07-01T09:00:05

**Content:**

hello

---
EOF

# 2. Stale header count (says 2, actually 1) — MUST be flagged.
cat > "$CH/2026-07/2026-07-02-claude.md" <<'EOF'
# Complete Chat Session Export

**Total Messages:** 2

### Message 1: User
**Timestamp:** 2026-07-02T09:00:00

**Content:**

only one message here

---
EOF

# 3. Leftover ## Session N block (header count happens to match) — MUST be flagged.
cat > "$CH/2026-07/2026-07-03-claude.md" <<'EOF'
# Complete Chat Session Export

**Total Messages:** 1

## Session 1 (Started: 090000)

### Message 1: User
**Timestamp:** 2026-07-03T09:00:00

**Content:**

leftover session block present

---
EOF

# 4. A .backup sibling of a flagged file — MUST be skipped.
cp "$CH/2026-07/2026-07-02-claude.md" "$CH/2026-07/2026-07-02-claude.md.backup"

REPORT=$(python3 "$DISCOVERY_SCRIPT" "$CH")

if echo "$REPORT" | grep -q "2026-07-02-claude.md"; then
  pass "flags a stale-header-count file"
else
  fail "did not flag the stale-header-count file"
fi

if echo "$REPORT" | grep -q "2026-07-03-claude.md"; then
  pass "flags a leftover ## Session N file"
else
  fail "did not flag the leftover Session-N file"
fi

if echo "$REPORT" | grep -q "2026-07-01-claude.md"; then
  fail "incorrectly flagged the clean file"
else
  pass "does not flag the clean file"
fi

if echo "$REPORT" | grep -q "\.backup"; then
  fail "scanned a .backup file (must be skipped)"
else
  pass "skips .backup siblings"
fi

if echo "$REPORT" | grep -q "=== 2 files flagged for rebuild ==="; then
  pass "header line reports exactly 2 flagged files"
else
  fail "header count line wrong: $(echo "$REPORT" | head -1)"
fi

# --dates-only emits just the YYYY-MM-DD list the repair loop consumes.
DATES=$(python3 "$DISCOVERY_SCRIPT" "$CH" --dates-only)
if [ "$DATES" = "$(printf '2026-07-02\n2026-07-03')" ]; then
  pass "--dates-only emits exactly the two flagged dates, sorted"
else
  fail "--dates-only mismatch: got [$DATES]"
fi

echo ""
echo "DISCOVERY: $PASS passed, $FAIL failed (total: $((PASS + FAIL)))"
[ $FAIL -eq 0 ] && exit 0 || exit 1
