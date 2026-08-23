#!/usr/bin/env bash
# fix-numbering-collision.sh — resolves a numbering collision reported by
# check-numbering-collision.sh. Renumbers the LATER-created entry (by first
# commit date) to the next free number in its sequence.
#
# Usage: fix-numbering-collision.sh <decisions|enhancements|issues> <number>
#
# This script MUTATES files. It is never invoked automatically from any
# hook — run it explicitly, then review the diff before committing, same as
# any other change. See ADR-067 § "Mechanism resolved 2026-08-23".
#
# Reference-rewrite policy: only a reference unambiguously scoped to the
# loser specifically is auto-rewritten (its own slug, for decisions — there
# is no safe automatic target at all for enhancements/issues, which have no
# slug to disambiguate loser from winner). Every other mention of the old ID
# — including the loser's own file body beyond its self-identity header — is
# reported under "AMBIGUOUS" for manual review, never guessed at.
# Scan scope: knowledge/ is scanned for both rewrite and ambiguity reporting;
# commands/, docs/, scripts/, mcp-server/, agents/, skills/, core/, and
# ROADMAP.md are scanned for ambiguity reporting ONLY (never rewritten) —
# a bounded, pragmatic set of the directories most likely to reference an ID,
# not an exhaustive repo-wide sweep.

set -euo pipefail

REPO_ROOT="${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"
AREA="${1:-}"
NUMBER="${2:-}"

if [ -z "$AREA" ] || [ -z "$NUMBER" ]; then
  echo "usage: $(basename "$0") <decisions|enhancements|issues> <number>" >&2
  exit 2
fi

case "$NUMBER" in
  ''|*[!0-9]*) echo "fix-numbering-collision: <number> must be a non-negative integer, got '$NUMBER'" >&2; exit 2 ;;
esac

# FIND_EXCLUDE must match check-numbering-collision.sh's companion-doc
# exemption exactly (currently: ADR-NNN-implementation-spec.md alongside the
# real ADR-NNN it documents, e.g. this repo's own ADR-067 pair) — without it,
# this script disagrees with the detector about what counts as a collision:
# it would "fix" a companion-doc pair the detector correctly calls clean, and
# refuse to fix a genuine collision the detector correctly flags (3-entries
# guard trips on decisions+companion+decisions). Both were reproduced during
# final review. Extend this list if new companion-doc suffix patterns appear.
case "$AREA" in
  decisions)    DIR="${REPO_ROOT}/knowledge/decisions";    ID_REGEX='^ADR-([0-9]+)-.*\.md$';  PREFIX="ADR";   PAD=3; FIND_EXCLUDE=(-not -iname '*-implementation-spec.md') ;;
  enhancements) DIR="${REPO_ROOT}/knowledge/enhancements"; ID_REGEX='^ENH-([0-9]+)$';         PREFIX="ENH";   PAD=3; FIND_EXCLUDE=() ;;
  issues)       DIR="${REPO_ROOT}/knowledge/issues";       ID_REGEX='^issue-([0-9]+)$';       PREFIX="issue"; PAD=0; FIND_EXCLUDE=() ;;
  *) echo "unknown area: $AREA (expected decisions|enhancements|issues)" >&2; exit 2 ;;
esac

pad_number() {
  local n="$1"
  if [ "$PAD" -gt 0 ]; then
    printf "%0${PAD}d" "$n"
  else
    printf "%d" "$n"
  fi
}

