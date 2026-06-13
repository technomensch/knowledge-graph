# Attempt 006 Results: True Root Cause Found

**Date:** 2026-03-28
**Status:** ROOT CAUSE CONFIRMED — Two independent sources

## Result

The SessionStart hook errors have two independent causes:

1. **Ghost registry entries** in `installed_plugins.json` that point to deleted cache dirs — Claude Code tries to load hooks from non-existent paths
2. **`.claude-plugin/plugin.json` auto-detection** — Claude Code loads the project as a local plugin because it has a plugin manifest in the root

## Why Previous Attempts Failed

| Attempt | Why it didn't work |
|---|---|
| 001-003 | Changed path variables, but the real issue was ghost registries + auto-detection |
| 004 | Correctly diagnosed script sync gap, but didn't account for auto-detection |
| 005 | Deleted marketplace + cache, but didn't clean `installed_plugins.json` AND Claude re-created the entry on next launch |

## Resolution

The hook PATH fix (`../scripts/` → `scripts/`) is correct and already on main. The remaining issue is environmental:

- **In the plugin's own repo:** hooks will always run via auto-detection. This is expected behavior, not a bug. The hooks should succeed now that paths are correct.
- **For users (other repos):** marketplace install → cache → hooks load from cache with correct paths. No `.claude-plugin/` in their project means no auto-detection interference.

## Testing Plan

1. Verify hooks work in this repo (local auto-detection path)
2. Install from marketplace into a different project (e.g., mindstudio-job-search)
3. Verify hooks work from marketplace cache (user path)
4. If both pass, issue is resolved

## Status: READY FOR VERIFICATION
