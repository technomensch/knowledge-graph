# Attempt 006: Full Uninstall + True Root Cause Identification

**Date:** 2026-03-28
**Prior Attempt:** 005 (uninstall marketplace + fix path — still failing)

## Root Cause (CONFIRMED)

Two independent sources were loading the plugin and triggering SessionStart hook errors:

### Source 1: Ghost registry entry (installed_plugins.json)
Claude Code re-creates `kmgraph@stayinginsync-knowledge-graph` in `installed_plugins.json` on launch, even after deleting the cache and marketplace dirs. The entry points to a non-existent cache path, causing hook resolution to fail.

**Fix:** Manually remove the entry from `~/.claude/plugins/installed_plugins.json`. Must be done AFTER every launch that might re-create it.

### Source 2: Local `.claude-plugin/plugin.json` auto-detection
Claude Code auto-detects `.claude-plugin/plugin.json` in the working directory and loads the project as a local plugin. This loads `hooks/hooks.json` with the SessionStart hook. Since this is the plugin's own repo, the `.claude-plugin/` directory must exist for distribution — it cannot be removed.

**Implication:** When developing in this repo, the plugin will ALWAYS be auto-loaded locally. This is not a bug — it's how Claude Code works. The developer cannot fully "uninstall" the plugin while working in its own repo.

## Testing Strategy

To test the real user experience (marketplace install → hooks load from cache):
- Install kmgraph from the marketplace into a DIFFERENT project (e.g., mindstudio-job-search)
- That project has no `.claude-plugin/` directory, so no auto-loading interference
- This simulates the actual user install path

## Actions Taken

1. Removed ghost `kmgraph@stayinginsync-knowledge-graph` entry from `installed_plugins.json`
2. Removed `kmgraph@stayinginsync-knowledge-graph` from `enabledPlugins` in both `~/.claude/settings.json` and project `settings.local.json`
3. Kept marketplace registration in `known_marketplaces.json` (needed for install)
4. Fixed hooks.json paths: `../scripts/` → `scripts/` (already on main)
5. Identified that `.claude-plugin/plugin.json` in project root causes unavoidable local auto-loading

## Files Modified During This Session

| File | Change |
|---|---|
| `~/.claude/plugins/installed_plugins.json` | Removed kmgraph + kg-sis entries (twice — Claude re-created them) |
| `~/.claude/plugins/known_marketplaces.json` | Removed then re-added marketplace (keeping for install capability) |
| `~/.claude/settings.json` | Removed kmgraph from enabledPlugins |
| `.claude/settings.local.json` | Removed kmgraph from enabledPlugins, cleaned stale permission entries |
| `hooks/hooks.json` | Fixed paths from `../scripts/` to `scripts/` (matches main) |
