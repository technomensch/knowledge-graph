---
title: 'ENH-005: FTS5 Database Relocation to User-Level Cache'
---

# ENH-005: FTS5 Database Relocation to User-Level Cache

**Local ID:** ENH-005 | **GitHub Issue:** #46

## Problem Statement

The FTS5 full-text search index (`.fts5.db`) is currently stored in the project directory (`{kgPath}/.fts5.db`) and listed in `.gitignore`. This causes two compounding problems:

1. **Lost on upgrade** — After a `git pull` or fresh clone, `.fts5.db` does not exist. Users get 0 search results with no explanation until they manually run `kg_fts5_rebuild`.

2. **Path mismatch** — The `kg_fts5_rebuild` and `kg_search` MCP tools scan `{kgPath}/lessons-learned/` and `{kgPath}/decisions/`. For projects where content lives under `docs/` (like this one), the tools index 0 files silently. The rebuild command reports success with 0 files.

**Root cause comparison:**

context-mode stores its database at `/tmp/context-mode-{PID}.db` — intentionally ephemeral, rebuilt fresh on every MCP server start, never committed. This works because context-mode indexes dynamic session output that changes every session.

kmgraph indexes stable markdown files that rarely change, so persistence *is* valuable — but the DB must live outside the project directory to survive git operations.

## Goals

1. **Survive upgrades** — Index persists across `git pull`, fresh clone, branch switches
2. **No git conflicts** — DB never inside the project directory
3. **Correct path resolution** — Tools detect actual content location (`docs/` subdir or root)
4. **Migration** — Existing `.fts5.db` files automatically moved on first upgrade
5. **No user action required** — Works transparently after install

## Proposed Behavior

After ENH-005:

```
~/.claude/kg-fts5/
└── knowledge-graph.db      ← persists across sessions, upgrades, git ops
```

- `kg_fts5_rebuild` writes to `~/.claude/kg-fts5/{kg-name}.db`
- `kg_search` reads from `~/.claude/kg-fts5/{kg-name}.db`
- `init` verify/upgrade flow detects old `.fts5.db` in project dir and migrates it
- `.gitignore` entry for `.fts5.db` removed (no longer in project dir)
- Content path auto-detection: tool checks both `{kgPath}/lessons-learned/` and `{kgPath}/knowledge/lessons-learned/` and uses whichever exists

## Requirements

### Functional

- [ ] `kg_fts5_rebuild` stores index at `~/.claude/kg-fts5/{kg-name}.db`
- [ ] `kg_search` reads index from `~/.claude/kg-fts5/{kg-name}.db`
- [ ] Both tools auto-detect content root (`{kgPath}/` or `{kgPath}/docs/`)
- [ ] `init` verify/upgrade Step 1f detects and migrates existing `.fts5.db` if present
- [ ] `init` verify/upgrade Step 1g checks if index is populated; offers rebuild if empty
- [ ] `.gitignore` entry `**/.fts5.db` removed
- [ ] `kg-config.json` does not need a new field — KG name is already available

### Non-Functional

- [ ] Migration is silent if no old `.fts5.db` exists (no-op)
- [ ] First-run rebuild completes in < 5 seconds for typical KG (< 100 files)
- [ ] No behavior change for users whose index is already current

## Affected Components

| Component | Change |
|---|---|
| `mcp-server/src/tools/fts5.ts` | Change DB path from `{kgPath}/.fts5.db` to `~/.claude/kg-fts5/{name}.db`; add content root auto-detection |
| `mcp-server/src/tools/search.ts` | Update FTS5 DB path resolution |
| `commands/init.md` | Add Step 1f (migrate old `.fts5.db`) and update Step 1g (rebuild check) |
| `.gitignore` | Remove `**/.fts5.db` pattern |
| `docs/GETTING-STARTED.md` | Update any references to `.fts5.db` location |

## Out of Scope

- Changing the FTS5 schema or index content
- Adding new fields to `kg-config.json`
- Changing how `fts5_declined` preference is stored (stays in `kg-config.json`)

## Related

- **ADR-011:** Defer Update Notifications — same pattern: user-level cache at `~/.claude/`
- **Fix 1 (v0.2.2-beta):** FTS5 index not rebuilt after upgrade — partially addressed; ENH-005 is the structural fix
- **Fix 2 (v0.2.2-beta):** KG path validation in init — ENH-005 content root auto-detection subsumes this
- **context-mode `db-base.ts`:** `/tmp/{PID}.db` pattern — inspiration for separating DB from project dir
