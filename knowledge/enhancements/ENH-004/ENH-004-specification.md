---
title: 'ENH-004: session-summary optional context-mode event DB integration'
---

# ENH-004: session-summary — Optional context-mode Event DB Integration

**Status:** 🔴 PROPOSED
**Branch:** `v0.2.2-beta`
**Target:** v0.2.2-beta

---

## Problem

`/kmgraph:session-summary` reconstructs what happened in a session after the fact — it reads git history, recent commits, open plan items, and draft ADRs. This archaeology approach works well when sessions have clear git activity, but misses sessions with lots of conversation and few commits (e.g., planning sessions, investigative sessions, Q&A sessions).

Context-mode has a `PreCompact` hook that logs every tool-level event (file edits, git ops, agent spawns) to a SQLite event database as the session progresses. That database is a more complete and accurate record of session activity than git history alone.

The dependency concern: if `session-summary` *requires* the context-mode event DB, it breaks silently for users who don't have context-mode installed. kmgraph is designed to work on all platforms.

---

## Goal

Make `session-summary-agent` optionally aware of context-mode's event database:
- **If context-mode is present:** read from the event DB to get a richer, more accurate picture of session activity, then layer the curated kmgraph narrative on top
- **If context-mode is absent:** fall back to the current git-archaeology approach — no degradation, no errors

---

## Division of Responsibility

| Layer | Owner | What it captures |
|---|---|---|
| Raw event stream | context-mode | Tool calls, file edits, git ops, timestamps |
| Curated narrative | kmgraph | Decisions made, lessons worth capturing, next steps, open items |

These are complementary. kmgraph does not replicate context-mode's event logging — it consumes the stream (when available) to produce better narratives.

---

## Acceptance Criteria

- [ ] `session-summary-agent` checks for context-mode event DB at session start
- [ ] If present: reads recent events to supplement git history (not replace it)
- [ ] If absent: existing git-archaeology path runs unchanged
- [ ] No errors or degraded output when context-mode is not installed
- [ ] Session summary quality visibly improves for low-commit sessions when context-mode is present
- [ ] Detection logic is isolated (easy to update if context-mode's DB path changes)

---

## User Notification (Post-Implementation Docs — DO NOT WRITE UNTIL IMPLEMENTED)

Two notification surfaces, both optional:

**1. GETTING-STARTED.md — Optional Features section**

Add a third entry alongside "Cleaner Conversations" and "Faster Search". Plain-English framing:

> Session summaries are built by looking backwards — reading recent git commits, checking open plans, scanning for lesson-worthy work. This works well when a session has clear git activity.
>
> If context-mode is also installed, session summaries can read a live event log instead. Context-mode tracks everything as it happens — every file edited, every command run, every agent spawned. This catches sessions that were mostly conversation, investigation, or planning with few commits. Those sessions currently produce thin summaries; with context-mode they produce complete ones.
>
> Context-mode is not required. Without it, session summaries work exactly as they do today.

**2. In-summary sparse hint**

When the generated summary is sparse (low-commit session, few items captured), append a single one-time tip:

> *Tip: Install context-mode to improve summaries for sessions like this one — see GETTING-STARTED.md § Optional Features*

Only fire when the summary is actually thin — not as a blanket message every session.

**Sparse threshold definition:** A summary is considered sparse if ALL of the following are true:
- Fewer than 3 commits found in session scope
- Fewer than 2 captured plan items / lessons / ADRs identified
- Summary body is under 200 words after generation

If context-mode is present and the threshold is still met (e.g., a genuine do-nothing session), do NOT show the tip — the user already has context-mode installed.

**Rule:** Neither notification should be written until ENH-004 is fully implemented and tested. Docs written before implementation go stale.

---

## Out of Scope

- kmgraph owning or writing to context-mode's event database
- Requiring context-mode for any kmgraph workflow
- Replacing the git-archaeology fallback path
