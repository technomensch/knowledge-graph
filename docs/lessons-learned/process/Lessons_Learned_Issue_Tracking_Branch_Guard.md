---
title: "Lesson: Issue Tracking Branch Guard — Don't Switch Branches During Active Implementation"
created: 2026-03-28T00:00:00Z
author: Claude Sonnet 4.6
email: noreply@anthropic.com
git:
  branch: v0.2.1-beta-mcp-write-and-portability
  commit: 2b06634b
tags:
  - git
  - workflow
  - issue-tracking
  - branch-management
  - kmgraph
category: process
---

# Lesson: Issue Tracking Branch Guard — Don't Switch Branches During Active Implementation

**Date:** 2026-03-28
**Category:** Process (Git Workflow)
**Discovered during:** v0.2.1-beta when ENH-001 issue tracking caused branch switch

---

## Problem

During v0.2.1-beta implementation (on branch `v0.2.1-beta-mcp-write-and-portability`), the `/kmgraph:start-issue-tracking` command was run to document the ENH-001 user-level global KG enhancement. The command silently ran `git checkout main && git checkout -b issue/ENH-001-global-kg`.

**Impact:**
- All subsequent v0.2.1-beta commits landed on `issue/ENH-001-global-kg`
- `v0.2.1-beta-mcp-write-and-portability` stopped receiving commits
- Recovery required: `git reset --hard` on the implementation branch, then delete the wrong branch
- Files created by the phase that ran before the switch had to be recovered from `git show`

The problem was compounded by the fact that the branch switch produced no warning — it appeared as normal command output with no indication that the active implementation context had changed.

---

## Root Cause

`/kmgraph:start-issue-tracking` Step 5.1 unconditionally ran:
```bash
git checkout main
git checkout -b issue/{N}-{slug}
```

No check existed for whether the user was mid-implementation on another branch.

---

## Solution: Active Work Guard

Added **Step 5.0: Active Work Guard** to `start-issue-tracking.md`. Before creating any branch, the command now checks:

```bash
current_branch=$(git branch --show-current)
```

If not on `main`, the user is presented with 3 options:

1. **Document only** — Create issue docs, stay on current branch. Branch created later when ready.
2. **Create branch now** — Switch immediately (use only if done with current branch).
3. **Cancel** — Abort issue tracking.

For option 1, the issue docs include a note:
```
**Branch:** Not yet created — run `git checkout -b issue/{N}-{slug}` when ready.
```

---

## When to Apply

This guard pattern applies to **any command that creates Git branches**, including:
- `/kmgraph:start-issue-tracking` — implemented in v0.2.1-beta
- `/kmgraph:init` — should check if CWD already has a repo with active work
- Any future commands that call `git checkout -b`

**Rule:** Any command that creates a branch must first check `git branch --show-current`. If not on the default branch, present options before switching.

---

## Related

- **ADR-022:** Branch creation commands must guard against active work context-switch (architectural decision)
- `commands/start-issue-tracking.md` → Step 5.0: Active Work Guard

---

**Category:** process
**Status:** Implemented in start-issue-tracking (v0.2.1-beta)
**Last Updated:** 2026-03-28
