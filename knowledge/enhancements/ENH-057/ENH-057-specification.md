---
title: "ENH-057: Hook active KG name into claude-hud status bar"
number: 057
status: proposed
version_target: null
github_issue: pending
created: 2026-07-28
related_adrs: ["ADR-067"]
related_enhs: []
notes: "Captured as an idea only — not designed, not scoped, not planned."
---

# ENH-057: Hook active KG name into claude-hud status bar

**Local ID:** ENH-057 | **GitHub Issue:** none filed (idea capture only)

## Problem

Idea only, not yet designed: surface the currently-resolved knowledge graph's name in the `claude-hud` status bar plugin, so the active KG is visible at a glance the same way other repo/session context already is — instead of the user needing to ask or run a tool to find out which graph a session is targeting.

## Status

Captured as an idea, 2026-07-28. Not scoped, not designed, not triaged for implementation. Worth revisiting once ADR-067's resolution model ships, since "which KG is this session using" becomes an even more relevant question under the new context-derived resolution model.

## Related

- ADR-067 (`knowledge/decisions/ADR-067-mutable-active-switch-vs-context-derived-kg-resolution.md`) — the resolution model this status-bar display would reflect
