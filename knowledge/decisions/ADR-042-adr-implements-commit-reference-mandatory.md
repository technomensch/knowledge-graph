---
title: "ADR-042: ADR `implements` Field — Mandatory Implementation Commit Reference"
number: 42
created: 2026-04-22T00:00:00Z
status: Accepted
author: technomensch
email: 917847+technomensch@users.noreply.github.com
git:
  branch: v0.5.2-beta-phase3-tier-resolver
  commit: 62a472cbe07785e6d1e314f7bbadaa6f8243c349
  pr: null
  issue: null
implements: "~/.kmgraph/rules.md § Knowledge Capture > ADR — Implementation Commit Reference (applied 2026-04-22, non-git-tracked personal config)"
related:
  adrs: []
  lessons: []
  kg_entries: []
tags: [process, adr, knowledge-capture, commit-traceability]
category: process
---

# ADR-042: ADR `implements` Field — Mandatory Implementation Commit Reference

**Date:** 2026-04-22
**Status:** Accepted
**Implements:** `~/.kmgraph/rules.md § Knowledge Capture > ADR — Implementation Commit Reference`
**Related:** None

---

## Context

**Problem:**
- ADRs were being created without referencing the commit where the decision was first implemented
- For ad hoc changes made outside a formal phase branch, the gap between the ADR write date and the implementation commit created an untraceable window
- The `implements` field already existed in the ADR YAML frontmatter template but was never prompted for by the `create-adr` skill, and no rule enforced filling it in
- Discovered during a career-prism session (2026-04-22) when reviewing ADRs 040 and 041 — both had `implements: null` despite live implementations

**Scope:**
- All ADRs across all projects using this knowledge graph system
- The rule is cross-project and belongs at the user level (`~/.kmgraph/rules.md`), not in any individual project's `knowledge/rules.md`
- The `create-adr` skill is a future enforcement point — the rule currently lives in `~/.kmgraph/rules.md`

**Constraints:**
- `~/.kmgraph/rules.md` is not git-tracked; changes to it have no commit hash
- The career-prism project's `knowledge/rules.md` was initially edited with this rule, then reverted — the rule belongs at user level only

---

## Decision

Every ADR must include the implementation commit hash in the `implements` YAML field. The field must never be left as `null` once the decision is implemented.

### Core Components

1. **Design-first (ADR before commit):** Set `implements: null` when creating; update to `implements: "<hash> — <one-line description>"` immediately after the implementation commit lands.
2. **Ad hoc (commit before ADR):** Run `git log --oneline -5`, identify the correct commit, and set `implements` retroactively when writing the ADR.
3. **Non-git-tracked implementations:** Note the file path and date — e.g., `"~/.kmgraph/rules.md — applied 2026-04-22"`.

### Implementation Approach

Rule added to `~/.kmgraph/rules.md § Knowledge Capture > ADR — Implementation Commit Reference`. The `create-adr` skill is a future enforcement point (see Future Considerations).

---

## Rationale

### Why This Approach

1. **Forward traceability:** Given an ADR, find the code that implements it. Without a commit reference, this requires searching commit history by date or keyword — error-prone.
2. **Backward traceability:** Given a commit, find the ADR that explains why. The commit message often references the ADR number, but the ADR must also link back.
3. **Ad hoc change safety:** Changes made outside a formal phase branch (the most common source of missing links) are especially prone to context loss. The rule is designed with ad hoc changes as the primary failure mode.

### Alternatives Considered

**Option A: Rely on commit message convention (e.g., "implements ADR-042")**
- Pros: No ADR change required; visible in `git log`
- Cons: Only searchable via git; ADR file itself remains an orphan without the link; relies on discipline at commit time
- Rejected because: the ADR file is the canonical record — it must be self-contained

**Option B: Add an `## Implementation` section to ADR body**
- Pros: More visible than a YAML field; can include prose
- Cons: Duplicates the `implements` field already in the template; creates two places to maintain
- Rejected because: the YAML field is already the right location; adding a body section creates drift

### Trade-offs

**Benefits:**
- ✅ ADRs become fully traceable in both directions (decision → code, code → decision)
- ✅ No new template changes needed — `implements` field already exists
- ✅ Cross-project rule enforced at the user level; no per-project setup required

**Costs:**
- ❌ Retroactive compliance: existing ADRs with `implements: null` are non-compliant
- ❌ `create-adr` skill does not yet prompt for the field — enforcement is rule-only until the skill is updated

**Mitigation:**
- Retroactive compliance is a future task, not a blocker — new ADRs comply immediately
- Skill update is tracked in Future Considerations

---

## Consequences

### Positive

1. **Audit trail closes:** ADR + commit form a complete record. No context window needed to trace a decision.
2. **Ad hoc changes get proper documentation:** The rule explicitly addresses the ad hoc case, which was the trigger for this decision.
3. **No template migration needed:** Existing template already has `implements`; only the rule and enforcement change.

### Negative

1. **Existing ADRs are non-compliant:** 041 ADRs exist with `implements: null`. Retroactive remediation is not scoped here.
2. **Skill enforcement gap:** `create-adr` does not prompt for `implements` — rule enforcement is manual until the skill is updated.

### Neutral

1. **Project-level rules.md stays clean:** The rule lives at `~/.kmgraph/rules.md` only; project `knowledge/rules.md` files do not need a copy.

---

## Implementation

**Timeline:** Applied 2026-04-22 during career-prism session.

**Affected Components:**
- `~/.kmgraph/rules.md` — rule added under § Knowledge Capture
- `create-adr` skill — future enforcement point (not yet updated)
- All future ADRs created after 2026-04-22

**Migration Path:**
Retroactive compliance for existing ADRs (001–041) is deferred. When an existing ADR is updated for any reason, fill in `implements` at that time.

---

## Validation

**Success Criteria:**
- All ADRs created after 2026-04-22 have a non-null `implements` field
- Ad hoc changes include the correct commit hash, not the ADR-write commit

**Metrics:**
- `implements: null` count in new ADRs: target 0

**Review Date:** 2026-07-01 — assess whether `create-adr` skill has been updated to prompt for `implements`

---

## Related Decisions

None

---

## Related Documentation

**Implementation:**
- `~/.kmgraph/rules.md § Knowledge Capture > ADR — Implementation Commit Reference`

---

## Future Considerations

1. **Update `create-adr` skill:** When status is Accepted, prompt: "What commit implements this decision? (`git log --oneline -5`)" and auto-fill `implements`. This closes the enforcement gap.
2. **Retroactive compliance sweep:** Once the skill is updated, run a pass over ADRs 001–041 to fill in `implements` where possible.

---

**Decision Made:** 2026-04-22
**Last Updated:** 2026-04-22
**Status:** Accepted
