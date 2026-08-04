---
title: Multi-KG Workflows
---

# Multi-KG Workflows

> "I have knowledge that spans multiple projects. How do I manage more than one graph?"

KMGraph supports multiple knowledge graphs — project-local, personal, and global-topic — each capturing a different scope of knowledge. KMGraph must be initialized (`/kmgraph:kmg-init`) and git configured before using multiple KGs.

## KG types

| Type | Storage location | Shared with |
|---|---|---|
| `project-local` | `knowledge/` (in the project repo) | Anyone with repo access |
| `personal` | `~/.kmgraph/` | Only the individual (synced via personal git remote) |
| Global-topic (named, non-project-tied) | `~/.kmgraph/knowledge-graphs/<name>/` | Configured per instance — git strategy is per-KG |
| `custom` | Any path | Configured per instance |

## View and target

```bash
/kmgraph:kmg-list
```

Shows all configured KGs.

There is no switch step — each capture/recall command resolves its target KG from the
current working directory automatically. Running a command from inside a project's
directory targets that project's `project-local` KG; `--user`/`scope: "user"` reaches
the personal KG from any directory; a named KG not tied to any directory (like a
global-topic KG) is reached with `--targetKg <name>` (see "Capture without switching"
below).

Run `/kmgraph:kmg-status` to confirm the KG resolved for the current directory and its
entry count, or `/kmgraph:kmg-list` to see all registered KGs.

## Set up a personal KG

```bash
/kmgraph:kmg-init-personal-kg
```

Creates `~/.kmgraph/` and registers it. Use this for patterns that apply across all projects.

## Set up a global-topic KG

For a named KG not tied to any single project (e.g. cross-project research notes), choose "Global topic-based" in the `/kmgraph:kmg-init` wizard, or register one directly by editing `~/.kmgraph/kg-config.json`:

```json
{
  "graphs": {
    "ai-research": {
      "type": "personal",
      "path": "~/.kmgraph/knowledge-graphs/ai-research/",
      "gitStrategy": "commit"
    }
  }
}
```

A global-topic KG isn't tied to any directory, so it's not resolved from cwd — reach it
explicitly with `--targetKg ai-research` on capture/recall commands (see "Capture without
switching" below).

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
