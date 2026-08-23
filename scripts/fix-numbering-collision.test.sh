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
# Self-identity headers are intentionally NOT auto-rewritten (no file-format
# assumption is safe across every real shape — see the script's own comment
# at the rename site) — the header stays as-is, and the renamed file is
# expected to surface under AMBIGUOUS instead, checked further below.
grep -q "# ADR-014: Alpha decision" knowledge/decisions/ADR-015-alpha.md && pass "alpha's header is left untouched, not guessed at" || fail "alpha's header should remain unchanged (self-identity rewrite is intentionally not attempted)"
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

# --- Prefix-overlapping slugs: winner's slug starts with the loser's slug ---
# (e.g. winner "ADR-014-alpha-extended", loser "ADR-014-alpha") — an
# unanchored substring match on the loser's slug would corrupt the winner's
# own identity and any third-party reference to it. Real shape: this repo
# already has prefix-overlapping ADR slugs (ADR-036/ADR-052). Reproduced by
# an independent review as a Critical corruption bug; asserted here.
REPO8="$(mktemp -d)"
(
  cd "$REPO8"
  git init -q
  git config user.email test@test.com
  git config user.name test
  mkdir -p knowledge/decisions knowledge/notes
  printf '# ADR-014: Alpha Extended decision\nCanonical path: knowledge/decisions/ADR-014-alpha-extended.md\n' > knowledge/decisions/ADR-014-alpha-extended.md
  git add . && GIT_AUTHOR_DATE="2024-01-01T00:00:00" GIT_COMMITTER_DATE="2024-01-01T00:00:00" git commit -q -m "winner: alpha-extended (earlier)"
  echo "# ADR-014: Alpha decision" > knowledge/decisions/ADR-014-alpha.md
  git add . && GIT_AUTHOR_DATE="2024-01-02T00:00:00" GIT_COMMITTER_DATE="2024-01-02T00:00:00" git commit -q -m "loser: alpha (later)"
  echo "Winner ref: ADR-014-alpha-extended.md" > knowledge/notes/ref.md
  git add . && git commit -q -m "add third-party ref to winner"
)
CLAUDE_PROJECT_DIR="$REPO8" "$FIX_SCRIPT" decisions 14 >/tmp/fix-out8.$$ 2>&1 || { cat /tmp/fix-out8.$$; fail "fix script exited non-zero on prefix-overlap fixture"; }
grep -q "Canonical path: knowledge/decisions/ADR-014-alpha-extended.md" "$REPO8/knowledge/decisions/ADR-014-alpha-extended.md" && pass "winner's own file untouched despite loser's slug being its prefix" || fail "winner's own file was corrupted by an unanchored prefix match — the reproduced Critical bug"
grep -q "Winner ref: ADR-014-alpha-extended.md" "$REPO8/knowledge/notes/ref.md" && pass "third-party reference to the winner untouched despite prefix overlap" || fail "third-party winner reference was corrupted by an unanchored prefix match"
rm -rf "$REPO8" /tmp/fix-out8.$$

# --- Extra-scan (outside knowledge/) must catch slug-qualified references, ---
# --- not just bare ones — the report-only scan has no safe-rewrite pass to
# --- lean on, so nothing there should be silently excluded.
REPO9="$(mktemp -d)"
mkdir -p "$REPO9/knowledge/decisions" "$REPO9/docs"
touch "$REPO9/knowledge/decisions/ADR-070-zulu.md"
touch "$REPO9/knowledge/decisions/ADR-070-alpha.md"
echo "See ADR-070-alpha for the decision." > "$REPO9/docs/guide.md"
OUT9=$(CLAUDE_PROJECT_DIR="$REPO9" "$FIX_SCRIPT" decisions 70 2>&1) || { echo "$OUT9"; fail "fix script exited non-zero on extra-scan slug-qualified fixture"; }
printf '%s' "$OUT9" | grep -q "docs/guide.md" && pass "slug-qualified reference outside knowledge/ is flagged ambiguous" || fail "expected docs/guide.md to be reported ambiguous, got: $OUT9"
rm -rf "$REPO9"

