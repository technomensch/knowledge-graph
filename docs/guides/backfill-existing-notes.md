---
id: backfill-existing-notes
title: Backfill from Existing Project Notes
sidebar_label: Backfill existing notes
description: Import existing README, CHANGELOG, and chat history into the knowledge graph
---

# Backfill from Existing Project Notes

## Goal

Seed the knowledge graph from documentation and chat history that already exists, so the graph starts populated rather than empty.

## Prerequisites

- KMGraph initialized (`/kmgraph:init`)
- Existing project notes in one or more of: README, CHANGELOG, existing lessons, Claude/Gemini chat history

## Steps

### Option A — Backfill during init

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

### Option B — Backfill after init

```bash
/kmgraph:update-graph --auto --sync-all
```

This processes all existing lessons silently in one pass without per-lesson prompts. Existing lessons and decisions are never modified — only the search index and graph entries are updated.

### Option C — Extract from chat history

Export chat history from Claude Code or Gemini CLI first:

```bash
/kmgraph:extract-chat
```

The command locates chat logs, extracts lessons and decisions, and presents them for review before writing. Use `--delegate knowledge-extractor` for large exports (10+ sessions):

```bash
/kmgraph:extract-chat --delegate knowledge-extractor
```

## Verify

```bash
/kmgraph:status
```

The entry count should reflect the backfilled content. Then test search:

```bash
/kmgraph:recall "topic from your existing notes"
```

## Next steps

- [Recall a past decision](/quickstart#step-4--recall-it) — search the now-populated graph
- [Sync across machines](/guides/sync-across-machines) — share the populated graph
