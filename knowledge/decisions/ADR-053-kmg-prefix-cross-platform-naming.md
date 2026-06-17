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

- **Breaking change** for all existing users: every `/kmgraph:` invocation changes
- Migration table published in CHANGELOG.md v0.6.0 entry
- Personal rules/triggers files referencing old names must be updated manually

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
