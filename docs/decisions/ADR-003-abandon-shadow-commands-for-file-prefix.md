---
title: "ADR-003: Abandon Shadow Commands; Use File Prefix"
status: Accepted
date: 2026-02-16
deciders: technomensch, Claude Sonnet 4.5
---

# ADR-003: Abandon Shadow Commands; Use File Prefix

## Status

**Accepted** - 2026-02-16 (Deprecated in favor of ADR-010)

## Context

The initial implementation attempted to control the command namespace via "shadow commands" — MCP tool definitions that would collide with competitors to force a specific namespace. Later replaced by file prefix pattern, then eventually by full namespace rename in v0.0.8.3 (ADR-010).

### Problem

1. **Namespace collision:** Claude Code marketplace allows multiple plugins with same commands
2. **User confusion:** `knowledge` prefix is ambiguous (which plugin?)
3. **Shadow command overhead:** Creating dummy MCP tools just to reserve namespace is wasteful
4. **Fragility:** Relies on MCP implementation details

### Scope

- Determine command naming convention
- Establish how to avoid namespace collisions
- Support multiple knowledge-graph variations in marketplace

---

## Decision

Phase 1 (v0.0.1-v0.0.2): Use file prefix naming convention
- Commands: `knowledge-init.md`, `knowledge-capture-lesson.md`
- Invoked as: `/knowledge-init`, `/knowledge-capture-lesson`
- Plugin identifier: `(knowledge)` in marketplace

Phase 2 (later): Full namespace rename to `kg-sis` to incorporate publisher identity

### Implementation Approach

1. **File naming:** Prefix all command files with `knowledge-` or `kg-sis-`
2. **Command invocation:** Plugin auto-discovers files and creates slash commands
3. **Marketplace clarity:** Plugin description clarifies "knowledge-*" scope
4. **Eventual goal:** Namespace rename to `kg-sis` for clearer branding

---

## Rationale

### Why This Approach

1. **Low overhead:** No shadow commands needed; just file naming convention
2. **Clear:** `knowledge-*` prefix immediately identifies command family
3. **Plugin discovery:** Helps users find all commands (all start with `knowledge-`)
4. **Transient:** Acknowledges this is temporary until full namespace rename

### Alternatives Considered

**Option A: Keep Shadow Commands**
- Pros: More "complete" namespace reservation
- Cons: Maintains unnecessary MCP tools; harder to maintain
- Rejected: Over-engineered for limited benefit

**Option B: No Prefix (Short Names)**
- Pros: Cleaner command names
- Cons: Higher collision risk; ambiguous ownership
- Rejected: Users wouldn't know which plugin provides `/init` or `/sync`

**Option C: Publisher Namespace (`tm-sis:*`)**
- Pros: Clear publisher identity
- Cons: Requires plugin platform changes; non-standard
- Rejected: Would be implemented in later version (v0.0.8.3)

---

## Consequences

### Positive

1. ✅ Clear command identification (`knowledge-` prefix)
2. ✅ No unnecessary MCP tools cluttering the design
3. ✅ Easy to migrate to full namespace later
4. ✅ Simple to implement (just file naming)

### Negative

1. ❌ Longer command names (`/knowledge-capture-lesson` vs `/capture-lesson`)
2. ❌ Verbose help output

### Neutral

1. Marketplace listing still uses plugin name for clarity
2. Skill naming might or might not use prefix

---

## Implementation

**Timeline:** v0.0.1 (2026-02-16) → v0.0.2 (deployed) → v0.0.8.3 (namespace rename)

**Affected Components:**
- All command files renamed from `*.md` to `knowledge-*.md`
- Plugin.json auto-discovery configured
- Help/documentation updated

**Migration Path:**
- v0.0.1→v0.0.2: Rename command files with prefix
- v0.0.8.3: Rename from `knowledge-*` to `kg-sis-*` (ADR-010)

---

## Validation

**Success Criteria:**
- All commands use consistent `knowledge-` prefix
- No namespace collisions with other plugins
- Users can identify command family by prefix
- Easy to migrate to new namespace if needed

**Review Date:** When considering v0.0.8.3 namespace rename (ADR-010)

---

## Related Decisions

- **[ADR-002: Commands vs Skills Architecture](ADR-002-commands-vs-skills-architecture.md)** — Commands organizational pattern
- **[ADR-010: Plugin Namespace Rename: knowledge → kg-sis](ADR-010-namespace-rename-knowledge-to-kg-sis.md)** — Later full namespace rename

---

## Related Documentation

**Lessons Learned:**
- [Plugin Namespace Visibility — Shadow Command Failure](../lessons-learned/debugging/Lessons_Learned_Plugin_Namespace_Visibility_Shadow_Command_Failure.md) — Why shadow commands didn't work as intended

---

## Migration to ADR-010

**Deprecated in v0.0.8.3:** This pattern was replaced by full namespace rename to `/kg-sis:*` commands (see ADR-010 for rationale).

**What Changed:**
- `knowledge-capture-lesson` → `/kg-sis:capture-lesson`
- File names: `knowledge-capture-lesson.md` → `capture-lesson.md` (namespace in plugin.json instead)
- Plugin namespace changed from `(knowledge)` to `(kg-sis)` in marketplace

---

**Decision Made:** 2026-02-16
**Last Updated:** 2026-02-22
**Status:** Accepted (Deprecated in v0.0.8.3, replaced by ADR-010)
