---
title: 'ADR-052: docs-impact-scan User-Facing Guide Page'
category:
  uri: uri-that-does-not-map-to-documentation
---

# ADR-052: docs-impact-scan User-Facing Guide Page

**Date:** 2026-06-12
**Status:** Accepted
**Implements:** v0.5.10.5

---

## Context

The docs-impact-scan feature (ADR-036) and its pre-push gate (ADR-050) constitute a significant workflow automation: phrase-triggered diff scanning, user validation, targeted doc dispatch, and a commit-specific completion flag that gates pushes. Despite this, the full workflow was only documented in internal ADRs and single-row table entries in three reference pages (`docs/reference/skills.md`, `docs/pillars/tailoring/automation-layer.md`, `docs/CHEAT-SHEET.md`).

During a pre-push docs-impact-scan run on v0.5.10.5, the gap was identified: no dedicated user-facing guide existed. The complete Gate 3 contract — same-branch-before-push, flag anatomy, eight-step workflow, learned pattern accumulation — was invisible to users unless they read ADR-036 and ADR-050 directly.

Placement was evaluated using Opus (claude-opus-4-7) against the existing docs information architecture.

## Decision

Add `docs/pillars/tailoring/docs-impact-scan.md` — a dedicated user-facing guide covering the full eight-step workflow, the pre-push gate contract, trigger phrases, and learned correction pattern behavior.

**Placement:** `docs/pillars/tailoring/` alongside `automation-layer.md` and `customize-hooks.md`.

**Rationale:** The tailoring pillar owns automation that fires without explicit commands. Docs-impact-scan is a phrase-triggered pre-push automation — a direct fit. Alternative placements rejected:
- `docs/reference/` — reference pages are per-artifact catalogs, not narrative workflow guides
- New `maintaining/` pillar — premature for a single feature; the tailoring pillar already covers this domain
- New `guides/` section — duplicates what pillars already are

## Consequences

- The docs-impact-scan workflow is user-discoverable without reading internal ADRs.
- The Gate 3 pre-push contract (same branch, commit-specific flag) is explicitly documented.
- `docs/pillars/tailoring/index.md` updated to list the new page.
- Learned correction pattern behavior is documented, encouraging KG contribution over time.
- Future docs-impact-scan improvements must update this guide as part of the change.