# --- Malformed-padding loser must be caught by the ambiguous scan even ---
# --- though its leftover mentions use its own on-disk (non-canonical) form.
REPO10="$(mktemp -d)"
mkdir -p "$REPO10/knowledge/enhancements/ENH-080" "$REPO10/knowledge/enhancements/ENH-80" "$REPO10/knowledge/notes"
echo "spec for winner" > "$REPO10/knowledge/enhancements/ENH-080/ENH-080-specification.md"
printf 'id: ENH-80\n# ENH-80: Loser\n' > "$REPO10/knowledge/enhancements/ENH-80/ENH-80-specification.md"
echo "points at loser dir: knowledge/enhancements/ENH-80/" > "$REPO10/knowledge/notes/r.md"
OUT10=$(CLAUDE_PROJECT_DIR="$REPO10" "$FIX_SCRIPT" enhancements 80 2>&1) || { echo "$OUT10"; fail "fix script exited non-zero on malformed-padding fixture"; }
printf '%s' "$OUT10" | grep -q "ENH-081-specification.md\|ENH-081$" && pass "malformed-padding loser's own renamed inner file is flagged ambiguous" || true
[ -f "$REPO10/knowledge/enhancements/ENH-081/ENH-081-specification.md" ] && printf '%s' "$OUT10" | grep -q "ENH-081-specification.md" && pass "malformed-padding loser's leftover self-identity is flagged ambiguous" || fail "expected the renamed inner file to be flagged ambiguous, got: $OUT10"
printf '%s' "$OUT10" | grep -q "notes/r.md" && pass "third-party reference to the malformed-padding loser's old path is flagged ambiguous" || fail "expected knowledge/notes/r.md to be reported ambiguous, got: $OUT10"
rm -rf "$REPO10"

# --- A companion doc (excluded from collision detection) has ambiguous ---
# --- ownership between winner and loser — must be surfaced, not silent.
REPO11="$(mktemp -d)"
(
  cd "$REPO11"
  git init -q
  git config user.email test@test.com
  git config user.name test
  mkdir -p knowledge/decisions
  echo "# ADR-090: Zulu" > knowledge/decisions/ADR-090-zulu.md
  git add . && GIT_AUTHOR_DATE="2024-01-01T00:00:00" GIT_COMMITTER_DATE="2024-01-01T00:00:00" git commit -q -m "winner"
  echo "# ADR-090: Alpha" > knowledge/decisions/ADR-090-alpha.md
  git add . && GIT_AUTHOR_DATE="2024-01-02T00:00:00" GIT_COMMITTER_DATE="2024-01-02T00:00:00" git commit -q -m "loser"
  echo "# Implementation spec for ADR-090-alpha" > knowledge/decisions/ADR-090-implementation-spec.md
  git add . && git commit -q -m "companion doc"
)
OUT11=$(CLAUDE_PROJECT_DIR="$REPO11" "$FIX_SCRIPT" decisions 90 2>&1) || { echo "$OUT11"; fail "fix script exited non-zero on companion-doc-ownership fixture"; }
printf '%s' "$OUT11" | grep -q "COMPANION DOC" && printf '%s' "$OUT11" | grep -q "ADR-090-implementation-spec.md" && pass "companion doc with ambiguous winner/loser ownership is flagged" || fail "expected a COMPANION DOC note naming ADR-090-implementation-spec.md, got: $OUT11"
rm -rf "$REPO11"

# --- Sed metacharacters in a slug (&, @) must not corrupt or crash --------
REPO12="$(mktemp -d)"
(
  cd "$REPO12"
  git init -q
  git config user.email test@test.com
  git config user.name test
  mkdir -p knowledge/decisions
  echo "# ADR-095: Zulu" > knowledge/decisions/ADR-095-zulu.md
  git add . && GIT_AUTHOR_DATE="2024-01-01T00:00:00" GIT_COMMITTER_DATE="2024-01-01T00:00:00" git commit -q -m "winner"
  echo "# ADR-095: A and B" > "knowledge/decisions/ADR-095-a&b.md"
  git add . && GIT_AUTHOR_DATE="2024-01-02T00:00:00" GIT_COMMITTER_DATE="2024-01-02T00:00:00" git commit -q -m "loser"
  printf 'ref: ADR-095-a&b.md\ndecoy: ADR-095-aXb.md should not match\n' > knowledge/decisions/ADR-095-zulu.md
  git add . && git commit -q -m "add ref with ampersand slug"
)
OUT12=$(CLAUDE_PROJECT_DIR="$REPO12" "$FIX_SCRIPT" decisions 95 2>&1) || { echo "$OUT12"; fail "fix script exited non-zero on ampersand-slug fixture"; }
grep -q "^ref: ADR-096-a&b.md$" "$REPO12/knowledge/decisions/ADR-095-zulu.md" && pass "ampersand in slug rewritten correctly, no whole-match corruption" || fail "ampersand in slug corrupted the rewrite"
grep -q "decoy: ADR-095-aXb.md should not match" "$REPO12/knowledge/decisions/ADR-095-zulu.md" && pass "unrelated decoy slug left untouched" || fail "decoy slug should not have been touched"
rm -rf "$REPO12"

