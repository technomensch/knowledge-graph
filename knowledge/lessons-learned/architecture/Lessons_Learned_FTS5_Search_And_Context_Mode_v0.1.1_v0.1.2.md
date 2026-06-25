---
title: "Lesson: Native FTS5 Search and Context-Mode Integration (v0.1.1 + v0.1.2)"

created: 2026-03-16T00:00:00Z

author: technomensch
email: 917847+technomensch@users.noreply.github.com

git:
  branch: v0.0.4-github-docs
  commit: b8544784b78d17fd2bb8372375184194dc6d9038
  pr: 35
  issue: null

sources:
  - url: "https://www.npmjs.com/package/node-sqlite3-wasm"
    title: "node-sqlite3-wasm — npm"
    accessed: "2026-03-16"
    context: "Confirmed FTS5 + BM25 support, synchronous API, no native compilation"
  - url: "https://www.npmjs.com/package/sql.js"
    title: "sql.js — npm"
    accessed: "2026-03-16"
    context: "Evaluated as FTS5 candidate — rejected because sql.js compiles with FTS3 only"
  - url: "https://www.npmjs.com/package/better-sqlite3"
    title: "better-sqlite3 — npm"
    accessed: "2026-03-16"
    context: "Evaluated as FTS5 candidate — rejected because it requires native C++ compilation"
  - url: "https://sqlite.org/fts5.html"
    title: "SQLite FTS5 Extension"
    accessed: "2026-03-16"
    context: "Reference for FTS5 virtual table syntax and BM25 ranking"

tags: [fts5, search, sqlite, wasm, context-mode, zero-config, upgrade, graceful-fallback, typescript, mcp-server]

category: architecture
---

# Lesson Learned: Native FTS5 Search and Context-Mode Integration (v0.1.1 + v0.1.2)

**Date:** 2026-03-16
**Category:** architecture
**Version:** 1.0

---

## Problem

Two independent scalability issues emerged as the knowledge graph grew beyond small personal projects.

### Problem 1: Conversation Flooding (v0.1.1)

`/kmgraph:sync-all` and `/kmgraph:update-graph` read many `.md` files inline during execution. For a knowledge graph with 30+ lessons, this flooded the conversation context with raw file content that persisted in memory long after the work was done. The knowledge graph got updated correctly, but the conversation became cluttered and consumed tokens that should be available for actual work.

**Context:**
- Commands read files using Claude Code's Read tool, which inlines content into the context window
- No mechanism existed to read files "silently" without entering the conversation
- The problem worsened linearly with KG size

**Impact:**
- Large syncs consumed 10,000–40,000 tokens of conversation context on file reads alone
- Users with large KGs experienced noticeably slower, more expensive sessions
- No way to sync without the conversation filling up

### Problem 2: Slow, Unranked Search (v0.1.2)

`kg_search` (MCP tool) performed a linear file scan on every query — reading all `.md` files with `fs.readFileSync` and scoring matches by a simple title/heading/body heuristic. Results were ordered by match type (title > heading > body) with no relevance ranking within each tier.

**Context:**
- All `.md` files read synchronously on every search call
- No index, no caching, no relevance model
- Performance degraded linearly with KG size

**Impact:**
- Search on a 50-file KG took 200–500ms
- Results sorted by file position, not relevance — the most useful file could appear anywhere
- No way to improve without a fundamentally different approach

---

## Root Cause

### Problem 1 Root Cause

Claude Code has no native "background file read" primitive. All file reads via the Read tool enter the conversation context. The only way to avoid this is to delegate reads to an external process whose output does not enter the main context.

The context-mode plugin (`mksglu/context-mode`) provides exactly this: `ctx_batch_execute` and `ctx_execute_file` run shell commands and file reads in a sandboxed subprocess, returning only a compact summary to the conversation.

The root cause of the problem was not using this capability — because kmgraph had no integration with context-mode at all.

### Problem 2 Root Cause

Linear scan is the simplest possible search implementation. It works at small scale but has no path to relevance ranking without a fundamentally different data structure. SQLite's FTS5 extension provides a production-grade full-text search index with BM25 relevance ranking built in — but choosing the right SQLite package for a Node.js plugin with a zero-config install requirement turned out to be non-trivial.

---

## Solution

### Solution 1: Context-Mode Integration (v0.1.1)

**Approach:** Detection-based optional integration. At runtime, kmgraph checks whether `mcp__plugin_context-mode_context-mode__ctx_batch_execute` is available. If yes, use it. If no, fall back to existing behavior. Zero hard dependency.

