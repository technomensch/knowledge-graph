---
id: INSTALL
title: Installation
sidebar_label: Installation
description: Step-by-step installation guide for Claude Code, MCP IDEs, and manual setup
---

Users can install the Knowledge Management Graph using a **universal installer** — a single markdown file that any AI assistant can execute for automated setup.

---

## How It Works

The universal installer detects the platform (Claude Code, Codex CLI, Cursor, Windsurf, Continue.dev, JetBrains, VS Code, Aider, or other AI assistants), configures the appropriate components, and initializes a knowledge graph automatically.

**Installation takes approximately 5 minutes.**

---

## Get the Installer

:::warning[Important: Use the Raw File]

This page shows a preview of the installer. To actually install, **copy and paste the raw markdown file** into an AI assistant.
**[→ Get the raw installer file](https://raw.githubusercontent.com/technomensch/knowledge-graph/main/INSTALL.md)**
- Click the link above
- Select all text (Ctrl+A / Cmd+A)
- Copy to clipboard (Ctrl+C / Cmd+C)
- Paste into Claude, ChatGPT, Cursor, or any AI assistant
- Follow the assistant's instructions

:::
---

## For Claude Code Users

:::tip[Claude Code Quick Start]

Claude Code users can follow a manual setup walkthrough instead:
→ [Quickstart](quickstart.mdx)
Or paste the universal installer above for the same automated experience.

:::

## For Codex CLI Users

:::tip[Codex Marketplace Install]

```bash
codex plugin marketplace add technomensch/knowledge-graph
codex plugin add kmgraph@knowledge-management-graph
```

Skills and MCP tools activate immediately after install — no further configuration needed.

:::
---

:::note[Not using Claude Code?]

The `commands/`, `skills/`, `agents/`, and `hooks/` directories in this repo are loaded exclusively
by the Claude Code plugin system. Do not copy these directories if using Cursor, Windsurf,
Continue.dev, JetBrains, VS Code, or any other tool — they will not work outside the plugin system.
All cross-platform functionality is provided through the MCP server as `kg_*` tools.

:::

## Platform Capabilities

Users can install on multiple platforms with varying automation levels:

| Platform | Automation | How to Install |
|----------|-----------|-----------------|
| **Claude Code** | Full automation | Paste installer (recommended) or follow [Quickstart](quickstart.mdx) |
| **Codex CLI** | Full automation | `codex plugin marketplace add technomensch/knowledge-graph` then `codex plugin add kmgraph@knowledge-management-graph` |
| **Cursor** | Medium (MCP tools) | Paste installer; MCP server handles data layer |
| **Windsurf** | Medium (MCP tools) | Paste installer; MCP server handles data layer |
| **Continue.dev** | Medium (MCP tools) | Paste installer; MCP server handles data layer |
| **JetBrains IDE** | Medium (MCP tools) | Paste installer; configure in Settings → Tools → AI Assistant |
| **VS Code** | Medium (MCP tools) | Paste installer; MCP server handles data layer |
| **Claude Desktop** | Medium (MCP tools) | Paste installer; configure in Desktop settings |
| **Aider** | Low (manual workflows) | Paste installer; follow templates manually |
| **GitHub Copilot** | Low (manual workflows) | Paste installer; follow templates manually |

---

## What Gets Installed

The installer sets up:

- **Configuration file** — `~/.claude/kg-config.json` (stores knowledge graph locations and metadata)
- **Directory structure** — `knowledge/`, `lessons-learned/`, `decisions/`, `sessions/`, `chat-history/`
- **Identity files** — `knowledge/me.md` (contributor identity, gitignored), `knowledge/rules.md` (project conventions, committed), and `knowledge/triggers.md` (rule timing, when each rule applies). See [Your AI Profile](pillars/portability/your-ai-profile.mdx).
- **Wiki links** — Cross-references throughout the KG are converted to Obsidian `[[wiki link]]` format, enabling graph view navigation in Obsidian and compatible editors
- **MCP server** — Provides knowledge graph tools for non-Claude-Code platforms
- **Templates** — Starter scaffolds for capturing lessons and decisions

---

## Upgrade Checks

When running `/kmgraph:init` on an existing installation, the wizard inspects your setup and reports what it finds:

| Check | What it looks for |
|-------|-------------------|
| **a. Directories** | Missing subdirectories (`knowledge/`, `decisions/`, `sessions/`, etc.) |
| **b. Config fields** | Missing fields in `~/.claude/kg-config.json` introduced in newer versions |
| **c. Templates** | Template files that have been updated or added since your install |
| **d. Platform split** | Claude-specific tool directives in `knowledge/rules.md` that belong in `CLAUDE.md` |
| **e. Wiki pass** | Bare `ADR-NNN`, `ENH-NNN`, `#NNN`, and lesson filename references not yet converted to `[[wiki links]]` — runs once per KG, skipped on re-run if already complete |
| **f. Docs migration** | `docs/enhancements/` or `docs/issues/` subdirectories that should be moved into the knowledge graph structure |
| **g. FTS5 cleanup** | Stale in-project FTS5 index files (`knowledge/fts5/`) left behind by older versions |
| **h. Identity scaffold** | Missing `me.md`, `rules.md`, or `triggers.md` — presents a dry-run preview, scans existing platform files (CLAUDE.md, GEMINI.md, .cursorrules, etc.), README, ADRs, and sessions to pre-populate recommendations, then archives any originals before writing |

:::note Re-running the wizard
`/kmgraph:init` is safe to re-run at any time. It skips steps already complete and only offers items still pending for your install.
:::

---

## Next Steps

After installation, users can:

1. **Capture a lesson** — Document a problem solved, pattern learned, or decision made
2. **Create architecture decisions** — Record important design choices
3. **Search knowledge** — Find lessons and patterns across sessions
4. **Sync knowledge** — Automatically extract and organize captured content

See [Quickstart](quickstart.mdx) for detailed walkthroughs.

---

## Having Issues?

- **Installation failed?** Paste the full error message into the installer file's troubleshooting section
- **MCP tools not visible?** Restart the IDE after configuring the MCP server
- **Config file not found?** Run the installer again to create it

See [FAQ](FAQ.md) for additional help.
