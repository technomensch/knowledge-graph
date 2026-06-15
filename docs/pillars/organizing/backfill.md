---
title: Backfill
category:
  uri: organizing
position: 4
slug: pillars-organizing-backfill
parent:
  uri: pillars-organizing-index
---

# Backfill

> "I have existing notes. How do I get them into the graph?"

Seed the knowledge graph from documentation and chat history that already exists, so the graph starts populated rather than empty. KMGraph must be initialized (`/kmgraph:init`) with existing project notes in README, CHANGELOG, or chat history.

## During init

When running `/kmgraph:init`, accept the optional backfill prompt:

```
Would you like to backfill the knowledge graph from existing project context? [y/N]
```

Select `y`. The backfill automatically processes:
- `README.md`
- `CHANGELOG.md`
- Existing `docs/lessons-learned/` entries
- Existing `docs/decisions/` ADRs
- Chat history exports (if present)

## After init

```bash
/kmgraph:update-graph --auto --sync-all
```

This processes all existing lessons silently in one pass without per-lesson prompts. Existing lessons and decisions are never modified — only the search index and graph entries are updated.

Confirm with `/kmgraph:status` (entry count) and `/kmgraph:recall "topic"` (search works).

## From chat history

Export chat history from Claude Code or Gemini CLI first:

```bash
/kmgraph:extract-chat
```

The command locates chat logs, extracts lessons and decisions, and presents them for review before writing. Use `--delegate knowledge-extractor` for large exports (10+ sessions):

```bash
/kmgraph:extract-chat --delegate knowledge-extractor
```

## Related

- [Quickstart](../../quickstart.mdx#step-4--recall-it) — search the now-populated graph
- [Sync Across Machines](../portability/sync-across-machines.md) — share the populated graph
