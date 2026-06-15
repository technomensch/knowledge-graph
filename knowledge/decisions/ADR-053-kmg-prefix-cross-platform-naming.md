---
id: ADR-053
title: kmg- Prefix for Cross-Platform Skill and Command Naming
status: Accepted
date: 2026-06-16
category: Architecture
---

# ADR-053: kmg- Prefix for Cross-Platform Skill and Command Naming

## Context

kmgraph skills and commands are invoked differently per platform:
- **Claude Code:** `/kmgraph:recall` (plugin namespace prefix)
- **Codex CLI:** `recall` (bare name, no namespace)

In Codex, bare names collide with any other plugin using the same short names (`recall`, `init`, `status`, etc.). Without a namespace prefix in the name itself, kmgraph commands are indistinguishable from other plugins.

The `gov-` prefix on governance skills (`gov-execute-plan`, `gov-plan-gate`) and `kg-` on `kg-recall` were inconsistent sub-prefixes that predated this cross-platform concern.

## Decision

Rename all 15 skills, 25 commands, and 7 init-shared subcommands with a `kmg-` prefix. The prefix:
- Ensures collision-free bare-name invocation in Codex
- Signals kmgraph ownership in any autocomplete UI
- Replaces inconsistent sub-prefixes (`gov-`, `kg-`)

Special cases:
- `kg-recall` → `kmg-auto-recall` (signals auto-trigger intent, not user command)
- `gov-execute-plan` → `kmg-execute-plan` (drops `gov-` sub-prefix)
- `gov-plan-gate` → `kmg-plan-gate` (drops `gov-` sub-prefix)

MCP tool names (`kg_*`) are unchanged — they are already namespaced by convention.

## Consequences

| Platform | Before | After |
|---|---|---|
| Claude Code | `/kmgraph:recall` | `/kmgraph:kmg-recall` |
| Codex | `recall` | `kmg-recall` |

---

## Rationale

### Lineage (Precedent from Earlier Decisions)

**ADR-003 (2026-02-16): File Prefix Pattern**  
Established that prefixing is reversible, scalable, and effective for collision avoidance. Temporary `knowledge-` prefix proved the pattern works.

**ADR-010 (2026-02-21): Full Namespace Rename**  
Demonstrated that breaking name changes are acceptable when:
- Documented in CHANGELOG with migration table
- Justified by clear benefit (collision avoidance, publisher identity)
- Scope is complete (not partial renames that confuse users)
- Migration path is clear for users

**ADR-028 (live): me.md + rules.md as Platform-Agnostic Source of Truth**  
Established principle: identity and behavioral rules must be portable across platforms. Platform-specific configs diverge from a shared source of truth — ADR-053 applies the same portability logic to naming.

**ADR-032 (superseded by v0.3.5-beta fixup): Platform-Specific Directives**  
Original intent (platforms have different constraints, need different handling) informs ADR-053. Mechanism was superseded (`knowledge/platform/` reversed in favor of `CLAUDE.md`). Cited here for the principle only, not the mechanism.

### Why `kmg-` Prefix Solves Both Problems

1. **Collision-free on Codex:** Bare name `kmg-recall` is globally unique (only kmgraph provides it)
2. **Consistent across platforms:** Users see `kmg-*` on both Claude Code and Codex — familiar pattern
3. **Publisher identity:** Clear that the command/skill belongs to kmgraph
4. **Scalable:** Pattern works for future Codex integrations, other CLI tools, or new platforms

---

## Scope

**Affected items (v0.6.0):**
- 15 skills (directory names + SKILL.md `name:` fields)
- 25 top-level commands (file names)
- 7 init-shared subcommands (directory + file names)
- Cross-references in ~20 files (skills, agents, rules, triggers, docs, examples)

**Not affected:**
- Historical entries in CHANGELOG.md, sessions/, lessons-learned/ (left as-is for audit trail)
- MCP tool names (remain `kg_*` — MCP namespace is independent)
- Scripts in `scripts/` directory (no user-facing references)

---

## Breaking Change & Migration

**User impact:** Personal rules, triggers, aliases referencing old names must be updated.

**Migration provided:** CHANGELOG.md includes complete search-and-replace table (47 renames: 15 skills + 25 commands + 7 init-shared, old → new).

**Example:**
```
kmgraph:capture-lesson     → kmgraph:kmg-capture-lesson
kmgraph:session-summary    → kmgraph:kmg-session-summary
kmgraph:kg-recall          → kmgraph:kmg-auto-recall  # internal skill; was not user-invocable
```

**Tool:** Users can apply search-and-replace manually or (optionally) a migration helper command can be provided in v0.6.1.

---

## Implementation

Phased:
- Phase 1: rename skill dirs, command files, init-shared subfiles (47 total)
- Phase 2: update all cross-references in skills, agents, knowledge, commands, root files, core/
- Phase 3: update docs/, version bump to 0.6.0, CHANGELOG migration table

## Acceptance Criteria

- [x] Design spec written and approved
- [x] Phase plans written and approved
- [x] All 15 skills + 25 commands + 7 init-shared renamed (47 total)
- [x] All cross-references updated (~70 files)
- [x] CHANGELOG includes migration table
- [ ] v0.6.0 released with breaking-change note
- [ ] Users can migrate personal configs via provided table
