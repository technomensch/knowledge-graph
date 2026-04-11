---
title: "Claude Code Plugin Cache Does Not Refresh After Update"
category: process
tags: [claude-code, plugin, cache, update, mcp, version]
created: 2026-03-03
author: technomensch
git_branch: v0.0.3-github-docs
severity: medium
status: workaround-documented
---

# Claude Code Plugin Cache Does Not Refresh After Update

## Problem

After running `claude plugin update` or using the "Update Now" button in the Claude Code plugin UI, the plugin continues to run from the old cached version. The version displayed in the Installed tab does not change, and new commands, skills, or hook changes from the updated version are not loaded.

Additionally, the MCP server may show a `failed` status and require manual reconnection after an update.

## Root Cause

Claude Code caches installed plugins in a versioned directory:

```
~/.claude/plugins/cache/{marketplace-name}/{plugin-name}/{version}/
```

When `claude plugin update` runs, it:
1. Updates `installed_plugins.json` with the new version number
2. Updates the marketplace metadata
3. **Does NOT re-download or replace the actual plugin files in the cache directory**

The physical cache directory (named after the original installed version) remains unchanged. `CLAUDE_PLUGIN_ROOT` continues to point to the stale path.

This is a known Claude Code bug with multiple open issues:
- [#19197](https://github.com/anthropics/claude-code/issues/19197) — update doesn't re-download files when version changes
- [#15642](https://github.com/anthropics/claude-code/issues/15642) — CLAUDE_PLUGIN_ROOT points to stale version after update
- [#14061](https://github.com/anthropics/claude-code/issues/14061) — /plugin update does not invalidate cache
- [#29074](https://github.com/anthropics/claude-code/issues/29074) — Cache not cleared on reinstall

## Symptoms

- Installed tab shows old version number (e.g., `0.0.10-alpha`) after updating to a newer release
- New commands or skills added in the update are not available
- Discover tab shows a version older than what is in the GitHub repo
- MCP server shows `failed` status after update

## Workaround

**Step 1: Clear the plugin cache**

```bash
rm -rf ~/.claude/plugins/cache/stayinginsync-knowledge-graph/
```

**Step 2: Reinstall the plugin**

Via the Claude Code `/plugin` UI: uninstall kmgraph, then reinstall from the marketplace.

Or via CLI:
```bash
claude plugin uninstall kmgraph
claude plugin install stayinginsync/knowledge-graph
```

**Step 3: Reconnect the MCP server**

After reinstalling, open `/plugin` → Installed → kmgraph → MCP Server → Reconnect.

## Prevention

None available within the plugin — this is a platform-level limitation. Document the workaround prominently and instruct users to use the cache-clear method for all version upgrades until Anthropic resolves the upstream issue.

## Related

- [ADR-006](../decisions/ADR-006-document-cache-clear-upgrade-workaround.md) — Decision to document workaround rather than implement in-plugin mitigation
- [GETTING-STARTED.md Troubleshooting](../GETTING-STARTED.md#plugin-update-does-not-take-effect) — User-facing instructions
