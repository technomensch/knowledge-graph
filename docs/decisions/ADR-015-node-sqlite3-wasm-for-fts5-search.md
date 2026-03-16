# ADR-015: Choose node-sqlite3-wasm for FTS5 Full-Text Search

**Date:** 2026-03-16
**Status:** Accepted
**Implements:** v0.1.2-beta — Native FTS5 Search
**Related:** [ADR-016](ADR-016-graceful-fallback-optional-mcp-dependencies.md), [Lesson: FTS5 and Context-Mode v0.1.1+v0.1.2](../lessons-learned/architecture/Lessons_Learned_FTS5_Search_And_Context_Mode_v0.1.1_v0.1.2.md)

---

## Context

`kg_search` (MCP tool) performed a linear file scan on every query. For a growing knowledge graph, this approach has two compounding problems: results are ordered by file position rather than relevance, and performance degrades linearly with corpus size.

SQLite's FTS5 extension provides a production-grade full-text index with BM25 relevance ranking and a porter stemmer — exactly what is needed. The decision was which npm package to use to access SQLite FTS5 from a Node.js MCP server.

**Problem:**
- Need SQLite FTS5 with BM25 ranking in a Node.js TypeScript project
- MCP server uses `"type": "commonjs"` — ESM-only packages are incompatible
- kmgraph's zero-config install relies on `npm install --omit=dev` run by a shell hook — any package requiring native C++ compilation will fail on machines without build tools (Python 3, make, C++ compiler, Xcode Command Line Tools)

**Scope:**
- In scope: npm package selection for SQLite FTS5 access in the MCP server
- Out of scope: search algorithm design, index schema, query syntax

**Constraints:**
- No native compilation (breaks zero-config install on vanilla machines)
- Must support FTS5 (not just FTS3)
- Must be CommonJS-compatible (not ESM-only)
- Must have a synchronous API (MCP server tools are synchronous by design)

---

## Decision

Use `node-sqlite3-wasm` (version ^0.8.55) as the SQLite provider for FTS5 search in the kmgraph MCP server.

### Core Components

1. **WASM-compiled SQLite:** node-sqlite3-wasm ships a WebAssembly build of SQLite with FTS5 and BM25 compiled in. No native toolchain required.
2. **Synchronous API:** `new Database(path)`, `db.prepare(sql)`, `stmt.all(params)`, `db.close()` — all synchronous, matching the MCP server's execution model.
3. **Persistent file-based storage:** Opens and writes directly to `.fts5.db` on disk. No serialization (`db.export()`) required — the file is always consistent.

### Implementation Approach

```typescript
const { Database } = require("node-sqlite3-wasm");
const db = new Database('/path/to/.fts5.db');
const rows = db.all(
  `SELECT file_path, section_heading, content, bm25(kg_entries) as rank
   FROM kg_entries WHERE kg_entries MATCH ? ORDER BY rank LIMIT 50`,
  [sanitizedQuery]
);
db.close();
```

---

## Rationale

### Why This Approach

1. **Only viable WASM option with FTS5:** sql.js (the most widely known WASM SQLite) ships with FTS3 only — this was confirmed by running `CREATE VIRTUAL TABLE USING fts5(...)` at development time, which returned `"no such module: fts5"`. node-sqlite3-wasm compiles the full SQLite source including FTS5.
2. **No native compilation:** The zero-config install requirement is non-negotiable. native `better-sqlite3` would fail silently or with cryptic errors on machines without Xcode Command Line Tools or build-essentials.
3. **Synchronous API eliminates async complexity:** The MCP server's tool handlers are synchronous. An async API would require either making all handlers async (a large refactor) or using synchronous wrappers around async calls (fragile).
4. **CommonJS compatible:** The `@sqlite.org/sqlite-wasm` official package is ESM-only. Using it in a `"type": "commonjs"` package requires complex bundler configuration that conflicts with the project's simple `tsc` build.

### Alternatives Considered

**Option A: better-sqlite3**
- Pros: Most widely used, well-documented, fastest synchronous SQLite for Node.js, full FTS5 support
- Cons: Requires native C++ compilation via node-gyp; needs Python 3, make, and a C++ compiler; fails on macOS without Xcode Command Line Tools; requires recompilation on Node.js major version upgrades; would fail in kmgraph's zero-config install hook
- Rejected because: Native compilation breaks zero-config install on most user machines

**Option B: sql.js**
- Pros: Widely known, WASM-based, no native compilation, synchronous API, persistent file storage
- Cons: FTS3 only — `CREATE VIRTUAL TABLE USING fts5(...)` fails at runtime with "no such module: fts5"
- Rejected because: Does not provide FTS5 (the reason for switching from linear scan)

