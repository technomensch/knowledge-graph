# ENH-052: Solution Approach

**Status:** Proposed — sketch only, not scoped for implementation. The design is
an open question deliberately left to whoever picks this up.

## Candidate Directions (pick-one-later, not decided here)

### Option A — New self-referential "KG consistency" skill
A pre-ship skill that audits `knowledge/` against itself, distinct from
`kmg-docs-impact-scan` (which is diff-driven over prose). It would:
- Recompute each index README's item count from the folder listing and compare to
  the declared "Total" / "Last Updated" header.
- Sanity-check `status:` frontmatter (e.g. flag a `resolved` item whose branch is
  `none` and has no linked merge, or a `deferred` item that now has commits).
- Check backlink symmetry: for each `related`/cross-reference edge A→N, verify N→A
  exists where the convention expects it.
Reuses the existing pre-push flag-file plumbing (Gate 3) so a push knows the audit ran.

### Option B — New gates on `scripts/pre-push-gate.sh`
Add Gate 5 (index-count/date freshness) and Gate 6 (backlink symmetry) alongside
the existing Gate 2 (version sync) and Gate 4 (github-issue-sync). Advisory
injection, exits 0, same `additionalContext` channel as today. Lowest-surface-area
option — no new skill, extends a script that already owns pre-push invariants.

### Option C — Extend `kmg-docs-impact-scan`'s scope
Add index-freshness and backlink checks as a new finding category inside the
existing skill, rather than a parallel mechanism. Keeps everything in one
pre-ship surface, but strains the skill's current "diff-driven prose matching"
identity — it would gain a non-diff, whole-tree responsibility.

## Open Questions (resolve at pickup, not now)

- Advisory vs. blocking? Today's gates are advisory (inject-and-continue). Index
  drift may warrant a hard stop; status accuracy probably can't be mechanized
  hard and stays advisory/prompt.
- Which index families are in scope for v1: issues, enhancements, decisions,
  lessons-learned — all four, or start with the two most-edited (issues,
  enhancements)?
- Is `status:` accuracy mechanically checkable at all, or is it inherently a
  human-judgment prompt rather than a gate?
- Does backlink symmetry share a mechanism with index-count freshness, or is it a
  separate check with a different failure mode and different false-positive risk?

## Explicit Non-Goals of the Mechanism

- Does **not** cover Docusaurus link integrity (issue-13) or `commands/*.md`
  references (issue-26). Any implementation must state this scope boundary
  explicitly rather than let readers assume "consistency check" covers those too.
- Does **not** subsume ENH-042's release-doc version-sync reconciliation; that
  stays its own item, though a shared pre-push-gate home is plausible.

These are scoping decisions for implementation, not commitments made here.
