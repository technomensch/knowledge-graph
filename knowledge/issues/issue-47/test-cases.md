# Test Cases — issue-47

No existing test harness covers shell logic embedded in agent/skill/command
markdown files — these are manual/scripted verification, not unit tests.

## Manual verification

1. **On base branch (the bug case):** from a clean checkout of `main` with no
   feature branch, run `/kmgraph:kmg-session-summary`. Before fix: "key files
   modified" section is empty. After fix: section either correctly shows an
   empty/legitimate range with an explicit label (see solution-approach.md item
   1), not a silent blank.
2. **On feature branch, normal case (regression guard):** from a feature branch
   with committed changes, run `/kmgraph:kmg-session-summary`. Confirm "key files
   modified" still lists the expected changed files — merge-base swap must not
   break the working case.
3. **`kmg-docs-impact-scan` on base branch:** run the skill while on `main` with
   no feature branch. Before fix: zero identifiers extracted, reports "no docs
   impact" incorrectly. After fix: matches case 1's corrected behavior.
4. **`kmg-docs-impact-scan` on feature branch (regression guard):** confirm
   identifier extraction still works and still respects the existing 20-identifier
   cap-and-note behavior.
5. **`kmg-update-issue-plan` on base branch:** run while on `main`. Before fix:
   lessons-learned discovery silently finds nothing even if lessons were
   captured this session. After fix: discovery uses the corrected range.
6. **Non-`main` default branch:** if feasible to test, verify the merge-base
   resolution in `paperwork-audit`'s pattern correctly detects a repo whose
   default branch is `master` or something else, and that the same now applies
   to the three newly-fixed sites (previously these three were `main`-only
   hardcoded and would have failed silently on a `master`-default repo too —
   confirm whether that's a real risk for this repo, low priority if not).
7. **Undeterminable default branch (no local `main` or `master` ref):** in a
   fresh single-branch clone or a worktree where neither exists locally,
   confirm all three newly-fixed sites (`session-summary-agent.md:444`,
   `kmg-docs-impact-scan/SKILL.md:24`, `kmg-update-issue-plan.md:87`) report
   the reason and skip the dependent step, rather than erroring out on
   `git merge-base "" HEAD` / `git diff --name-only "" HEAD`. This is the
   failure mode solution-approach.md's fallback section exists to prevent —
   without this test it's easy to ship the merge-base happy path only.
8. **Docs-site consistency:** after the fix, confirm
   `docs/pillars/tailoring/docs-impact-scan.md` no longer states
   `git diff main...HEAD` as current behavior, and that
   `docs/superpowers/specs/2026-04-16-docs-impact-scan-design.md` has an
   explicit note if left as historic record rather than updated.

## ADR verification

9. Confirm `knowledge/decisions/ADR-036-docs-impact-scan.md` is updated in the
   same PR as the `kmg-docs-impact-scan/SKILL.md:24` change — the fix should not
   land without the ADR amendment.
10. Confirm the drive-by fixes in the same ADR-036 pass: `skills/docs-impact-scan/SKILL.md`
    path references (lines 73, 136) corrected to
    `skills/kmg-docs-impact-scan/`, and the `Status:` field (line 184) made
    consistent with the frontmatter/line 25.
