---
id: ENH-053
type: Enhancement
status: proposed
github-issue: "#208"
branch: none
created: 2026-07-26
related_adrs: ["ADR-067"]
---

# ENH-053: Topic-KGs Spanning Multiple Related Projects (Not User-Graph, Not Single-Project)

**Local ID:** ENH-053 | **GitHub Issue:** [#208](https://github.com/technomensch/knowledge-graph/issues/208)

## Problem Statement

Surfaced during the v0.7 (ADR-067) brainstorm on KG resolution. Today's model has exactly
two KG shapes: project-local (many, one per repo) and personal (exactly one, cross-project).
There's a third shape not yet designed for: a small cluster of *related* projects that want
a shared KG that is neither scoped to one repo nor as broad as the single personal graph —
e.g. several repos under one client, product line, or initiative that should share captured
knowledge without polluting the single all-purpose personal KG.

This is explicitly **out of scope for the v0.7 ADR-067 resolution work** — the current
project is designed around per-project and per-person graphs, not topic/grouping graphs,
and no real usage pattern for this has been observed yet. Captured here so the idea isn't
lost, not because it's blocking anything today.

## Notes

Request captured only during a brainstorm session — scope, naming, registry mechanics, and
UX are all undesigned. Revisit only if a real multi-project-cluster use case shows up in
practice; don't design speculatively ahead of that.

## Related

- ADR-067 (`knowledge/decisions/ADR-067-mutable-active-switch-vs-context-derived-kg-resolution.md`) — the KG resolution model this would eventually need to slot into
- `docs/specs/2026-07-26-adr-067-kg-resolution-v0.7-spec.md` — the v0.7 spec this was descoped out of
- issue-30 (`knowledge/issues/issue-30/issue-30-description.md`) — cited this ENH's lightweight, deferred "write it down" capture precedent (no branch/PR overhead) when scoping its own `kmg-handoff`/`kmg-session-wrap` fix