**Key design principle:** The integration must be invisible to users who don't have context-mode. No configuration, no errors, no degraded behavior — just a transparent optimization.

**Changes to `commands/sync-all.md`:**
- Added Step 0 detection block before the main sync loop
- When context-mode is available: wraps the lesson scan and MEMORY.md size check in a single `ctx_batch_execute` call — only a one-line summary enters the conversation
- When context-mode is absent: existing inline file-read behavior unchanged

**Changes to `commands/update-graph.md`:**
- Added three-tier fallback based on lesson count and context-mode availability:
  1. ≥10 lessons AND context-mode available → `ctx_execute_file` per lesson (sandboxed reads)
  2. ≥10 lessons, no context-mode → delegate to `knowledge-extractor` subagent
  3. <10 lessons → direct Read (unchanged)

**Result:** Users with context-mode installed get significantly cleaner conversations during large syncs. Users without it see no change.

---

### Solution 2: Native FTS5 Search (v0.1.2)

**Approach:** Add a SQLite FTS5 index at `{kg-root}/.fts5.db`. `kg_search` checks for this file first; if present, queries the index for BM25-ranked results. If absent or on error, falls back to the existing linear scan. The index is built and maintained by a new `kg_fts5_rebuild` MCP tool.

#### Package Selection: Why node-sqlite3-wasm

Three packages were evaluated. The selection was constrained by kmgraph's zero-config install requirement: the SessionStart hook runs `npm install --omit=dev` automatically, and any package requiring native C++ compilation would fail on machines without build tools.

| Package | FTS5 | API Style | Compilation | Verdict |
|---------|------|-----------|-------------|---------|
| `better-sqlite3` | ✅ | Synchronous | Native C++ — requires python3, make, compiler | ❌ Rejected |
| `sql.js` | ❌ | Synchronous | WASM — no native compilation | ❌ Rejected (FTS3 only) |
| `@sqlite.org/sqlite-wasm` | ✅ | Async | WASM — no native compilation | ❌ Rejected (ESM-only) |
| `node-sqlite3-wasm` | ✅ | Synchronous | WASM — no native compilation | ✅ Chosen |

**sql.js failure (confirmed in testing):**
```sql
-- This fails at runtime with sql.js:
CREATE VIRTUAL TABLE test USING fts5(content);
-- Error: "no such module: fts5"
```
sql.js ships with FTS3 compiled in, not FTS5. This was discovered by running the CREATE TABLE statement — not from documentation.

**@sqlite.org/sqlite-wasm rejection:**
The official SQLite WASM package uses ESM (`import`/`export`). The MCP server package.json has `"type": "commonjs"`. ESM-only packages cannot be used in a CommonJS module. Rejected without testing.

**node-sqlite3-wasm selection:**
- WASM-compiled SQLite with FTS5 + BM25 enabled
- Synchronous API (no async init, no `db.export()` serialization)
- Persistent file-based database (reads/writes directly to `.fts5.db`)
- CommonJS-compatible
- Single npm dependency, ~3MB

**API pattern used:**
```typescript
const db = new Database('/path/to/file.db');
const rows = db.all(
  `SELECT file_path, section_heading, content, bm25(kg_entries) as rank
   FROM kg_entries WHERE kg_entries MATCH ? ORDER BY rank LIMIT 50`,
  [sanitizedQuery]
);
db.close();
```

#### Zero-Config Upgrade Mechanism

**Problem:** Existing v0.1.0 users have `node_modules/@modelcontextprotocol` already installed. The SessionStart hook only triggered `npm install` when that folder was absent. Adding `node-sqlite3-wasm` as a new dependency would never be installed for existing users.

**Solution:** Store an md5 hash of `package.json` in `node_modules/.pkg-installed-hash` after each successful install. On every session start, recompute the hash. If it differs, trigger `npm install` again.

```bash
# In hooks-master.sh:
MCP_PKG_HASH_FILE="$PLUGIN_ROOT/mcp-server/node_modules/.pkg-installed-hash"

if command -v md5sum &> /dev/null; then
    CURRENT_HASH=$(md5sum "$MCP_PKG_JSON" | cut -d' ' -f1)
elif command -v md5 &> /dev/null; then
    CURRENT_HASH=$(md5 -q "$MCP_PKG_JSON")
fi
STORED_HASH=$(cat "$MCP_PKG_HASH_FILE" 2>/dev/null || echo "")

if [ -n "$CURRENT_HASH" ] && [ "$CURRENT_HASH" != "$STORED_HASH" ]; then
    NEEDS_INSTALL=true
fi

# After successful install:
echo "$CURRENT_HASH" > "$MCP_PKG_HASH_FILE"
```

