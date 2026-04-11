---
title: Sequential Prompts, Decoupled Decisions, and Skill Trigger Gaps
enhancement_id: ENH-006
github_issue: 47
version: 0.2.2
status: Proposed
created: 2026-03-30
author: mkaplan
---

# ENH-006: Sequential Prompts, Decoupled Decisions, and Skill Trigger Gaps

## Problem

### A. `start-issue-tracking` command — three UX failures

**1. Batched prompts**
Steps 1.1, 1.2, and 5.0 are output in a single block, requiring the user to answer multiple questions at once and track which answer goes to which step. The command says "WAIT FOR USER INPUT" but does not enforce it per-question.

**2. Type and versioning are conflated**
Step 1.1 options mix two independent concerns:
- "New Feature (vX.[Minor].0)" encodes both a type and a version impact
- "WIP Update (continue on existing branch)" encodes both a version policy and a branch strategy
- A user who wants "new enhancement, no version bump, stay on current branch" has no clean path

**3. No plan management question**
Step 5.0 asks about branch strategy but never asks about plan strategy. The user cannot specify whether to create a new plan, append tasks to an existing plan, or document-only.

### B. `adr-guide` skill — keyword gap

The skill fires on literal phrases ("I'm thinking of using", "should we use", "decision between"). It misses implicit design decisions surfaced through problem analysis — e.g., "the problem is that / here's what it should look like / this needs to be redesigned." Architecture decisions identified this way are never offered to the ADR workflow.

### C. `lesson-capture` skill — keyword gap

The skill fires on resolution-moment language ("figured it out", "the fix was", "turns out"). It misses pattern identification during active use — when a UX or process failure is observed and named, but no bug was "solved" in the traditional sense.

### D. `start-issue-tracking` Step 6.2 — not enforced as mandatory

Step 6.2 asks "Should I run `/kmgraph:capture-lesson` now?" but is treated as optional in practice. During this session it was skipped entirely. The command must enforce Step 6 as a required gate, not a suggestion.

### E. `start-issue-tracking` Step 6.4 — no gate before implementation start

Step 6.4 asks about running `/kmgraph:update-issue-plan` to sync ROADMAP and CHANGELOG, but is framed as optional. Nothing in the process prevents implementation from beginning before this step is completed. The result: issues can be implemented with ROADMAP and CHANGELOG never updated for them.

The fix is not to make Step 6.4 harder to skip — it's to add an explicit prerequisite check at implementation time. When the user says "execute" or "implement" against a plan, the process should verify that Step 6.4 was completed for all issues in scope and surface any that were skipped before allowing implementation to proceed.

---

## Solution

### A. Redesign the interactive gate (Steps 1.1–1.4 + 5.0) as four fully independent sequential prompts:

1. **Type** — What kind of work is this?
2. **Version impact** — How does this affect the version number?
3. **Branch** — Where does this work live?
4. **Plan** — How should this work be planned?

Each prompt is asked one at a time. The model waits for the user's answer before presenting the next. After all four answers are collected, the model states its assumptions and asks for confirmation before writing anything.

All options for each decision must be explicitly listed, including combinations the user might not think to ask about (e.g., hotfix with document-only plan, enhancement with no version bump on current branch).

Prompts must be formatted as numbered lists, not tables.

### B. Expand `adr-guide` trigger list

Add trigger patterns that cover implicit design decisions:
- "the problem is that"
- "here's what it should look like"
- "here's what it should do instead"
- "needs to be redesigned"
- "this should be"
- Pattern identified during active use of a command/workflow

### C. Expand `lesson-capture` trigger list

Add trigger patterns that cover pattern identification (not just bug resolution):
- UX or process failure observed and named during active use
- "this is a gap"
- "the issue is"
- "noticed that"
- "this doesn't work because"

### D. Make Step 6.2 mandatory in `start-issue-tracking`

Change Step 6.2 from a soft suggestion to a required gate. The model must not proceed to Step 7 until it has presented the lesson capture question and received an answer (yes or deferred-to-plan).

### E. Add implementation prerequisite check to `gov-execute-plan`

When execution begins against a plan, the `gov-execute-plan` skill must check whether Step 6.4 (ROADMAP + CHANGELOG sync) was completed for each issue/enhancement in scope. If any are missing:

> "Before implementing [ENH-NNN], the following initialization steps were not completed:
> - Step 6.4: ROADMAP and CHANGELOG not updated
>
> Complete now, skip, or cancel?"

This gates implementation start, not issue tracking completion. The check lives in `gov-execute-plan` because that's the enforcement point for plan execution, not in `start-issue-tracking` which has already exited.

## Goals

- User is never asked to answer multiple questions at once in `start-issue-tracking`
- Type, version impact, branch strategy, and plan strategy are independently selectable
- All valid option combinations are reachable
- Model makes reasonable assumptions after gathering decisions, confirms before acting
- Prompt format is consistent: numbered list, one question per message
- `adr-guide` catches design decisions surfaced through analysis, not just explicit choice-framing
- `lesson-capture` catches pattern identification during use, not just post-resolution moments
- Step 6.2 is never skipped
- ROADMAP and CHANGELOG are always synced before implementation begins

## Out of Scope

- Changes to Steps 2–5, 7 (issue numbering, directory creation, documentation generation, git integration, termination)
- Changes to Step 0 (discourse capture / behavior lock)
- Smart default auto-detection logic (unchanged)
