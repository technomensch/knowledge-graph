---
id: troubleshooting
title: Troubleshooting
sidebar_label: Troubleshooting
description: Solutions to common KMGraph setup and runtime issues
---

# Troubleshooting

## Plugin update not taking effect

After a plugin update from the Claude Code marketplace, commands from the old version may still be loaded. The fix is to clear the plugin cache and reinstall.

**macOS / Linux:**

```bash
# 1. Clear the stale cache
rm -rf ~/.claude/plugins/cache/stayinginsync-knowledge-graph

# 2. In Claude Code, run:
/plugin uninstall kmgraph
/reload-plugins
/plugin update stayinginsync
/plugin install kmgraph
/reload-plugins
```

Then fully quit and relaunch Claude Code, restart the MCP server (`/mcp restart kmgraph`), and verify with `/kmgraph:init` (select option 1 — Verify/upgrade).

**Windows (PowerShell):**

```powershell
Remove-Item -Recurse -Force "$env:USERPROFILE\.claude\plugins\cache\stayinginsync-knowledge-graph"
```

Then follow the same `/plugin uninstall` → `/plugin install` steps above.

:::tip
The marketplace may still show the older version number after `/plugin update stayinginsync`. That is expected — continue with the reinstall.
:::

---

## Commands do not appear in Claude Code autocomplete

- Verify the plugin is loaded: start Claude Code with `claude --plugin-dir /path/to/knowledge-graph`
- Commands use a colon, not a hyphen: `/kmgraph:init` (correct), `/knowledge-init` (incorrect)
- Restart Claude Code completely if commands still do not appear after the above

---

## MCP server does not start

```bash
# Verify Node.js is installed (18+ required)
node --version

# Check the MCP server binary exists
ls mcp-server/dist/index.js

# Test the MCP server directly
./tests/test-mcp-direct.sh
```

If the binary is missing, rebuild it:

```bash
cd mcp-server && npm install && npm run build
```

> **Note (v0.5.10.5+):** The MCP server is now pre-bundled and committed to `mcp-server/dist/`. Marketplace installs (Claude Code, Codex CLI) should have the binary without running `npm install`. The rebuild command above is only needed for local development or manual git-clone installs that modify the server source.

---

## Templates are not found

Verify that `core/default-templates/` exists in the project directory and that templates were copied:

```bash
ls core/default-templates/
cp -r core/default-templates/. docs/templates/
```

---

## Which lesson category should I use?

| Category | Use for |
|---|---|
| `architecture` | System design decisions, component relationships |
| `process` | Workflow improvements, tool configurations, procedures |
| `patterns` | Reusable solutions discovered through experience |
| `debugging` | Bug investigations, troubleshooting sessions, root cause analysis |

When uncertain: use `debugging` for problem-solving and `process` for workflow-related insights.

---

## Is git required?

Git is recommended but not required. With git, the system automatically captures branch name, commit hash, and PR/issue numbers as lesson metadata. Without git, all features remain available — only automatic code linking is unavailable.

---

## Still stuck?

Open an issue at [github.com/technomensch/knowledge-graph/issues](https://github.com/technomensch/knowledge-graph/issues).
