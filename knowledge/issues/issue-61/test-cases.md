# issue-61: Test Cases / Acceptance Criteria

**Status:** Draft. Written at filing time as a shape for the eventual work. Refine after the [Decisions Needed](issue-61-description.md#decisions-needed) are answered; several cases depend on which scope is chosen.

## Proposed test file

`scripts/pre-push-gate-backlink.test.sh`, following the style of the existing `*.test.sh` files in `scripts/`. Each case builds a throwaway git repo with a base commit, a branch commit, and the minimum `knowledge/issues/` and `knowledge/enhancements/` fixtures, then runs the Gate 5 backlink block and asserts on its output.

## Baseline reproduction (current, wrong behavior)

1. **Incidental mention.** A new spec lists ten sample IDs in an evidence table and has no frontmatter relationships. Current behavior: ten findings. Expected after fix: zero.
2. **Cascade.** Doc A genuinely relates to doc B. Doc B (older) mentions doc C one-way. Adding the A-to-B backlink to B. Current behavior: a new finding for B-to-C. Expected after fix: no finding, because the B-to-C reference was not added by this branch.
3. **Committed-only read.** Edit a doc without committing and run the gate. Current behavior: the uncommitted edit is invisible. Expected after fix: either the edit is seen, or the finding text says the gate reads committed history only.

## Cases that must keep working

4. **Genuine frontmatter reference, no backlink.** New doc lists another doc in `related_*` and the other doc does not mention it. Expected: one finding naming both docs.
5. **Genuine `## Related` reference, no backlink.** Same, via the Related section. Expected: one finding.
6. **Reciprocated reference.** Both docs mention each other. Expected: no finding.
7. **Self reference.** A doc mentions its own ID. Expected: no finding.
8. **Reference to a missing doc.** A doc mentions an ID with no folder. Expected: no crash; behavior documented (skip or report), decided in Decision 2.

## Output cases (if Options C and D are adopted)

9. **Volume cap.** More than the cap findings. Expected: first N printed plus a count of the remainder.
10. **Suggested line.** Each finding prints a reciprocal bullet with a correct relative link and an obviously incomplete reason placeholder.

## Regression guards

11. **Exit status.** The gate stays advisory (exit 0) unless the blocking decision changes.
12. **Lessons index count.** The lessons glob counts every `*.md` lesson file, not only `Lessons_Learned_*.md` (the adjacent bug fixed in `680a7395`).
13. **Fenced and quoted text.** IDs inside code fences and blockquotes are ignored when Option A is adopted.

## Manual acceptance

- Re-run the 2026-10-16 scenario on a scratch branch: add a spec with a long sample-ID evidence list plus nine genuine relationships. The gate should report only the nine, and fixing them should not create new findings in older docs.
