# Installation

Users can install the Knowledge Management Graph using a **universal installer** — a single markdown file that any AI assistant can execute for automated setup.

---

## How It Works

The universal installer detects the platform (Claude Code, Cursor, Windsurf, Continue.dev, JetBrains, VS Code, Aider, or other AI assistants), configures the appropriate components, and initializes a knowledge graph automatically.

**Installation takes approximately 5 minutes.**

---

## Get the Installer

!!! warning "Important: Use the Raw File"

    This page shows a preview of the installer. To actually install, **copy and paste the raw markdown file** into an AI assistant.

    **[→ Get the raw installer file](https://raw.githubusercontent.com/technomensch/knowledge-graph/main/INSTALL.md)**

    - Click the link above
    - Select all text (Ctrl+A / Cmd+A)
    - Copy to clipboard (Ctrl+C / Cmd+C)
    - Paste into Claude, ChatGPT, Cursor, or any AI assistant
    - Follow the assistant's instructions

---

## For Claude Code Users

!!! tip "Claude Code Quick Start"

    Claude Code users can follow a manual setup walkthrough instead:

    → [Claude Code Setup Guide](GETTING-STARTED.md)

    Or paste the universal installer above for the same automated experience.

---

## Platform Capabilities

Users can install on multiple platforms with varying automation levels:

| Platform | Automation | How to Install |
|----------|-----------|-----------------|
| **Claude Code** | Full automation | Paste installer (recommended) or follow [Getting Started](GETTING-STARTED.md) |
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
- **MCP server** — Provides knowledge graph tools for non-Claude-Code platforms
- **Templates** — Starter scaffolds for capturing lessons and decisions

---

## Next Steps

After installation, users can:

1. **Capture a lesson** — Document a problem solved, pattern learned, or decision made
2. **Create architecture decisions** — Record important design choices
3. **Search knowledge** — Find lessons and patterns across sessions
4. **Sync knowledge** — Automatically extract and organize captured content

See [Getting Started](GETTING-STARTED.md) for detailed walkthroughs.

---

## Having Issues?

- **Installation failed?** Paste the full error message into the installer file's troubleshooting section
- **MCP tools not visible?** Restart the IDE after configuring the MCP server
- **Config file not found?** Run the installer again to create it

See [FAQ](FAQ.md) for additional help.