# --- ERE metacharacters in a slug (+) must still be matched literally ------
# "+" is an ERE quantifier (unlike BRE); an escape helper covering only the
# BRE set made the safe rewrite silently fail to match "c++" — and a later
# fix attempt put "[" directly before "." in the bracket expression, forming
# the POSIX collating-symbol opener "[." which unbalanced the expression and
# killed the whole script under set -e mid-run. Both asserted here.
REPO13="$(mktemp -d)"
(
  cd "$REPO13"
  git init -q
  git config user.email test@test.com
  git config user.name test
  mkdir -p knowledge/decisions
  echo "# ADR-097: Zulu" > knowledge/decisions/ADR-097-zulu.md
  git add . && GIT_AUTHOR_DATE="2024-01-01T00:00:00" GIT_COMMITTER_DATE="2024-01-01T00:00:00" git commit -q -m "winner"
  echo "# ADR-097: C plus plus" > "knowledge/decisions/ADR-097-c++.md"
  git add . && GIT_AUTHOR_DATE="2024-01-02T00:00:00" GIT_COMMITTER_DATE="2024-01-02T00:00:00" git commit -q -m "loser"
  printf 'ref: ADR-097-c++.md\ndecoy: ADR-097-cxx.md untouched\n' > knowledge/decisions/ADR-097-zulu.md
  git add . && git commit -q -m "add ref with ERE-metachar slug"
)
OUT13=$(CLAUDE_PROJECT_DIR="$REPO13" "$FIX_SCRIPT" decisions 97 2>&1) || { echo "$OUT13"; fail "fix script crashed on ERE-metachar slug (script must not die mid-run)"; }
grep -q "^ref: ADR-098-c++.md$" "$REPO13/knowledge/decisions/ADR-097-zulu.md" && pass "ERE-metachar slug (+) matched literally and rewritten" || fail "slug containing + was not rewritten — ERE escaping regression"
grep -q "decoy: ADR-097-cxx.md untouched" "$REPO13/knowledge/decisions/ADR-097-zulu.md" && pass "ERE-metachar decoy not over-matched" || fail "+ was treated as a quantifier and over-matched the decoy"
rm -rf "$REPO13"

# --- Adjacent references separated by one boundary char must ALL be caught -
# (sed consumes the boundary on each match, so alternating occurrences
# escape a single pass — the script runs the substitution twice).
REPO14="$(mktemp -d)"
(
  cd "$REPO14"
  git init -q
  git config user.email test@test.com
  git config user.name test
  mkdir -p knowledge/decisions
  echo "# ADR-098: Zulu" > knowledge/decisions/ADR-098-zulu.md
  git add . && GIT_AUTHOR_DATE="2024-01-01T00:00:00" GIT_COMMITTER_DATE="2024-01-01T00:00:00" git commit -q -m "winner"
  echo "# ADR-098: Alpha" > knowledge/decisions/ADR-098-alpha.md
  git add . && GIT_AUTHOR_DATE="2024-01-02T00:00:00" GIT_COMMITTER_DATE="2024-01-02T00:00:00" git commit -q -m "loser"
  printf 'refs: ADR-098-alpha ADR-098-alpha ADR-098-alpha ADR-098-alpha\n' > knowledge/decisions/ADR-098-zulu.md
  git add . && git commit -q -m "add four adjacent refs"
)
CLAUDE_PROJECT_DIR="$REPO14" "$FIX_SCRIPT" decisions 98 >/dev/null 2>&1 || fail "fix script exited non-zero on adjacent-refs fixture"
REMAINING=$(grep -c "ADR-098-alpha" "$REPO14/knowledge/decisions/ADR-098-zulu.md" || true)
[ "$REMAINING" -eq 0 ] && pass "all four adjacent references rewritten (two-pass sed)" || fail "$REMAINING adjacent reference(s) missed by the rewrite — single-pass sed regression"
rm -rf "$REPO14"

exit $FAIL
