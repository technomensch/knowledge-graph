---
title: >-
  ADR-046: Introduce concept+setup hybrid page type and document how-to guide
  pattern separately from narrative guides
number: 38
created: 2026-04-28T00:00:00.000Z
status: Accepted
author: technomensch
email: 917847+technomensch@users.noreply.github.com
git:
  branch: docs-update-command-guide-formatting
  commit: 35bcf15699debf6969f29c0627f5c2f10b10d24f
  pr: null
  issue: null
implements: null
related:
  adrs: []
  lessons: []
  kg_entries: []
tags:
  - architecture
  - documentation
  - style-guide
category: architecture
---

# ADR-046: Introduce concept+setup hybrid page type and document how-to guide pattern separately from narrative guides

**Date:** 2026-04-28
**Status:** Accepted
**Implements:** null
**Related:** None

---

## Context

The style guide (`docs/STYLE-GUIDE.md`) section 4a documented a single "guide page pattern" intended for narrative guides (`GETTING-STARTED.md`, `CONFIGURATION.md`, `WORKFLOWS.md`). However, step-by-step how-to guides in `docs/guides/` evolved organically using a different pattern: Goal / Prerequisites / Steps / Verify. This pattern is consistent across all existing how-to guides but was never documented in the style guide.

Additionally, some guide pages (e.g. `me-and-rules.mdx`) are hybrids — they explain a system conceptually AND include a setup how-to — and fit neither the narrative guide pattern nor the step-by-step pattern cleanly.

**Problem:**
- The style guide's single guide pattern did not match what was actually in the codebase
- New contributors had no documented pattern to follow for how-to guides
- Hybrid pages had no recognised type, making authoring guidance ambiguous

**Scope:**
- In scope: `docs/STYLE-GUIDE.md` section additions; classification of existing guide pages
- Out of scope: Renaming or restructuring existing files; changes to `docs/guides/` content

---

## Decision

1. Add style guide section 4g documenting the how-to task guide pattern (Goal / Prerequisites / Steps / Verify) as the standard for step-by-step guides in `docs/guides/`
2. Retain section 4a for narrative guides only (`GETTING-STARTED.md`, `CONFIGURATION.md`, `WORKFLOWS.md`)
3. Recognise concept+setup hybrid pages as a distinct type — they follow conceptual structure with embedded imperative setup sections, not the step-by-step pattern

### Core Components

1. **Section 4g (how-to task guide pattern):** Goal / Prerequisites / Steps / Verify — applies to `docs/guides/` step-by-step pages
2. **Section 4a (narrative guide pattern):** Retained unchanged for the three main narrative guides
3. **Concept+setup hybrid type:** Named and described as a distinct page type; examples: `me-and-rules.mdx`, `platform-adaptation.mdx`

### Implementation Approach

Update `docs/STYLE-GUIDE.md` to add section 4g and add explicit "Apply to:" lines to section 4a distinguishing it from the new how-to pattern. Document the hybrid type as a third variant with named examples.

---

## Rationale

The existing how-to guides are consistent and user-friendly in their current form. Forcing them into the 4a narrative pattern would make them worse — the Goal / Prerequisites / Steps / Verify structure is task-oriented and scannable, while 4a is narrative-oriented.

The hybrid type (`me-and-rules`, `platform-adaptation`) serves users who need both conceptual understanding and actionable setup in one place. Neither the narrative nor the step-by-step pattern covers this adequately.

### Why This Approach

1. **Accuracy:** The style guide should reflect what is actually in the codebase, not prescribe a pattern that existing files do not follow
2. **Usability:** The how-to pattern is already proven and user-friendly; documenting it preserves that quality
3. **Disambiguation:** Explicit "Apply to:" labels in the style guide make the authoring choice obvious without requiring judgment calls

### Alternatives Considered

**Option A: Merge all guides under section 4a**
- Pros: Single pattern, simpler style guide
- Cons: Forces narrative structure onto task-oriented content; degrades usability of how-to guides
- Rejected because: Existing guides are good; the pattern should match the content type

**Option B: Leave how-to guides undocumented**
- Pros: No style guide changes needed
- Cons: New contributors have no guidance; hybrid pages remain undefined
- Rejected because: Undocumented patterns invite inconsistency over time

### Trade-offs

**Benefits:**
- Clearer authoring guidance; new contributors have an explicit pattern for how-to guides
- Style guide accurately reflects what is actually in the codebase
- Hybrid type is named and examples are provided

**Costs:**
- Three page types now exist (narrative guide, how-to task guide, concept+setup hybrid) — authors must choose the right one

**Mitigation:**
- Section headers and "Apply to:" lines in the style guide make the choice obvious

---

## Consequences

### Positive

1. **Authoring clarity:** New contributors have an explicit pattern to follow for how-to guides in `docs/guides/`
2. **Accuracy:** Style guide accurately reflects what is actually in the codebase rather than prescribing an unused pattern

### Negative

1. **Three-way choice:** Authors must now choose between three page types (narrative guide, how-to task guide, concept+setup hybrid)

### Neutral

1. **No file renames:** Existing files are unchanged; only the style guide gains new sections

---

## Implementation

**Timeline:** Implemented alongside `docs/STYLE-GUIDE.md` update (2026-04-28)

**Affected Components:**
- `docs/STYLE-GUIDE.md` — sections 4a and 4g updated; concept+setup hybrid type added

**Migration Path:**
No migration required. Existing files are already compliant with the newly documented patterns.

---

## Validation

**Success Criteria:**
- Section 4g exists in `docs/STYLE-GUIDE.md` with Goal / Prerequisites / Steps / Verify pattern documented
- Section 4a has explicit "Apply to:" scope limiting it to narrative guides
- Concept+setup hybrid type is named and at least two examples are cited

**Review Date:** 2027-04-28

---

## Related Decisions

- **[ADR-027](ADR-027-docusaurus-restructure-diataxis-docs-feed.md):** Docusaurus restructure using Diátaxis — established narrative vs. reference vs. guide separation

---

## Future Considerations

1. **Additional hybrid types:** If new content patterns emerge that fit neither narrative nor how-to, extend the style guide rather than force-fitting
2. **Linting:** A future docs linter could validate that files in `docs/guides/` follow the how-to pattern structure

---

**Decision Made:** 2026-04-28
**Last Updated:** 2026-04-28
**Status:** Accepted
