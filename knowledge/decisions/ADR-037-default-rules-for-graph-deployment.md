---
title: 'ADR-037: Default Graph-Usage Rules Seeded at Deployment'
category:
  uri: uri-that-does-not-map-to-process
---

# ADR-037: Default Graph-Usage Rules Seeded at Deployment

**Date:** 2026-04-20
**Status:** Proposed
**Related:** ADR-033 (triggers.md), ADR-034 (capture-level routing)

---

## Context

The kmgraph initialization (`/kmgraph:init`) scaffolds the directory structure and seeds an ADR template, but ships no default rules about **how the graph itself should be used**. Every project that deploys a new graph rediscovers the same meta-rules independently through trial and error.

**Problem discovered in practice (career-prism, 2026-04-20):**

During a Phase 3 remediation session, an emergent process decision was captured — a rule about cross-phase scope boundaries in multi-phase plans. The AI assistant wrote the rule correctly to `knowledge/rules.md` but also wrote canonical content to a memory file (`feedback_cross_phase_scope.md`), bypassing the ADR path entirely. When the user questioned why memory was used instead of an ADR, the assistant corrected course and created the ADR. But the correction required user intervention — the assistant did not know the graph's intended usage pattern because no default rules existed to enforce it.

The root cause: graph-usage rules (process decisions → ADR; memory files → thin pointers; rules.md references ADR) exist in mature graph deployments but are never seeded at init time. New deployments and new AI sessions have no default guidance.

**Problem:**
- `knowledge/rules.md` is seeded empty or with project-specific stubs — no graph-meta rules
- No rule states "emergent process decisions → ADR, not memory entry"
- No rule states "memory files are thin pointers only — no canonical content"
- No rule states "rules.md enforcement entries must reference their source ADR"
- AI assistants rediscover these rules only after making mistakes

**Scope:**
- `/kmgraph:init` initialization flow
- Default `rules.md` content seeded at graph creation
- Possibly a separate `graph-usage.md` or `meta-rules.md` file

---

## Decision

Seed a **default graph-usage rules block** into `knowledge/rules.md` during `/kmgraph:init`. This block is clearly marked as graph-meta rules (distinct from project-specific rules) and covers the fundamental patterns for how the knowledge graph should be used.

### Core Components

1. **Default rules block seeded at init** — added to `knowledge/rules.md` under a `## Graph Usage` or `## Knowledge Governance` section:

   ```markdown
   ## Knowledge Governance

   ### Decision Records
   - Process decisions, architectural decisions, and governance rules → create an ADR in `knowledge/decisions/`
   - This includes emergent decisions discovered during reviews, remediations, and sessions — not just planned decisions
   - ADR is the canonical record; `rules.md` references it for enforcement; memory files point to it

   ### Memory Files
   - Memory files are thin pointers only — no canonical content
   - Canonical content belongs in: ADRs (decisions), rules.md (enforcement), lessons-learned/ (patterns)
   - A memory file body should be ≤10 lines: the rule/fact in one sentence, Why, How to apply, and a pointer to the canonical source

   ### Rules Entries
   - Every enforcement rule in rules.md that derives from a decision must link to its source ADR
   - Format: `### Rule Name ([[ADR-XXX-title|ADR-XXX]])`
   - Rules without ADR backing are acceptable for lightweight conventions but should be promoted to ADRs if contested or cross-project

   ### When to Create Each Artifact
   | Finding type | Artifact |
   |---|---|
   | Architecture or process decision | ADR |
   | Enforcement rule | rules.md entry (+ ADR link) |
   | Repeating pattern or anti-pattern | lessons-learned/ |
   | Cross-session recall pointer | memory file (thin) |
   | Project state / in-flight context | memory file (thin) |
   ```

2. **Seeding mechanism** — `/kmgraph:init` writes this block to `knowledge/rules.md` before any project-specific content. It is clearly delimited so project rules can follow below it.

3. **Upgrade path** — existing graphs without the default block can adopt it via `/kmgraph:upgrade` or a one-time manual merge.

### Implementation Approach

- Modify the `directory-scaffold` init step to write `rules.md` with the default block instead of an empty file
- The block is marked with a comment: `<!-- kmgraph-defaults: do not remove -->`
- Project-specific rules go below a `## Project Rules` separator

