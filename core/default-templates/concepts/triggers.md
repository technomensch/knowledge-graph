# Triggers — When to Apply Rules

> This file maps workflow phases to rules from `rules.md`. All AI platforms read this
> alongside `rules.md`. Entries here are additive — user-level triggers always apply;
> project-level entries extend (never replace) them.
>
> **Project-level narrowing:** a project entry may add a condition to a user trigger
> (e.g., "skip if plan has fewer than 3 tasks") but must not remove it entirely.

---

- Gate: check `rules.md § Plan Protocol > Plan File Routing` (in this file or the active project's `rules.md`) before defaulting to `docs/plans/` — use the matching artifact path if one is defined

## After writing an implementation plan

- Apply: `rules.md § Plan Protocol > Parallelism Analysis`
- Apply: `rules.md § Plan Protocol > Acceptance Criteria`
- Apply: `rules.md § Plan Protocol > Execution & Gating` (open plan file in editor)

## Before producing an inline recommendation

- Gate: a prompt asks a recommendation/advice question inline without invoking a skill (phrasing: "what could we do", "how should we approach", "what's the best way", "any ideas/recommendations/thoughts on", "what are my options", "how to best", or similar)
- Apply: `rules.md § Architectural Proposals > Cascading Impact Analysis`
- Apply: `rules.md § Review Protocol > ADR Pre-Check Before Surfacing a Finding`
- Required before answering:
  1. Invoke `kmgraph:recall` on the topic — show results under "Prior Art"
  2. ADR pre-check — search `knowledge/decisions/` for covering ADRs
  3. Note cascade / blast-radius of proposed options
  4. Root-cause gate — determine root cause vs symptom; if symptom-only, surface root cause first
- Gate: do not produce the recommendation before these steps run

## Before committing

- Apply: `rules.md § Knowledge Capture > Plan-First Rule`
- Apply: `rules.md § Knowledge Capture > Branch-Close Rule`

## When making an architecture decision

- Apply: `rules.md § Knowledge Capture > When to Capture` (ADR trigger condition)

## At session end

- Apply: `rules.md § Knowledge Capture > Cadence & Routing` (run /kmgraph:sync-all)
