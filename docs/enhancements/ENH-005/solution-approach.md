---
title: Solution Approach — ENH-005 FTS5 Database Relocation
enhancement_id: ENH-005
github_issue: 46
status: Draft
created: 2026-03-30
---

# Solution Approach: ENH-005 FTS5 Database Relocation

**Local ID:** ENH-005 | **GitHub Issue:** #46

## Core Design

Two changes working together:

1. **DB path**: `{kgPath}/.fts5.db` → `~/.claude/kg-fts5/{kg-name}.db`
2. **Content root auto-detection**: scan both `{kgPath}/` and `{kgPath}/docs/` to find where markdown files actually live

## Change 1: DB Path Resolution

```typescript
// Current (broken)
const dbPath = path.join(kgPath, ".fts5.db");

// New
import { homedir } from "node:os";

function getFTS5DbPath(kgName: string): string {
  const cacheDir = path.join(homedir(), ".claude", "kg-fts5");
  fs.mkdirSync(cacheDir, { recursive: true });
  return path.join(cacheDir, `${kgName}.db`);
}
```

`kgName` comes from `kg-config.json` `.active` field — already available in every MCP tool call.

## Change 2: Content Root Auto-Detection

```typescript
function resolveContentRoot(kgPath: string): string {
  // Check if content lives under docs/ (this project's pattern)
  const docsSubdir = path.join(kgPath, "docs");
  if (fs.existsSync(path.join(docsSubdir, "lessons-learned")) ||
      fs.existsSync(path.join(docsSubdir, "decisions"))) {
    return docsSubdir;
  }
  // Default: content at KG root
  return kgPath;
}
```

The FTS5 rebuild scans `{contentRoot}/lessons-learned/`, `{contentRoot}/decisions/`, `{contentRoot}/sessions/`, `{contentRoot}/knowledge/`.

## Change 3: Migration in `init` verify/upgrade

Add Step 1f to the verify/upgrade flow:

```
Step 1f: Check for legacy .fts5.db
→ If {kgPath}/.fts5.db exists:
  "Found legacy FTS5 index at {kgPath}/.fts5.db — migrating to ~/.claude/kg-fts5/{name}.db"
  → Copy file to new location
  → Delete old file
  → Remove .fts5.db from .gitignore if present
  "Migration complete. Search index preserved."
→ If not found: no-op
```

## Change 4: .gitignore Cleanup

Remove `**/.fts5.db` from `.gitignore`. The DB is no longer in the project directory.

## Implementation Sequence

1. **`mcp-server/src/tools/fts5.ts`** — Update `getFTS5DbPath()`, add `resolveContentRoot()`
2. **`mcp-server/src/tools/search.ts`** — Update FTS5 path resolution to use same helper
3. **`commands/init.md`** — Add Step 1f (migration) and update Step 1g (rebuild check uses new path)
4. **`.gitignore`** — Remove `**/.fts5.db`
5. **`docs/GETTING-STARTED.md`** — Update any references to `.fts5.db` location

## Notes

- The `kgName` is always available from `kg-config.json` — no new config fields needed
- `~/.claude/kg-fts5/` directory created on first use via `mkdirSync({ recursive: true })` — no setup step
- WAL mode still applies (inherited from existing FTS5 implementation)
- If multiple KGs exist, each gets its own `{name}.db` — no conflicts
