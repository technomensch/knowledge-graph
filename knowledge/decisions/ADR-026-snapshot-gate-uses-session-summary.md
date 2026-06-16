---
title: >-
  ADR-026: Snapshot Gate Invokes session-summary-agent, Not a Lightweight Temp
  Capture
category:
  uri: uri-that-does-not-map-to-process
---

# ADR-026: Snapshot Gate Invokes session-summary-agent, Not a Lightweight Temp Capture

**Date:** 2026-04-06
**Status:** Accepted
**Implements:** ENH-002
**Related:** ADR-020 (lifecycle hooks suite), ENH-002 solution-approach.md

---

## Context

ENH-002 designed a "Snapshot Gate" — a prompt inserted at the start of all capture commands (`/kmgraph:capture-lesson`, `/kmgraph:create-adr`, `/kmgraph:start-issue-tracking`) that offers to preserve session context before proceeding.

The original design in ENH-002's solution-approach explicitly invokes `session-summary-agent --snapshot`: a lightweight variant of the full session summary that captures conversation context and file changes without requiring git history.

**Problem:**
- When `capture-lesson.md` was implemented, the gate's language drifted — describing the snapshot as "a lightweight mid-session save" rather than a `session-summary` invocation
- Users confused the gate's output with the standalone `/kmgraph:session-summary` command, or misread it as a separate, distinct mechanism
- The `?` explanation (shown only on request) described a temp artifact rather than a persistent summary
- A model-switch mid-skill (e.g., Sonnet → Haiku between gate and `kg_capture`) caused context loss because no file was written — the snapshot lived only in the active model's context

**Scope:**
- In scope: language used in the Snapshot Gate; what the gate invokes
- Out of scope: changes to `session-summary-agent` behavior itself

---

## Decision

The Snapshot Gate in all capture commands **invokes `session-summary-agent --snapshot`** — not a bespoke lightweight capture.

The user-facing prompt uses the term "session summary" explicitly, not "snapshot," to match the canonical command name. The gate's `?` explanation describes `/kmgraph:session-summary` in snapshot mode.

After the agent returns, a visible transition message confirms: *"Session summary saved — I'll use that to fill in the lesson's context and background."*

### Core Components

1. **Gate prompt language:** "Run session summary first?" — not "snapshot the session"
2. **Agent invoked:** `session-summary-agent --snapshot` (with `--git` if user opts in)
3. **Transition message:** Explicit confirmation that the summary is now available as context for the lesson/ADR/issue

---

## Rationale

### Why This Approach

1. **Eliminates conceptual split:** One mechanism (session-summary) instead of two overlapping constructs (snapshot vs. session-summary). Users learn one command, not two.
2. **Produces a persistent file:** Session summary writes to disk. Survives model switches, rate limit recoveries, and context compression — none of which a context-only snapshot survives.
3. **Matches original intent:** ENH-002 solution-approach.md (line 15) explicitly states: "The gate is a single two-question prompt that runs the session-summary-agent in lightweight mode." The drift was an implementation error, not a design evolution.
4. **Better lesson quality:** A written session summary provides richer source material for a lesson's `context` field than reconstructed in-context text.

### Alternatives Considered

**Option A: Keep lightweight temp snapshot, fix language only**
- Pros: Simpler; avoids session-summary overhead
- Cons: Still two overlapping mechanisms; still fragile to model switches; still confusing
- Rejected because: Root cause is architectural, not linguistic

**Option B: Remove the gate entirely**
- Pros: Simplest UX
- Cons: Loses the "capture context at the moment of discovery" value
- Rejected because: ENH-002's core value proposition is precisely this gate

### Trade-offs

**Benefits:**
- Persistent artifact survives model switches and context resets
- Single, canonical mechanism users already know
- Richer context for downstream lesson/ADR capture

**Costs:**
- Session summary is slightly heavier than a minimal temp capture
- Users who skip git are still running more than a raw snapshot

**Mitigation:**
- Gate is always opt-in — users who want fast capture skip it with `n`
- `--git` is separately opt-in, keeping the no-git path lightweight

---

## Consequences

### Positive

1. **Model-switch resilience:** Written file survives context resets; any model picking up mid-skill sees the summary file rather than reconstructing from raw session text.
2. **UX consistency:** "Session summary" appears in the gate prompt and the command name — no separate vocabulary for users to learn.

### Negative

1. **Slightly heavier gate:** `session-summary-agent` does more work than a minimal inline snapshot. Acceptable given the opt-in nature.

### Neutral

1. **No change to session-summary-agent:** This ADR affects prompt language and invocation framing only. The agent itself is unchanged.

---

## Gap Closed: lesson-capture-agent Now Checks for Existing Summary (2026-04-06)

The gate produces a persistent session summary file. `lesson-capture-agent` Phase 2 now checks `{kgPath}/sessions/YYYY-MM/` for a summary written today before asking the user for context. If found, it offers:

> "I found a session summary from today — use it to pre-fill the lesson context? [y] Yes   [n] Ask me instead"

This closes the model-switch fragility loop end-to-end: gate writes the file → agent reads the file → context survives any reset or model switch.

---

## Implementation

**Timeline:** Implemented 2026-04-06 on branch `v0.2.3.2-beta`

**Affected Components:**
- `commands/capture-lesson.md` — Snapshot Gate section updated (this branch)
- `commands/create-adr.md` — Gate language to be updated (ENH-002 full implementation)
- `commands/start-issue-tracking.md` — Gate language to be updated (ENH-002 full implementation)

**Migration Path:**
No migration needed — language-only change in command files. No stored data affected.

---

## Validation

**Success Criteria:**
- Users invoking the gate understand they are running `/kmgraph:session-summary`, not a separate mechanism
- Model switches between gate and `kg_capture` no longer cause context loss (summary file exists on disk)
- No confusion reports distinguishing "snapshot" from "session summary"

**Review Date:** 2026-07-01

---

## Related Decisions

- **[ADR-020](ADR-020-lifecycle-hooks-suite-automated-capture.md):** Lifecycle hooks suite — this gate is part of the same capture-automation layer
- **[ENH-002](../enhancements/ENH-002/ENH-002-specification.md):** Full spec for session snapshot on capture

---

**Decision Made:** 2026-04-06
**Last Updated:** 2026-04-06 (gap closed: lesson-capture-agent Phase 2 now reads today's session summary)
**Status:** Accepted
