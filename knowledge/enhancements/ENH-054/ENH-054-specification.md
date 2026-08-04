---
id: ENH-054
type: Enhancement
status: proposed
github-issue: "#209"
branch: none
created: 2026-07-26
related_adrs: ["ADR-067"]
---

# ENH-054: Full Audit-Trail History Log for Registry Lifecycle Transitions

**Local ID:** ENH-054 | **GitHub Issue:** [#209](https://github.com/technomensch/knowledge-graph/issues/209)

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

**Concrete use case surfaced 2026-07-28, during ADR-067's Fable Review Findings item 13
walkthrough:** a "browse activity across all registered KGs" bulk-read tool was proposed for
a team-lead-on-a-shared-machine scenario, then descoped as not matching how this project's
actual user works (solo, multiple client repos). A sharper, real version of the underlying
need surfaced during that discussion: **shared-login / hot-desk accountability** — e.g. a
federal contractor forced to share a physical desk or log into a shared machine under one
OS account, where multiple people's registered project KGs end up in the same local registry
at different times. Cross-project bleed in that scenario is already fully prevented by
ADR-067 items 1-12 (cwd-based resolution, hard-fail on un-init'd repos, contractor-isolation
never-fall-back-to-personal) — this is a *different* concern: "who touched what, and when,"
an audit/accountability question, not a resolution-correctness one. If ENH-054 is revived,
this is the concrete trigger that would justify it, and the eventual design should carry
forward two constraints noted during that discussion: any read surface here should stay
strictly read-only (never reintroduce write-target ambiguity), and any sort/recency key
should use content-file mtime, not a `lastUsed` registry field (removed under ADR-067 item 4
— it had no reliable writer once `kmg-switch` retired).

## Related

- ADR-067 (`knowledge/decisions/ADR-067-mutable-active-switch-vs-context-derived-kg-resolution.md`)
- `docs/specs/2026-07-26-adr-067-kg-resolution-v0.7-spec.md` — the v0.7 spec this was descoped out of
