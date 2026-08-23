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

mkdir -p knowledge/issues/issue-1
echo "See [[ADR-014-alpha]] for the related decision." >> knowledge/decisions/ADR-014-zulu.md
echo "Related: ADR-014 covers this." > knowledge/issues/issue-1/issue-1-description.md
git add . && git commit -q -m "add cross-references to ADR-014-alpha"

export CLAUDE_PROJECT_DIR="$REPO"
OUT=$("$FIX_SCRIPT" decisions 14 2>&1) || { echo "$OUT"; fail "fix script exited non-zero"; }

[ -f "knowledge/decisions/ADR-014-zulu.md" ] && pass "earlier entry (zulu) keeps ADR-014" || fail "zulu should still be ADR-014"
[ ! -f "knowledge/decisions/ADR-014-alpha.md" ] && pass "later entry (alpha) no longer at ADR-014" || fail "alpha should have been renumbered away from ADR-014"
[ -f "knowledge/decisions/ADR-015-alpha.md" ] && pass "later entry (alpha) renumbered to next free ADR-015" || fail "alpha should now be ADR-015-alpha.md"
grep -q "# ADR-015: Alpha decision" knowledge/decisions/ADR-015-alpha.md && pass "alpha's in-file header updated to ADR-015" || fail "alpha's header still says ADR-014"

grep -q "ADR-015-alpha" knowledge/decisions/ADR-014-zulu.md && pass "loser's slug-qualified wikilink rewritten to new ID" || fail "wikilink still points at old ADR-014-alpha"
grep -q "# ADR-014: Zulu decision" knowledge/decisions/ADR-014-zulu.md && pass "winner's own header untouched (not corrupted)" || fail "winner's header was incorrectly rewritten — this is the winner-corruption bug"
grep -q "Related: ADR-014 covers this" knowledge/issues/issue-1/issue-1-description.md && pass "ambiguous bare-ID mention left untouched (could mean the winner)" || fail "bare ADR-014 mention should NOT have been auto-rewritten — it's ambiguous"
printf '%s' "$OUT" | grep -q "AMBIGUOUS" && printf '%s' "$OUT" | grep -q "issue-1-description.md" && pass "fix script flags the ambiguous mention for manual review" || fail "fix script should report issue-1-description.md as needing manual review, got: $OUT"
printf '%s' "$OUT" | grep -q "^  - .*ADR-014-zulu.md" && fail "winner's own file should NOT be in the ambiguous bulleted list — it's a correct, expected self-reference" || pass "winner's own file is excluded from the ambiguous report's bulleted list"

# --- Enhancements/issues have NO slug to disambiguate loser from winner, so
# --- a path-qualified reference is NOT safe to auto-rewrite (the winner keeps
# --- that exact path too). This reproduces the real corruption a task review
# --- found in an earlier revision: a THIRD file correctly referencing the
# --- winner via its path must be left untouched and reported ambiguous,
# --- never silently repointed at the loser's new location.
REPO5="$(mktemp -d)"
(
  cd "$REPO5"
  git init -q
  git config user.email test@test.com
  git config user.name test
  mkdir -p knowledge/enhancements/ENH-014 knowledge/enhancements/ENH-14 knowledge/issues/issue-1
  echo "spec for winner" > knowledge/enhancements/ENH-014/ENH-014-specification.md
  git add . && GIT_AUTHOR_DATE="2024-01-01T00:00:00" GIT_COMMITTER_DATE="2024-01-01T00:00:00" git commit -q -m "add ENH-014 (winner, earlier, canonical padding)"
  echo "spec for loser" > knowledge/enhancements/ENH-14/ENH-14-specification.md
  git add . && GIT_AUTHOR_DATE="2024-01-02T00:00:00" GIT_COMMITTER_DATE="2024-01-02T00:00:00" git commit -q -m "add ENH-14 (loser, later, malformed padding)"
  echo "See knowledge/enhancements/ENH-014/ENH-014-specification.md for the winner reference." > knowledge/issues/issue-1/issue-1-description.md
  git add . && git commit -q -m "add third-party reference to the winner"
)
ENH_OUT=$(CLAUDE_PROJECT_DIR="$REPO5" "$FIX_SCRIPT" enhancements 14 2>&1) || { echo "$ENH_OUT"; fail "fix script exited non-zero on enh collision"; }
grep -q "ENH-014/ENH-014-specification.md" "$REPO5/knowledge/issues/issue-1/issue-1-description.md" && pass "third-party reference to the winner's path is untouched (not corrupted)" || fail "third-party winner-path reference was incorrectly rewritten — this is the reproduced corruption bug"
printf '%s' "$ENH_OUT" | grep -q "AMBIGUOUS" && printf '%s' "$ENH_OUT" | grep -q "issue-1-description.md" && pass "enh path-qualified mention is flagged ambiguous instead of auto-rewritten" || fail "should report issue-1-description.md as ambiguous, got: $ENH_OUT"
rm -rf "$REPO5"

