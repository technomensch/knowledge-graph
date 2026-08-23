#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FIX_SCRIPT="${SCRIPT_DIR}/fix-numbering-collision.sh"
FAIL=0
pass() { printf 'ok   - %s\n' "$1"; }
fail() { printf 'FAIL - %s\n' "$1"; FAIL=1; }

REPO="$(mktemp -d)"
trap 'rm -rf "$REPO"' EXIT
cd "$REPO"
git init -q
git config user.email test@test.com
git config user.name test
mkdir -p knowledge/decisions

# Fixture deliberately names the EARLIER-committed entry "zulu" (sorts last
# alphabetically) and the LATER-committed entry "alpha" (sorts first). If the
# tie-break logic were broken and silently fell back to array/sort order
# instead of actually comparing commit dates, this fixture would catch it —
# a fixture where alphabetical order matches chronological order would not.
#
# Commit dates are pinned explicitly (rather than relying on wall-clock time
# between the two `git commit` calls) because git's author-date timestamp has
# 1-second granularity: two commits made back-to-back in a script routinely
# land in the same second on a fast machine, which would make EPOCH_A ==
# EPOCH_B and silently degrade the tie-break to array/sort order — the exact
# failure mode this fixture exists to catch. Pinning dates makes the
# earlier/later relationship deterministic regardless of execution speed.
echo "# ADR-014: Zulu decision" > knowledge/decisions/ADR-014-zulu.md
git add . && GIT_AUTHOR_DATE="2024-01-01T00:00:00" GIT_COMMITTER_DATE="2024-01-01T00:00:00" git commit -q -m "add ADR-014-zulu (earlier)"

echo "# ADR-014: Alpha decision" > knowledge/decisions/ADR-014-alpha.md
git add . && GIT_AUTHOR_DATE="2024-01-02T00:00:00" GIT_COMMITTER_DATE="2024-01-02T00:00:00" git commit -q -m "add ADR-014-alpha (later)"

export CLAUDE_PROJECT_DIR="$REPO"
OUT=$("$FIX_SCRIPT" decisions 14 2>&1) || { echo "$OUT"; fail "fix script exited non-zero"; }

[ -f "knowledge/decisions/ADR-014-zulu.md" ] && pass "earlier entry (zulu) keeps ADR-014" || fail "zulu should still be ADR-014"
[ ! -f "knowledge/decisions/ADR-014-alpha.md" ] && pass "later entry (alpha) no longer at ADR-014" || fail "alpha should have been renumbered away from ADR-014"
[ -f "knowledge/decisions/ADR-015-alpha.md" ] && pass "later entry (alpha) renumbered to next free ADR-015" || fail "alpha should now be ADR-015-alpha.md"
grep -q "# ADR-015: Alpha decision" knowledge/decisions/ADR-015-alpha.md && pass "alpha's in-file header updated to ADR-015" || fail "alpha's header still says ADR-014"

# --- No collision: distinct numbers, script should refuse and exit 1 ---
REPO2="$(mktemp -d)"
mkdir -p "$REPO2/knowledge/decisions"
touch "$REPO2/knowledge/decisions/ADR-001-solo.md"
CLAUDE_PROJECT_DIR="$REPO2" "$FIX_SCRIPT" decisions 1 >/tmp/fix-out2.$$ 2>&1 && fail "should exit 1 for no collision" || pass "no-collision case exits 1"
grep -q "no collision found" /tmp/fix-out2.$$ && pass "no-collision message is clear" || fail "no-collision message missing"
rm -rf "$REPO2" /tmp/fix-out2.$$

exit $FAIL
