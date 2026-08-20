---
title: "Plugin Cache Does Not Refresh After Update (Claude Code & Codex CLI)"
category: process
tags: [claude-code, codex-cli, plugin, cache, update, mcp, version, full-automation]
created: 2026-03-03
author: technomensch
git_branch: v0.0.3-github-docs
severity: medium
status: workaround-documented
---

# Plugin Cache Does Not Refresh After Update (Claude Code & Codex CLI)

## Problem

After running `claude plugin update` (Claude Code) or `codex plugin upgrade` (Codex CLI), the plugin continues to run from the old cached version. The version displayed in the Installed plugins section does not change, and new commands, skills, or hook changes from the updated version are not loaded.

Additionally, the MCP server (Claude Code only) may show a `failed` status and require manual reconnection after an update.

## Root Cause

Both Claude Code and Codex CLI cache installed plugins in versioned directories:

**Claude Code:**
```
~/.claude/plugins/cache/{marketplace-name}/{plugin-name}/{version}/
```

**Codex CLI:**
```
~/.codex/plugins/cache/{marketplace-name}/{plugin-name}/{version}/
```

When `claude plugin update` or `codex plugin upgrade` runs, both platforms:
1. Update metadata with the new version number
2. Update marketplace information
3. **Do NOT re-download or replace the actual plugin files in the cache directory**

The physical cache directory (named after the original installed version) remains unchanged. `CLAUDE_PLUGIN_ROOT` (Claude Code) or equivalent path (Codex) continues to point to the stale version.

This is a known platform bug on both implementations:

**Claude Code issues:**
- [#19197](https://github.com/anthropics/claude-code/issues/19197) — update doesn't re-download files when version changes
- [#15642](https://github.com/anthropics/claude-code/issues/15642) — CLAUDE_PLUGIN_ROOT points to stale version after update
- [#14061](https://github.com/anthropics/claude-code/issues/14061) — /plugin update does not invalidate cache
- [#29074](https://github.com/anthropics/claude-code/issues/29074) — Cache not cleared on reinstall

**Codex CLI issue:**
- [openai/codex#21138](https://github.com/openai/codex/issues/21138) — Plugin cache not invalidated on upgrade

## Symptoms

- Installed plugins section shows old version number (e.g., `0.0.10-alpha`) after updating to a newer release
- New commands or skills added in the update are not available
- Marketplace shows a version older than what is in the GitHub repo
- (Claude Code only) MCP server shows `failed` status after update

## Workaround

### Claude Code

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

### Codex CLI

**Step 1: Clear the plugin cache**
```bash
rm -rf ~/.codex/plugins/cache/knowledge-management-graph/kmgraph/
```

**Step 2: Reinstall the plugin**
```bash
codex plugin uninstall kmgraph
codex plugin marketplace add technomensch/knowledge-graph
codex plugin add kmgraph@knowledge-management-graph
```

## Prevention

None available within the plugin — this is a platform-level limitation in both Claude Code and Codex CLI. Document the workaround prominently and instruct users to use the cache-clear method for all version upgrades until the platforms resolve the upstream issues.

---

## Distinguishing Stale Cache from Unbundled Binary Issues

**Two separate failure modes** have different root causes and fixes:

### Stale Cache (This Issue)
- **Symptom:** Plugin shows old version number after update; new features unavailable
- **Root cause:** Platform cache directory not invalidated; old files still cached
- **Trigger:** Using `claude plugin update` or `codex plugin upgrade`
- **Fix:** Manual `rm -rf` of cache directory + reinstall

### Missing Module / Unbundled Binary (v0.5.10.3)
- **Symptom:** `Cannot find module '@modelcontextprotocol/sdk/server/mcp.js'`
- **Root cause:** Binary is bare tsc output with unbundled deps; marketplace install has no node_modules
- **Trigger:** Fresh marketplace install without post-install hook running `npm install`
- **Fix:** esbuild bundling to create self-contained binary

**Example sequence:**
1. User installs kmgraph v0.5.9 from marketplace → unbundled binary fails (issue [#2](https://github.com/technomensch/knowledge-graph/issues/2))
2. User manually installs v0.5.10.3 with esbuild fix via git clone → works
3. User runs `claude plugin update` → binary is cached stale (issue [#1](https://github.com/technomensch/knowledge-graph/issues/1)), shows old version
4. User clears cache and reinstalls → works again

Both issues must be solved together for a reliable upgrade experience.

## Related

- [ADR-006: Document Cache-Clear as Official Upgrade Path](../decisions/ADR-006-document-cache-clear-upgrade-workaround.md) — Decision to document workaround for both Claude Code and Codex CLI
- [ADR-009: Three-Tier Installation Architecture](../decisions/ADR-009-three-tier-installation-architecture.md) — Tier 1 groups both Claude Code and Codex CLI as full-automation platforms
- [GETTING-STARTED.md Troubleshooting](../GETTING-STARTED.md#plugin-update-does-not-take-effect) — User-facing instructions
