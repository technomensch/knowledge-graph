---
title: "MCP Server Binary Exists But Each IDE Needs Explicit Registration"
date: 2026-03-27
author: technomensch
email: 917847+technomensch@users.noreply.github.com
git:
  branch: v0.2.0-beta-layered-architecture
  commit: a09611b50725a5c2141c178f0de7067dd9b41b1b
  commit_short: a09611b5
tags: [mcp, ide-integration, gemini-cli, registration, platform-portability, antigravity]
category: process
---

## Problem

During v0.2.0-beta Phase 7b Gemini platform portability testing, the MCP server (`mcp-server/dist/index.js`) was built and present in the project, but `kg_search`, `kg_fts5_rebuild`, and all other `kg_*` MCP tools were unavailable in Gemini CLI / Antigravity. Recall fell back to file-reading instead of ranked FTS5 search. There was no error — the tools simply did not exist in the IDE's tool namespace.

## Root Cause

MCP tools are not auto-discovered from the project directory. Each IDE maintains its own MCP server registry. For Gemini CLI / Antigravity, this registry lives at `~/.gemini/settings.json` under a `mcpServers` key. That key was absent — the server had never been registered. Having `mcp-server/dist/index.js` built and working in Claude Code does not propagate registration to any other IDE.

## Solution

Register the MCP server explicitly in `~/.gemini/settings.json`:

```json
{
  "mcpServers": {
    "kmgraph": {
      "command": "node",
      "args": ["/abs/path/to/mcp-server/dist/index.js"]
    }
  }
}
```

After adding this entry, restart Gemini CLI / Antigravity. Verify availability by calling `kg_config_list` — if it returns results, MCP tools are live.

## Pattern

Every new IDE where KMGraph is used requires a separate, explicit registration step pointing to the built binary. The registration format varies by IDE:

- **Claude Code:** managed via `.claude/settings.json` or marketplace install
- **Gemini CLI / Antigravity:** `~/.gemini/settings.json` → `mcpServers` key
- **Other IDEs:** consult that IDE's MCP configuration docs

**Prevention checklist for new IDE onboarding:**
1. Build the server (`npm run build` in `mcp-server/`)
2. Register the server in the IDE's MCP config file using an absolute path
3. Restart the IDE
4. Verify with `kg_config_list` before relying on any `kg_*` tool

**Automation target (v0.2.1 Item D):** Automate MCP registration as part of `/kmgraph:init` and `/kmgraph:setup-platform`. When a `kg_*` tool call fails because the server is not registered, detect this and offer to register it rather than silently falling back.

## References

- v0.2.1 backlog meta-issue (Item D: MCP auto-registration on first use)
- Phase 7b validation notes, branch `v0.2.0-beta-layered-architecture`
- Gemini CLI MCP settings: `~/.gemini/settings.json`
