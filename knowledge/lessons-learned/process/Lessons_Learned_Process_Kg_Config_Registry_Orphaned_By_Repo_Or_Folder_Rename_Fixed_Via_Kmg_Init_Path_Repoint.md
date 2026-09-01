---
title: "kg-config registry orphaned by repo or folder rename - fixed via kmg-init path-repoint"
created: 2026-08-06T17:04:27.018Z
updated: 2026-08-06T17:04:27.018Z
author: technomensch
git:
  branch: main
  commit: f98af6dba2a55d65609e93388ad6b3856e454921
tags: [kmgraph, adr-067, kg-config, repo-rename, graphId, fts5, path-repoint]
category: process
---
## Problem

A GitHub repo rename (docs-readme-poc → tidal-docs) plus a matching local folder rename left `~/.kmgraph/kg-config.json`'s registry entry orphaned — still keyed as `docs-readme-poc` and pointing at the now-nonexistent path `/Users/mkaplan/GitHub/docs-readme-poc/knowledge`. Renaming a repo on GitHub and locally does not update KMGraph's registry automatically.

## Solution

Ran `/kmgraph:kmg-init` from inside the renamed folder (`tidal-docs`). It detected a fully-formed KG on disk with no config entry pointing at it, whose `.kmgraph-id` `graphId` (`606112d7-...`) matched the existing stale registry entry, and offered to fix the config in place: rename the key to `tidal-docs` and repoint the path to `/Users/mkaplan/GitHub/tidal-docs/knowledge` — not register a duplicate KG. The config was backed up first (`kg-config.json.bak.<timestamp>`), and all settings were preserved (categories, git strategy, lastUsed, history).

`kmg-init` then flagged the FTS5 search index as stale (local-only, doesn't move with a folder rename) and offered `kg_fts5_rebuild`, which was also accepted, restoring `kg_search`/recall.

## When to apply

Any time a repo or its containing folder is renamed (on GitHub and/or locally), run `/kmgraph:kmg-init` afterward to repoint the registry, and expect to manually rebuild the FTS5 index (`kg_fts5_rebuild`) since it never migrates with content.

## Context

- Branch: main
- Commit: f98af6db
- Category: process
