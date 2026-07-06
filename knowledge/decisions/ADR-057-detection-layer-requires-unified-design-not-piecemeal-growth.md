---
title: "ADR-057: Detection layer requires unified design, not piecemeal growth"
number: 057
status: Accepted
date: 2026-07-01
author: technomensch
email: mkitact@gmail.com
git:
  branch: v0.6.15-fix-init-completeness
  commit: 723622307d08714757c60b526d29ca15c0fdd461
  pr: null
  issue: null
implements: null
related:
  adrs: [034, 045, 056]
  lessons: []
  kg_entries:
    - knowledge/enhancements/ENH-006/ENH-006-specification.md
    - knowledge/enhancements/ENH-008/ENH-008-specification.md
tags: [architecture, detection-layer, skills, capture, classifier, auto-capture-pipeline]
category: architecture
---

# ADR-057: Detection layer requires unified design, not piecemeal growth

**Date:** 2026-07-01
**Status:** Accepted — investigation settled 2026-07-03 (final decision: no consolidation)
**Implements:** No implementation required. The final decision is "no change" to the 5 skills, apart from two minor items: (1) clean up `rules-capture-agent`'s input contract into a pure write-executor, and (2) add a shared trigger-fixture file. See the Decision section.
**Related:** [ADR-034](ADR-034-capture-level-routing-dispatcher-agent-split.md) (the one genuinely unified capture system — destination routing, not detection), [ADR-045](ADR-045-update-profile-skill-not-command.md) (the "consistent with" admission), [ADR-056](ADR-056-reject-plugin-split-for-contributor-only-doc-commands.md) (sibling piecemeal-growth finding from the same session), ENH-006, ENH-008 (prior-art evidence)

---

## Context

kmgraph has **5 skills** that each independently detect a knowledge-worthy signal in conversation and dispatch to a drafting agent:

1. `kmg-lesson-capture` — detects bug-solved / breakthrough signals
2. `kmg-adr-guide` — detects architectural-decision signals
3. `kmg-rules-capture` — detects implicit behavioral-correction signals
4. `kmg-update-profile` — detects profile-update requests
5. `kmg-capture-router` — detects explicit "capture that / remember that" phrasing

The maintainer had assumed these were part of a deliberately unified "detection layer" architecture. A recall investigation this session (2026-07-01) **disproved that assumption.**

**Problem:**
- Whether the detection layer is a designed architecture or an accreted set of one-offs determines how it should evolve — patch the individual skills, or consolidate them.
- The investigation needed to establish, from KG evidence, whether any governing spec ever unified *when/how these 5 skills fire*.

**Scope:**
- In scope: the architectural characterization of the 5-skill detection/trigger front-end, and the decision on its eventual direction.
- Out of scope: the exact shape of the consolidated classifier (depends on the still-in-progress parent auto-capture pipeline design — see "Relationship to the larger auto-capture redesign").

**Evidence gathered (recall investigation, 2026-07-01):**

- **Two creation waves, no unifying spec.** `lesson-capture` and `adr-guide` were both created 2026-02-27 in one generic batch commit (`739181b1`, "Add skills and subagents layer") alongside 3 other skills — no governing ENH/ADR at creation.
- `capture-router` created 2026-03-30 under **ENH-008**, bundled into a release commit with 3 unrelated ENHs (ENH-005, ENH-006, ENH-007) — a narrowly-scoped one-off gap fix, not a detection-layer initiative.
- `rules-capture` created 2026-04-10 with no governing ENH/ADR at creation. Its interactions with `lesson-capture` (exclusion added) and `capture-router` (routing fix) were patched in reactively **within 1 day** of creation — evidence of retrofitted coupling, not upfront co-design.
- `update-profile` created 2026-04-23 under **ADR-045**. ADR-045's own text is the clinching evidence: its "Neutral" consequences section states the skill approach is merely *"consistent with how other behavioral enforcements (rules-capture, lesson-capture, adr-guide) are implemented in kmgraph"* — i.e. it explicitly **followed an observed pattern rather than a designed architecture.** This is the closest thing to a unifying rationale anywhere in the KG, and it explicitly is not one.
- **ENH-006** (2026-03-30) found and fixed keyword-detection gaps in *both* `lesson-capture` and `adr-guide` in the same audit, but logged them as two separate lettered problems (B and C) — evaluated as independent one-off defects, not components of one system.
- The only genuinely unified shared system found is **ADR-034** (`gov-capture-routing`, 2026-04-15) — but that governs write **destination** (which KG: user / project / named), not detection **trigger logic**. No ADR unifies when/how these 5 skills fire.

