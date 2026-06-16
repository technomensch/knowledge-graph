---
type: Bug
---

# Issue-5: `start-issue-tracking` Never Calls `gh issue create`

## Problem

The `/kmgraph:start-issue-tracking` skill documents a "CRITICAL RULE" about creating GitHub
Issues and populates a `github-issue` frontmatter field in every ENH/issue spec — but Step 5
of the skill only calls `gh pr create --draft`. The `gh issue create` command was never
implemented in the execution steps.

**Impact:** Every ENH and issue created since `v0.0.5-alpha` (commit `4641faab`) has
`github-issue: null` or `"TBD"`. ENH-015 through ENH-019 are all unsynced to GitHub.

## Evidence

- `git log --follow commands/start-issue-tracking.md` — 12 commits, `gh issue create`
  absent from all of them
- ENH-015, ENH-016, ENH-017, ENH-018, ENH-019: all have `github-issue: null` or `"TBD"`
- GitHub repo has no open enhancement issues past #47 (ENH-006)
- `knowledge/issues/issue-1`: `github-issue: NOT SET`

## Root Cause

Original omission in `v0.0.5-alpha`. The prose and frontmatter schema anticipated GitHub
issue creation, but the actual `gh issue create` call was never written into the execution
steps. `gh pr create --draft` was added instead — a different operation that requires a
branch and cannot replace issue creation.

## Fix

In Step 5 of `commands/start-issue-tracking.md`:
1. Add `gh issue create` call after directory/doc creation (Step 4), before branch creation
2. Capture the returned issue URL/number and write it back into the spec frontmatter
3. Update `github-issue` field from `null`/`"TBD"` to the actual issue number

## Related

- **ADR-024** — documents the sequential prompt design for `start-issue-tracking`; any
  Step 5 changes must remain consistent with the UX decisions there
- **ENH-017** — proposes UX improvements to Step 1.2; shares the same command file;
  implementation should be coordinated to avoid merge conflicts
- **GitHub Issue:** #124
