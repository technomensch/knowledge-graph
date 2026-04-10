---
title: "ADR-002: Commands vs Skills Architecture"
status: Accepted
date: 2026-02-16
deciders: technomensch, Claude Sonnet 4.5
---

# ADR-002: Commands vs Skills Architecture

## Status

**Accepted** - 2026-02-16

## Context

Claude Code plugins support two types of autonomous invocation: **commands** (flat namespace, direct execution) and **skills** (hierarchical, guidance-focused). The plugin needs both immediate task execution and contextual guidance, requiring a decision about how to structure and organize them.

### Problem

1. **Namespace collision:** Both commands and skills are user-invocable via slash commands
2. **Duplication risk:** Similar functionality in both categories could diverge
3. **Organization:** Need clear separation between task automation and guidance
4. **Visibility:** Commands and skills should be discoverable in different contexts

### Scope

- Determine which functionality belongs in commands vs skills
- Establish organizational pattern for separation of concerns
- Define interaction patterns between the two

---

## Decision

Implement dual architecture:

### Commands (Flat Namespace)

- Direct task automation that produces artifacts
- Flat directory structure: `commands/[command-name].md`
- Invoked via `/kg-sis:command-name`
- Examples: `capture-lesson`, `create-adr`, `update-graph`, `sync-all`
- Output: Creates/modifies files, produces concrete results

### Skills (Hierarchical Guidance)

- Contextual guidance and patterns for knowledge work
- Hierarchical structure: `skills/[category]/[skill-name].md` with `SKILL.md` parent
- Invoked via `/kg-sis:[category]/[skill-name]` (future) or referenced from commands
- Examples: `knowledge-graph-usage`, `troubleshooting-guides`, `pattern-library`
- Output: Guidance, decision trees, references to relevant commands

### Implementation Approach

1. **Commands:** Implement all autonomous task execution here
2. **Skills:** House guidance, patterns, and decision support
3. **Interaction:** Commands can reference skills; skills can suggest commands
4. **Discovery:** `/kg-sis:help` lists commands; skills auto-link in command docs

---

## Rationale

### Why This Approach

1. **Clear mental model:** "Commands do things; skills teach"
2. **Scalability:** Each structure accommodates different growth patterns
3. **Reusability:** Skills can reference multiple commands; commands are focused units
4. **Plugin compatibility:** Leverages Claude Code's built-in understanding of both types

### Alternatives Considered

**Option A: Commands Only**
- Pros: Simpler structure, single namespace
- Cons: No place for contextual guidance; all functionality inline in command prompts
- Rejected: Misses opportunity for progressive disclosure

**Option B: Skills Only**
- Pros: Rich hierarchical organization
- Cons: Skills are guidance-focused, not ideal for task automation with file modifications
- Rejected: Would shoehorn commands into a structure designed for guidance

---

## Consequences

### Positive

1. **Clear separation:** Each structure has a purpose
2. **Discoverable:** Users understand where to find automation vs guidance
3. **Maintainable:** Reduces complexity of individual units
4. **Modular:** Easy to add new commands or skills independently

### Negative

1. **Potential duplication:** Similar logic might appear in both categories
2. **More files:** Larger plugin surface area to maintain

### Neutral

1. **Learning curve:** Users must understand the distinction
2. **Naming:** Requires careful naming conventions to avoid confusion

---

## Implementation

**Timeline:** v0.0.1-alpha (2026-02-16)

**Affected Components:**
- `commands/` directory for all task automation
- `skills/` directory for guidance and patterns
- Plugin.json manifest listing both types
- README/documentation explaining the distinction

**Existing Commands:**
- `/kg-sis:init` (setup)
- `/kg-sis:capture-lesson` (documentation)
- `/kg-sis:create-adr` (documentation)
- `/kg-sis:update-graph` (automation)
- `/kg-sis:sync-all` (automation)

**Existing Skills:**
- `knowledge-graph-usage` (contextual guidance)

---

## Validation

**Success Criteria:**
- Commands are discoverable via `/kg-sis:help`
- Skills are referenced from relevant commands
- No single file exceeds reasonable complexity limits
- Users can extend with new commands/skills without modifying existing files

**Review Date:** After v0.0.3 when plugin has stabilized command set

---

## Related Decisions

- **[ADR-001: Centralized Multi-KG Configuration](ADR-001-centralized-multi-kg-configuration.md)** — Commands need centralized routing
- **[ADR-003: Abandon Shadow Commands; Use File Prefix](ADR-003-abandon-shadow-commands-for-file-prefix.md)** — Commands namespace pattern

---

## Related Documentation

**Lessons Learned:**
- [Commands vs Skills Architecture Research](../lessons-learned/architecture/Lessons_Learned_Commands_vs_Skills_Architecture.md) — Background research

---

## Future Considerations

1. **Hierarchical commands:** May add category prefixes as command count grows
2. **Skill discovery:** Skills might become more discoverable as plugin matures
3. **Bi-directional linking:** Cross-references between commands and skills

---

**Decision Made:** 2026-02-16
**Last Updated:** 2026-02-22
**Status:** Accepted
