# issue-61: Implementation Log

## 2026-10-16 — Investigated and tracked (not implemented)

**Trigger.** While closing out the v0.7.10 pre-push cleanup, the Gate 5 backlink-symmetry check reported 33 missing backlinks after a new enhancement spec was committed. Only 9 were genuine relationships. Fixing them surfaced further findings in older docs, repeatedly, until the gate reported CLEAN on the eighth round.

**Filing.** Created through `/kmgraph:kmg-start-issue-tracking` with explicit user args: silent execution, type Hardening, Mode 3 (track only), status deferred, no branch, no plan, version impact not applicable (WIP append). Lesson capture and plan-sync prompts were answered no in advance. The full four-file folder was created deliberately, because [ENH-065](../../enhancements/ENH-065/ENH-065-specification.md) documents single-file folders as a defect.

### Investigation timeline (from the cleanup session)

1. Gate 5 reported 33 findings on the new spec. Triage showed 9 genuine relationships and 24 incidental mentions (sample lists, history citations, quoted chat text).
2. Incidental mentions were rewritten as plain numbers. The 9 genuine backlinks were added, editing 9 docs.
3. Re-running the gate reported 9 new findings from those docs' older references. Fixing them edited 6 more docs and produced 3 more.
4. Subsequent rounds reported 2, 17, 9, 2, 4, 1 and 1 findings. Round 8 was CLEAN.
5. A subagent looping on uncommitted edits reported CLEAN; three findings reappeared after the commit, which exposed that the gate reads `$MERGE_BASE..HEAD` only.
6. Later rounds were auto-fixed with generic reciprocal text because the volume was too high for hand-written reasons. About 15 earlier docs have specific reasons.
7. The result was one squash commit, `docs(kg): reciprocate cross-references flagged by Gate 5 across 32 issue/ENH docs`, with 115 insertions.
8. Separately, the lessons index-count glob (`Lessons_Learned_*.md` only) was found to miss 7 real lessons and was fixed in `680a7395`.
9. `scripts/` contains no test file for Gate 5.

### Status

No code changed by this issue. All remediation options and the seven decisions are recorded in [issue-61-description.md](issue-61-description.md) and [solution-approach.md](solution-approach.md).

### Next actions

- Owner answers the Decisions Needed.
- If approved, start with the fixtures in [test-cases.md](test-cases.md), then narrow detection and scope.
- Coordinate with [ENH-062](../../enhancements/ENH-062/ENH-062-specification.md) before building a parser that its relationship schema would replace.