OLD_ID="${PREFIX}-$(pad_number "$((10#$NUMBER))")"

# --- Find every entry matching this number ---
MATCHES=()
while IFS= read -r path; do
  [ -n "$path" ] || continue
  base=$(basename "$path")
  id=$(printf '%s\n' "$base" | sed -nE "s/${ID_REGEX}/\\1/p")
  [ -n "$id" ] || continue
  [ "$((10#$id))" -eq "$((10#$NUMBER))" ] && MATCHES+=("$path")
done < <(find "$DIR" -maxdepth 1 "${FIND_EXCLUDE[@]+"${FIND_EXCLUDE[@]}"}" 2>/dev/null | sort)

if [ "${#MATCHES[@]}" -lt 2 ]; then
  echo "fix-numbering-collision: no collision found for ${OLD_ID} (found ${#MATCHES[@]} match(es))" >&2
  exit 1
fi
if [ "${#MATCHES[@]}" -gt 2 ]; then
  echo "fix-numbering-collision: ${#MATCHES[@]} entries claim ${OLD_ID} — this script resolves one pair at a time. Resolve manually or re-run after fixing one pair." >&2
  exit 1
fi

# --- Tie-break: earlier first-commit date wins, keeps the number ---
# `|| true` guards each call: set -o pipefail means a non-git REPO_ROOT (git
# log exits 128) would otherwise abort the whole script here under set -e,
# with no output — this makes that case fall through to the empty-epoch
# default below instead of dying silently.
first_commit_epoch() {
  local path="$1" rel
  rel="${path#"$REPO_ROOT"/}"
  git -C "$REPO_ROOT" log --diff-filter=A --follow --format=%at -- "$rel" 2>/dev/null | tail -1
}

EPOCH_A=$(first_commit_epoch "${MATCHES[0]}") || true
EPOCH_B=$(first_commit_epoch "${MATCHES[1]}") || true

# Entries never committed (working-tree only) sort last — treat missing epoch as "now".
[ -z "$EPOCH_A" ] && EPOCH_A=9999999999
[ -z "$EPOCH_B" ] && EPOCH_B=9999999999

if [ "$EPOCH_A" -le "$EPOCH_B" ]; then
  WINNER="${MATCHES[0]}"
  LOSER="${MATCHES[1]}"
else
  WINNER="${MATCHES[1]}"
  LOSER="${MATCHES[0]}"
fi

# --- Compute next free number in this sequence ---
MAX=0
while IFS= read -r path; do
  [ -n "$path" ] || continue
  base=$(basename "$path")
  id=$(printf '%s\n' "$base" | sed -nE "s/${ID_REGEX}/\\1/p")
  [ -n "$id" ] || continue
  n=$((10#$id))
  [ "$n" -gt "$MAX" ] && MAX="$n"
done < <(find "$DIR" -maxdepth 1 "${FIND_EXCLUDE[@]+"${FIND_EXCLUDE[@]}"}" 2>/dev/null)

NEW_NUM=$((MAX + 1))
NEW_ID="${PREFIX}-$(pad_number "$NEW_NUM")"

# Tied timestamps are real (e.g. both colliding files added in the same
# commit) — WINNER is then chosen only by find|sort order, not chronology.
# Say so honestly rather than claiming "(earlier)" when it isn't.
if [ "$EPOCH_A" -eq "$EPOCH_B" ]; then
  TIE_NOTE="(tie — arbitrary, kept alphabetically-first)"
else
  TIE_NOTE="(earlier)"
fi

echo "fix-numbering-collision: ${OLD_ID} collision — keeping $(basename "$WINNER") ${TIE_NOTE}, renumbering $(basename "$LOSER") to ${NEW_ID}"

# --- Rename the loser ---
# Rebuild the new basename from the regex capture groups, not from a literal
# OLD_ID substring replace — a literal replace silently no-ops (and the
# `mv a a` fallback below would then "succeed" while renaming nothing) if the
# loser's actual on-disk padding doesn't match OLD_ID's canonical padded form
# (e.g. a malformed "ADR-14-x.md" next to a canonical "ADR-014-y.md").
LOSER_BASE=$(basename "$LOSER")
case "$AREA" in
  decisions)
    SLUG_TAIL=$(printf '%s\n' "$LOSER_BASE" | sed -nE 's/^ADR-[0-9]+-(.*)\.md$/\1/p')
    NEW_BASE="ADR-$(pad_number "$NEW_NUM")-${SLUG_TAIL}.md"
    ;;
  enhancements) NEW_BASE="ENH-$(pad_number "$NEW_NUM")" ;;
  issues)       NEW_BASE="issue-${NEW_NUM}" ;;
esac
NEW_PATH="${DIR}/${NEW_BASE}"

if [ "$NEW_PATH" = "$LOSER" ]; then
  echo "fix-numbering-collision: internal error — computed new path is identical to the old path ($NEW_PATH), refusing to proceed" >&2
  exit 1
fi
if [ -e "$NEW_PATH" ]; then
  echo "fix-numbering-collision: refusing to overwrite existing path $NEW_PATH" >&2
  exit 1
fi

git -C "$REPO_ROOT" mv "$LOSER" "$NEW_PATH" 2>/dev/null || mv "$LOSER" "$NEW_PATH"
if [ ! -e "$NEW_PATH" ]; then
  echo "fix-numbering-collision: rename failed — $NEW_PATH does not exist after mv" >&2
  exit 1
fi

# Best-effort cleanup if a later step in this script dies mid-sed (set -e).
# Tracks the exact .bak paths this run creates rather than sweeping
# knowledge/ for any file named *.bak — a blanket sweep was tried and found,
# via re-review, to delete this repo's own 29 pre-existing, untracked,
# gitignored .bak files under knowledge/sessions/ on every run, silently and
# unrecoverably (gitignored means no git history to restore from).
BAK_FILES=()
cleanup_bak_files() {
  local f
  for f in "${BAK_FILES[@]+"${BAK_FILES[@]}"}"; do
    rm -f "$f"
  done
}
trap cleanup_bak_files EXIT

# --- The loser's own self-identity header is NOT auto-rewritten -----------
# Two different auto-rewrite attempts were tried here and both proved unsafe
# via review: a blanket file-wide rewrite corrupted body mentions correctly
# pointing at the WINNER (e.g. "builds on ADR-014 (winner)" silently became
# a dangling ADR-015 reference); a line-1-only rewrite (assuming a
# "# ADR-NNN: Title" convention on line 1) turned out wrong for most real
# files — the majority of this repo's ADRs carry their identity in YAML
# frontmatter starting on line 2, and issue/ inner files have no line-1
# identity at all, so the "fix" silently missed them. There is no format
# assumption that holds safely across every file shape, so this script makes
# none: the renamed file is scanned by the same ambiguous-mention pass below
# as every other file, and ANY leftover OLD_ID mention in it — including its
# own header — surfaces under AMBIGUOUS for a human to update by hand. Never
# wrong, at the cost of one manual edit the tool already tells you about.

# --- Rename inner files for directory-based areas (enhancements/issues) ---
# These have no slug, so their inner files are named <PREFIX>-<NNN>-<suffix>
# (e.g. issue-14-description.md) — renaming them keeps pre-push-gate.sh's
# Gate 5 backlink check (which resolves paths by exact <ref>/<ref>-*.md) working.
# Content self-identity (if any) is left for the ambiguous scan, same
# rationale as the decisions case above.
#
# Match each inner file's OWN on-disk number via regex, not a literal
# "${OLD_ID}-" prefix string — the outer directory's number can be malformed
# padding (that's the whole point of this fix: ENH-14/ collides with ENH-014/
# on number, not on padded string). A prior revision matched the literal
# OLD_ID (canonical padding) and silently missed the malformed case entirely
# — reproduced via final review: ENH-14/'s own ENH-14-specification.md was
# neither renamed nor rewritten, leaving ENH-015/ENH-14-specification.md on
# disk and breaking Gate 5's exact-path backlink resolution silently.
if [ "$AREA" != "decisions" ] && [ -d "$NEW_PATH" ]; then
  INNER_REGEX="^${PREFIX}-([0-9]+)-(.*)\$"
  while IFS= read -r inner; do
    [ -n "$inner" ] || continue
    inner_base=$(basename "$inner")
    inner_num=$(printf '%s\n' "$inner_base" | sed -nE "s/${INNER_REGEX}/\\1/p")
    inner_suffix=$(printf '%s\n' "$inner_base" | sed -nE "s/${INNER_REGEX}/\\2/p")
    [ -n "$inner_num" ] || continue
    [ "$((10#$inner_num))" -eq "$((10#$NUMBER))" ] || continue
    new_inner_base="${NEW_ID}-${inner_suffix}"
    mv "$inner" "${NEW_PATH}/${new_inner_base}"
  done < <(find "$NEW_PATH" -maxdepth 1 -type f 2>/dev/null)
fi

# --- Rewrite only references unambiguously scoped to the LOSER, never the ---
# --- winner (which keeps OLD_ID) or an ambiguous bare mention ------------
#
# After this fix, OLD_ID still belongs to $WINNER. A bare mention like
# "see ADR-014" elsewhere could mean the winner (still correctly ADR-014) or
# the just-renumbered loser — there is no mechanical way to tell which, so
# bare mentions are reported for manual review, never auto-rewritten. Only
# rewrite targets that are unique to the loser specifically:
#   - decisions: the loser's own slug (e.g. "ADR-014-alpha") is unique to it —
#     the winner has a different slug, so this substring can't hit the winner.
#   - enhancements/issues (no slug — directory name IS the bare ID): there is
#     NO safe automatic rewrite target. A path-qualified form like "ENH-014/"
#     is NOT unique to the loser — the WINNER keeps that exact same path
#     after this fix, so blindly rewriting it corrupts any reference that
#     correctly pointed at the winner. (An earlier revision of this script
#     treated the path-qualified form as safe and was found, via task review,
#     to silently rewrite a winner-pointing reference into the loser's new
#     location — real, reproduced corruption, not a hypothetical.) Every
#     mention — path-qualified or bare — is reported as ambiguous instead.
case "$AREA" in
  decisions)
    LOSER_SUFFIX_NOEXT="${SLUG_TAIL}"                # e.g. "alpha", set above when NEW_BASE was built
    OLD_REF="${OLD_ID}-${LOSER_SUFFIX_NOEXT}"        # e.g. "ADR-014-alpha" — unique to the loser
    NEW_REF="${NEW_ID}-${LOSER_SUFFIX_NOEXT}"        # e.g. "ADR-015-alpha"
    # Trailing exclusion keeps "/" and "-" out of what counts as ambiguous,
    # since both are already covered by the safe OLD_REF rewrite above.
    AMBIGUOUS_REGEX="(^|[^0-9-])${OLD_ID}([^0-9/-]|\$)"
    ;;
  enhancements|issues)
    OLD_REF=""
    NEW_REF=""
    # No "/" exclusion here — unlike decisions, a trailing "/" (path-qualified
    # form) is NOT handled by a safe rewrite for these two areas, so it must
    # be caught by the ambiguous scan too, not skipped.
    AMBIGUOUS_REGEX="(^|[^0-9-])${OLD_ID}([^0-9-]|\$)"
    ;;
