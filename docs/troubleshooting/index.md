---
title: Troubleshooting
category:
  uri: troubleshooting
position: 1
slug: troubleshooting-index
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

Then fully quit and relaunch Claude Code, restart the MCP server (`/mcp restart kmgraph`), and verify with `/kmgraph:kmg-init` (select option 1 — Verify/upgrade).

**Windows (PowerShell):**

```powershell
Remove-Item -Recurse -Force "$env:USERPROFILE\.claude\plugins\cache\stayinginsync-knowledge-graph"
```

Then follow the same `/plugin uninstall` → `/plugin install` steps above.

> 👍 **Tip**
>
> The marketplace may still show the older version number after `/plugin update stayinginsync`. That is expected — continue with the reinstall.

---

## Commands do not appear in Claude Code autocomplete

- Verify the plugin is loaded: start Claude Code with `claude --plugin-dir /path/to/knowledge-graph`
- Commands use a colon, not a hyphen: `/kmgraph:kmg-init` (correct), `/knowledge-init` (incorrect)
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

## Upgrading to v0.6.7 (template apply protection)

v0.6.7 fixes a bug where `kg_upgrade apply templates` unconditionally overwrote existing files, including user-modified READMEs (`decisions/README.md`, `lessons-learned/README.md`). If you were affected, recover with:

```bash
git checkout HEAD -- knowledge/decisions/README.md knowledge/lessons-learned/README.md
```

After upgrading to v0.6.7, `kg_upgrade apply` skips any existing file with different content and reports it as "Skipped (user content): … (manual review required)". No more silent overwrites.

---

## Upgrading to v0.6.6 (init compliance gate)

v0.6.6 adds a mandatory STOP gate to `kmg-init` when an existing knowledge graph is detected. If the upgrade wizard previously skipped straight to FTS5/wiki steps without presenting the upgrade menu, upgrade to v0.6.6+ and re-run `/kmgraph:kmg-init` — the gate now forces the numbered menu to appear.

---

## Upgrading to v0.5.10.7 (starter relocation + concepts/ rename)

v0.5.10.7 renamed `core/default-templates/knowledge/` to `core/default-templates/concepts/` and moved starter templates from live dirs into `knowledge/templates/`. Running `/kmgraph:kmg-init` (option 1 — Verify/upgrade) applies both migrations automatically.

**If you prefer to migrate manually:**

*Starter relocation — move starters out of live dirs:*
```bash
mkdir -p /path/to/kg/knowledge/templates
for f in lessons-learned/lesson-template.md decisions/ADR-template.md sessions/session-template.md knowledge/entry-template.md; do
  [ -f "/path/to/kg/$f" ] && mv "/path/to/kg/$f" "/path/to/kg/knowledge/templates/$(basename "$f")"
done
```

*`knowledge/knowledge/` merge (only if this nested dir exists):*
```bash
# If the dir exists and files are unmodified vs. plugin source, merge:
mv /path/to/kg/knowledge/knowledge/*.md /path/to/kg/knowledge/concepts/
rmdir /path/to/kg/knowledge/knowledge
# Archive first if files have been edited — they represent your customizations.
```

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