---

## Rationale

### Why This Approach

1. **Eliminates per-project rediscovery:** The most common graph-usage mistakes (writing canonical content to memory, skipping ADRs for process decisions) happen because the rules don't exist at init time. Seeding them eliminates the first occurrence in every project.
2. **AI assistants follow explicit rules:** When `knowledge/rules.md` contains graph-usage rules, the AI reads them at session start (via triggers) and applies them without user correction.
3. **Consistent graph hygiene across projects:** All graphs deployed from the same kmgraph version share the same baseline governance rules. Project-specific rules extend rather than replace them.

### Alternatives Considered

**Option A: Document graph-usage rules in the kmgraph README only**
- Pros: No init changes required
- Cons: README is not read by AI assistants during sessions; rules only help humans, not agents
- Rejected: Doesn't solve the AI-assistant failure mode

**Option B: Separate `graph-meta-rules.md` file**
- Pros: Clean separation between graph rules and project rules
- Cons: Another file to discover and load; current trigger system already reads `rules.md`
- Rejected: Adding a section to the existing `rules.md` is simpler and uses existing trigger patterns

**Option C: Encode rules as system prompt additions in CLAUDE.md/GEMINI.md**
- Pros: Always loaded
- Cons: Bloats context at every session; these are reference rules, not always-on instructions
- Rejected: Trigger-based loading (read when relevant) is the right pattern per ADR-033

### Trade-offs

**Benefits:**
- ✅ First-session AI behavior matches mature graph behavior — no warm-up tax
- ✅ Single source of truth for graph governance across all projects
- ✅ Upgrade path propagates rule improvements to existing deployments

**Costs:**
- ❌ Init change required — small engineering effort
- ❌ Existing graph deployments need a migration/upgrade step

**Mitigation:**
- Migration is a simple append to existing `rules.md` files — non-destructive
- `/kmgraph:upgrade` is the natural delivery mechanism

---

## Consequences

### Positive

1. **Reduced AI correction loops:** The most common graph-usage mistake is eliminated by making the rules explicit at init time.
2. **Consistent cross-project hygiene:** Memory files stay thin, ADRs are created for decisions, rules reference their source.

### Negative

1. **Init output is larger:** `knowledge/rules.md` ships with content instead of being empty — could feel prescriptive for new users.

### Neutral

1. **Project rules still project-owned:** The default block is graph-meta; project teams add their own rules below it without conflict.

---

## Implementation

**Timeline:** To be scheduled — no blocking dependency.

**Affected Components:**
- `kmgraph:init-shared:directory-scaffold` skill — writes `rules.md`
- `/kmgraph:upgrade` — adds migration step for existing deployments

**Migration Path for Existing Deployments:**
1. Copy the `## Knowledge Governance` block above into `knowledge/rules.md` above any existing project rules
2. Add the `<!-- kmgraph-defaults -->` marker
3. Verify triggers still load the file correctly

---

## Validation

**Success Criteria:**
- A fresh graph deployment has graph-usage rules in `rules.md` without any manual steps
- An AI assistant in a new project session correctly routes a process decision to an ADR without user correction

**Review Date:** After first deployment using the new init — verify AI behavior in first session

---

## Related Decisions

- **[ADR-033](ADR-033-triggersmd-platform-agnostic-rule-timing-companion-file.md):** triggers.md — governs when rules.md is loaded; default rules only work if triggers fire correctly
- **[ADR-034](ADR-034-capture-level-routing-dispatcher-agent-split.md):** Capture-level routing — governs which artifact type to create; complements the decision table above
- **[User ADR-007](~/.kmgraph/decisions/ADR-007-memory-thin-pointers-adr-first.md):** Memory Files Are Thin Pointers — the user-level rules and trigger hardening that this plugin ADR must implement at the system level; ADR-007 § Plugin Fix Required contains the specific changes needed in `/kmgraph:init`, `feedback` type description, `/kmgraph:sync-all` audit, and `/kmgraph:session-summary`

---

**Decision Made:** 2026-04-20
**Last Updated:** 2026-04-20
**Status:** Proposed
