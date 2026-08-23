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

# The loser's own body (beyond its line-1 self-identity header) can
# legitimately mention the WINNER by bare ID — this must NOT be blanket-
# rewritten to the loser's own new ID (that would silently point it at
# itself, corrupting a reference that meant the winner). A prior revision
# did exactly that via a file-wide sed; reproduced and fixed via final
# branch review. This line must survive untouched, then be reported
# ambiguous (since bare "ADR-014" is inherently ambiguous post-fix).
echo "Builds on ADR-014 (the winner) for background." >> knowledge/decisions/ADR-014-alpha.md
git add . && git commit -q -m "add winner-mentioning body line to ADR-014-alpha"

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
grep -q "Builds on ADR-014 (the winner) for background." knowledge/decisions/ADR-015-alpha.md && pass "loser's own body mention of the winner is untouched (not blanket-rewritten)" || fail "loser's body mention of the winner was incorrectly rewritten — this is the reproduced corruption bug"
printf '%s' "$OUT" | grep -q "^  - .*ADR-015-alpha.md" && pass "loser's renamed file is itself flagged ambiguous for its own leftover bare mention" || fail "expected ADR-015-alpha.md to appear in the ambiguous list (it still bare-mentions ADR-014), got: $OUT"

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

# Inner-file rename must match the loser's ACTUAL on-disk (malformed) prefix
# "ENH-14-", not the canonical padded "ENH-014-" — a prior revision matched
# only the canonical form and silently left ENH-14-specification.md unrenamed
# and unrewritten inside the renamed ENH-015/ directory, reproduced by final
# branch review.
[ ! -f "$REPO5/knowledge/enhancements/ENH-015/ENH-14-specification.md" ] && pass "loser's malformed-padding inner file is no longer at its old name" || fail "ENH-14-specification.md should have been renamed"
[ -f "$REPO5/knowledge/enhancements/ENH-015/ENH-015-specification.md" ] && pass "loser's inner file renamed to match new canonical ID" || fail "expected knowledge/enhancements/ENH-015/ENH-015-specification.md to exist"
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

# --- Companion-doc exemption: fix script must agree with the detector about
# --- what counts as a collision. A prior revision lacked this exemption,
# --- reproduced via final branch review as two distinct bugs: fabricating a
# --- collision on a real companion-doc pair (this repo's own ADR-067 shape),
# --- and dead-ending on a genuine collision because a companion doc made the
# --- >2-matches guard trip. Both are asserted here.
REPO6="$(mktemp -d)"
mkdir -p "$REPO6/knowledge/decisions"
touch "$REPO6/knowledge/decisions/ADR-050-main.md" "$REPO6/knowledge/decisions/ADR-050-implementation-spec.md"
OUT6=$(CLAUDE_PROJECT_DIR="$REPO6" "$FIX_SCRIPT" decisions 50 2>&1) && fail "should exit 1 — companion doc is not a real collision" || pass "companion-doc pair alone is correctly refused as no collision"
printf '%s' "$OUT6" | grep -q "no collision found" && pass "companion-doc-only case gives the clear no-collision message" || fail "expected 'no collision found', got: $OUT6"
[ -f "$REPO6/knowledge/decisions/ADR-050-main.md" ] && [ -f "$REPO6/knowledge/decisions/ADR-050-implementation-spec.md" ] && pass "companion-doc pair left untouched on disk" || fail "companion-doc files should not have been renamed"

touch "$REPO6/knowledge/decisions/ADR-050-second.md"
OUT6B=$(CLAUDE_PROJECT_DIR="$REPO6" "$FIX_SCRIPT" decisions 50 2>&1) || { echo "$OUT6B"; fail "fix script should succeed: real collision (main vs second), companion doc excluded from the count"; }
printf '%s' "$OUT6B" | grep -q "renamed to" && pass "genuine collision alongside a companion doc is still resolved (companion doesn't trip the >2-matches guard)" || fail "expected a successful rename, got: $OUT6B"
rm -rf "$REPO6"

# --- Ambiguous reporting extends to a bounded set of non-knowledge/
# --- directories (commands/, docs/, scripts/, mcp-server/, agents/, skills/,
# --- core/, ROADMAP.md) — never rewritten there, only reported, since IDs
# --- are referenced from outside knowledge/ in the real repo and a silent
# --- dangling reference there defeats this design's "report what you can't
# --- safely rewrite" posture (final branch review finding).
REPO7="$(mktemp -d)"
mkdir -p "$REPO7/knowledge/decisions" "$REPO7/commands" "$REPO7/scripts"
touch "$REPO7/knowledge/decisions/ADR-060-zulu.md" "$REPO7/knowledge/decisions/ADR-060-alpha.md"
echo "See ADR-060 for the relevant decision." > "$REPO7/commands/some-command.md"
echo "# ADR-060 covers this check" > "$REPO7/scripts/some-check.sh"
OUT7=$(CLAUDE_PROJECT_DIR="$REPO7" "$FIX_SCRIPT" decisions 60 2>&1) || { echo "$OUT7"; fail "fix script exited non-zero on extra-scan-dirs fixture"; }
printf '%s' "$OUT7" | grep -q "some-command.md" && pass "bare mention in commands/ (outside knowledge/) is flagged ambiguous" || fail "expected commands/some-command.md to be reported ambiguous, got: $OUT7"
printf '%s' "$OUT7" | grep -q "some-check.sh" && pass "bare mention in scripts/ (outside knowledge/) is flagged ambiguous" || fail "expected scripts/some-check.sh to be reported ambiguous, got: $OUT7"
grep -q "See ADR-060 for the relevant decision." "$REPO7/commands/some-command.md" && pass "commands/ file is reported but never rewritten" || fail "commands/ file should never be mutated by this script"
rm -rf "$REPO7"

# --- >2 matches: three entries claim the same number, script should refuse ---
REPO4="$(mktemp -d)"
mkdir -p "$REPO4/knowledge/decisions"
touch "$REPO4/knowledge/decisions/ADR-030-a.md" "$REPO4/knowledge/decisions/ADR-030-b.md" "$REPO4/knowledge/decisions/ADR-030-c.md"
OUT4=$(CLAUDE_PROJECT_DIR="$REPO4" "$FIX_SCRIPT" decisions 30 2>&1) && fail "should exit 1 for >2 matches" || pass ">2-matches case exits 1"
printf '%s' "$OUT4" | grep -q "3 entries claim" && pass ">2-matches message names the count" || fail ">2-matches message should name the count, got: $OUT4"
rm -rf "$REPO4"

exit $FAIL
