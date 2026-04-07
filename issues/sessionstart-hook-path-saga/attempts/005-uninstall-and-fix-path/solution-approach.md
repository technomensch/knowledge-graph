# Attempt 005: Uninstall Marketplace Plugin + Fix Hook Paths

**Date:** 2026-03-28
**Prior Attempt:** 004 (root cause diagnosis)
**Hypothesis:** Removing the stale marketplace install and fixing hook paths to work from project root will resolve SessionStart errors.

## Context Shift

Previous attempts assumed the plugin would always be loaded from the marketplace install at `~/.claude/plugins/marketplaces/stayinginsync-knowledge-graph/`. This attempt takes a different approach: since the user is developing the plugin in-repo, remove the marketplace install entirely and let Claude Code load the plugin from the project's own `.claude-plugin/plugin.json`.

## Actions Taken

### Step 1: Uninstall marketplace plugin
- Removed `kmgraph@stayinginsync-knowledge-graph` from `.claude/settings.local.json` `enabledPlugins`
- Deleted marketplace source: `~/.claude/plugins/marketplaces/stayinginsync-knowledge-graph/`
- Deleted plugin cache: `~/.claude/plugins/cache/stayinginsync-knowledge-graph/`
- Cleaned up stale permission entries referencing old plugin paths

### Step 2: Fix hook paths
- Changed all 6 hook commands in `hooks/hooks.json` from `${CLAUDE_PLUGIN_ROOT}/../scripts/` to `${CLAUDE_PLUGIN_ROOT}/scripts/`
- Rationale: When loaded from project root, `CLAUDE_PLUGIN_ROOT` = project root, so `scripts/` is a direct child
- This also matches the **original working path** from pre-v0.2.x (commit `a233fca0` used `${CLAUDE_PLUGIN_ROOT}/scripts/`)
- The `../scripts/` path was introduced in commit `680d2dd0` and was always incorrect for both marketplace and project-root loading

### Step 3: Verify (new terminal)
- Launched Claude in a fresh terminal
- **Result: Still failing** — SessionStart hook error persists

## Open Questions

1. Is Claude Code loading the plugin from `.claude-plugin/plugin.json` in the project root?
2. What value does `CLAUDE_PLUGIN_ROOT` actually resolve to when loaded this way?
3. Are the hook errors coming from the hooks.json in the project, or from somewhere else?
4. Could there be cached plugin state that survives directory deletion?
