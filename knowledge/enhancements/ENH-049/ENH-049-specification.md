---
title: "ENH-044: Concurrent Multi-Repo/Multi-Tool Work with Different Active KGs"
number: 044
status: proposed
version_target: null
github_issue: 180
created: 2026-07-17
related_adrs: ["ADR-067"]
related_enhs: []
notes: "Captures a real, current user pain point; deliberately not scoped/designed yet — see ADR-067 for the underlying open architectural question."
---

# ENH-044: Concurrent Multi-Repo/Multi-Tool Work with Different Active KGs

**Local ID:** ENH-044 | **GitHub Issue:** #180

## Problem Statement

The user is working on two projects at once — one via Claude Code, one via Codex CLI — each needing a different knowledge graph active. In the user's own words:

> "we also need to figure out how I can work in different repos with different graphs at the same time because this is becoming limiting. I'm trying to work on two projects at once, one in claude and one in codex, with different graphs and the constant switching is killing me. I can only imagine what it is like for users"

The current mechanism is a single global `.active` KG switch, changed only via explicit `/kmgraph:kmg-switch` calls. Because there is only one active KG at a time regardless of which repo or tool session is actually in use, working across two concurrent projects requires constantly running the switch command back and forth. This is real, current friction in the user's own daily workflow — not a hypothetical scenario — and it is reasonable to infer that any user working across multiple concurrent projects/tools would hit the same wall.

**This spec captures the NEED only.** It deliberately does not design a solution, propose an implementation approach, or recommend between options (e.g., per-directory context resolution, multiple simultaneous active pointers, tool-scoped state, or anything else). That work is intentionally deferred.

## Related

- **ADR-067** (`knowledge/decisions/ADR-067-mutable-active-switch-vs-context-derived-kg-resolution.md`) is an already-open, undecided architectural decision on directly relevant territory: whether the KG config's `.active` field should remain a single mutable switch (current behavior) or move toward resolving the correct KG from context (e.g., current working directory / repo) rather than a single global pointer. This user pain point is likely the real-world motivating case for resolving ADR-067, but this spec does not attempt to resolve ADR-067 or propose how — it is cross-referenced only.
- Loosely adjacent but distinct: a "personal/project restructuring" idea floated earlier in session planning (tied to ADR-028, possibly v7/npm-distribution scope) touches related territory but addresses a different problem (storage/distribution structure, not concurrent multi-repo/multi-tool active-KG resolution). Not to be conflated with this need.

## Status

Need captured 2026-07-17. Not yet scoped, designed, or triaged for implementation.