# --- Genuine tie: both colliding files added in the SAME commit, so they get
# --- identical author/committer timestamps naturally (no date-pinning trick
# --- needed) — this is a guaranteed real-world case (e.g. a copy-paste
# --- duplicate committed together), not a rare timing fluke. Asserts the
# --- output message is honest about the tie rather than falsely "(earlier)".
REPO3="$(mktemp -d)"
(
  cd "$REPO3"
  git init -q
  git config user.email test@test.com
  git config user.name test
  mkdir -p knowledge/decisions
  echo "# ADR-020: Zulu decision" > knowledge/decisions/ADR-020-zulu.md
  echo "# ADR-020: Alpha decision" > knowledge/decisions/ADR-020-alpha.md
  git add . && git commit -q -m "add both ADR-020 entries in one commit (genuine tie)"
)
TIE_OUT=$(CLAUDE_PROJECT_DIR="$REPO3" "$FIX_SCRIPT" decisions 20 2>&1) || { echo "$TIE_OUT"; fail "fix script exited non-zero on genuine tie"; }
printf '%s' "$TIE_OUT" | grep -q "tie" && pass "genuine-tie message says 'tie'" || fail "genuine-tie message should mention 'tie', got: $TIE_OUT"
printf '%s' "$TIE_OUT" | grep -q "(earlier)" && fail "genuine-tie message falsely claims '(earlier)'" || pass "genuine-tie message does not falsely claim '(earlier)'"
rm -rf "$REPO3"

# --- No collision: distinct numbers, script should refuse and exit 1 ---
REPO2="$(mktemp -d)"
mkdir -p "$REPO2/knowledge/decisions"
touch "$REPO2/knowledge/decisions/ADR-001-solo.md"
CLAUDE_PROJECT_DIR="$REPO2" "$FIX_SCRIPT" decisions 1 >/tmp/fix-out2.$$ 2>&1 && fail "should exit 1 for no collision" || pass "no-collision case exits 1"
grep -q "no collision found" /tmp/fix-out2.$$ && pass "no-collision message is clear" || fail "no-collision message missing"
rm -rf "$REPO2" /tmp/fix-out2.$$

# --- >2 matches: three entries claim the same number, script should refuse ---
REPO4="$(mktemp -d)"
mkdir -p "$REPO4/knowledge/decisions"
touch "$REPO4/knowledge/decisions/ADR-030-a.md" "$REPO4/knowledge/decisions/ADR-030-b.md" "$REPO4/knowledge/decisions/ADR-030-c.md"
OUT4=$(CLAUDE_PROJECT_DIR="$REPO4" "$FIX_SCRIPT" decisions 30 2>&1) && fail "should exit 1 for >2 matches" || pass ">2-matches case exits 1"
printf '%s' "$OUT4" | grep -q "3 entries claim" && pass ">2-matches message names the count" || fail ">2-matches message should name the count, got: $OUT4"
rm -rf "$REPO4"

exit $FAIL
