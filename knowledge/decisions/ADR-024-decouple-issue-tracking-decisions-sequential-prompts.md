---
title: "ADR-024: Decouple Issue Tracking Decisions into Four Independent Sequential Prompts"
number: 024
created: 2026-03-30T00:00:00Z
status: Accepted
author: technomensch
email: 917847+technomensch@users.noreply.github.com
git:
  branch: v0.2.2-beta
  commit: 9a2f62601069a73d504bba67d1b41e5a281658b0
  pr: null
  issue: null
implements: v0.2.2-beta
related:
  adrs: []
  lessons: []
  kg_entries: [docs/enhancements/ENH-006/]
tags: [process, command-ux, issue-tracking]
category: process
---

# ADR-024: Decouple Issue Tracking Decisions into Four Independent Sequential Prompts

**Date:** 2026-03-30
**Status:** Accepted
**Implements:** v0.2.2-beta
**Related:** [ENH-006](../enhancements/ENH-006/)

---

## Context

The `start-issue-tracking` command previously batched multiple prompts (Steps 1.1, 1.2, 5.0) into a single output block, conflating unrelated concerns: issue type was mixed with version increment strategy and branch strategy, and there was no plan management question.

**Problem:**
- Batched multi-part prompts produced ambiguous answers (e.g., "1 and 3" could mean "new feature version but stay on current branch" — but this mapping was implicit and error-prone)
- Issue type, version increment strategy, branch strategy, and plan management are independent decisions; bundling them forced the model to interpret composite answers
- No prompt existed for plan management, so that decision was silently skipped
- Enforcement gates at Steps 6.2 (lesson capture) and 6.4 (ROADMAP + CHANGELOG sync) were absent, allowing implementation to begin before required documentation was updated

**Scope:**
- In scope: Step 1 prompt structure, enforcement gates at Steps 6.2 and 6.4, prerequisite check in `gov-execute-plan`
- Out of scope: Changes to issue templates, lesson capture content, or ROADMAP format

---

## Decision

Replace the batched/conflated Step 1 with four fully independent sequential prompts — Type, Version Impact, Branch, and Plan — each asked one at a time with the model waiting for an explicit answer before proceeding. Add enforcement gates at Steps 6.2 and 6.4, and add a prerequisite check in `gov-execute-plan` that blocks implementation start if Step 6.4 was not completed.

### Core Components

1. **Sequential Type Prompt:** Ask issue type (bug / feature / enhancement / chore) as a standalone question before any other decision.
2. **Sequential Version Impact Prompt:** Ask version increment strategy (patch / minor / major / none) as a standalone follow-up.
3. **Sequential Branch Prompt:** Ask branch strategy (new branch / stay on current / defer) as a standalone follow-up.
4. **Sequential Plan Prompt:** Ask whether a plan file is needed and where it lives, as a standalone follow-up.
5. **Enforcement Gates:** Step 6.2 requires lesson capture confirmation before proceeding; Step 6.4 requires ROADMAP and CHANGELOG sync before implementation begins.
6. **Gov-Execute-Plan Prerequisite Check:** `gov-execute-plan` blocks implementation start if the Step 6.4 gate was not completed.

### Implementation Approach

Each prompt is implemented as a hard stop — the model emits the question and explicitly waits for user input before emitting the next question. No batching, no inferred composite answers. Gates are enforced by conditional logic in the command flow that checks for explicit user confirmation before advancing.

---

## Rationale

### Why This Approach

1. **Eliminates ambiguous composite answers:** When four decisions are bundled into one prompt, users naturally give shorthand answers ("1 and 3") that require inference. One question at a time removes the ambiguity entirely — each answer maps to exactly one decision.
2. **Surfaces the plan decision explicitly:** Previously, plan management was never asked. Sequential prompts ensure it is always addressed, preventing undocumented implementation starts.
3. **Enforces documentation hygiene at the gate:** ROADMAP and CHANGELOG sync is a prerequisite for implementation, not an afterthought. Making it a gate in both `start-issue-tracking` and `gov-execute-plan` ensures the constraint is enforced regardless of which path the user enters from.

### Alternatives Considered

**Option A: Keep batched prompts, improve answer parsing**
- Pros: Fewer round-trips in the interaction
- Cons: Composite answer parsing is inherently fragile; any new combination requires parser updates; still does not surface the plan question
- Rejected because: Root cause is prompt design, not parsing logic

**Option B: Single structured form (all four fields at once)**
- Pros: One interaction round-trip
- Cons: Same ambiguity risk as current approach; users still provide shorthand; no enforcement that each field is explicitly addressed
- Rejected because: Does not guarantee independent, unambiguous answers for each decision

### Trade-offs

**Benefits:**
- Users can reach any combination of type / version / branch / plan decisions without ambiguity
- ROADMAP and CHANGELOG are always synced before implementation begins
- Plan management is always explicitly decided

**Costs:**
- Slightly longer issue tracking flow (4 prompts instead of 1 batched block)

**Mitigation:**
- The 4-prompt flow is linear and fast; the clarity gain outweighs the minor interaction overhead

---

## Consequences

### Positive

1. **No ambiguous multi-part answers:** Each decision is resolved independently with an unambiguous user response.
2. **Complete decision coverage:** Plan management is now always addressed; no silent skips.
3. **Documentation sync enforced:** ROADMAP and CHANGELOG are guaranteed to be updated before implementation starts.

### Negative

1. **Longer interaction flow:** Four sequential prompts replace one batched block; users must respond four times instead of once.

### Neutral

1. **`gov-execute-plan` behavior change:** The prerequisite check adds a new blocking condition; existing sessions that bypassed Step 6.4 will be blocked until the gate is satisfied.

---

## Implementation

**Timeline:** Implemented in v0.2.2-beta

**Affected Components:**
- `commands/start-issue-tracking` — Step 1 prompt redesign, Steps 6.2 and 6.4 enforcement gates
- `agents/gov-execute-plan` — Step 6.4 prerequisite check added

**Migration Path:**
No migration needed. The change is behavioral (prompt structure); existing issues and plans are unaffected.

---

## Validation

**Success Criteria:**
- No batched multi-part questions in Step 1 of `start-issue-tracking`
- Each of the four decisions (type, version, branch, plan) elicits a standalone, unambiguous answer
- `gov-execute-plan` blocks implementation start if Step 6.4 gate was not completed
- ROADMAP and CHANGELOG are updated before any implementation work begins

**Review Date:** 2026-06-30

---

## Related Decisions

- No directly superseded ADRs — this is a new process decision for the `start-issue-tracking` command flow.

---

## Related Documentation

**Enhancements:**
- [ENH-006](../enhancements/ENH-006/) — Issue tracking gap fixes that motivated this decision

**Issues:**
- [[issue-5]] — GitHub [#124](https://github.com/technomensch/knowledge-graph/issues/124) — bug: `start-issue-tracking` Step 5 never called `gh issue create`; any Step 5 changes must stay consistent with sequential prompt design in this ADR; fixed in v0.5.9.2

---

## Future Considerations

1. **Prompt count:** If additional decisions are identified (e.g., test strategy), the same sequential pattern should be applied — do not batch new decisions with existing ones.
2. **Gate automation:** Step 6.4 enforcement could eventually be automated (e.g., via a hook that checks ROADMAP diff before allowing implementation commits).

---

**Decision Made:** 2026-03-30
**Last Updated:** 2026-03-30
**Status:** Accepted
