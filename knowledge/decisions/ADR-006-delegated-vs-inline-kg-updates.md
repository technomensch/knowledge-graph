---
title: "ADR-006: Delegated vs Inline KG Update Architecture"
status: Accepted
date: 2026-02-16
deciders: technomensch, Claude Sonnet 4.5
---

# ADR-006: Delegated vs Inline KG Update Architecture

## Status

**Accepted** - 2026-02-16

## Context

The multi-KG architecture introduces a critical challenge: when a lesson is captured or a decision is made, how should knowledge graph updates be routed? The initial single-KG design used "inline" updates (embedded in capture-lesson), but multi-KG requires careful routing to ensure the correct KG is updated.

### Problem

1. **Routing ambiguity:** Which KG should receive the update?
2. **Multi-step operations:** Updating multiple KG categories (patterns, gotchas, concepts) requires routing to each
3. **Consistency:** Ensuring all related KG files stay in sync across projects
4. **Multi-KG sync:** Updating just the active KG vs all KGs complicates the architecture

### Scope

- Determine when updates are routed inline vs delegated
- Establish how `/kg-sis:update-graph` (delegated) differs from inline updates
- Define integration points for multi-KG routing

---

## Decision

Implement hybrid architecture:

### Inline Updates (Limited)

- Used only for simple, single-file updates within the current KG
- Examples: Updating MEMORY.md, marking lessons as read
- Constraint: Same-KG only

### Delegated Updates (Primary)

- `/kg-sis:update-graph` command handles all KG file modifications
- Routes to active KG path from centralized config
- Supports batch updates (patterns + gotchas + concepts in one call)
- Can accept `--all-graphs` flag to update across multiple KGs (future)

### Implementation Approach

1. **Capture-lesson** → calls `/kg-sis:update-graph` with extracted patterns
2. **Create-adr** → calls `/kg-sis:update-graph` with ADR metadata
3. **Update-graph** → handles routing based on active KG + categories
4. **Multi-KG sync** → delegates to update-graph with appropriate flags

---

## Rationale

### Why This Approach

1. **Separation of concerns:** Capture logic separate from routing logic
2. **Testable:** Each component handles one concern (capture vs routing)
3. **Flexible:** Can add multi-KG operations without changing capture-lesson
4. **Explicit:** Command name (`update-graph`) clearly indicates what it does

### Alternatives Considered

**Option A: All Inline**
- Pros: Single code path, no delegation overhead
- Cons: Doesn't scale to multi-KG; couples capture to routing
- Rejected: Breaks with multi-KG architecture

**Option B: All Delegated**
- Pros: Consistent routing
- Cons: Extra function call overhead for simple operations
- Rejected: Overly rigid; some operations (MEMORY.md updates) don't need routing logic

**Option C: Environment-Based Routing**
- Pros: Automatic based on active KG
- Cons: Implicit; hard to debug; doesn't support cross-KG operations
- Rejected: Violates principle of explicit over implicit

---

## Consequences

### Positive

1. ✅ Scales naturally to multi-KG scenarios
2. ✅ Clear separation between "capture" and "route" responsibilities
3. ✅ Testable in isolation
4. ✅ Foundation for future cross-KG operations

### Negative

1. ❌ Adds one extra command invocation in capture workflow
2. ❌ Slightly more complex for users to understand

### Neutral

1. Update-graph becomes a critical piece of architecture
2. Performance cost minimal (same KG operations, just routed)

---

## Implementation

**Timeline:** v0.0.3-alpha (2026-02-16)

**Affected Components:**
- `/kg-sis:capture-lesson` — Step 4.6 delegates to update-graph
- `/kg-sis:create-adr` — New command, uses delegated updates
- `/kg-sis:update-graph` — Enhanced with multi-category routing
- `commands/update-graph.md` — Implements routing logic

**Capture-Lesson Integration:**
```
Step 4.5: Extract patterns/gotchas/concepts
Step 4.6: Present user choice:
  1. Extract now (recommended) — Run /kg-sis:update-graph inline
  2. Manual later — Defer extraction
  3. Skip — Batch via sync-all
```

**Update-Graph Router:**
```
Input: lesson file + active KG
1. Extract metadata (category, tags, keywords)
2. For each extracted pattern:
   a. Check active KG patterns.md
   b. Format entry
   c. Append/merge as needed
3. Same for gotchas, concepts, etc.
```

---

## Validation

**Success Criteria:**
- Capture-lesson successfully extracts and routes patterns
- Update-graph correctly identifies active KG
- Multi-category updates don't miss any categories
- MEMORY.md updates still work inline (MEMORY is special case)

**Review Date:** After v0.0.4 when multi-KG usage patterns emerge

---

## Related Decisions

- **[ADR-001: Centralized Multi-KG Configuration](ADR-001-centralized-multi-kg-configuration.md)** — Provides routing target via active pointer
- **[ADR-002: Commands vs Skills Architecture](ADR-002-commands-vs-skills-architecture.md)** — Update-graph is a command, not skill

---

## Related Documentation

**Knowledge Graph:**
- [Delegated Command Architecture Pattern](../knowledge/patterns.md#delegated-vs-inline) — Multi-KG routing pattern

**Lessons Learned:**
- [Inline KG Updates Violate Multi-KG Architecture](../lessons-learned/architecture/Lessons_Learned_Inline_KG_Updates_Violate_Multi_KG.md) — Problem identification

---

## Future Considerations

1. **Cross-KG sync:** Update multiple KGs with `--all-graphs` flag
2. **Selective routing:** Update specific categories only
3. **Diff preview:** Show changes before applying
4. **Rollback capability:** Undo last KG update

---

**Decision Made:** 2026-02-16
**Last Updated:** 2026-02-22
**Status:** Accepted
