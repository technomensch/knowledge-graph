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

## ADR verification

7. Confirm `knowledge/decisions/ADR-036-docs-impact-scan.md` is updated in the
   same PR as the `kmg-docs-impact-scan/SKILL.md:24` change — the fix should not
   land without the ADR amendment.
