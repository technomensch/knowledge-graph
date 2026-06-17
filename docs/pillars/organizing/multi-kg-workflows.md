---
title: Multi-KG Workflows
category:
  uri: organizing
position: 2
slug: pillars-organizing-multi-kg-workflows
parent:
  uri: pillars-organizing-index
---

# Multi-KG Workflows

> "I have knowledge that spans multiple projects. How do I manage more than one graph?"

KMGraph supports multiple knowledge graphs — project-local, personal, and cowork — each capturing a different scope of knowledge. KMGraph must be initialized (`/kmgraph:kmg-init`) and git configured before using multiple KGs.

## KG types

| Type | Storage location | Shared with |
|---|---|---|
| `project-local` | `docs/` (in the project repo) | Anyone with repo access |
| `personal` | `~/.kmgraph/` | Only the individual (synced via personal git remote) |
| `cowork` | Configurable shared path | Team (synced via shared git remote) |
| `custom` | Any path | Configured per instance |

## View and switch

```bash
/kmgraph:kmg-list
```

Shows all configured KGs and which is currently active.

```bash
/kmgraph:kmg-switch personal
/kmgraph:kmg-switch project-local
/kmgraph:kmg-switch cowork
```

All capture and recall commands operate on the active KG.

Run `/kmgraph:kmg-status` to confirm the active KG and entry count, or `/kmgraph:kmg-list` to see all registered KGs.

## Set up a personal KG

```bash
/kmgraph:kmg-init-personal-kg
```

Creates `~/.kmgraph/` and registers it. Use this for patterns that apply across all projects.

## Set up a cowork KG

Edit `~/.claude/kg-config.json`:

```json
{
  "graphs": {
    "cowork": {
      "type": "cowork",
      "path": "/path/to/shared/kg",
      "gitStrategy": "commit"
    }
  }
}
```

Then switch to it: `/kmgraph:kmg-switch cowork`

`gitStrategy` controls what happens to entries after capture:

| Value | Behavior |
|---|---|
| `commit` | Auto-commits each new entry |
| `stage` | Stages entry but does not commit |
| `ignore` | Creates the file but does not touch git |

Set per-KG in `kg-config.json` under the `graphs[name]` block.

## Capture without switching

```bash
/kmgraph:kmg-capture-lesson --targetKg personal
/kmgraph:kmg-capture-lesson --targetKg project-local
```

## Search across all KGs

```bash
/kmgraph:kmg-recall --all "search terms"
```

## Related

- [Sync Across Machines](../portability/sync-across-machines.md) — keep KGs in sync on multiple machines
- [Sanitize Before Sharing](./sanitize-before-sharing.md) — scrub sensitive data from a shared KG
- [Graph Configuration](./graph-configuration.md) — full `kg-config.json` schema