**Consequence of piecemeal growth:** each skill independently re-implements NL pattern detection for its own trigger vocabulary, with no shared classification logic, no consistent confidence/precision model across skills, and cross-skill exclusions (e.g. `rules-capture` excluding `lesson-capture`'s territory) maintained as ad-hoc patches rather than a single source of truth.

---

## Decision

**Keep all 5 detection skills as separate, standalone files.** No consolidation. `kmg-capture-router`, `kmg-update-profile`, `kmg-lesson-capture`, `kmg-adr-guide`, `kmg-rules-capture` remain exactly as they are today, each owning its own trigger vocabulary.

Two small changes only:
1. `rules-capture-agent`'s input contract is cleaned up into a pure write-executor (`{target_file, rule_text, scope, source_quote, session_context}` in, write + confirm out) — internal hygiene, not a behavior change.
2. A shared test-fixture file (`skills/tests/trigger-fixtures.md`) is added, listing representative utterances with their expected owning skill, referenced from each skill's Conflict Avoidance section — a lightweight guardrail against trigger-vocabulary drift between the peer skills over time, addressing this ADR's original "no shared confidence model" finding without merging anything.

## Investigation Summary

This ADR originally characterized the 5-skill detection layer as accreted, not designed (see Context/Evidence above), and proposed consolidation. Four rounds of investigation on 2026-07-03 tested various consolidation architectures; each was rejected on independent review:

- **Full consolidation into 1 new skill** — rejected: Claude Code skills match by description; one skill spanning 5 signal types dilutes trigger precision.
- **Shared engine for 3 of 5 skills, 2 left standalone** — rejected: `kmg-capture-router` reinforcement tested and found to violate its own documented non-overlap design.
- **`kmg-capture-router` restored as sole engine for all 5 (5→2)** — rejected: independent review found "zero capability lost" was false; 13+ real behaviors (platform detection, cascade scans, exclusion guards, flag-file dependencies used by other skills) had no proposed destination.
- **Full capability mapping + lightweight `kmg-capture-rules` intermediate (5→3)** — every capability mapped to a real home, but independent review found the router's description still had to broaden materially (reintroducing the precision problem), interactive target-override for rules couldn't survive moving into a subagent, and two behaviors (session-level suppression, dual-fire on one utterance) had no owner in the new design.

Applying the same reasoning that killed the last proposal to `kmg-lesson-capture`/`kmg-adr-guide` as well: their implicit-trigger vocabulary has the identical relationship to the router's Conflict Avoidance section that killed the rules-capture merge. No version of consolidation survived independent scrutiny. The evidence for *why the skills grew piecemeal* (Context/Evidence section above) still stands — it's the *fix* that didn't hold up.

## Full Investigation Record

The complete same-day investigation — all 4 rejected architectures in full detail, the specific factual errors found (including a `head -20`-truncated grep that produced a false bug report), the capability inventory, and both independent reviewers' full critiques — is preserved in this session's extracted chat history:
`knowledge/chat-history/2026-07/2026-07-03-claude.md`

**Note for future consideration (not scoped as an ENH):** extracting a working session's chat history and linking it as a reference from the governing ADR — rather than preserving every intermediate step inline in the document itself — may be worth adopting as a general technique for other long, iterative investigations in this project. Flagged here for awareness; not formally captured as its own enhancement.

---

## Scope note (important)

**This ADR documents the decision and its evidence only.** It is explicitly **one component** of a larger, still-in-progress redesign of kmgraph's automatic knowledge-capture pipeline being brainstormed in the same working session (2026-07-01).

### Relationship to the larger auto-capture redesign

The parent redesign also covers:
- A tiered `capture_mode` (silent / summary / full-review) confirmation gate, configurable per-KG and per-category in `kg-config.json`.
- An auto-draft / single-approval model for local writes.
- Explicit separation between **local capture** (can be automated) and **propagation** to plan / issue / GitHub (must always stay manually confirmed, never silent).

That larger pipeline design is **not yet finalized** and does **not yet have its own ADR/ENH number** as of this writing.

### Deferred implementation — CORRECTED, see Amendments (2026-07-03)

~~Do NOT write an implementation ENH for detection-layer consolidation yet. The classifier's exact shape depends on decisions not yet locked in the parent design (e.g. how `capture_mode` routing interacts with classification).~~

**This reasoning was tested and found false — see "Amendments" section below.** `capture_mode` is a downstream consumer of the classifier's output, not a co-dependency. The consolidation ENH is ready to be specced now — **filed as [ENH-036](../enhancements/ENH-036/ENH-036-specification.md)** under the ADR-058 umbrella.

1. The consolidation ENH is folded into the umbrella naming/governance ADR as a ready-now item, alongside **ADR-056 / ENH-033** (contributor-vs-user command scoping) and the chat-history backfill extractor ENH.
2. That umbrella ADR cites **this ADR (ADR-057)** as one of its governing decisions.
3. **Forward cross-reference:** update this section with the real ENH number once the consolidation ENH is filed.

---

## Rationale

### Why this approach

1. **The evidence is decisive.** Every one of the 5 skills traces to either a generic batch commit, a one-off gap-fix ENH bundled with unrelated work, or a create-then-patch-within-a-day sequence. No artifact anywhere in the KG designs the detection layer as a system. ADR-045 self-describes as pattern-following, not architecture.
2. **Detection is the layer that should be unified; drafting is not.** All 5 skills do the *same kind* of work (NL signal detection + type discrimination) and currently duplicate it. The drafting agents do *genuinely different* work (different artifacts, templates, destinations) and correctly stay separate. Consolidating detection removes duplication without collapsing things that are legitimately distinct.
3. **A single classifier gives a consistent precision/confidence model.** Today each skill has its own ad-hoc trigger vocabulary and no shared confidence model; cross-skill exclusions are patches. One classifier is the natural home for a single source of truth on when a signal fires and which type it is.
4. **Deferring the ENH is correct, not procrastination.** The classifier's shape is genuinely dependent on unresolved parent-design questions (`capture_mode` routing). Filing an ENH now would lock a shape that the parent design may invalidate.

### Alternatives Considered

**Option A: Patch each skill independently (status quo continued)**
- Pros: no architectural change; each fix is small and local.
- Cons: perpetuates duplicated NL detection, inconsistent confidence models, and ad-hoc cross-skill exclusions; every new capture type adds a 6th, 7th independent detector.
- Rejected because: it is the exact pattern this ADR identifies as unsound; it does not scale and keeps the coupling implicit.

**Option B: Consolidate detection AND drafting into one mega-skill**
- Pros: maximal unification.
- Cons: collapses genuinely different artifact-production logic (lesson vs. ADR vs. rules vs. profile) into one place; the drafting agents produce different outputs with different templates and destinations.
- Rejected because: it over-unifies — the drafting agents are correctly separate.

**Option C: Consolidate detection/classification only; keep drafting agents separate (chosen)**
- Pros: removes the actual duplication (detection); preserves legitimate separation (drafting); gives one home for the confidence/exclusion model.
- Cons: requires a classifier design that depends on the not-yet-final parent pipeline.
- Selected because: it targets the real defect and defers only the part that genuinely depends on unresolved upstream decisions.

### Trade-offs

**Benefits:**
- ✅ Single source of truth for detection triggers and cross-type exclusions.
- ✅ Consistent confidence/precision model across all capture types.
- ✅ New capture types extend one classifier rather than adding another standalone detector.

**Costs:**
- ❌ No immediate fix — implementation is deferred pending the parent design.
- ❌ Risk of a dangling forward reference if the future ENH link is never closed (mitigated by the explicit "pending — to be linked" marker above).

**Mitigation:**
- The deferral is bounded to the parent auto-capture pipeline design; this ADR names the exact dependency and the exact follow-up (a citing ENH).

---

## Consequences

### Positive

1. **Assumption corrected:** the maintainer now has evidence-backed clarity that the detection layer was never designed as a system.
2. **Direction set:** future work has a decided target (single classifier front-end, separate drafting agents) rather than continued ad-hoc patching.
3. **Governance anchor:** the future consolidation ENH has a governing ADR to cite.

### Negative

1. **No shipped change yet:** the fragmentation persists until the parent design finalizes and the ENH lands.

### Neutral

1. **Contrast with ADR-034 is now explicit:** destination routing *is* unified (`gov-capture-routing`); detection is *not*. This ADR names that asymmetry rather than leaving it implicit.

---

## Prior Discussion / Evidence Sources

- **ENH-006** (`knowledge/enhancements/ENH-006/ENH-006-specification.md`) — the keyword-gap audit that treated `lesson-capture` and `adr-guide` gaps as two separate lettered problems (B and C), evidencing that they were seen as independent defects rather than one system.
- **ENH-008** (`knowledge/enhancements/ENH-008/ENH-008-specification.md`) — `capture-router`'s origin as a one-off gap fix, bundled with unrelated ENHs.
- **ADR-045** (`ADR-045-update-profile-skill-not-command.md`) — the "consistent with how other behavioral enforcements ... are implemented" admission; closest thing to a unifying rationale, and explicitly not one.
- **ADR-034** (`ADR-034-capture-level-routing-dispatcher-agent-split.md`) — the one genuinely unified shared capture system, governing write *destination* (which KG), not detection *trigger logic*; contrasted here against the absence of an equivalent for detection.
- **ADR-056** (`ADR-056-reject-plugin-split-for-contributor-only-doc-commands.md`) — sibling finding from the same session, a different layer of the same overall "system got confusing through piecemeal growth" theme.

---

## Related Decisions

- **[ADR-034](ADR-034-capture-level-routing-dispatcher-agent-split.md):** Unified *destination* routing; this ADR identifies the missing unified *detection* counterpart.
- **[ADR-045](ADR-045-update-profile-skill-not-command.md):** Its "consistent with" wording is the clinching evidence of pattern-following over design.
- **[ADR-056](ADR-056-reject-plugin-split-for-contributor-only-doc-commands.md):** Same-session sibling finding on piecemeal growth in the doc-command layer.
- **[ADR-058](ADR-058-naming-scope-upfront-check-for-new-commands-skills-docstrings.md):** Cites this ADR as evidence — the architectural-accretion instance of the broader process gap it governs. ADR-058's governance layer sits above this decision; the DETECT-layer consolidation ENH unblocked by this ADR's 2026-07-03 amendment is filed as **ENH-036** under ADR-058's umbrella.

---

## Future Considerations

1. ~~File the consolidation ENH once the parent auto-capture pipeline design is finalized~~ — **superseded, see Amendments below: the dependency this deferral was based on does not hold. The ENH is no longer blocked.**
2. **Close the forward-reference loop:** ~~update this ADR's "Deferred implementation" marker with the real ENH number when it exists.~~ **Done (2026-07-03): the consolidation ENH is [ENH-036](../enhancements/ENH-036/ENH-036-specification.md), governed by ADR-057 and ADR-058.**
3. **Classifier precision model:** decide how a single confidence model reconciles the 5 previously-independent trigger vocabularies without regressing any current trigger's recall. **This is now the actual open dependency — see Amendments.**

---

## Amendments

*(The four append-only amendments originally recorded here — one per rejected consolidation architecture, all dated 2026-07-03 — have been consolidated into the "Investigation Summary" and "Full Investigation Record" sections above as part of the 2026-07-03 settlement pass. The full blow-by-blow, including both independent reviewers' critiques and the specific factual errors found, is preserved in the extracted chat history at `knowledge/chat-history/2026-07/2026-07-03-claude.md`. Nothing was hidden — this is a readability consolidation, not a deletion of the record.)*

---

**Decision Made:** 2026-07-01
**Last Updated:** 2026-07-03
**Status:** Accepted — settled 2026-07-03. Final decision: **no consolidation** — all 5 detection skills remain separate, standalone files, with two minor changes only (`rules-capture-agent` contract cleanup + a shared trigger-fixture file). The four consolidation architectures explored across 2026-07-03 were each rejected on independent review; see the Investigation Summary above and the full record at `knowledge/chat-history/2026-07/2026-07-03-claude.md`.
