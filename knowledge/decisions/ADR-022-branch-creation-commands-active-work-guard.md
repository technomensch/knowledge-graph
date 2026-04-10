# ADR-022: Branch Creation Commands Must Guard Against Active Work Context-Switch

**Date:** 2026-03-28
**Status:** Accepted
**Implements:** v0.2.1-beta — start-issue-tracking Active Work Guard
**Related:** [Lesson: Issue Tracking Branch Guard](../lessons-learned/process/Lessons_Learned_Issue_Tracking_Branch_Guard.md)

---

## Context

During v0.2.1-beta implementation, `/kmgraph:start-issue-tracking` was run while the user was actively working on branch `v0.2.1-beta-mcp-write-and-portability`. The command executed `git checkout main && git checkout -b issue/ENH-001-global-kg` without warning. All subsequent commits landed on the wrong branch, requiring a `git reset --hard` recovery and manual file recovery from `git show`.

The root cause was not a bug but a missing precondition check: the command assumed it was always safe to switch branches, which is only true when the user is on the default branch.

**Scope:**
- In scope: any KMGraph command that creates a Git branch as part of its workflow
- Out of scope: user-initiated `git checkout` calls outside of commands

---

## Decision

**All commands that create Git branches must check the current branch before switching.**

If the current branch is not the default branch (main/develop), the command must present an explicit choice before taking any branch action:

```
You're currently on branch [current_branch].

Creating a new issue branch will switch you away from your active work.
All subsequent commits would go to the new branch instead of [current_branch].

How would you like to proceed?

1. Document only — Create docs but stay on [current_branch]
2. Create branch now — Switch to new issue branch immediately
3. Cancel — Abort
```

**Option 1 (Document only):** Issue or enhancement documentation is created; no branch switch occurs. A note is added to the docs: "Branch not yet created — run `git checkout -b issue/{N}-{slug}` when ready."

**Option 2 (Create branch now):** Normal branch creation proceeds. Used only when the user is done with or intending to leave the current branch.

**Option 3 (Cancel):** Command exits without creating anything.

---

## Affected Commands

| Command | Status |
|---|---|
| `commands/start-issue-tracking.md` | ✅ Implemented (Step 5.0, v0.2.1-beta) |
| `commands/init.md` | 🔲 Should implement — init creates a branch on first run |
| Any future branch-creating command | 🔲 Must implement before release |

---

## Consequences

**Benefits:**
- Prevents accidental branch contamination during active implementation
- Preserves user's work context — no silent switches
- Reduces manual recovery work (git reset, file recovery from history)
- Makes "Document now, branch later" a first-class workflow option

**Trade-offs:**
- Adds an interactive step to branch creation (minor friction for users already on main)
- "Document only" option requires users to remember to create the branch manually later — a note in the docs mitigates this but does not eliminate the risk

---

**Supersedes:** No prior ADR (new rule)
**Reviewed by:** Claude Sonnet 4.6
