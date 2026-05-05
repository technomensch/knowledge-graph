---
id: multi-kg-workflows
title: Multi-KG Workflows
sidebar_label: Multi-KG Workflows
description: How to use project-local, personal, and cowork knowledge graphs side by side
---

# Multi-KG Workflows

## Goal

Capture and retrieve knowledge across multiple knowledge graphs — a project-local KG for project-specific decisions, a personal KG for reusable patterns across all projects, and optionally a cowork KG for team-shared knowledge.

## KG Types

| Type | Storage location | Shared with |
|---|---|---|
| `project-local` | `docs/` (in the project repo) | Anyone with repo access |
| `personal` | `~/.kmgraph/` | Only the individual (synced via personal git remote) |
| `cowork` | Configurable shared path | Team (synced via shared git remote) |
| `custom` | Any path | Configured per instance |

## Prerequisites

- KMGraph initialized (`/kmgraph:init`)
- Git configured (recommended for sync)

## Steps

### View active knowledge graphs

```bash
/kmgraph:list
```

Shows all configured KGs and which is currently active.

### Switch the active KG

```bash
/kmgraph:switch personal
/kmgraph:switch project-local
/kmgraph:switch cowork
```

All capture and recall commands operate on the active KG.

### Initialize a personal KG

```bash
/kmgraph:init-personal-kg
```

Creates `~/.kmgraph/` and registers it. Use this for patterns that apply across all projects.

### Configure a cowork KG

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

Then switch to it: `/kmgraph:switch cowork`

### Configure git strategy per KG

`gitStrategy` controls what happens to entries after capture:

| Value | Behavior |
|---|---|
| `commit` | Auto-commits each new entry |
| `stage` | Stages entry but does not commit |
| `ignore` | Creates the file but does not touch git |

Set per-KG in `kg-config.json` under the `graphs[name]` block.

### Capture to a specific KG without switching

```bash
/kmgraph:capture-lesson --targetKg personal
/kmgraph:capture-lesson --targetKg project-local
```

### Search across all KGs

```bash
/kmgraph:recall --all "search terms"
```

## Verify

```bash
/kmgraph:status
```

Shows which KG is active and its entry count. Run `/kmgraph:list` to verify all KGs are registered.

## Next steps

- [Sync across machines](../portability/sync-across-machines.md) — keep KGs in sync on multiple machines
- [Sanitize before sharing](./sanitize-before-sharing.md) — scrub sensitive data from a shared KG
- [Configuration reference](./graph-configuration.md) — full `kg-config.json` schema
