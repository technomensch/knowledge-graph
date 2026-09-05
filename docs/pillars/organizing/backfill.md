---
title: Backfill
---

# Backfill

> "I have existing notes. How do I get them into the graph?"

Seed the knowledge graph from documentation and chat history that already exists, so the graph starts populated rather than empty. KMGraph must be initialized (`/kmgraph:kmg-init`) with existing project notes in README, CHANGELOG, or chat history.

## During init

When running `/kmgraph:kmg-init`, accept the optional backfill prompt:

```
Would you like to backfill the knowledge graph from existing project context? [y/N]
```

Select `y`. The backfill automatically processes:
- `README.md`
- `CHANGELOG.md`
- Existing `knowledge/lessons-learned/` entries
- Existing `knowledge/decisions/` ADRs
- Chat history exports (if present)

## After init

```bash
/kmgraph:kmg-backfill
```

This scans `chat-history/`, `lessons-learned/`, and `decisions/`, drafts candidates, and presents them for confirmation before writing anything. Existing lessons and decisions are never modified — only the knowledge graph's index entries are created or updated.

Confirm with `/kmgraph:kmg-status` (entry count) and `/kmgraph:kmg-recall "topic"` (search works).

## From chat history

Export chat history from Claude Code or Gemini CLI first:

```bash
/kmgraph:kmg-extract-chat
```

The command locates chat logs, extracts lessons and decisions, and presents them for review before writing. Use `--delegate knowledge-extractor` for large exports (10+ sessions):

```bash
/kmgraph:kmg-extract-chat --delegate knowledge-extractor
```

## Related

- [Quickstart](../../quickstart#step-4--recall-it) — search the now-populated graph
- [Sync Across Machines](../portability/sync-across-machines.md) — share the populated graph

## Troubleshooting

### Init completed but backfill was skipped

If the initialization wizard ran but the backfill offer didn't appear (or you declined it), run backfill manually:

**Claude Code:**
```
/kmgraph:kmg-init
```
Re-run init on the same project — it detects the existing KG and jumps directly to the backfill offer (Step 1.10).

**Gemini CLI:**
```
/kmg-init
```
Same behavior — re-running init on an initialized project triggers the backfill wizard.

**Codex / other platforms:**
Use the MCP tool directly:
```
kg_capture  (after running kg_search to confirm the KG is active)
```
Or re-run the init command for your platform — the existing KG is preserved and the backfill step runs again.

### Backfill ran but produced no candidates

The extractor found no scannable sources. Confirm at least one of these exists in your project root:
- `chat-history/` or `knowledge/chat-history/`
- `plans/` or `knowledge/plans/`
- `research/`
- `specs/`
- `README.md`
- `CHANGELOG.md`

If sources exist but were missed, re-run `/kmgraph:kmg-init` (it detects the existing KG and re-offers the backfill step) — or, if the missed source is `chat-history/`, `lessons-learned/`, or `decisions/`, run `/kmgraph:kmg-backfill` directly, optionally scoped to a path:

**Claude Code:**
```
/kmgraph:kmg-backfill knowledge/chat-history/2026-08/
```

If the missed source is `research/`, `plans/`, or `specs/` instead, `kmg-backfill` can't reach it — re-running `/kmgraph:kmg-init` is the only remedy.

### Backfill failed mid-run

If the extractor agent crashed or timed out partway through, no partial writes occur (the extractor is read-only; writes happen in the coordinator only after confirmation). Re-run the backfill trigger safely — duplicate candidates are surfaced for review, not auto-written.
