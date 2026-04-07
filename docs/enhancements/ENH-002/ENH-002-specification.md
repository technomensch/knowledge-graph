---
title: Session Snapshot on Capture
enhancement_id: ENH-002
github_issue: 41
version: 0.2.2
status: Proposed
created: 2026-03-28
author: mkaplan
---

# ENH-002: Session Snapshot on Capture

**Local ID:** ENH-002 | **GitHub Issue:** #41

## Problem Statement

When a capture-worthy moment occurs mid-session (a lesson learned, an architectural decision, a bug worth tracking, or an enhancement identified), the current workflow interrupts implementation flow with a full capture dialog. The user either:

1. Completes the capture immediately — disrupting implementation context
2. Defers the capture — risks losing the "why this mattered" context by wrap-up time

Neither is ideal. The root issue is that context is most valuable at the moment of discovery, but the full capture workflow is too heavy to run mid-task.

Additionally, when captures are deferred to session wrap-up, the session summary is written *after* the fact and must reconstruct context from memory and git history — missing the live conversational thread that explained *why* the capture was triggered.

## Goals

1. **Preserve live context** — capture the "why" at the moment of discovery, not reconstructed at wrap-up
2. **Reduce mid-session overhead** — snapshot is lightweight; full capture happens afterward or at wrap-up
3. **Incremental session record** — session summary becomes a living document updated at each capture trigger, not just a terminal artifact
4. **Optional git inclusion** — user controls whether git history is included in the snapshot, reducing overhead for quick captures
5. **Covers all capture types** — lessons, ADRs, issues, and enhancements all trigger the same snapshot behavior

## Proposed Behavior

When any capture command fires mid-session (`/kmgraph:capture-lesson`, `/kmgraph:create-adr`, `/kmgraph:start-issue-tracking`), or when a capture skill/hook triggers:

```
Capture trigger fires
  ↓
"Before we capture — want to snapshot the session first? (yes / skip)"
  ↓ yes
"Include git history? (yes / no — adds ~5 sec if yes)"
  ↓
session-summary runs in append mode
  → records current state, open plan items, what led here
  → includes conversational context around why this capture was triggered
  ↓
Capture proceeds with session summary as context source
  ↓
User continues work
  ↓
Next capture trigger → appends to same session summary
  ↓
Wrap-up: session summary already populated; final run adds closing context only
```

## Requirements

### Functional

- [ ] All capture entry points offer a "snapshot first" prompt before proceeding: `capture-lesson`, `create-adr`, `start-issue-tracking`
- [ ] Snapshot prompt includes optional git inclusion: "Include git history? (yes / no)"
- [ ] When git is declined, session-summary-agent skips git log calls entirely (conversation + file changes only)
- [ ] Session summary runs in append mode when a summary for today already exists
- [ ] The capture that triggered the snapshot can reference the session summary file for its "context" field
- [ ] Hooks (PostToolUse lesson check, Stop hook) also offer snapshot-first behavior before capture prompts
- [ ] Session summary skill (`session-wrap`) is aware of whether a snapshot was taken this session
- [ ] `lesson-capture-agent` checks for an existing session summary for today before asking user for context — if found, offers to pre-fill from it: "I found a session summary from today — use it to pre-fill the lesson context? [y] Yes   [n] Ask me instead"

### Non-Functional

- [ ] Snapshot without git completes in under 10 seconds
- [ ] Snapshot with git completes in under 30 seconds
- [ ] Append mode does not duplicate content already in the session summary
- [ ] Behavior is identical regardless of which capture command triggered it

## Affected Components

| Component | Change |
|---|---|
| `agents/session-summary-agent.md` | Add lightweight "snapshot mode" (no git) vs full mode; expose git as opt-in |
| `commands/capture-lesson.md` | Add snapshot prompt before capture dialog |
| `commands/create-adr.md` | Add snapshot prompt before ADR dialog |
| `commands/start-issue-tracking.md` | Add snapshot prompt before Step 1 |
| `agents/lesson-capture-agent.md` | Phase 2: check for today's session summary before asking user for context; offer to pre-fill from it |
| `skills/session-wrap/SKILL.md` | Track whether snapshot taken this session; adjust Stop hook prompt |
| `skills/lesson-capture/SKILL.md` | Offer snapshot before dispatching to lesson-capture-agent |
| `scripts/post-tool-lesson-check.sh` | Add snapshot offer before lesson capture prompt |
| `scripts/session-end-prompt.sh` | Check if snapshot exists; adjust wrap-up prompt accordingly |

## Out of Scope

- Automatic (no-prompt) snapshots — always user-confirmed
- Changing what the session summary captures — only adding the opt-in git toggle and append-mode optimization
- User-level KG integration (ENH-001 scope)

## Related

- **ENH-001:** User-Level Global Knowledge Graphs (v0.2.2)
- **ADR-022:** Branch creation commands must guard active work context-switch
- **Session:** 2026-03-28 — conversation that identified this pattern