**Option C: @sqlite.org/sqlite-wasm (official)**
- Pros: Official SQLite project, actively maintained, full FTS5 support
- Cons: ESM-only; incompatible with `"type": "commonjs"` package without a bundler; would require significant build configuration changes
- Rejected because: ESM/CJS incompatibility; adds bundler complexity to a project using plain `tsc`

**Option D: @sqlite.org/sqlite-wasm (official)**

### Trade-offs

**Benefits:**
- ✅ FTS5 + BM25 ranking — relevance-sorted results vs file-position ordering
- ✅ No native compilation — installs cleanly on any machine with Node.js
- ✅ CommonJS compatible — works with existing `tsc` build, no bundler needed
- ✅ Synchronous API — no async refactor required in MCP server tools
- ✅ Persistent files — `.fts5.db` persists across process restarts without serialization

**Costs:**
- ❌ ~3MB larger install footprint (WASM binary) vs native build (~1MB)
- ❌ Marginally slower than native `better-sqlite3` for very large indexes
- ❌ Less documentation and community support than `better-sqlite3`

**Mitigation:**
- Performance difference is immaterial for typical KG sizes (< 1,000 files)
- Package size is acceptable given the feature being enabled

---

## Consequences

### Positive

1. **Relevance-ranked search:** BM25 ranking surfaces the most relevant files first, regardless of where the match appears in the file
2. **Porter stemmer:** "searching" matches "search", "decisions" matches "decision" — reduces missed results from word form variation
3. **Incremental rebuild:** mtime-based change detection means only modified files are re-indexed on each rebuild
4. **Zero-config install:** Existing users get `node-sqlite3-wasm` installed automatically on their next session start via the package.json hash check in hooks-master.sh (see ADR-016 for the graceful fallback pattern)

### Negative

1. **Graceful fallback required:** Because the package installs asynchronously on first session start, the MCP server must handle the case where `node-sqlite3-wasm` is not yet present. This requires the `try/require` pattern (see ADR-016).
2. **WASM startup overhead:** The first query of a session initializes the WASM runtime (~50-100ms). Subsequent queries are fast.

### Neutral

1. **New `.fts5.db` artifact:** Added to `.gitignore` as `**/.fts5.db`. Local only, rebuilt on demand.
2. **New `kg_fts5_rebuild` MCP tool:** Expands the tool count from 7 to 8.

---

## Implementation

**Timeline:** Implemented 2026-03-16 in v0.1.2-beta

**Affected Components:**
- `mcp-server/package.json` — added `"node-sqlite3-wasm": "^0.8.55"`
- `mcp-server/src/tools/fts5.ts` — new module: index management, search, MCP tool registration
- `mcp-server/src/tools/search.ts` — updated to route through FTS5 when index present
- `mcp-server/src/index.ts` — registers `kg_fts5_rebuild` tool
- `scripts/hooks-master.sh` — package.json hash check ensures new dep installs on upgrade
- `.gitignore` — added `**/.fts5.db`

**Migration Path:**
Existing users (v0.1.0 → v0.1.2): no action required. `node-sqlite3-wasm` installs automatically on next session start. `kg_search` falls back to linear scan until the user builds the index via `kg_fts5_rebuild` or `/kmgraph:sync-all`.

---

## Validation

**Success Criteria:**
- ✅ `npm run build` succeeds with zero TypeScript errors
- ✅ 10 unit tests in `mcp-server/tests/fts5.test.ts` pass
- ✅ `kg_search` returns FTS5 results when index exists; falls back cleanly when absent
- ✅ MCP server starts cleanly before `node-sqlite3-wasm` is installed (graceful fallback)

**Review Date:** 2026-09-16 — reassess if a better WASM SQLite with FTS5 becomes available, or if native compilation can be made zero-config

---

## Related Decisions

- **[ADR-016](ADR-016-graceful-fallback-optional-mcp-dependencies.md):** Graceful fallback pattern — required because node-sqlite3-wasm installs asynchronously on upgrade

---

## Related Documentation

**Lessons Learned:**
- [FTS5 Search and Context-Mode Integration v0.1.1+v0.1.2](../lessons-learned/architecture/Lessons_Learned_FTS5_Search_And_Context_Mode_v0.1.1_v0.1.2.md)

**Implementation:**
- `mcp-server/src/tools/fts5.ts`
- `mcp-server/tests/fts5.test.ts`

---

## Future Considerations

1. **better-sqlite3 via optional dependency:** If a zero-config native compilation solution becomes available (e.g., prebuilt binaries for all platforms), better-sqlite3 could offer better performance. Revisit if user feedback indicates search latency is a concern.
2. **Index size:** For very large KGs (10,000+ files), monitor `.fts5.db` file size. FTS5's content table stores text; consider content= option to avoid duplication if disk usage becomes a concern.

---

**Decision Made:** 2026-03-16
**Last Updated:** 2026-03-16
**Status:** Accepted
