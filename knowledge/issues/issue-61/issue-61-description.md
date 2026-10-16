---
id: issue-61
type: Hardening
status: deferred
github-issue: "#263"
branch: none
created: 2026-10-16
related_enhs: ["ENH-052", "ENH-062", "ENH-065"]
related_adrs: ["ADR-043", "ADR-050", "ADR-068"]
---

# issue-61: Gate 5 backlink-symmetry check treats every ID mention as a relationship and ripples across the corpus

**Local ID:** issue-61 | **GitHub Issue:** [#263](https://github.com/technomensch/knowledge-graph/issues/263) (filed via `/kmgraph:kmg-start-issue-tracking`, Mode 3, track only, silent)

**Status:** 🟡 Deferred (Track only) — decisions needed before implementation (see [Decisions Needed](#decisions-needed))
**Discovered:** 2026-10-16, while closing out the v0.7.10 pre-push cleanup
**Type:** Hardening
**Governed by:** [ADR-050](../../decisions/ADR-050-pre-push-composite-gate-inline-recommendation-gate.md) (composite pre-push gate, advisory by default); enforcement-by-hook lineage in ADR-043.

## Summary

`scripts/pre-push-gate.sh` Gate 5 checks that issue and enhancement docs reference each other symmetrically. It decides what counts as a "reference" by running `grep -oE 'issue-[0-9]+|ENH-[0-9]+'` over the whole file, so every ID that appears anywhere (prose, code spans, quoted chat text, sample lists, evidence tables) is treated as a declared relationship that needs a reciprocal backlink. The check also looks at every changed doc in full, not at the references the branch actually added. Together these two properties produced a 33-finding report on one new doc, of which 9 were real relationships, and then a transitive cascade that touched 32 docs across eight fix rounds.

The gate is advisory (exit 0, per ADR-050), so nothing was blocked. The cost was the remediation: hours of rework and a large batch of low-quality, generic backlinks added only to silence the report.

## Where

`scripts/pre-push-gate.sh`, Gate 5 backlink block (roughly lines 280 to 310):

- `CHANGED_KG_DOCS` is `git diff --name-only $MERGE_BASE HEAD -- 'knowledge/issues/*/issue-*-description.md' 'knowledge/enhancements/*/ENH-*-specification.md'`.
- For each changed doc, `REFERENCED` is `grep -oE 'issue-[0-9]+|ENH-[0-9]+'` over the **whole file**.
- Each referenced doc must match `grep -qE "$SELF_REF"` (it must mention the changed doc back), otherwise a finding is reported.
- Origin: the paperwork-drift umbrella ([ENH-052](../../enhancements/ENH-052/ENH-052-specification.md)), which added Gates 5 and 6.

## Evidence (observed 2026-10-16)

### 1. Overbroad detection

The new spec for [ENH-065](../../enhancements/ENH-065/ENH-065-specification.md) (committed as `3ca7b39b`) listed sample issues and enhancements in its evidence section. Gate 5 reported 33 missing backlinks. Only 9 were genuine relationships (issue 25, 30, 33, 60 and ENH 051, 052, 056, 062, 063). The other 24 were sample lists, history citations and quoted chat text. The workaround used at the time was to rewrite incidental mentions as plain numbers ("issue 15"), which makes them non-greppable by ID and therefore harder for a human or tool to find later.

### 2. Ripple and cascade

Adding the 9 genuine backlinks edited 9 docs. That put each edited doc's *older* references in scope, which produced 9 new findings (for example, ENH 056 referencing issue 30, 35 and 45; issue 25 referencing ENH 050, 053 and issue 30, 33; issue 33 referencing ENH 053 and issue 30). Fixing those edited 6 more docs and surfaced 3 more (ENH 050 referencing ENH 006, 034 and 042). Later rounds reported 2, 17, 9, 2, 4, 1 and 1 findings before the gate reported CLEAN on round 8. The final squash commit, `docs(kg): reciprocate cross-references flagged by Gate 5 across 32 issue/ENH docs`, touched 32 docs with 115 insertions.

Root cause: the corpus carries a large body of historic one-way references. Any doc that is touched surfaces its legacy asymmetry, so the fix is transitive and only terminates when the whole connected component is symmetric.

### 3. Blind spot: committed history only

The gate diffs `$MERGE_BASE..HEAD`. It never reads the working tree. A fixing agent that loops on uncommitted edits sees "CLEAN" while the next commit re-opens findings. During the cleanup a subagent reported CLEAN, and three more findings appeared after the commit.

### 4. Low-quality remediation pressure

Early rounds were fixed by hand, roughly 15 docs, with specific one-clause reasons. Later rounds were auto-fixed with generic text of the form "X's spec cross-references this item", because the volume was too high to write real reasons manually. A gate that rewards any backlink text invites boilerplate.

### 5. Adjacent Gate 5 bug fixed the same day

The lessons index-count glob only matched `Lessons_Learned_*.md`, so 7 real lessons were uncounted (fixed in commit `680a7395`). Same theme: pattern-matching on names or text that is too narrow in one place and too broad in another.

### 6. No test coverage

`scripts/` has `*.test.sh` files for numbering and github-issue sync only. Gate 5 has no test file, so none of the behaviors above is pinned.

## Impact

- Maintenance cost: one new doc can force edits across dozens of unrelated docs, and the follow-up commit history becomes noisy.
- Signal loss: genuine missing backlinks are buried among incidental mentions, so reviewers learn to ignore or bulk-fix the report.
- Quality erosion: generic backlink text and ID-to-plain-number rewrites degrade the graph the check was meant to protect.
- False assurance: the committed-history-only read lets a local "CLEAN" be wrong.

## Recommendation (options, not decided)

Ranked. The recommended first step is (a) plus (b).

- **(a)** Restrict relationship extraction to frontmatter `related_*` / `related-*` keys and the `## Related` section; ignore code fences, quoted blocks and evidence prose.
- **(b)** Only check references **added** in this branch's diff (`git diff -U0` added lines), so legacy asymmetry is never surfaced merely by touching a doc.
- **(c)** Cap and cluster the output and de-duplicate transitive findings.
- **(d)** Have the gate suggest the reciprocal line instead of only failing.
- **(e)** Let the relationship fields designed in [ENH-062](../../enhancements/ENH-062/ENH-062-specification.md) (`blocked_by`, `blocking`, `depends_on`, `related_to`) become the machine-readable source the gate reads.
- **(f)** Read the working tree as well as committed history, or state the commit-first requirement in the finding text.
- **(g)** Add `scripts/pre-push-gate-backlink.test.sh` with fixtures: incidental mention, genuine frontmatter reference, legacy asymmetry left untouched, cascade case.
- Also consider a one-time legacy-asymmetry audit as a separate decision.

## Decisions Needed

1. Is symmetry required for incidental mentions at all, or only for declared relationships?
2. Scope of the check: every changed doc, or only references added by the branch?
3. What to do about the hundreds of legacy one-way references: ignore, tag, or backfill with real reasons?
4. Whether the 32 generic-reason backlinks from this cleanup should be re-worded with specific reasons.
5. Delivery surface: `scripts/` is dev-only and never ships to consumers. A consumer-repo check would belong in a shipped skill such as `kmg-paperwork-audit`, per its own scope note.
6. Coupling to the [ENH-062](../../enhancements/ENH-062/ENH-062-specification.md) schema work: wait for it, or ship a frontmatter-only interim.
7. Blocking versus advisory. The ADR-050 default is advisory; any change needs an explicit decision.

## Related

- [ENH-052](../../enhancements/ENH-052/ENH-052-specification.md) — the paperwork-drift umbrella that introduced Gate 5; this issue is a defect in that gate's design.
- [ENH-062](../../enhancements/ENH-062/ENH-062-specification.md) — its relationship fields could become the machine-readable source that replaces whole-file ID grepping.
- [ENH-065](../../enhancements/ENH-065/ENH-065-specification.md) — its spec triggered the 33-finding report, and its folder-completeness check is the sibling Gate 5/6 extension.
- [ADR-050](../../decisions/ADR-050-pre-push-composite-gate-inline-recommendation-gate.md) — gate is advisory by default.
- [ADR-068](../../decisions/ADR-068-lightweight-vs-full-workflow-rule-and-piloted-command-completion-check.md) — the lightweight-vs-full rule that governs how much documentation this issue needs; filed here as the full four-file folder.
