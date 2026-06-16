---
title: Solution Approach — ENH-006
---

# Solution Approach: ENH-006

## Affected Files

- `commands/start-issue-tracking.md` — Step 1 (Verification & Versioning Gate) + Step 6.2
- `skills/adr-guide/SKILL.md` — trigger keyword list
- `skills/lesson-capture/SKILL.md` — trigger keyword list
- `skills/gov-execute-plan/SKILL.md` — add prerequisite check before implementation start

## Changes

### 1. Replace Step 1.1 with four sequential sub-steps

Remove the current combined Step 1.1 versioning prompt. Replace with:

**Step 1.1 — Issue Type** (ask first, wait for answer)

Present as numbered list:
1. Bug — something broken
2. Enhancement — new capability or behavior
3. Refactor — restructure without behavior change
4. Hardening — strengthen guardrails or validation
5. Hotfix — critical fix to a released version
6. Documentation — docs only, no code change
7. Chore — maintenance, dependency updates, tooling

**Step 1.2 — Version Impact** (ask after 1.1 answer received)

Present as numbered list:
1. Major bump — breaking change (vX.0.0)
2. Minor bump — new feature added (v0.X.0)
3. Patch — small fix or improvement (v0.0.X)
4. Hotfix bump — critical patch to a released version (v0.0.0.X)
5. None — stays within current version scope

**Step 1.3 — Branch** (ask after 1.2 answer received)

Present as numbered list:
1. New branch from main
2. New branch from current branch ([current_branch])
3. Stay on current branch ([current_branch])
4. Document only — no branch yet, create later

**Step 1.4 — Plan** (ask after 1.3 answer received)

Present as numbered list:
1. New plan file — standalone plan for this issue/enhancement
2. Append to existing plan — add tasks to the active [plan_name] plan
3. Document only — no plan yet, create later

### 2. Remove Step 5.0 (Active Work Guard)

Step 5.0 currently asks a branch question that duplicates Step 1.3. Remove it entirely. The branch decision is fully handled by Step 1.3.

The active branch warning notice (currently in Step 1.0) remains — it primes the user before they answer 1.3.

### 3. Assumption Confirmation Block

After all four answers are collected, present a single confirmation block:

```
Here's what I'll do:

- Type: [answer]
- Version: [answer] → [resulting version]
- Branch: [answer] → [branch name or "no change"]
- Plan: [answer] → [plan file or "append to X" or "none yet"]
- Issue ID: [auto-detected next ID]

Change anything? (y to proceed / list corrections)
```

### 4. Enforce sequential wait

Each sub-step must end with a clear stop. The model must not output Step 1.2 until the user has answered Step 1.1. Add explicit instruction in the command:

> **RULE: Output one prompt. Stop. Wait for user input. Then output the next prompt.**

### 5. Add prerequisite check to `gov-execute-plan`

At the start of any plan execution, before the first implementation step, check whether Step 6.4 (ROADMAP + CHANGELOG) was completed for each issue/enhancement in scope. Detection heuristic: check whether the issue's ENH-NNN or issue-N entry appears in CHANGELOG.md and ROADMAP.md.

If missing, surface:

```
Before implementing [ENH-NNN], the following initialization steps were not completed:
- Step 6.4: ROADMAP and CHANGELOG not synced

1. Complete now
2. Skip for this session
3. Cancel
```

Option 1 runs `/kmgraph:update-issue-plan` inline.
Option 2 notes the skip in the execution log and proceeds.
Option 3 exits.

This check runs once per execution session, not before every step.

### 6. Enforce Step 6.2 as a mandatory gate

Change the Step 6.2 instruction from soft suggestion to hard gate:

> **RULE: Do not proceed to Step 7 until Step 6.2 has been presented and answered.**

The question remains the same — "Should I run `/kmgraph:capture-lesson` now?" — but the model must not skip it or treat it as implied.

### 7. Expand `adr-guide` triggers

Add to `skills/adr-guide/SKILL.md` trigger list:
- "the problem is that"
- "here's what it should look like / do instead"
- "needs to be redesigned"
- "this should be"
- Design decision identified through problem analysis during active use of a command or workflow

### 8. Expand `lesson-capture` triggers

Add to `skills/lesson-capture/SKILL.md` trigger list:
- UX or process failure observed and named during active use (even without a resolution moment)
- "this is a gap"
- "the issue is"
- "noticed that"
- "this doesn't work because"

## Backward Compatibility

No behavioral change to Steps 2–5, 7. The four answers collected in Steps 1.1–1.4 map directly to the same downstream variables the command already uses.