**Result:** Any future dependency change in `package.json` automatically triggers re-install on the user's next session start. No user action required.

#### Graceful Fallback for Optional Dependencies

**Problem:** `node-sqlite3-wasm` is installed by the SessionStart hook at first run. Between upgrading the plugin and the first session restart, the package does not exist. A hard `import { Database } from "node-sqlite3-wasm"` at module load would crash the MCP server.

**Solution:** Replace the static import with a `try/require` pattern. Guard all FTS5 operations with a boolean flag.

```typescript
// Before (crashes MCP server if package absent):
import { Database } from "node-sqlite3-wasm";

// After (graceful — MCP server starts normally):
let Database: any;
let fts5Available = false;
try {
  Database = require("node-sqlite3-wasm").Database;
  fts5Available = true;
} catch {
  // node-sqlite3-wasm not installed yet — FTS5 disabled until next restart
}
```

**TypeScript complication (TS2749):**
After switching to `let Database: any`, the original function signatures used `Database` as a type:
```typescript
function initDb(db: Database): void { ... }     // TS2749: 'Database' refers to a value
function indexFile(db: Database, ...): number { ... } // TS2749: same error
```
TypeScript cannot use a runtime `let` variable as a type annotation. Fix: change parameter types to `any`:
```typescript
function initDb(db: any): void { ... }
function indexFile(db: any, ...): number { ... }
```

**Behavioral result:**
- If FTS5 unavailable: `kg_search` returns `[]` from `searchFts5`, falls back to linear scan
- If FTS5 unavailable: `kg_fts5_rebuild` returns a helpful message asking user to restart
- MCP server starts cleanly regardless of whether `node-sqlite3-wasm` is installed

---

## Verification

### Context-Mode Integration
- Manual test: `sync-all` completes with identical results with and without context-mode
- Manual test: `update-graph` reads files in background when context-mode present and ≥10 lessons
- Detection failure test: context-mode absent → existing behavior, no errors

### FTS5 Search
- 10 unit tests in `mcp-server/tests/fts5.test.ts` — all passing:
  - `sanitizeFts5Query`: strips operators, handles empty input
  - `indexFile`: parses frontmatter title, headings, body into correct rows
  - `rebuildIndex`: skips unchanged files, re-indexes modified files, removes deleted files
  - `searchFts5`: returns correct shape, handles empty query
  - Corrupt database: `searchFts5` throws on corrupt `.fts5.db` (does not silently return empty)
- Build verification: `npm run build` zero errors after TS2749 fix

---

## Prevention System

**Dependency upgrade pattern (for future MCP server deps):**
1. Add hash check to `hooks-master.sh` — already in place, covers all future `package.json` changes
2. Use `try/require` for any optional or first-run dependency
3. Change type annotations from the loaded class to `any` in any function that receives the instance
4. Add a `fooAvailable` boolean guard at module level
5. Add unit tests that run with the real package (not mocked) to catch API changes early

**Plugin integration pattern (for future optional companion plugins):**
1. Check tool availability at runtime, not install-time
2. All integration paths must have a fallback that preserves existing behavior
3. Document detection mechanism in comments — it is not obvious to future maintainers
4. Add a plain-language note in user docs: "activates automatically when X is installed"

---

## Replication Pattern

### Pattern: Zero-Config Dependency Upgrade in a Shell-Hook-Managed npm Project

**When to apply:**
- A Node.js project whose dependencies are managed by a shell script (e.g., a Claude Code hook)
- The script checks for existing `node_modules` but does not re-run on dependency changes
- A new dependency is being added in an upgrade

