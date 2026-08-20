---
title: "ADR-051: Session Summary / Handoff Asymmetric Coupling via continues_from"
number: 051
created: 2026-06-07T00:00:00Z
status: Accepted
author: technomensch
email: 917847+technomensch@users.noreply.github.com
git:
  branch: v0.5.10-ux-session-handoff
  commit: d58462d2
  pr: null
  issue: null
implements: v0.5.10
related:
  adrs: [26, 49, 50]
  lessons: []
  kg_entries: []
tags: [session-summary, handoff, continues_from, coupling, context-transfer]
category: process
---

# ADR-051: Session Summary / Handoff Asymmetric Coupling via `continues_from`

**Date:** 2026-06-07
**Status:** Accepted
**Implements:** v0.5.10
**Related:** [[ADR-026-snapshot-gate-uses-session-summary]] (snapshot gate / session-summary-agent), [[ADR-049-review-audit-protocol-post-plan-pre-push-review-governance]] (Review Audit Protocol), [[ADR-050-pre-push-composite-gate-inline-recommendation-gate]] (pre-push composite gate)

---

## Context

Session summaries (permanent, retrospective) and handoff documents (ephemeral, prospective) both live in `knowledge/sessions/YYYY-MM/` and both capture "what was built." When a single session produces both — completed sub-work plus unfinished work — the "what was built" content is written twice. This is friction at the worst moment: end of a long session with context nearly exhausted.

The relationship between the two document types was undefined. No template or guidance told the author how to handle the overlap case.

Full design analysis: `knowledge/analysis/session-summary-vs-handoff-comparison.md`

**Why not consolidate into one document type?**

Consolidation was evaluated and rejected on three grounds:

1. **Lifecycle conflict** — Summaries are permanent (archival). Handoffs are ephemeral (consumed and deleted). A single type forces one lifecycle on both.
2. **Tense/voice conflict** — Summaries are retrospective/narrative. Handoffs are imperative/forward-looking. A merged doc produces awkward mixed tense.
3. **Trigger conflict** — Summaries trigger on completion. Handoffs trigger on interruption. A unified type with optional sections creates "which half do I fill in?" friction at every session end.

---

## Decision

Two document types, asymmetrically coupled. **Handoff points to summary. Summary has no awareness of handoffs.**

```
session-summary.md  ←─── (referenced by) ─── handoff.md
   permanent                                   ephemeral
   retrospective                               prospective
   archival                                    operational
```

Add an optional `continues_from` field to handoff documents. When set, the handoff's "What Was Completed" section collapses to a one-liner:

> "See `continues_from` summary for completed work. This handoff covers unfinished work only."

**Field value:** repo-relative path to the session summary, e.g. `knowledge/sessions/2026-05/2026-05-28-session-summary.md`.

**Where the field lives:**
- Session-style handoff YAML frontmatter (single `.md` in `knowledge/sessions/YYYY-MM/`)
- START-HERE.md header block in the package handoff output (`./handoff-packages/YYYY-MM-DD/`)
- NOT in the session-summary template — asymmetry is intentional

**Coupling direction:** one-way only. Handoff → summary. Deleting an ephemeral handoff never leaves a dangling reference inside a permanent archive.

**Optionality:** field is optional. Old handoffs without it remain valid. No migration required.

---

## Rationale

Asymmetric coupling solves the duplication problem while preserving the load-bearing differences between the two types:

- The prospective/ephemeral doc (handoff) may know about the retrospective/permanent doc (summary) — this is safe because the handoff is consumed and often deleted
- The permanent/archival doc (summary) must not reference the ephemeral doc — a dangling reference in a permanent archive is noise at best, confusion at worst
- One optional frontmatter field is the minimum change that eliminates duplication without requiring template redesign or migration

**Intended consumers of `continues_from`:**
1. `/kmgraph:recall` and FTS5 search — follow-the-thread pointer for session continuity queries
2. Future session-resume flow — hydrate "what was already done" by opening the linked summary instead of re-deriving it

No new tooling is built in v0.5.10. The field is additive metadata; consumers are documented here for future implementation reference.

---

## Consequences

### Positive

1. **Eliminates end-of-session duplication** — authors reference the summary instead of rewriting completed work
2. **No migration burden** — field is optional; absence on old files is valid
3. **Preserves document identity** — both types keep their distinct lifecycle, tone, and trigger

### Negative

1. **Indirect access** — readers of a handoff must follow the `continues_from` link to see completed work (one extra hop)
2. **Author discipline required** — field is optional, so authors must remember to set it; no enforcement gate

### Neutral

1. **Two handoff shapes** — session-style (YAML frontmatter) and package-style (START-HERE.md header block) both carry the field; implementation touches both shapes

---

## Related Decisions

- **[ADR-026](ADR-026-session-summary-snapshot-gate.md):** Session-summary-agent is the canonical "completed work" artifact; confirms session-summary is the right target for `continues_from`
- **[ADR-049](ADR-049-review-audit-protocol-post-plan-pre-push-review-governance.md):** Review Audit Protocol — the cascade check gate this change routes through
- **[ADR-050](ADR-050-pre-push-composite-gate-inline-recommendation-gate.md):** Pre-push composite gate

---

## Related Documentation

- `knowledge/analysis/session-summary-vs-handoff-comparison.md` — full Opus design analysis
- `knowledge/enhancements/ENH-021/ENH-021-specification.md` — enhancement spec with spec-vs-reality findings
- `commands/handoff.md` — updated in v0.5.10 to include `continues_from` field
- `commands/session-summary.md` — updated in v0.5.10 with pairing guidance note

---

**Decision Made:** 2026-06-07
**Last Updated:** 2026-06-07
**Status:** Accepted
