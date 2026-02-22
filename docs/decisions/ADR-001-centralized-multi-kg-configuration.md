---
title: "ADR-001: Centralized Multi-KG Configuration"
status: Accepted
date: 2026-02-15
deciders: technomensch, Claude Sonnet 4.5
---

# ADR-001: Centralized Multi-KG Configuration

## Status

**Accepted** - 2026-02-15

## Context

The knowledge-graph plugin is designed to support multiple independent knowledge graphs, each potentially owned by different users or projects. The initial implementation included a single `.claude/projects/-Users-mkaplan-Documents-GitHub-knowledge-graph/memory/MEMORY.md` file per project, but this approach creates challenges for scaling to multiple KGs.

### Problem

1. **Fragmented state:** Each project-local KG stores metadata separately
2. **No active pointer:** No way to specify which KG is currently active
3. **Configuration duplication:** Per-KG settings scattered across multiple locations
4. **Discovery:** No centralized way to list all configured KGs

### Scope

- Establish a single source of truth for KG configuration
- Support multiple KGs (project-local, global, cowork-shared, custom-path)
- Enable switching between active KGs
- Store both metadata and per-KG settings

---

## Decision

Implement centralized configuration via `~/.claude/kg-config.json` with:

### Core Components

1. **Active pointer:** Single `"active"` field specifying the currently active KG name
2. **KG registry:** `"graphs"` object mapping KG names to their metadata:
   ```json
   {
     "active": "knowledge-graph",
     "graphs": {
       "knowledge-graph": {
         "path": "/Users/mkaplan/Documents/GitHub/knowledge-graph/docs/",
         "type": "project-local",
         "created": "2026-02-15",
         "categories": ["architecture", "patterns", "process", "debugging"]
       }
     }
   }
   ```

3. **Per-KG metadata:** Type classification (project-local, global, cowork, custom)
4. **Flexible paths:** Support both absolute and tilde-expanded paths

### Implementation Approach

- Store config at `~/.claude/kg-config.json`
- Commands read active pointer, resolve path, then operate on that KG
- `/kg-sis:switch` command to change active KG
- `/kg-sis:list` command to display all configured KGs

---

## Rationale

### Why This Approach

1. **Single source of truth:** One file for all KG state eliminates fragmentation
2. **Active pointer pattern:** Familiar pattern from `git` (`.git/config`, current branch)
3. **Extensible:** Can add per-KG settings without modifying all commands
4. **Backward compatible:** Existing KGs can be migrated on first run

### Alternatives Considered

**Option A: Per-project .claude/kg-local.json**
- Pros: No global state, each project self-contained
- Cons: Can't switch between KGs; must edit per-project config to use global KG
- Rejected: Doesn't support use case of "I want to use different KGs for different tasks"

**Option B: Environment variable KG_PATH**
- Pros: Simple, no file to manage
- Cons: Fragile (shell-dependent), no discovery mechanism
- Rejected: Users can't easily list or switch between KGs

### Trade-offs

**Benefits:**
- ✅ Commands know which KG to operate on without per-invocation flags
- ✅ Users can maintain multiple KGs (project, global, shared)
- ✅ Future multi-KG sync operations easier to implement
- ✅ Familiar pattern from git

**Costs:**
- ❌ New global state to manage
- ❌ Requires careful backup (loss of config = loss of KG paths)

**Mitigation:**
- Include backup/restore utilities in `/kg-sis:sync-all`
- Document migration path in INSTALL.md

---

## Consequences

### Positive

1. **Multi-KG support:** Users can maintain project-local, global, and shared KGs simultaneously
2. **Clear active context:** Commands always know which KG they're operating on
3. **Reduced flags:** No need for `--kg-path` on every command invocation
4. **Extensibility:** Foundation for future per-KG settings

### Negative

1. **Global state:** Config file is now critical (must be backed up)
2. **Migration needed:** Existing projects need one-time migration
3. **One active KG:** Can't operate on multiple KGs in a single command

### Neutral

1. **File format:** JSON chosen for simplicity (YAML would work equally well)

---

## Implementation

**Timeline:** v0.0.1-alpha (2026-02-15)

**Affected Components:**
- `/kg-sis:init` — Wizard creates config and initial KG entry
- `/kg-sis:switch` — New command to change active KG
- `/kg-sis:list` — New command to list all KGs
- All commands — Read config to determine active KG path

**Migration Path:**
- On first run, if config doesn't exist, run init wizard
- If legacy per-project KGs exist, offer to migrate to centralized config

---

## Validation

**Success Criteria:**
- Users can maintain 3+ KGs without file duplication
- `/kg-sis:switch` reliably changes active context
- All commands operate on active KG without explicit path specification
- Config survives plugin updates

**Review Date:** After v0.0.3 when multi-KG use cases emerge from real usage

---

## Related Decisions

- **[ADR-002: Commands vs Skills Architecture](ADR-002-commands-vs-skills-architecture.md)** — Commands need centralized routing
- **[ADR-006: Delegated vs Inline KG Updates](ADR-006-delegated-vs-inline-kg-updates.md)** — Multi-KG requires delegated updates

---

## Related Documentation

**Lessons Learned:**
- [Config File Orphaned References After Repo Rename](../lessons-learned/architecture/Lessons_Learned_Config_Orphaned_References.md) — Identifies risks of centralized config during refactoring

**Implementation:**
- `~/.claude/kg-config.json` — Config file structure and defaults

---

## Future Considerations

1. **Per-KG settings:** May add per-KG customizations (hooks, rules, automation)
2. **Config encryption:** Protect config if it contains credentials
3. **Multi-KG commands:** Operations across multiple KGs simultaneously

---

**Decision Made:** 2026-02-15
**Last Updated:** 2026-02-22
**Status:** Accepted
