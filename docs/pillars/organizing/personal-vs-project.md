---
id: personal-vs-project
title: Personal vs. Project
sidebar_label: Personal vs. Project
description: Understanding personal and project-scoped knowledge graphs
---

# Personal vs. Project

Every knowledge graph belongs to one of two scopes: **project** or **personal**.

## Project KG

A project KG lives inside a project's directory at `./knowledge/`. It contains knowledge specific to that project:

- Bug fixes and workarounds found in this codebase
- Architecture decisions for this system
- Debugging sessions for this project's stack

**Best for**: Anything that only makes sense in the context of one project.

## Personal KG

A personal KG lives at `~/.kmgraph/` and is accessible from any project. It contains cross-project patterns and lessons:

- Workflow habits ("Create vs Update in implementation plans")
- Tool quirks that appear across projects (MCP registration, IDE setup)
- Personal ADRs ("Why I prefer TypeScript strict mode")
- Reusable checklists and process patterns

**Best for**: Knowledge that would apply identically in your next project.

## Identity and rules files

Each scope also scaffolds two special files:

| File | Scope | Committed? | Purpose |
|---|---|---|---|
| `knowledge/rules.md` | Project | Yes | Project conventions shared by all contributors |
| `knowledge/me.md` | Project | No — gitignored | Who you are in this project (per-contributor) |
| `~/.kmgraph/rules.md` | Personal | N/A local | Cross-project behavioral rules |
| `~/.kmgraph/me.md` | Personal | N/A local | Cross-project personal identity and preferences |

These files are the platform-agnostic foundation that all AI platform config files (CLAUDE.md, .cursorrules, etc.) point to. See [Portable AI Identity](../portability/your-ai-profile.md) for the full setup guide.

## How they work together

| Behavior | Detail |
|---|---|
| **`/kmgraph:recall`** | Searches both KGs automatically when a personal KG is registered. Results show `[project]` or `[personal]` source labels. |
| **`/kmgraph:capture-lesson`** | Shows a KG picker when ≥2 KGs are registered. Only one prompt per session (choice remembered). |
| **SessionStart hook** | Surfaces recent personal KG lessons alongside project lessons. |
| **Active KG** | Unchanged by personal KG setup — project KG stays active for new captures by default. |

## When to use personal vs project

| Situation | Save to |
|---|---|
| "I fixed a bug specific to this repo" | Project KG |
| "I learned a general debugging pattern" | Personal KG |
| "We decided to use Redis for this project" | Project KG |
| "I always prefer feature flags over config files" | Personal KG |
| "This MCP registration quirk affects all IDEs" | Personal KG |

## Scope diagram

```mermaid
%%{init: {'theme': 'neutral'}}%%
graph TB
    subgraph Personal ["🧑 Personal KG (~/.kmgraph/)"]
        PM["me.md — cross-project identity (local)"]
        PR["rules.md — cross-project rules (local)"]
        P1["Patterns & lessons"]
        P2["Tool quirks & IDE setup"]
        P3["Personal ADRs"]
    end

    subgraph Project ["📁 Project KG (./knowledge/)"]
        PJM["me.md — contributor identity (gitignored)"]
        PJR["rules.md — project conventions (committed)"]
        PJ1["Project-specific bug fixes"]
        PJ2["Architecture decisions"]
        PJ3["Codebase-specific patterns"]
    end

    Recall["🔍 /kmgraph:recall"]
    Recall -->|searches both| Personal
    Recall -->|searches both| Project

    accTitle: Personal vs Project KG scopes
    accDescr: Two KG scopes — Personal stored at ~/.kmgraph/ and Project stored in ./knowledge/. Each scope includes me.md for identity and rules.md for behavioral conventions. Recall searches both automatically.
```

## Routing captures by level

All capture commands (`session-summary`, `create-adr`, `capture-lesson`, `sync-all`) and `recall` accept an explicit routing flag — or recognize equivalent natural language in the invocation message:

| Signal | Resolves to | Behavior |
|---|---|---|
| `--user` / "user level" / "for the user" | Personal KG (`~/.kmgraph/`) | Writes directly; bypasses `kg_capture`; no KG switch |
| `--project` / "for this project" / "project level" | Current project's KG | Temporarily switches active KG if it differs; restores after |
| `--named=<kg>` / name of a KG (e.g., "career-ops") | Named KG from `kg-config.json` | Writes to named KG directly; no switch |
| (no signal) | Active KG | Default behavior; every draft shows `Saving to: {path}` for confirmation |

**Examples:**

```bash
/kmgraph:capture-lesson "user level"        # → ~/.kmgraph/lessons-learned/
/kmgraph:create-adr --project               # → current project's knowledge/decisions/
/kmgraph:session-summary --named=career-ops # → career-ops KG sessions/
/kmgraph:recall "auth patterns" --user      # → search only ~/.kmgraph/
```

If a named KG isn't found, a fuzzy suggestion prompt appears. If the project has no configured KG, a setup prompt offers options to initialize or redirect the capture.

## Setup

- **During init**: `/kmgraph:init` offers to create a personal KG at the end of setup
- **Standalone**: `/kmgraph:init-personal-kg` creates and registers the personal KG at any time

See [Multi-KG Workflows](./multi-kg-workflows.md) for advanced configuration and [Portable AI Identity](../portability/your-ai-profile.mdx) for setting up `me.md` and `rules.md`.

## Related

- [Graph Configuration](./graph-configuration.md)
- [Multi-KG Workflows](./multi-kg-workflows.md)
- [Portable AI Identity](../portability/your-ai-profile.mdx)
