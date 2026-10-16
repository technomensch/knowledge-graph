# issue-61: Solution Approach

**Status:** Not decided. This document lays out options and trade-offs so the owner decisions in [the description](issue-61-description.md#decisions-needed) can be made quickly. Nothing here is a commitment.

## Goal

Keep the backlink-symmetry check useful for genuine relationships while removing the two behaviors that caused the 2026-10-16 cascade: treating every ID mention as a relationship, and re-checking a touched doc's entire legacy history.

## Design constraint inherited from the repo

Gates live in `scripts/pre-push-gate.sh` and are advisory (exit 0) per ADR-050. `scripts/` is dev-only and never ships to consumer repos, so any fix there only protects this repository. A consumer-facing equivalent would have to live in a shipped skill such as `kmg-paperwork-audit`.

## Options

### Option A: narrow what counts as a relationship

Extract references only from frontmatter `related_*` / `related-*` keys and the `## Related` section.

- Pro: removes the sample-list, history-citation and quoted-text false positives (24 of the 33 findings in the triggering run).
- Pro: small change to one grep pipeline.
- Con: docs that relate to each other only in prose are no longer checked. That may be correct (see Decision 1).
- Con: depends on docs consistently using a `## Related` heading and frontmatter keys. Older docs vary.

### Option B: only check references added by the branch

Run `git diff -U0 $MERGE_BASE HEAD` on the changed docs and extract IDs only from added lines.

- Pro: breaks the cascade. Touching a doc no longer surfaces its legacy asymmetry, so each fix stays local.
- Pro: compatible with Option A; together they are the recommended first step.
- Con: a reference that already exists but is edited (not added) is invisible. Acceptable, since the asymmetry predates the branch.
- Con: diff-line parsing is slightly more fragile than whole-file grep; it needs fixtures.

### Option C: cap, cluster and de-duplicate output

Group findings by changed doc, collapse transitive duplicates, and cap the printed list with a count of the remainder.

- Pro: readable output even if the volume is high.
- Con: treats the symptom. Does not stop generic-text bulk fixes.

### Option D: suggest the reciprocal line

For each finding, print a ready-to-paste Related bullet with the correct relative link and a placeholder reason.

- Pro: cheaper to fix correctly.
- Con: encourages pasting the placeholder unchanged, which is the low-quality outcome already observed. Mitigate by making the placeholder obviously incomplete.

### Option E: use ENH-062's relationship fields as the source

When the relationship schema in [ENH-062](../../enhancements/ENH-062/ENH-062-specification.md) lands, have the gate read `blocked_by`, `blocking`, `depends_on` and `related_to` from frontmatter only.

- Pro: the cleanest long-term answer; relationships become declared data, not inferred text.
- Con: blocked on a design that is still `proposed`; needs a backfill decision for existing docs.

### Option F: close the committed-history blind spot

Either also read the working tree, or print "commit first; this gate reads committed history only" in the finding text.

- Pro: the documentation-only variant is trivial and removes a real trap.
- Con: reading the working tree changes the gate's contract (it is a pre-push check of what will be pushed).

### Option G: tests

Add `scripts/pre-push-gate-backlink.test.sh` with fixtures: incidental mention, genuine frontmatter reference, legacy asymmetry untouched, cascade case. See [test-cases.md](test-cases.md).

- Pro: pins the behavior; prerequisite for safely changing A and B.
- Con: needs a way to build a throwaway git repo with a merge base inside the test.

## Recommended sequencing (for discussion)

1. Option G first (fixtures that encode the current, wrong behavior as expected failures).
2. Options A and B together.
3. Option F as a message change in the same commit.
4. Options C and D only if volume is still a problem after A and B.
5. Option E as part of the ENH-062 delivery, not before.
6. A one-time legacy-asymmetry audit as a separate, explicitly approved task. It is a data-quality project, not a gate fix.

## Risks

- Narrowing detection may hide relationships that reviewers want enforced. Mitigation: make the extraction scope an explicit, documented decision (Decision 1).
- Added-lines-only checking is blind to renames and moved blocks. Mitigation: fixtures for both.
- Doing the fix before the ENH-062 schema risks building a parser that is replaced. Mitigation: keep Options A and B small and removable.

## Related

- [issue-61 description](issue-61-description.md)
- [ENH-052](../../enhancements/ENH-052/ENH-052-specification.md) — the umbrella that owns Gates 5 and 6.
- [ENH-062](../../enhancements/ENH-062/ENH-062-specification.md) — relationship schema (Option E).
- [ENH-065](../../enhancements/ENH-065/ENH-065-specification.md) — the sibling check whose spec triggered the observation.
