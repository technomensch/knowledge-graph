---
title: "ADR-030: Shared Module Pattern for Slash Command Deduplication"
number: 030
created: 2026-04-10T00:00:00Z
status: Accepted
author: technomensch
email: 917847+technomensch@users.noreply.github.com
git:
  branch: v0.3.1-init-shared-refactor
  commit: c9ef4b6878a3d9c67ac83a5517310fd47ab9871a
  pr: null
  issue: null
implements: null
related:
  adrs: []
  lessons: []
  kg_entries: []
tags: [architecture]
category: architecture
---

# ADR-030: Shared Module Pattern for Slash Command Deduplication

**Date:** 2026-04-10
**Status:** Accepted
**Implements:** v0.3.1
**Related:** None

---

## Context

`commands/init.md` and `commands/init-personal-kg.md` contained large duplicated instruction blocks covering the same logic: upgrade detection, directory scaffolding, template seeding, FTS5 index rebuild, and config entry writing. Any change to this shared logic required parallel edits in both files, creating maintenance risk and drift. The commands are markdown instruction files followed by Claude — not compiled code — so there is no native import or include mechanism.

**Problem:**
- Duplicated instruction blocks across two command files required paired edits for every logic change
- Drift between the two files was a persistent risk with no structural enforcement
- No native module/include mechanism exists for Claude markdown instruction files

**Scope:**
- In scope: `commands/init.md`, `commands/init-personal-kg.md`, and the five new shared modules under `commands/init-shared/`
- Out of scope: other command files not sharing logic with init commands
- Constraint: solution must work within Claude's markdown instruction execution model

---

## Decision

Extract duplicated instruction blocks into parameterized shared module files under `commands/init-shared/`. Each module file begins with a parameter contract table listing the variables it expects. Parent commands invoke a module by instructing Claude to read the shared file and execute it with named parameter values.

### Core Components

1. **`upgrade-inspector.md`:** Detects whether an existing KG installation requires upgrade, and what version it is upgrading from
2. **`directory-scaffold.md`:** Creates the required directory structure for a new or upgraded KG
3. **`template-seed.md`:** Seeds template files from `core/templates/` into the active KG path
4. **`fts5-rebuild.md`:** Rebuilds the FTS5 full-text search index
5. **`config-entry-write.md`:** Writes or updates the KG config entry in `~/.claude/kg-config.json`

### Implementation Approach

Parent commands (`init.md`, `init-personal-kg.md`) are reduced to stubs that set named parameters and instruct Claude to read and execute each shared module in sequence. Each module opens with a parameter contract table (e.g., `KG_PATH`, `KG_NAME`) so the interface is explicit and verifiable before execution.

---

## Rationale

### Why This Approach

1. **Single source of truth:** Each shared behavior is written once and updated once; no parallel edits required
2. **Explicit parameter contracts:** Module interface is declared at the top of each file, making dependencies verifiable
3. **Copy-verbatim-then-minimize-diffs:** Preserves original prose and reduces token cost versus full rewrites

### Alternatives Considered

**Option A: Keep duplication, use comments to flag paired files**
- Pros: No structural change required; simpler to understand at a glance
- Cons: Relies on discipline rather than structure; drift is not prevented, only flagged
- Rejected because: enforcement is not structural — any edit that misses the comment pairing creates silent drift

### Trade-offs

**Benefits:**
- Changes to shared logic (e.g., a new upgrade check) only require editing one file
- Parameter contracts make module dependencies explicit and reviewable
- Reduces total token load for both parent commands

**Costs:**
- Slight indirection — readers of `init.md` must follow a stub to understand the full flow
- Bash array notation in module bodies (`{categories[@]}`) is instructional pseudo-code, not real shell; callers must expand correctly

**Mitigation:**
- A future lesson-learned capture will document the pseudo-code array expansion requirement to prevent misuse

---

## Consequences

### Positive

1. **Reduced maintenance surface:** Shared logic changes propagate automatically to both init commands
2. **Explicit interfaces:** Parameter contract tables make it clear what each module requires before execution
3. **Token efficiency:** Parent command stubs are smaller; Claude reads only the modules needed per invocation

### Negative

1. **Indirection:** The full init flow is no longer readable in a single file; readers must follow cross-file references
2. **Pseudo-code risk:** Array expansion in module bodies is instructional, not executable shell — callers must handle correctly

### Neutral

1. **Residual overlap:** Two modules (`upgrade-inspector` and `config-entry-write`) still contain overlapping "config field backfill" logic — a v0.3.2 cleanup candidate

---

## Implementation

**Timeline:** Implemented in branch `v0.3.1-init-shared-refactor`

**Affected Components:**
- `commands/init.md`
- `commands/init-personal-kg.md`
- `commands/init-shared/upgrade-inspector.md` (new)
- `commands/init-shared/directory-scaffold.md` (new)
- `commands/init-shared/template-seed.md` (new)
- `commands/init-shared/fts5-rebuild.md` (new)
- `commands/init-shared/config-entry-write.md` (new)

**Migration Path:**
No migration required for end users for the shared module refactor itself.

**Amendment (2026-04-10): Cross-reference rewrite added to path migration**

The `docs/ → knowledge/` migration execution in `commands/init.md` (section 1f.1) previously moved files and updated `.gitignore` but left internal markdown cross-references pointing at old `docs/` paths, silently breaking any `[link](docs/lessons-learned/...)` in KG files, CLAUDE.md, or README.md. A new step `e2` has been added to the migration block that runs a `find | sed` pass over all migrated `.md` files plus CLAUDE.md and README.md, rewriting `docs/{subdir}/` to `knowledge/{subdir}/`. MEMORY.md entries (under `~/.claude/projects/`) cannot be auto-rewritten and a warning is emitted instead.

---

## Validation

**Success Criteria:**
- Both `init.md` and `init-personal-kg.md` invoke shared modules rather than containing duplicated blocks
- Each shared module begins with a parameter contract table
- A two-stage review (Sonnet then Opus) confirmed correctness before merge

**Review Date:** Reassess at v0.4.0 — consider whether additional commands can adopt this pattern

---

## Related Decisions

None

---

## Related Documentation

**Knowledge Graph:**
- None

**Lessons Learned:**
- Lesson to be captured separately covering pseudo-code array expansion in module bodies

**Implementation:**
- `commands/init-shared/` directory — five shared module files

---

## Future Considerations

1. **v0.3.2 cleanup:** Consolidate overlapping config field backfill logic in `upgrade-inspector` and `config-entry-write` modules
2. **Pattern expansion:** Evaluate whether other command pairs (e.g., `capture-lesson` variants) benefit from the same shared module pattern

---

**Decision Made:** 2026-04-10
**Last Updated:** 2026-04-10 (amended: cross-reference rewrite added to path migration)
**Status:** Accepted
