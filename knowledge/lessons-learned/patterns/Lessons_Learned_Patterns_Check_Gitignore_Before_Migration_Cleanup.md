---
title: Check Gitignore Before Migration Cleanup
category:
  uri: uri-that-does-not-map-to-patterns
---
## Problem

The Step 1f.0 legacy FTS5 migration in `commands/init.md` moved `.fts5.db` to user cache whenever it existed, without checking whether the file was intentionally gitignored. A gitignored `.fts5.db` is the active local search index - not a legacy stray - so moving it would silently destroy the user's working search index.

## Root Cause

The migration check (`if [ -f "$KG_ROOT/.fts5.db" ]`) treated file existence as sufficient signal for "this is a legacy file." Gitignore status is the actual signal: an intentionally gitignored file is active local state managed by the user; an untracked, non-gitignored file is the legacy stray.

## Solution

Add `git check-ignore -q` before any move or gitignore rule removal:

- **Gitignored** - active local state. Leave in place. Note it will be orphaned after path migration but harmless; a fresh index is rebuilt at the new location on next use.
- **Not gitignored** - legacy stray. Migrate to user cache and remove the gitignore rule.

For personal KGs (always outside git): `git check-ignore` does not apply. If `.fts5.db` exists it is always intentional - never suggest removal. Only surface it as an upgrade item when it is *missing*.

## General Pattern

Before any migration or cleanup action on a file that is expected to be gitignored in normal operation, check gitignore status first. File existence alone is not sufficient to classify a file as a stray.

## How to Replicate

Any wizard step that offers to move, rename, or remove files should gate destructive action on:
1. File exists AND
2. Not gitignored (or not intentionally placed)

For files outside git repos, treat existence as intentional by default.

## When to Apply

- Writing wizard or migration logic that moves, renames, or removes files
- Any cleanup step targeting files that are normally gitignored in active use (e.g., `.fts5.db`, build artifacts, local caches)
- Upgrade/migration steps in `commands/init.md` or `commands/init-personal-kg.md`
- Anytime the signal for "this file is a stray" is ambiguous - verify via gitignore status, not just existence

## Audience

Anyone writing wizard or migration logic in KMGraph commands.

## Context

- Discovered during v0.3.0-beta "See What's New" wizard testing
- The wizard surfaced `docs/.fts5.db` as a cleanup candidate even though it was the active gitignored search index for the project-local KG
- Branch: v0.3.0-beta
- Commit: 1f70f3a5
- Fix applied in `commands/init.md` and `commands/init-personal-kg.md`; documented in ADR-028
