# Platform Adaptation Guide

**Navigation**: [Home](../../README.md) > [Getting Started](../../docs/GETTING-STARTED.md) > Platform Adaptation

**Using the knowledge graph with different AI coding platforms**

The knowledge graph core is platform-agnostic. This guide covers platform capabilities and usage patterns after installation.

---

## Installation

**For installation on any platform**, paste [INSTALL.md](../../INSTALL.md) into the AI assistant for automated setup. The installer handles platform detection, MCP server configuration, and knowledge graph initialization.

This guide focuses on **platform capabilities and usage patterns** after installation is complete.

---

## Quick Reference

| Platform | Automation Level | MCP Support | Commands |
|----------|-----------------|-------------|----------|
| **Claude Code** | Full | ✅ | 22 commands |
| **Cursor** | Medium | ✅ (via MCP) | None (use MCP tools) |
| **Windsurf** | Medium | ✅ (via MCP) | None (use MCP tools) |
| **Continue.dev** | Medium | ✅ (via MCP) | Custom slash commands |
| **JetBrains AI** | Medium | ✅ (via MCP) | None (use MCP tools) |
| **VS Code (Claude)** | Medium | ✅ (via MCP) | None (use MCP tools) |
| **Claude Desktop** | Medium | ✅ (via MCP) | None (use MCP tools) |
| **Aider** | Low | ❌ | Manual only |
| **Copilot Chat** | Low | ❌ | Manual only |
| **Local LLMs** | Custom | ❌ | Manual + system prompts |

---

## Claude Code (Native — Full Automation)

**Status:** ✅ Fully supported (this plugin)

**Automation:** Full — all 22 commands, hooks, agents, and MCP tools available

**Features:**
- 22 commands: `/knowledge:capture-lesson`, `/knowledge:recall`, `/knowledge:create-adr`, etc.
- SessionStart hooks: check-memory, recent-lessons, memory-diff-check
- Subagents for automated review
- MEMORY.md bidirectional sync with archive/restore
- ADR automation with bidirectional lesson linking
- Git metadata auto-capture on every operation

**For installation:** See [GETTING-STARTED.md](../../docs/GETTING-STARTED.md) or paste [INSTALL.md](../../INSTALL.md).

---

## Cursor

**Platform:** VS Code fork with AI features
**Automation:** Medium (MCP tools + indexed directories)

**With MCP server installed (recommended):**
- Use `kg_config_init`, `kg_config_list`, `kg_search`, `kg_scaffold` tools directly in Cursor chat
- MCP provides the same data layer as Claude Code
- Full search, lesson creation, and ADR scaffolding via MCP tools

**Without MCP:**
- Index `docs/knowledge/`, `docs/lessons-learned/`, `docs/decisions/` directories
- Use Cursor rules (`.cursorrules`) to guide lesson creation
- Use `@docs/knowledge` to reference knowledge in Composer

**Limitations (without MCP):**
- No automated git metadata tracking
- No bidirectional MEMORY.md sync
- Manual category README updates
- No automated pipelines (`/knowledge:sync-all` equivalent)

**Workaround:** Use manual workflows from [WORKFLOWS.md](./WORKFLOWS.md) + Cursor Composer for assistance

---

## Windsurf

**Platform:** AI-native IDE by Codeium
**Automation:** Medium (MCP tools + Cascade context)

**With MCP server installed (recommended):**
- MCP tools available directly in Cascade chat
- `kg_search` integrates with Windsurf's context-aware search
- `kg_scaffold` creates lessons from templates automatically

**Without MCP:**
- Use `.windsurfrules` to reference knowledge graph conventions
- Index `docs/` directories for context

**Limitations (without MCP):**
- No automated git metadata tracking
- Manual lesson creation and search
- No ADR automation

**Workaround:** Use manual workflows from [WORKFLOWS.md](./WORKFLOWS.md)

---

## Continue.dev

**Platform:** VS Code / JetBrains extension
**Automation:** Medium (MCP tools + context providers + custom slash commands)

**With MCP server installed (recommended):**
- MCP tools available via Continue's tool-calling interface
- `kg_search` provides full-text knowledge search
- `kg_scaffold` creates lessons from templates

**Without MCP:**
- Configure context providers to index `docs/knowledge/`, `docs/lessons-learned/`, `docs/decisions/`
- Create custom `/lesson` and `/recall` slash commands in `~/.continue/config.json`
- Use `@knowledge` to reference docs in context

**Limitations (without MCP):**
- No automated git metadata tracking
- No bidirectional MEMORY.md sync
- Manual category README updates

**Workaround:** Use manual workflows from [WORKFLOWS.md](./WORKFLOWS.md)

---

## JetBrains AI Assistant

**Platform:** IntelliJ, WebStorm, PyCharm, etc.
**Automation:** Medium (MCP tools via AI Assistant plugin)

**With MCP server installed (recommended):**
- Configure MCP server in Settings → Tools → AI Assistant → MCP Servers
- Use `kg_config_init`, `kg_search`, `kg_scaffold` tools in AI chat

**Limitations:**
- No automated git metadata tracking
- No bidirectional MEMORY.md sync
- No ADR wizard (use `kg_scaffold` with ADR template)

---

## VS Code (Claude Extension) and Claude Desktop

