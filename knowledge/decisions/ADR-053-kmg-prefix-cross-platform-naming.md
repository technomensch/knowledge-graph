---
id: ADR-053
title: kmg- Prefix as Canonical Cross-Platform Skill and Command Naming Convention
date: 2026-06-12
status: Accepted
version_target: v0.6.0
related_adr:
  - ADR-003
  - ADR-010
  - ADR-028
  - ADR-013
supersedes: null
tags:
  - naming
  - cross-platform
  - breaking-change
---

# ADR-053: `kmg-` Prefix as Canonical Cross-Platform Skill and Command Naming Convention

**Date:** 2026-06-12  
**Status:** Accepted  
**Version Target:** v0.6.0  
**Breaking Change:** Yes — requires user migration for personal rules/triggers/configs

---

## Context

kmgraph supports two execution platforms:

1. **Claude Code** — Plugin system applies plugin namespace at invocation time. Skills and commands are invoked as `/kmgraph:<name>`, where `kmgraph` is the plugin name.
2. **Codex (OpenAI CLI)** — No plugin-level namespace exists. Skills and commands are invoked by bare name (e.g., `recall`, `session-summary`, `capture-lesson`).

This creates two problems:

### 1. Collision Risk
Generic names like `recall`, `status`, `help`, `session-wrap` will collide with identically-named skills from other installed Codex plugins. Users cannot disambiguate.

### 2. Inconsistency Across Platforms
Users switching between Claude Code and Codex see different invocation syntax:
- Claude Code: `/kmgraph:recall`
- Codex: `recall`

**Precedent:** context-mode plugin uses `ctx-` prefix (`ctx-stats`, `ctx-doctor`, `ctx-upgrade`). In Claude Code: `/context-mode:ctx-stats`. In Codex: `ctx-stats`. Consistent and collision-free across platforms.

---

## Decision

Apply `kmg-` prefix (knowledge-management-graph) to all skill and command names in their directory names, SKILL.md frontmatter `name:` fields, and command file names.

### Naming Convention

- **Standard:** `kmg-<action>` (e.g., `kmg-recall`, `kmg-capture-lesson`)
- **Grouped:** `kmg-<group>-<action>` when a meaningful sub-group exists (e.g., `kmg-init-shared:kmg-ai-model-tier-resolver`)
- **Special cases:** Governance commands drop `gov-` prefix in favor of `kmg-` (e.g., `gov-execute-plan` → `kmg-execute-plan`, not `kmg-gov-execute-plan`)

### Invocation After Change

| Platform | Before | After |
|---|---|---|
| Claude Code | `/kmgraph:recall` | `/kmgraph:kmg-recall` |
| Codex | `recall` | `kmg-recall` |

---

## Rationale

### Lineage (Precedent from Earlier Decisions)

**[[ADR-003-abandon-shadow-commands-for-file-prefix]] (2026-02-16): File Prefix Pattern**  
Established that prefixing is reversible, scalable, and effective for collision avoidance. Temporary `knowledge-` prefix proved the pattern works.

**[[ADR-010-namespace-rename-knowledge-to-kg-sis]] (2026-02-21): Full Namespace Rename**  
Demonstrated that breaking name changes are acceptable when:
- Documented in CHANGELOG with migration table
- Justified by clear benefit (collision avoidance, publisher identity)
- Scope is complete (not partial renames that confuse users)
- Migration path is clear for users

**[[ADR-028-me-and-rules-as-platform-agnostic-source-of-truth]] (live): me.md + rules.md as Platform-Agnostic Source of Truth**  
Established principle: identity and behavioral rules must be portable across platforms. Platform-specific configs diverge from a shared source of truth — [[ADR-053-kmg-prefix-cross-platform-naming]] applies the same portability logic to naming.

**[[ADR-032-platform-specific-directives-in-platform-config]] (superseded by v0.3.5-beta fixup): Platform-Specific Directives**  
Original intent (platforms have different constraints, need different handling) informs [[ADR-053-kmg-prefix-cross-platform-naming]]. Mechanism was superseded (`knowledge/platform/` reversed in favor of `CLAUDE.md`). Cited here for the principle only, not the mechanism.

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

See design spec: `/Users/mkaplan/GitHub/knowledge-graph/docs/specs/2026-06-12-kmg-prefix-normalization-design.md`

See implementation plan:
- `knowledge/enhancements/ENH-013/v0.6.0-phase-0-audit.md`
- `knowledge/enhancements/ENH-013/v0.6.0-phase-1-renames.md`
- `knowledge/enhancements/ENH-013/v0.6.0-phase-2-refs.md`
- `knowledge/enhancements/ENH-013/v0.6.0-phase-3-docs.md`

---

## Related Decisions

| Decision | Reason |
|---|---|
| [[ADR-003-abandon-shadow-commands-for-file-prefix]] | Established prefixing pattern; [[ADR-053-kmg-prefix-cross-platform-naming]] extends it |
| [[ADR-010-namespace-rename-knowledge-to-kg-sis]] | Precedent for breaking name changes; [[ADR-053-kmg-prefix-cross-platform-naming]] follows same protocol |
| [[ADR-028-me-and-rules-as-platform-agnostic-source-of-truth]] | Platform-agnostic source of truth principle; [[ADR-053-kmg-prefix-cross-platform-naming]] extends to naming |
| [[ADR-032-platform-specific-directives-in-platform-config]] | Platform-specific constraints principle (superseded mechanism, live principle) |
| [[ADR-013-documentation-update-protocol]] | Docs updates required when behavior changes (affects user-facing docs) |
| [[ENH-013]] (absorbed) | Original kg-recall → auto-recall enhancement; subsumed into v0.6.0 |

---

## Acceptance Criteria

- [x] Decision is clearly documented and rationale is clear
- [ ] Design spec written and approved
- [ ] Phase plans written and approved
- [ ] All 15 skills + 25 commands + 7 init-shared renamed (47 total)
- [ ] All cross-references updated (20 files)
- [ ] CHANGELOG includes migration table
- [ ] v0.6.0 released with breaking-change note
- [ ] Users can migrate personal configs via provided table

---

## Alternative Rejected

### Do nothing (no prefix)
**Rationale for rejection:** Collision risk on Codex is unacceptable. Generic names like `recall`, `status`, `help` will conflict with other plugins. Users cannot disambiguate. Breaks cross-platform consistency.

### Partial prefix (only problematic names)
**Rationale for rejection:** Creates inconsistency — some names are `kmg-*`, others are not. Users must remember which ones got prefixed. Full prefix is simpler and consistent.

### Different prefix (e.g., `kg-` extended)
**Rationale for rejection:** `kg-` is already used by the MCP layer and would cause confusion. `kmg-` (full acronym) is clearer.

---

## Future Work

- **v0.6.1:** Optional migration helper command (`kmg-migrate-personal-config`) to auto-update user's `.kmgraph/rules.md` and other personal KGs
- **v0.7.0:** Multi-platform delivery (hooks support for Codex, Cursor, and others)

---

**Created:** 2026-06-12  
**Last updated:** 2026-06-15