esac

REWRITTEN=0
AMBIGUOUS_HITS=""
while IFS= read -r ref_file; do
  [ -n "$ref_file" ] || continue
  [ -f "$ref_file" ] || continue

  # Safe rewrite runs on every file, including the winner's own — the winner
  # can legitimately contain a slug-qualified cross-reference TO the loser
  # (e.g. "see ADR-014-alpha for background" inside the winner's own file),
  # which still needs updating even though the winner's own identity doesn't.
  if [ -n "$OLD_REF" ] && grep -qF "$OLD_REF" "$ref_file" 2>/dev/null; then
    ESCAPED_OLD_REF=$(printf '%s' "$OLD_REF" | sed 's/[][\.*^$/]/\\&/g')
    ESCAPED_NEW_REF=$(printf '%s' "$NEW_REF" | sed 's/[][\.*^$/]/\\&/g')
    BAK_FILES+=("${ref_file}.bak")
    sed -i.bak "s@${ESCAPED_OLD_REF}@${ESCAPED_NEW_REF}@g" "$ref_file"
    rm -f "${ref_file}.bak"
    REWRITTEN=$((REWRITTEN + 1))
  fi

  # Never flag the winner's own file (decisions) or anything inside the
  # winner's own directory (enhancements/issues) as ambiguous — its bare
  # self-reference to its own ID is correct and expected, not something
  # needing manual review. (Any actual cross-reference to the loser it
  # contained was already handled by the safe rewrite above, if present.)
  case "$ref_file" in
    "$WINNER"|"$WINNER"/*) continue ;;
  esac

  # Bare/path-qualified OLD_ID mentions not part of the safe target above are
  # ambiguous — report, never guess.
  if grep -qE "$AMBIGUOUS_REGEX" "$ref_file" 2>/dev/null; then
    AMBIGUOUS_HITS="${AMBIGUOUS_HITS}  - ${ref_file}
"
  fi
done < <(find "${REPO_ROOT}/knowledge" -type f -name '*.md' -not -path '*/knowledge/plans/*' 2>/dev/null)

# --- Ambiguous-only scan outside knowledge/ ---------------------------------
# The safe rewrite above is intentionally confined to knowledge/ (the only
# scope this design has been tested against). But IDs are also referenced
# from commands/, docs/, scripts/, mcp-server/, agents/, skills/, core/, and
# top-level docs like ROADMAP.md — leaving those silently dangling after a
# renumber with no warning contradicts this design's own "report what you
# can't safely rewrite" posture (final branch review flagged this directly).
# This pass only REPORTS, never rewrites, and is a bounded, pragmatic set of
# likely-reference locations, not an exhaustive whole-filesystem sweep.
EXTRA_SCAN_DIRS="commands docs scripts mcp-server agents skills core"
for extra_dir in $EXTRA_SCAN_DIRS; do
  [ -d "${REPO_ROOT}/${extra_dir}" ] || continue
  while IFS= read -r ref_file; do
    [ -n "$ref_file" ] || continue
    [ -f "$ref_file" ] || continue
    if grep -qE "$AMBIGUOUS_REGEX" "$ref_file" 2>/dev/null; then
      AMBIGUOUS_HITS="${AMBIGUOUS_HITS}  - ${ref_file}
"
    fi
  done < <(find "${REPO_ROOT}/${extra_dir}" -type f -not -path '*/node_modules/*' \( -name '*.md' -o -name '*.mdx' -o -name '*.ts' -o -name '*.sh' \) 2>/dev/null)
done
if [ -f "${REPO_ROOT}/ROADMAP.md" ] && grep -qE "$AMBIGUOUS_REGEX" "${REPO_ROOT}/ROADMAP.md" 2>/dev/null; then
  AMBIGUOUS_HITS="${AMBIGUOUS_HITS}  - ${REPO_ROOT}/ROADMAP.md
"
fi

echo "fix-numbering-collision: renamed to ${NEW_BASE}, rewrote unambiguous references in ${REWRITTEN} file(s). Review the diff before committing."
if [ -n "$AMBIGUOUS_HITS" ]; then
  echo "fix-numbering-collision: AMBIGUOUS — bare ${OLD_ID} mentions found outside a rewritten context (${OLD_ID} still belongs to $(basename "$WINNER") after this fix). Check by hand whether any of these actually meant the renumbered entry:"
  printf '%s' "$AMBIGUOUS_HITS"
fi
