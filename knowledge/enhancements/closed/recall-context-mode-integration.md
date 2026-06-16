---
title: CLOSED — recall + context-mode FTS5 integration
---

# CLOSED: recall + context-mode FTS5 Integration

## What Was Proposed (2026-03-16)

During a context-mode + kmgraph integration analysis, a suggestion was made that `/kmgraph:recall` should call `ctx_search` (context-mode's FTS5) instead of grep when the FTS5 index exists, for better relevance ranking and reduced context flooding.

## Why It Was Closed (2026-03-29)

Investigation revealed the proposal was based on a misunderstanding of the current architecture:

- `recall` already routes through `recall-agent` → `kg_search` MCP tool
- `kg_search` already uses kmgraph's **own** FTS5 index (`.fts5.db`) when present, with BM25 relevance ranking
- Falls back to linear scan only when `.fts5.db` is absent — not a ranking quality problem, a missing index problem

The apparent "0 results" issue in the session that prompted this was caused by the KG path being misconfigured (root vs. `docs/`), not by a search quality gap.

## What Actually Fixed It

The init verify/upgrade flow fix shipped in v0.2.2-beta (2026-03-29):
- **Step 1e**: detects missing `.fts5.db` after upgrade, offers to rebuild
- **KG path validation**: detects misconfigured path before rebuild, offers to correct

No context-mode dependency is needed or desirable. Users without context-mode installed get full FTS5 search quality via `kg_search`.

## Lesson

Don't replace working internal infrastructure with an optional external dependency. The right fix was to ensure the FTS5 index survives upgrades — not to route around it.
