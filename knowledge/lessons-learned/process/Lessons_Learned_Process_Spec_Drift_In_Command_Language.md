---
title: "Spec Drift In Command Language"
created: 2026-04-07T01:48:30.478Z
updated: 2026-04-07T01:48:30.478Z
author: technomensch
git:
  branch: v0.2.3.2-beta
  commit: 0c0c73f2b6e1d3a5c9f4e7b2d8a1c6e0f3b5d7a9
tags: [spec-drift, command-language, snapshot-gate, consistency, process]
category: process
---
## Problem

Command language in the skills and agent specs drifted from the canonical spec as features evolved. Specifically, the Snapshot Gate used the phrase "snapshot the session" in three commands (`capture-lesson`, `create-adr`, `start-issue-tracking`), but the correct mechanic — running a full session summary via `/kmgraph:session-summary` — was never what "snapshot" implied. Users and the model interpreted "snapshot" as a lightweight or bespoke operation, causing confusion and fragility when model context switched mid-session.

## Solution

Audited all three affected commands against the canonical Snapshot Gate spec. Replaced all instances of "snapshot the session" with "run a session summary" and added a `[?]` inline explanation with a transition message. Added a git-inclusion prompt to `start-issue-tracking` to match the other commands. Updated `lesson-capture-agent` Phase 2 to check for today's session summary before prompting the user, offering to pre-fill context — closing the model-switch fragility loop. Documented the design intent and drift in [[ADR-026-snapshot-gate-uses-session-summary]].

## When to apply

Apply this lesson whenever:
- A command or agent spec is updated and the user-facing language changes meaning (even subtly)
- Multiple commands share a mechanic (e.g., Snapshot Gate) — check all of them for consistency, not just the one under active development
- A phrase in a spec could be interpreted differently by different model instances or users — favor explicit, unambiguous verbs over shorthand

Signals to watch for: a command works but users or the model hesitate on a step, ask clarifying questions about what an action does, or skip the step entirely.

## Context

- Branch: v0.2.3.2-beta
- Commit: 0c0c73f2
- Category: process