**Universal pattern:**
1. Compute a hash of `package.json` (use `md5sum` on Linux, `md5 -q` on macOS — check both)
2. Store the hash in `node_modules/.pkg-installed-hash` after a successful install
3. On each hook run, compare current hash to stored hash; re-run install if they differ
4. Handle the "hash tool not available" case gracefully (skip comparison, don't re-install)

**Customization points:**
- Hash file location (any path inside `node_modules/` works)
- Hash tool detection (`md5sum` vs `md5` vs `sha256sum`)
- Error handling strategy for failed installs

---

### Pattern: Graceful Fallback for Optional npm Dependencies in a TypeScript MCP Server

**When to apply:**
- An MCP server gains a new optional feature backed by an npm package
- The package may not be present at startup (first-run, pending install, upgrade in progress)
- The feature should degrade gracefully, not crash the server

**Universal pattern:**
```typescript
let OptionalLib: any;
let featureAvailable = false;
try {
  OptionalLib = require("optional-package").ClassName;
  featureAvailable = true;
} catch {
  // Package not installed yet — feature disabled
}

// Guard all usage:
export function doFeatureThing(...): ReturnType {
  if (!featureAvailable) {
    return defaultFallback; // or throw descriptive error
  }
  const instance = new OptionalLib(args);
  // ...
}
```

**TypeScript note:** Any function that accepts an instance of the dynamically-loaded class must use `any` for that parameter's type, since the class is a runtime value, not a compile-time type.

---

## What Didn't Work

1. **sql.js for FTS5** — Documentation implies FTS support; testing proved only FTS3 is compiled in. Always run `CREATE VIRTUAL TABLE USING fts5(...)` as a smoke test before committing to a package.

2. **@sqlite.org/sqlite-wasm** — ESM-only. Cannot be used in a `"type": "commonjs"` package. Check ESM/CJS compatibility before evaluating a package's API.

3. **`npx jest` using global jest instead of local** — In some environments, `npx jest` downloads a fresh global copy rather than using the local install. Use `node_modules/.bin/jest` directly when running tests from a specific project.

4. **`npm install` skipping devDependencies** — In some shell environments, bare `npm install` acts like production mode. Use `npm install --include=dev` explicitly when devDependencies are needed (e.g., for running tests).

5. **Static import for an upgrade-added package** — The first instinct was a clean `import { Database } from "node-sqlite3-wasm"`. This would have crashed the MCP server for any existing user on their first session after upgrading. The try/require pattern must be established before the package ships.

---

## Lessons & Takeaways

**Key Insights:**

1. **Zero-config is a constraint, not a feature** — Every dependency decision must be evaluated against "will this install automatically on a user's machine without any tools?". Native compilation (better-sqlite3) fails this test. ESM-only packages fail this test in CommonJS projects. WASM packages with synchronous APIs pass.

2. **Package documentation does not equal package behavior** — sql.js says "FTS support" but ships FTS3. The only reliable test is to run the feature-specific SQL at development time.

3. **Hash-based change detection is the right primitive for hook-managed installs** — Checking for a specific folder (like `node_modules/@modelcontextprotocol`) only detects "installed vs not installed". It misses the "installed but outdated" state that every upgrade creates. A package.json hash catches both.

4. **Try/require is the right pattern for optional MCP features** — The MCP server must start cleanly even if a feature's package isn't installed yet. `try/require` with a boolean guard is idiomatic Node.js for this; the TypeScript implication (use `any` for types) is a small price.

5. **Detection-based optional integrations are more resilient than configuration-based** — Checking for a tool's availability at runtime (does `ctx_batch_execute` exist?) is more reliable than checking a config flag (is `context-mode: true` set?). The tool either works or it doesn't.

**What Worked:**
- Keeping both features independently fallback-safe — each can be absent without affecting the other
- Writing unit tests for the FTS5 module before merging (caught the TS2749 error early)
- Separating the "install the package" problem from the "use the package" problem in hooks-master.sh

**If We Had to Do It Again:**
- Evaluate WASM SQLite packages first when native compilation is off the table
- Run a smoke test (FTS5 CREATE TABLE) earlier in package evaluation to avoid going deep on sql.js
- Add the hash check to hooks-master.sh at the same time as adding the first npm dependency, not reactively when a second one appears

---

## Related ADRs

- [ADR-015: Choose node-sqlite3-wasm for FTS5 Search](../../decisions/ADR-015-node-sqlite3-wasm-for-fts5-search.md)
- [ADR-016: Graceful Fallback Pattern for Optional MCP Dependencies](../../decisions/ADR-016-graceful-fallback-optional-mcp-dependencies.md)

---

## Related Documentation

**Architecture Decisions:**
- See ADR-015 and ADR-016 (created with this lesson)

**Implementation:**
- `mcp-server/src/tools/fts5.ts` — FTS5 index management and search
- `mcp-server/src/tools/search.ts` — `kg_search` with FTS5/linear-scan routing
- `scripts/hooks-master.sh` — Zero-config upgrade via package.json hash check
- `commands/sync-all.md` — Context-mode integration (Step 0)
- `commands/update-graph.md` — Context-mode integration (three-tier fallback)

**Tests:**
- `mcp-server/tests/fts5.test.ts` — 10 unit tests for FTS5 module

**User Documentation:**
- `docs/CONCEPTS.md` — "Keeping the Conversation Focused", "How Search Works"
- `docs/GETTING-STARTED.md` — Optional Features section
- `docs/COMMAND-GUIDE.md` — Search Index section, Technical Details section

---

**Version:** 1.0
**Created:** 2026-03-16
**Last Updated:** 2026-03-16
