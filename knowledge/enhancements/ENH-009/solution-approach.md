---
type: Hardening
---

# Solution Approach: ENH-009

## Summary

Add three structural improvements to `commands/start-issue-tracking.md`:
1. Mode selection gate (Step 0.5)
2. Pre-flight working-tree check (Step 0.6)
3. Status field + exit handoff banner (Step 7)

## Changes Required

### `commands/start-issue-tracking.md`

**New Step 0.5: Mode Selection Gate** (insert after snapshot gate in Step 0, before Step 1)

Present three options and wait for user answer:
- `[1] Track then Implement` — default flow; exit prompts "Proceed to implementation now?"
- `[2] Implement then Track` — pre-flight check runs first; docs generated retroactively
- `[3] Track only` — no branch; status set to `deferred`

Store `{workflow_mode}` = 1, 2, or 3 for use throughout the flow.

**New Step 0.6: Pre-flight Working-Tree Check** (insert after mode selection)

Run `git status --porcelain` and `git diff --stat HEAD`. If changes exist, prompt user to identify whether they relate to the issue. If yes: commit as implementation first.

**Step 7: Add status field and exit handoff banner**

- Set `status:` in issue frontmatter based on mode and user response:
  - Mode 1, implementation deferred → `tracked-not-implemented`
  - Mode 1, implementing now → `in-progress`
  - Mode 2 → `implemented`
  - Mode 3 → `deferred`
- Append exit handoff banner listing next-action commands

**Issue/Enhancement description template**

Add `status:` field to YAML frontmatter with valid values documented.

## Acceptance Criteria

- [ ] Mode selection gate appears before Step 1 on every invocation
- [ ] Mode 1 exit prompts "Proceed to implementation now?" — N sets `status: tracked-not-implemented`
- [ ] Mode 2 runs pre-flight check and commits implementation before docs
- [ ] Mode 3 skips branch creation and sets `status: deferred`
- [ ] Pre-flight check detects uncommitted changes and asks if they relate to the issue
- [ ] All generated issue/enhancement descriptions include `status:` field
- [ ] Exit banner lists next-action commands on every completion
- [ ] Git presence gate (`{git_available}`) still respected — pre-flight check skipped if no Git repo
