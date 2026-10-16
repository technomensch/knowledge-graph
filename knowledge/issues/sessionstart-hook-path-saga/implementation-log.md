# Implementation Log

Chronological record of all attempts to solve the SessionStart hook path resolution errors.

**Total Attempts:** 7 (README); attempts 004-006 documented in `attempts/` folders below
**Last Updated:** 2026-03-28

> Note: attempts 001-003 (revert env var, debug script paths, fix actual paths) are listed in the README but have no `attempts/` folders in the repo, so they are not given entries here. Attempt 007 (root cause: `learning-output-style` / `explanatory-output-style` plugins) is recorded in the README and `analysis/root-cause-evolution.md`.

---

## Attempt 004: Apply real fix — path correction to parent directory (2026-03-28)

**Status:** Superseded (root cause identified in results, fix applied in Attempt 005)
**Details:** [solution-approach](attempts/004-apply-real-fix/solution-approach.md) / [attempt-results](attempts/004-apply-real-fix/attempt-results.md)

**Approach:**
Previous attempts only changed environment variables. Updated all 7 hook commands in `hooks/hooks.json` from `${CLAUDE_PLUGIN_ROOT}/scripts/` to `${CLAUDE_PLUGIN_ROOT}/../scripts/`, on the assumption that scripts lived at the project root.

**Outcome:**
Results file found a three-layer deployment gap: the installed plugin is a copy (not a symlink) of the repo; `${CLAUDE_PLUGIN_ROOT}/../scripts/` resolves to a nonexistent directory; and the plugin's own `scripts/` was stale (6 newer hook scripts never copied). Recommended Option B (symlink plugin `scripts/` to repo `scripts/` plus path fix back to `${CLAUDE_PLUGIN_ROOT}/scripts/`).

**Key Learning:**
Hooks run through `${CLAUDE_PLUGIN_ROOT}`, so running a script manually bypasses the path resolution that actually fails.

---

## Attempt 005: Uninstall marketplace plugin + fix hook paths (2026-03-28)

**Status:** Failed (error persisted)
**Details:** [solution-approach](attempts/005-uninstall-and-fix-path/solution-approach.md) / [attempt-results](attempts/005-uninstall-and-fix-path/attempt-results.md)

**Approach:**
Removed the marketplace install (settings entry, marketplace dir, plugin cache, stale permissions) so the plugin would load from the project's `.claude-plugin/plugin.json`, and changed all 6 hook commands from `${CLAUDE_PLUGIN_ROOT}/../scripts/` back to `${CLAUDE_PLUGIN_ROOT}/scripts/` (the pre-v0.2.x path from commit `a233fca0`).

**Outcome:**
SessionStart hook error still appeared in a fresh terminal. Open questions: where `CLAUDE_PLUGIN_ROOT` points when loaded locally, whether cached state survives directory deletion, and whether the error is about path resolution at all.

**Key Learning:**
The `../scripts/` path (introduced in `680d2dd0`) was wrong, but fixing it did not remove the visible error, so another source was involved.

---

## Attempt 006: Full uninstall + true root cause identification (2026-03-28)

**Status:** Root cause identified for kmgraph-side loading; later superseded by Attempt 007 (README)
**Details:** [solution-approach](attempts/006-full-uninstall-and-root-cause/solution-approach.md) / [attempt-results](attempts/006-full-uninstall-and-root-cause/attempt-results.md)

**Approach:**
Removed ghost `kmgraph@stayinginsync-knowledge-graph` entries from `~/.claude/plugins/installed_plugins.json` (Claude Code re-created them, so this was done twice), removed kmgraph from `enabledPlugins` in user and project settings, kept the marketplace registration, and confirmed the `scripts/` path fix.

**Outcome:**
Identified two independent kmgraph-side loading sources: ghost registry entries pointing to deleted cache dirs, and `.claude-plugin/plugin.json` auto-detection that always loads the repo as a local plugin. Proposed testing a marketplace install in a different project. Per the README, the visible errors were ultimately traced to other plugins in Attempt 007.

**Key Learning:**
In the plugin's own repo the plugin is always auto-loaded locally; it cannot be fully uninstalled there.
