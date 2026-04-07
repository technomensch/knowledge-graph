---
id: issue-2
type: Hardening
status: OPEN
---

# Solution Approach: issue-2

## Summary

Add a Git presence gate to `commands/start-issue-tracking.md` so all Git-dependent steps are skipped when the project has no Git repository.

## Changes Required

### `commands/start-issue-tracking.md`

**Step 1.0 — Git Authority Check**
- Add `git rev-parse --is-inside-work-tree 2>/dev/null` check as the first command
- Store result as `{git_available}` flag
- If false: note that Git steps will be skipped; proceed to Step 1.1

**Step 1.3 — Branch**
- Make conditional: if `{git_available} = false`, skip or auto-answer "N/A — no Git repo"

**Step 5 — Git Integration**
- Add `CONDITIONAL:` banner at top of section
- Entire step skips if `{git_available} = false`

**Step 7 — Summary**
- Branch row: omit if `{git_available} = false`
- GitHub Issue row: omit if `{git_available} = false`
- Git Authority row: show "N/A — no Git repo" if `{git_available} = false`

**Smart Defaults section**
- Add note that git-based auto-detection is skipped when no repo is present

**Best Practice #3**
- Soften to: "Use branches when working in a Git repo"

## Acceptance Criteria

- [ ] Step 1.0 detects Git presence before any other git command runs
- [ ] Step 1.3 is skipped/bypassed when no Git repo
- [ ] Step 5 is fully skipped when no Git repo
- [ ] Step 7 summary adapts to no-Git state
- [ ] No `git` commands run in a non-Git project context
