---
title: "ENH-003: doc-update-router skill"
local-id: ENH-003
type: enhancement
status: proposed
created: 2026-03-29
version-target: 0.2.2
---

# ENH-003: doc-update-router — Extensible Routing Skill for Doc Updates

**Status:** 🔴 PROPOSED
**Branch:** `v0.2.2-beta`
**Target:** v0.2.2-beta

---

## Problem

Two gaps exist in the current skill coverage:

1. When the user says "update [doc name]" or "update this doc", there is no skill to intercept that intent and route it through `/kmgraph:update-doc --user-facing`. Claude either edits the file directly (bypassing the wizard and standards validation) or does nothing.

2. When the user says "update today's session summary" or "update the current session summary" mid-session, `session-wrap` does not fire — it only triggers on end-of-session signals. The request falls through with no routing.

Both gaps result in doc updates happening outside the established workflows, bypassing standards validation, changelog enforcement, and the update-doc wizard.

---

## Goal

A single `doc-update-router` skill with an extensible routing table that:
- Intercepts explicit doc-update intent from the user
- Routes to the correct command based on what was requested
- Can be extended by adding rows to the routing table — no structural changes needed

---

## Routing Table (Initial)

| User says | Routes to |
|---|---|
| "update [doc name]", "update this doc", "update the docs" | `/kmgraph:update-doc --user-facing` with resolved file path |
| "update today's session summary", "update the current session summary", "update the session" | `/kmgraph:session-summary` |
| "update the changelog" | `/kmgraph:update-doc --user-facing CHANGELOG.md` |
| "update the ADR" | `/kmgraph:create-adr` |

New rows can be added at any time without creating new issues or skills.

---

## Acceptance Criteria

- [ ] Skill file created at `skills/doc-update-router/SKILL.md`
- [ ] Triggers on: "update [doc]", "update this doc", "update today's session summary", "update the session summary", "update the current session summary"
- [ ] Routes to correct command for each trigger pattern
- [ ] Does NOT trigger on general edits or non-doc-update phrases
- [ ] Routing table is documented and clearly extensible
- [ ] `session-wrap` skill not duplicated — router only fires on explicit update requests, not end-of-session signals

---

## Out of Scope

- Automatic detection of which docs need updating (that's the Documentation Update Rule in CLAUDE.md)
- Auto-triggering after commits (that's the `feedback_docs_update_on_command_change` memory)
- Replacing `session-wrap` — the router handles explicit requests; `session-wrap` handles end-of-session detection