**Platform:** VS Code with Anthropic Claude extension, Claude Desktop app
**Automation:** Medium (MCP tools)

**With MCP server installed (recommended):**
- MCP tools available in Claude chat within the IDE
- Full access to `kg_config_init`, `kg_search`, `kg_scaffold`, `kg_check_sensitive`
- Config file location: `.vscode/mcp.json` (VS Code) or `~/Library/Application Support/Claude/claude_desktop_config.json` (Desktop)

**Limitations:**
- No Claude Code commands (22 commands are Claude Code-specific)
- No SessionStart hooks
- No automated pipeline (`/knowledge:sync-all` equivalent)

---

## Aider

**Platform:** Terminal-based AI pair programming
**Automation:** Low (manual workflows with AI assistance)

**Usage pattern:**
- Add `read-only-paths` for knowledge directories in `.aider.conf.yml`
- Ask Aider to create lessons using the template at `core/templates/lessons-learned/lesson-template.md`
- Aider assists with content; file operations are manual

**Limitations:**
- Fully manual workflow
- No MCP support
- No git metadata automation

**Workaround:** Use manual workflows from [WORKFLOWS.md](./WORKFLOWS.md); Aider helps write content

---

## GitHub Copilot Chat

**Platform:** VS Code extension
**Automation:** Low (manual prompting)

**Usage pattern:**
- Copilot indexes workspace automatically — ensure knowledge docs are in `docs/`
- Reference knowledge via `@workspace` queries: `@workspace What patterns are in docs/knowledge/patterns.md?`
- Use `#file:docs/lessons-learned/` references in prompts

**Limitations:**
- No skills/commands
- No MCP support
- Fully manual searching and creation

**Workaround:** Use entirely manual workflows; Copilot assists with writing

---

## Local LLMs (Ollama, LM Studio, etc.)

**Platform:** Self-hosted models
**Automation:** Custom (system prompts + scripts)

**Usage pattern:**
- Create a `system-prompt.md` describing the knowledge graph structure and conventions
- Include the lesson template as context in each request
- Use the system prompt to guide lesson creation, categorization, and search

**Limitations:**
- No IDE integration
- No MCP support (unless running an MCP-compatible client)
- Manual file operations required

**Workaround:** Use LLM to generate content; manually save files using templates

---

## MCP Tools Reference

For all MCP-capable platforms, these 7 tools are available:

| Tool | Description |
|------|-------------|
| `kg_config_init` | Create a new knowledge graph with directory structure |
| `kg_config_list` | List all configured knowledge graphs |
| `kg_config_switch` | Change the active knowledge graph |
| `kg_config_add_category` | Add a new category to the active KG |
| `kg_search` | Full-text search across the active KG |
| `kg_scaffold` | Create a file from a template |
| `kg_check_sensitive` | Scan for potentially sensitive data |

---

## Migration Between Platforms

### From Claude Code to Another Platform

**1. Keep core knowledge** — knowledge stays in `docs/` (platform-agnostic):

```bash
git commit -m "docs: knowledge graph export"
```

**2. Use the MCP server** — run the knowledge graph as an MCP server to access from the new platform.

**3. Recreate automation** — review Claude Code commands and implement equivalent patterns in the new platform, or use manual workflows.

### From Manual to Automated

**1. Organize existing docs** — move to the standard directory structure.

**2. Initialize config** — run `node mcp-server/dist/cli.js init` or paste INSTALL.md to set up `~/.claude/kg-config.json`.

**3. Add git metadata retroactively** if needed:

```markdown
**Branch:** (unknown - created before tracking)
**Commit:** (see git log for related commits)
```

### Between AI Platforms

Knowledge is portable — the same `docs/` directory works with all platforms. Automation requires platform-specific implementation.

---

## Recommended Approach by Team Size

### Solo Developer

**Platform:** Any (even manual)
**Recommendation:** Start with the universal installer, add automation where valuable

### Small Team (2-5)

**Platform:** MCP-capable IDE (Cursor, Windsurf, Continue.dev)
**Recommendation:** MCP tools provide the core data layer; each developer uses their preferred IDE

### Medium Team (6-20)

**Platform:** Mix of platforms sharing one MCP server
**Recommendation:** Centralized knowledge access; team members use different IDEs

### Large Team (20+)

**Platform:** Custom integration + knowledge curator
**Recommendation:** Dedicated tools, formal processes, dedicated MCP server instance

---

## Learn More

**Installation**:
- [Universal Installer](../../INSTALL.md) — Automated setup for all platforms
- [Getting Started](../../docs/GETTING-STARTED.md) — Claude Code setup guide

**Core Concepts & Reference**:
- [Concepts Guide](../../docs/CONCEPTS.md) — Plain-English term explanations
- [Configuration](../../docs/CONFIGURATION.md) — Post-install customization
- [Command Guide](../../docs/COMMAND-GUIDE.md) — All commands (Claude Code users)

**Guides**:
- [Architecture Guide](./ARCHITECTURE.md) — System design overview
- [Patterns Guide](./PATTERNS-GUIDE.md) — Writing quality lessons and ADRs
- [Manual Workflows](./WORKFLOWS.md) — Step-by-step processes for all platforms

**Resources**:
- [Templates](../templates/) — Starter scaffolds for all document types
- [Examples](../examples/) — Real-world samples to study
