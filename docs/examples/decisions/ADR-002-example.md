<!-- THIS IS AN EXAMPLE — Replace with your project's ADRs -->

# ADR-002: Bidirectional Sync Between Knowledge Graph and Project Memory

**Status:** Accepted

**Date:** 2026-02-05

---

## Context

Many projects using AI-assisted development maintain two complementary knowledge systems:

1. **Knowledge Graph** (`docs/knowledge/*.md`) — Quick-reference index of patterns, concepts, and gotchas
   - Fast lookups via grep/search
   - Discoverable, indexed, cross-referenced
   - Links to detailed lessons-learned files

2. **Project Memory** (persistent context file) — Governance context loaded into AI system prompt
   - Automatically loaded each session
   - Provides immediate context without searching
   - Acts as institutional memory across sessions

**The problem:** These systems evolved independently:
- New patterns discovered → Added to KG only
- New insights emerged → Added to memory (if remembered, ad-hoc)
- Result: **Knowledge drift** — patterns existed in one system but not the other

**Consequence:** Future sessions didn't know critical patterns existed because they weren't in memory, even though they were in the knowledge graph.

---

## Problem

The current workflow stops at knowledge graph creation:

```
Discover pattern → Create KG entry → ✅ Complete
                                    ↓
Memory update:   (forgotten, ad-hoc, or missed)
```

**Risk:** AI sessions inherit memory context automatically, but KG requires explicit search. Patterns not in memory are effectively invisible to new sessions.

---

## Decision

Enhance the knowledge graph update workflow with a **memory sync step** that runs after every KG entry creation.

This ensures bidirectional synchronization:

```
Discover pattern → Create KG entry → Check memory → Update memory → Complete
                      ↓              ↓             ↓
                   Quick-ref    Discovery      Persistence
                   (search)     mechanism      (auto-loaded)
```

### Implementation

When a KG entry is created or updated:

1. Determine if the entry triggers a memory update
2. Check memory update triggers (see categories below)
3. Update appropriate memory section with consistent formatting
4. Link back to KG entry and lesson-learned source
5. Verify memory file stays under size limit (~250 lines)
6. Stage both KG + memory updates in a single commit

### Memory Update Categories

| KG Entry Type | Memory Section | Example |
|---------------|----------------|---------|
| New **Gotcha** | Common Failure Patterns | "Config drift causes platform inconsistency" |
| New **Best Practice** | Best Practices checklist | "Always verify sync across tiers" |
| New **Workflow Change** | Workflow Skills table | "Updated knowledge capture to include memory sync" |
| New **Architecture Decision** | Core Governance Patterns | "Adopted bidirectional sync strategy" |

### Not All Entries Trigger Updates

Some KG entries are informational and don't need memory persistence:
- One-time project-specific patterns
- Historical context entries
- Reference documentation

---

## Rationale

### Why This Matters

1. **System prompt loading:** Memory is automatically loaded into AI context each session. If not updated, future sessions miss critical governance patterns.

2. **Bidirectional sync prevents drift:** KG is the *discovery* mechanism, Memory is the *persistence* layer. Without sync, knowledge lives in only one place.

3. **Closes the feedback loop:**
   ```
   Session 1: Discover pattern → KG entry → Memory entry
   Session 2: Load memory → Know pattern exists → Use correctly
   Session 3: Refine pattern → Update both → Better guidance
   ```

4. **Formalizes best practice:** Prevents ad-hoc memory updates by making sync a required workflow step.

### Alternatives Considered

| Approach | Decision | Reason |
|----------|----------|--------|
| Manual memory updates | ❌ Rejected | Requires discipline, easy to forget |
| Separate memory sync skill | ❌ Rejected | Adds process step, breaks integration flow |
| Automated script | ❌ Rejected | Can't understand semantic differences between entries |
| No sync (status quo) | ❌ Rejected | Causes knowledge drift between systems |
| **Integrated workflow step** | ✅ **Chosen** | Natural integration point, preserves judgment |

---

## Consequences

### Positive

- ✅ Memory always synchronized with knowledge graph
- ✅ Future sessions inherit governance patterns automatically
- ✅ Pattern documentation becomes end-to-end (discovery → persistence)
- ✅ Prevents "lost knowledge" between sessions
- ✅ Single commit captures both KG and memory updates

### Negative

- ⚠️ Adds ~2-3 minutes to knowledge graph updates
- ⚠️ Memory file needs discipline to maintain conciseness
- ⚠️ Requires careful classification of what triggers updates

### Constraints

- Memory file must stay under ~250 lines (link to detail files for larger topics)
- Not all KG entries should trigger memory updates
- Updates must maintain consistent formatting with existing memory sections

---

## Verification

After implementing:

1. Run knowledge graph update to create new entry
2. Verify sync step executes (checks memory update triggers)
3. Update memory per workflow
4. Verify bidirectional links (KG → Memory, Memory → KG)
5. Git diff confirms both files staged together

---

## Cross-References

- **Pattern:** [[patterns.md#bidirectional-memory-sync]]
- **Pattern:** [[patterns.md#project-memory-system]]
- **Concept:** [[concepts.md#memory-systems]]
- **Related:** Knowledge capture workflows, session context management
