---
id: ENH-054
type: Enhancement
status: proposed
github-issue: null
branch: none
created: 2026-07-26
related_adrs: ["ADR-067"]
---

# ENH-054: Full Audit-Trail History Log for Registry Lifecycle Transitions

**Local ID:** ENH-054 | **GitHub Issue:** none filed (captured only, deferred to future scoping)

## Problem Statement

Surfaced during the v0.7 (ADR-067) brainstorm on KG resolution, specifically the registry
lifecycle question (archive/delete/restore of a registered project-local KG entry). The
v0.7 spec adopts a lightweight model — a `status` field (`active`/`archived`/`deleted`) plus
a single `statusChangedAt` timestamp (and optionally the acting `github user`, if
applicable) on each registry entry. That covers the stated need: tell the user when a graph
was archived, offer to restore it, never silently write through to an archived entry.

A **full history log** — every transition an entry has ever gone through (archived → restored
→ archived again, etc.), not just its current status — was explicitly considered and
deferred as unnecessary for v0.7. It would only matter for questions like "how many times
has this been archived," which isn't a need that's shown up yet.

## Notes

Request captured only during a brainstorm session — YAGNI'd out of the v0.7 scope
deliberately (see `docs/specs/2026-07-26-adr-067-kg-resolution-v0.7-spec.md`), not because it's a
bad idea, but because the lightweight status+timestamp model already satisfies every
concrete requirement discussed. Revisit only if a real need for multi-transition history
shows up in practice.

## Related

- ADR-067 (`knowledge/decisions/ADR-067-mutable-active-switch-vs-context-derived-kg-resolution.md`)
- `docs/specs/2026-07-26-adr-067-kg-resolution-v0.7-spec.md` — the v0.7 spec this was descoped out of
