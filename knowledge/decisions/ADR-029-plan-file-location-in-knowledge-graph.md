---
title: 'ADR-029: Plan File Location in Knowledge Graph'
category:
  uri: uri-that-does-not-map-to-process
---

# ADR-029: Plan File Location in Knowledge Graph

**Date:** 2026-04-09
**Status:** Accepted
**Implements:** v0.3.0-beta
**Related:** [[ADR-014-maintain-dual-plan-file-locations]], [[ADR-028-me-and-rules-as-platform-agnostic-source-of-truth]]

---

## Context

**Problem:**
- Implementation plans lived in `docs/plans/` (gitignored, local only) and were invisible to `kg_search`
- Plans had no standard connection to the ENH or issue they implemented
- ADR-014 established a dual-location protocol (`~/.claude/plans/` + `docs/plans/`) but neither location is part of the knowledge graph
- A v0.3.0-beta planning session surfaced that the KG was missing its own work history - plans executed and gone, leaving only lessons and ADRs but no trace of the implementation plan itself

**Scope:**
- Where plan files live within the knowledge graph directory structure
- Naming convention for plan files
- Fallback location for plans not linked to an ENH or issue
- Out of scope: changes to `~/.claude/plans/` (ephemeral, unchanged) or `docs/plans/` (local working reference, unchanged per ADR-014)

---

## Decision

Plan files in the knowledge graph follow a three-location structure based on what they implement:

### Core Components

1. **ENH-linked plans:** `knowledge/ENH-NNN/vX-plan.md`
   - One plan file per ENH per version
   - Multiple ENHs in the same version each get their own file without collision

2. **Issue-linked plans** (bugs, patches, hotfixes): `knowledge/issue-NNN/vX-plan.md`
   - Same pattern as ENH, scoped to the issue folder

3. **Misc/bundled plans** (no parent ENH or issue): `knowledge/plans/vX-plan.md`
   - Catch-all for version releases that bundle minor changes without a dedicated ENH or issue

### Naming Convention

`vX-plan.md` where `X` is the full version string (e.g., `v0.3.0-beta-plan.md`, `v0.2.4.1-beta-plan.md`).

### Implementation Approach

A new KMGraph skill (`skills/pre-implementation-backfill.md`) triggers on "proceed" / "start" / "implement" vocabulary. Before execution begins it:
1. Checks if a KG is active and the plan references an ENH or issue
2. Prompts the user to backfill the plan into the appropriate KG folder
3. Creates the plan file with wiki links and phase-gated pre-flight instructions
4. Adds a one-line pointer to the `docs/plans/` working copy

The skill lives in KMGraph (not superpowers) because the backfill logic is KMGraph-specific. Superpowers is an unmanaged upstream plugin.

---

## Rationale

### Why This Approach

1. **Searchability:** `kg_search "v0.3.0 plan"` finds the plan alongside lessons, ADRs, and sessions - complete picture in one search
2. **Graph visibility:** Obsidian shows ENH-NNN linking to the plan, ADRs, and sessions as a connected node
3. **No sync problem:** One file in the graph, `docs/plans/` becomes a thin pointer - no dual-content drift
4. **Lifecycle:** Plan files can carry a status field (`active` / `implemented` / `abandoned`) - lifecycle built in
5. **vX naming:** Multiple ENHs in the same version each get `vX-plan.md` in their own folder - no collision, version is always clear

### Alternatives Considered

**Option A: Plans embedded directly in the ENH spec file**
- Pros: One file per ENH, no extra files
- Cons: Plan content mixes with spec content; spec files grow unbounded; harder to archive the plan independently
- Rejected because: Separation of spec (what) vs. plan (how/when) is worth the extra file

**Option B: All plans in `knowledge/plans/` regardless of ENH/issue**
- Pros: Single location, simple
- Cons: No structural link between plan and ENH; graph edges are weaker; naming must encode the ENH reference in the filename
- Rejected because: Co-location in the ENH folder makes the relationship explicit and enables automatic wiki backlinks

**Option C: Keep plans in `docs/plans/` only (ADR-014 status quo)**
- Pros: No change needed
- Cons: Plans remain invisible to `kg_search`; KG has no record of how decisions were implemented
- Rejected because: The KG should capture the full project memory, including implementation plans

### Trade-offs

**Benefits:**
- Plans searchable via `kg_search`
- Obsidian graph shows full implementation chain: ENH - plan - ADR - session
- `docs/plans/` pointer file is lightweight and still serves as the implementation agent's working reference
- Educational: skill surfaces the pattern at exactly the right moment (pre-implementation)

**Costs:**
- Additional file per ENH/issue (small overhead)
- Skill needs to be built (`pre-implementation-backfill.md`)

**Mitigation:**
- The skill is optional (user can decline the backfill prompt); nothing breaks if skipped
- The `knowledge/plans/` fallback handles all cases where no ENH/issue exists

---

## Consequences

### Positive

1. **Complete project memory:** KG captures the full chain - spec, plan, ADR, session, lessons
2. **Pre-flight context efficiency:** Plan file in KG with wiki links and phase-gated pre-flight bullets reduces context load during implementation (agent loads only what it needs per phase)
3. **Natural education:** Users learn the pattern through the skill prompt, not documentation

### Negative

1. **Skill build required:** `pre-implementation-backfill.md` does not exist yet - until it does, backfill is a manual step
2. **Existing plans unlinked:** Plans created before this ADR are not in the KG; backfill is retroactive work

### Neutral

1. **ADR-014 unchanged:** `~/.claude/plans/` and `docs/plans/` dual-location protocol remains in force; this adds a third location (KG) as the canonical persistent record

---

## Implementation

**Timeline:** v0.3.0-beta (scoped to ENH-010 or a new ENH)

**Affected Components:**
- New: `skills/pre-implementation-backfill.md`
- New: `core/templates/plans/` (plan file template for KG entries)
- Update: `commands/init.md` to scaffold `knowledge/plans/` directory
- Update: `.gitignore` logic - `knowledge/plans/` gitignored by default (same as sessions/)

**Migration Path:**
No migration required. Existing plans in `docs/plans/` are unaffected. New plans optionally backfilled via the skill.

---

## Validation

**Success Criteria:**
- `kg_search "v0.3.0 plan"` returns the plan file
- Obsidian graph shows ENH-NNN linking to the plan file
- Pre-implementation skill prompts user before execution begins
- `knowledge/plans/` scaffolded by `kmgraph:init`

---

## Related Decisions

- **[[ADR-014-maintain-dual-plan-file-locations]]:** Established `~/.claude/plans/` + `docs/plans/` dual-location protocol - this ADR adds the KG as a third persistent layer, not a replacement
- **[[ADR-028-me-and-rules-as-platform-agnostic-source-of-truth]]:** Same session; same motivation - reduce fragmentation by making the KG the authoritative store

---

## Related Documentation

**Lessons Learned:**
- [[Lessons_Learned_Plan_File_Dual_Location_Protocol]] - prior dual-location lesson, superseded by this three-location approach for KG-integrated projects

**Sessions:**
- [[2026-04-09-v0.3.0-beta-planning-default-path-and-rules-scaffold]] - session where this decision was reached

---

**Decision Made:** 2026-04-09
**Last Updated:** 2026-04-09
**Status:** Accepted
