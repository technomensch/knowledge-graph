---
title: "Upgrade Path Missing FTS5 Stale File Cleanup"
created: 2026-04-12T00:00:00Z
author: technomensch
email: 917847+technomensch@users.noreply.github.com
category: process
tags: [fts5, upgrade, migration, cleanup, stale-files, installer, obsidian, v8-crash, gitignore]
git:
  branch: v0.3.7
  commit: 9387b147139808be7c993b8fcfb4fba7772f6574
  commit_short: 9387b147
  pr: null
  issue: null
sources: []
---

# Upgrade Path Missing FTS5 Stale File Cleanup

## Problem

After the FTS5 database location migrated from inside the project directory to `~/.kmgraph/index/projects/`, stale `.fts5.db` files remained in the project tree. The upgrader had no cleanup step. Four artifact files accumulated — `.fts5.db`, `docs/.fts5.db`, `knowledge/.fts5.db`, `knowledge/.fts5.db-journal` — totalling 41MB. When Obsidian attempted to index the vault, those files triggered a V8 crash.

## Root Cause

The migration moved the FTS5 database location but left no corresponding teardown step. The installer/upgrader created the new DB at the correct path, then silently left the old files in place. Nothing flagged the presence of in-project `.fts5.db` files as a warning sign. Because the crash occurred in Obsidian rather than in KMGraph directly, the connection to the stale files was not immediately obvious.

## Solution

1. Manually deleted the 4 stale `.fts5.db` files (41MB total removed).
2. Added `**/.fts5.db` to `.gitignore` to prevent future `.fts5.db` files from being tracked or surfaced to indexers.
3. Confirmed real DBs exist in `~/.kmgraph/index/projects/` — the live index was unaffected.

## When to Apply

Apply this lesson whenever a migration moves a generated artifact (database, cache, index file) from inside the project directory to an external location:

- Add a cleanup step to the upgrade path that detects and removes in-project copies of the artifact.
- Add the artifact's filename pattern to `.gitignore` immediately — not as a follow-up.
- Verify both the old location (absence expected) and the new location (presence expected) in post-upgrade validation.

If users report unexplained crashes in tools that index the project vault (Obsidian, IDEs, file watchers), check for large binary artifact files left behind by prior migrations.

## Prevention / Action Item

Add a cleanup step to the KMGraph upgrade path that:

1. Detects `.fts5.db` files anywhere inside the project directory (glob: `**/.fts5.db`).
2. Logs their presence as a warning.
3. Removes them after user confirmation (or silently if in non-interactive mode).

This step should run after the new DB location is confirmed healthy, so the old files are not deleted before the migration succeeds.
---

*Captured during session 2026-04-12. See `knowledge/sessions/2026-04-12-snapshot.md` for full session context.*
