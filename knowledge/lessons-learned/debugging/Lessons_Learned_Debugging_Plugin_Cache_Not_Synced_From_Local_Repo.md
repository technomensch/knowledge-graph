---
title: "Lesson: Plugin Cache Not Synced From Local Repo"
created: 2026-04-09T00:00:00Z
last-updated: 2026-08-04T00:00:00Z
author: technomensch
tags: [debugging, plugin-cache, reload-plugins, local-development, commands]
category: debugging
version: 1.0
---

# Lesson: Plugin Cache Not Synced From Local Repo

**Date:** 2026-04-09
**Category:** Debugging
**Version:** 1.0

---

## Problem

`/reload-plugins` loads the plugin from the installed marketplace cache directory, not from the local development repo. Editing `commands/`, `core/`, or `skills/` files in the repo and running `/reload-plugins` did not pick up those edits — the reload re-read the same stale cached copy.

## Root Cause

The installed plugin's live files live under the marketplace cache path (e.g. `~/.claude/plugins/cache/{marketplace}/{plugin}/{version}/`), a separate copy from the working repo. `/reload-plugins` re-reads from that cache path; it has no mechanism for reading directly from a local development checkout.

## Solution

Manually copy the changed files into the cache path before running `/reload-plugins`, so the reload picks up a cache directory that actually reflects the edits:

```bash
cp -r commands/ ~/.claude/plugins/cache/{marketplace}/{plugin}/{version}/commands/
# repeat for core/, skills/, etc. as needed
```
Then run `/reload-plugins`.

## When to Apply

- Testing local edits to `commands/`, `core/`, or `skills/` against an already-installed plugin copy.
- Any time `/reload-plugins` appears to have no effect after an edit — check whether the cache path actually contains the edited files before assuming the reload itself is broken.

**Related, narrower-scoped topology:** `local-marketplace-testing-workflow.md` (2026-02-16) documents the same underlying "two copies, no live link" pattern under an older local-marketplace testing setup (a separate rsync'd local marketplace directory, rather than the `~/.claude/plugins/cache/...` marketplace-cache model this lesson covers). `claude-code-plugin-cache-stale-after-update.md` (2026-03-03) documents the related but distinct post-`plugin update` stale-cache case, where the cache isn't invalidated by an update event at all, rather than an active-local-development sync gap.

## Context

Reconstructed from chat-history evidence (`2026-04-09-claude.md`, ~line 15782, confirming "Lesson captured at `docs/lessons-learned/debugging/...` and README index updated" the same day) during a 2026-08-04 KG-index audit. This entry's existence is also independently confirmed by git-tracked history: commit `ac325f8a` (2026-04-10, the docs→knowledge migration) shows the README's Debugging section at that point containing exactly this one entry, worded as: "Plugin Cache Not Synced From Local Repo — `/reload-plugins` loads from the marketplace cache, not the local repo; copy files manually into the cache before reloading to test local changes." The original lesson file itself, however, was created under `knowledge/lessons-learned/debugging/` (gitignored since creation) and was never itself git-tracked, so this document is a reconstruction of its content from that index description and adjacent evidence, not a recovery of the original file text.
