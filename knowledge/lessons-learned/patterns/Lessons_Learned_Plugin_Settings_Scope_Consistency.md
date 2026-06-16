---
title: Plugin Settings Scope Consistency
category:
  uri: uri-that-does-not-map-to-patterns
---

# Plugin Settings Scope Consistency

## Problem

Uninstall fails with "not installed in scope" when `enabledPlugins` entries exist in `settings.local.json` without a matching install record in the global plugin registry. The error is misleading — the plugin appears to be installed in settings but the registry has no record of it.

Compounding the issue: a committed `.claude/settings.json` containing an `enabledPlugins` block reproduces this orphaned state for every developer who clones the repository. The moment they clone and run an uninstall, they hit the same inconsistency.

## Solution

Remove redundant `enabledPlugins` blocks from committed settings files (`.claude/settings.json`). The plugin manager uses `.claude-plugin/plugin.json` for auto-detection and registration — explicit `enabledPlugins` entries in settings are unnecessary and conflict with the registry.

Steps taken:

1. Audited `.claude/settings.json` for `enabledPlugins` entries.
2. Removed the block — plugin presence is declared in `.claude-plugin/plugin.json`, not in settings.
3. Verified uninstall succeeded after the block was removed.

## When to Apply

Apply this pattern whenever:

- An uninstall command returns "not installed in scope" despite the plugin appearing active.
- Developers report scope errors on a freshly cloned repo.
- A plugin repository has a committed `.claude/settings.json` with an `enabledPlugins` block.
- You are setting up a new Claude Code plugin and deciding what to commit in `.claude/`.

Audit checklist for plugin repos:

- [ ] `.claude/settings.json` — no `enabledPlugins` block
- [ ] `.claude/settings.local.json` — gitignored, not committed
- [ ] `.claude-plugin/plugin.json` — present and accurate (source of truth)

## Context

- Branch: v0.2.3.2-beta
- Commit: 499360b9
- Category: patterns
- Audience: plugin maintainers on this project; anyone building Claude Code plugins
- Session reference: `knowledge/sessions/2026-04/2026-04-07-session-snapshot-2026-04-06.md`
