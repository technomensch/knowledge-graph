---
title: FTS5 SearchDirs Missing Chat History
category:
  uri: uri-that-does-not-map-to-architecture
---
## Problem

`kg_fts5_rebuild` never indexes files in `knowledge/chat-history/` because the hardcoded `searchDirs` array in `mcp-server/src/tools/fts5.ts` does not include `"chat-history"`. The directory exists, is populated by `extract-chat`, and contained 70+ `.md` files — but 0 were indexed. The bug is silent: `kg_fts5_rebuild` returns success with no error, and `kg_search` returns empty results for chat-history content without any warning.

## Root Cause

`searchDirs = ["knowledge", "lessons-learned", "decisions", "sessions"]` is hardcoded — no `"chat-history"` entry. The indexer walks each `searchDirs` entry relative to `kgPath`. For this project, `kgPath` is `/Users/mkaplan/GitHub/knowledge-graph/knowledge`, and `extract-chat` writes to `{kgPath}/chat-history/`. Adding `"chat-history"` to the array is the complete fix.

## How Discovered

User noted `~/.kmgraph/chat-history/` was empty; chat-history had been moved to `knowledge/chat-history/` at some point. Confirmed via sqlite3:

```sql
SELECT COUNT(*) FROM kg_index_meta WHERE file_path LIKE '%chat-history%'
```

Returned 0 actual chat-history files indexed (only 2 ADR/session files that mention "chat-history" in their name). Traced through `mcp-server/dist/tools/fts5.js` and `mcp-server/dist/utils.js` to find `walkDir` (no exclusions) and the hardcoded `searchDirs` list.

## Solution

Add `"chat-history"` to `searchDirs` in `mcp-server/src/tools/fts5.ts`, then rebuild dist.

Tracked as Task N in the v0.5.9-decision-governance plan.

## How to Verify

After applying the fix, run `kg_fts5_rebuild`, then:

```bash
sqlite3 ~/.kmgraph/index/projects/knowledge-graph.db \
  "SELECT COUNT(*) FROM kg_index_meta WHERE file_path LIKE '%chat-history%'"
```

Should return ~70+.

## When to Apply

Any new KG subdirectory added under `kgPath` that is not in `searchDirs` will be silently skipped. When adding new content directories (e.g., `handoffs/`, `specs/`, `enhancements/`), always check whether they need to be added to `searchDirs` in `fts5.ts`.

More broadly: any time `extract-chat` or a new capture command writes to a new subdirectory, treat updating `searchDirs` as a required paired step — not an afterthought.

## Context

- Branch: main
- Commit: 39798b98
- Category: architecture
- Related: v0.5.9-decision-governance plan Task N; `knowledge/enhancements/ENH-015`
