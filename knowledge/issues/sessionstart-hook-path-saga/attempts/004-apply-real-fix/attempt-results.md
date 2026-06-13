# Attempt 004 Results: Deployment Sync Gap Discovered

**Date:** 2026-03-28
**Status:** ROOT CAUSE FULLY IDENTIFIED

## Finding: Three-Layer Problem

### Layer 1: Plugin is a copy, not a symlink
```
Repo:   /Users/mkaplan/GitHub/knowledge-graph/scripts/     ← has ALL 7 scripts
Plugin: /Users/mkaplan/.claude/plugins/marketplaces/stayinginsync-knowledge-graph/scripts/ ← has only 8 ORIGINAL scripts
```
The plugin install is a **separate directory copy**, not a symlink to the repo. When new scripts were added in commit `680d2dd0`, they went into the repo but were never deployed to the plugin install.

### Layer 2: `../scripts/` path resolves to nowhere
```
${CLAUDE_PLUGIN_ROOT} = /Users/mkaplan/.claude/plugins/marketplaces/stayinginsync-knowledge-graph
${CLAUDE_PLUGIN_ROOT}/../scripts/ = /Users/mkaplan/.claude/plugins/marketplaces/scripts/  ← DOES NOT EXIST
```

### Layer 3: Plugin's own scripts/ is stale
The plugin's `scripts/` directory has only the original scripts — the 6 newer hook scripts were never copied over.

## Script Inventory

| Script | In Repo | In Plugin Install | In `../scripts/` |
|---|---|---|---|
| hooks-master.sh | ✓ | ✓ | ✗ (path DNE) |
| post-tool-lesson-check.sh | ✓ | ✗ | ✗ |
| platform-file-change-check.sh | ✓ | ✗ | ✗ |
| plan-mirror.sh | ✓ | ✗ | ✗ |
| pre-commit-knowledge-gate.sh | ✓ | ✗ | ✗ |
| session-end-prompt.sh | ✓ | ✗ | ✗ |
| notification-dispatch.sh | ✓ | ✗ | ✗ |
| check-memory.sh | ✓ | ✓ | ✗ |
| memory-diff-check.sh | ✓ | ✓ | ✗ |
| recent-lessons.sh | ✓ | ✓ | ✗ |
| validate-plugin.sh | ✓ | ✓ | ✗ |

## Why hooks-master.sh "works" when run manually
Running it manually via `bash /path/to/scripts/hooks-master.sh` bypasses the hook system's path resolution. The hook system uses `${CLAUDE_PLUGIN_ROOT}/../scripts/` which fails.

## Fix Options

### Option A: Fix path to use `${CLAUDE_PLUGIN_ROOT}/scripts/` and sync missing scripts
1. Change hooks.json paths from `${CLAUDE_PLUGIN_ROOT}/../scripts/` → `${CLAUDE_PLUGIN_ROOT}/scripts/`
2. Copy 6 missing scripts from repo to plugin install
**Downside:** Manual sync needed after every repo change

### Option B: Symlink plugin scripts/ to repo scripts/
1. Replace plugin `scripts/` with symlink to repo `scripts/`
2. Fix hooks.json path to `${CLAUDE_PLUGIN_ROOT}/scripts/`
**Benefit:** Auto-sync on every repo update

### Option C: Use absolute repo path in hooks.json
1. Hardcode `/Users/mkaplan/GitHub/knowledge-graph/scripts/` in hooks.json
**Downside:** Not portable; breaks on different machines

### Recommendation: Option B (symlink + path fix)
Most robust and maintains sync automatically.

## Next Step (Attempt 005)
1. Fix hooks.json: `${CLAUDE_PLUGIN_ROOT}/../scripts/` → `${CLAUDE_PLUGIN_ROOT}/scripts/`
2. Symlink plugin scripts/ to repo scripts/
3. Restart Claude and verify
