# Knowledge Management Graph — Installation Guide

> **How to use this file:** Paste the entire contents of this document into any AI assistant (Claude Code, Cursor, Windsurf, Continue.dev, JetBrains AI, VS Code, Copilot, Aider, or any LLM). The assistant will detect the platform, install the appropriate components, and configure everything automatically.

---

## Instructions for the AI Assistant

You are installing the **Knowledge Management Graph** — a system for capturing lessons learned, architecture decisions, and institutional knowledge. Follow the steps below in order. Do not skip steps. Ask the user questions only where indicated.

---

### Step 0: Verify Shell Access

This installer requires shell access to your local directory. You'll need to grant
the LLM permission to:
- Run shell commands
- Read/write files in your local directory

**Claude Code:** Grant permission when prompted
**Cursor/Windsurf:** Shell access enabled by default
**Continue.dev:** Enable in settings
**Other LLMs:** Not applicable (proceed to Manual Installation section)

**Quick Test:**
```bash
echo "Shell access: OK" && node --version && git --version
```

If this fails, you don't have shell access. Skip to Manual Installation section below.

```bash
# Check node and git are available
command -v node >/dev/null 2>&1 || echo "Node.js not found"
command -v git >/dev/null 2>&1 || echo "Git not found"
```

---

## Step 0.5: Check for Previous Installation (Skip if first install)

Run the scan below. **If the output is empty, skip this step entirely and proceed to Step 1.**
Only take action if stale references are found.

```bash
# Scan for prior versions of this tool
echo "=== Claude Code extension registry ==="
claude extension list 2>/dev/null | grep -E "knowledge|kg-sis|kmgraph" || echo "None found"

echo "=== MCP config files ==="
for f in \
  ~/.cursor/mcp.json \
  ~/.codeium/windsurf/mcp_config.json \
  ~/.continue/config.json \
  "$HOME/Library/Application Support/Claude/claude_desktop_config.json" \
  "$APPDATA/Claude/claude_desktop_config.json"; do
  [ -f "$f" ] && grep -l "knowledge-graph\|kg-sis" "$f" 2>/dev/null && echo "STALE: $f"
done || echo "None found"
```

**If output is empty → skip to Step 1.**

**If stale references found → clean up before proceeding:**

| Location | Action |
|----------|--------|
| Claude Code (`settings.local.json` `enabledPlugins`) | Run `claude extension uninstall knowledge` and/or `claude extension uninstall kg-sis` |
| `~/.cursor/mcp.json` | Remove `"knowledge-graph"` or `"kg-sis"` server entry (do NOT overwrite the whole file) |
| `~/.codeium/windsurf/mcp_config.json` | Remove stale server entry |
| `~/.continue/config.json` | Remove stale server entry |
| `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) | Remove stale server entry |
| `%APPDATA%/Claude/claude_desktop_config.json` (Windows) | Remove stale server entry |
| `.vscode/mcp.json` (workspace) | Remove stale server entry |
| `~/.claude/kg-config.json` | Update repo path if repo was renamed/moved |

After cleanup, re-run the scan to confirm zero results, then proceed to Step 1.

**Note:** Claude Code may cache the extension registry between sessions — restart Claude Code
after uninstalling before verifying.
---

### Step 1: Detect Platform


Check which AI coding environment is active by running these detection commands:

```bash
# Check for Claude Code
which claude 2>/dev/null && echo "PLATFORM=claude-code"

# Check for platform-specific directories
[ -d ".cursor" ] && echo "PLATFORM=cursor"
[ -d ".windsurf" ] && echo "PLATFORM=windsurf"
[ -d ".continue" ] && echo "PLATFORM=continue"
[ -d ".idea" ] && echo "PLATFORM=jetbrains"
[ -f ".vscode/mcp.json" ] && echo "PLATFORM=vscode-claude"

# Check for Claude Desktop config
[ -f "$HOME/Library/Application Support/Claude/claude_desktop_config.json" ] && echo "PLATFORM=claude-desktop"
[ -f "$APPDATA/Claude/claude_desktop_config.json" ] && echo "PLATFORM=claude-desktop"
```

**If Claude Code is detected**, go to **Step 2A** (fast path).
**If any MCP-capable IDE is detected** (Cursor, Windsurf, Continue.dev, JetBrains, VS Code, Claude Desktop), go to **Step 2B** (MCP path).
**If no IDE is detected**, ask the user which platform they use. If it supports MCP, go to **Step 2B**. Otherwise, go to **Step 2C** (template-only path).

---

### Step 2A: Claude Code Installation (Fast Path)

Claude Code supports full plugin installation with all 22 commands, hooks, agents, and MCP tools.

**Ask the user:**

```
How would you like to install the Knowledge Management Graph?

1. Marketplace install (recommended) — installs from the plugin registry
2. Local install — clone the repo and load from disk
```

**If marketplace install (option 1):**

```bash
claude plugin install knowledge
```

**If local install (option 2):**

```bash
git clone https://github.com/technomensch/knowledge-graph.git
cd knowledge-graph/mcp-server && npm install && npm run build && cd ..
```

Then instruct the user to launch Claude Code with the plugin directory:

```bash
claude --plugin-dir /path/to/knowledge-graph
```

**After installation, go to Step 3 (Initialize Knowledge Graph).**

---

### Step 2B: MCP IDE Installation (Cursor, Windsurf, Continue.dev, JetBrains, VS Code, Claude Desktop)

This path installs the MCP server, which provides 7 tools for knowledge management: `kg_config_init`, `kg_config_list`, `kg_config_switch`, `kg_config_add_category`, `kg_search`, `kg_scaffold`, and `kg_check_sensitive`.

#### 2B.1: Check Prerequisites

```bash
git --version    # Requires git
node --version   # Requires Node.js 18+
npm --version    # Requires npm
```

**If Node.js is not installed or below version 18:**

Tell the user:
```
Node.js 18+ is required for the MCP server. Install it from https://nodejs.org/
After installing Node.js, run this installation again.
```

If the user cannot install Node.js, go to **Step 2C** (template-only path).

#### 2B.2: Clone and Build

```bash
git clone https://github.com/technomensch/knowledge-graph.git
cd knowledge-graph/mcp-server
npm install
npm run build
```

Verify the build succeeded:

```bash
[ -f dist/index.js ] && echo "BUILD_SUCCESS" || echo "BUILD_FAILED"
```

If the build failed, show the error output and ask the user to resolve it before proceeding.

#### 2B.3: Configure IDE

Determine the absolute path to the MCP server entry point:

```bash
echo "$(cd knowledge-graph/mcp-server && pwd)/dist/index.js"
```

Store this as `MCP_SERVER_PATH`.

**Write the MCP configuration to the correct location based on the detected platform:**

**Cursor** — Write to `~/.cursor/mcp.json`:
```json
{
  "mcpServers": {
    "knowledge-graph": {
      "command": "node",
      "args": ["MCP_SERVER_PATH"]
    }
  }
}
```

⚠️ **After modifying MCP config, restart your IDE** for changes to take effect.

**Windsurf** — Write to `~/.codeium/windsurf/mcp_config.json`:
```json
{
  "mcpServers": {
    "knowledge-graph": {
      "command": "node",
      "args": ["MCP_SERVER_PATH"]
    }
  }
}
```

⚠️ **After modifying MCP config, restart your IDE** for changes to take effect.

**Continue.dev** — Add to `~/.continue/config.json` under the `mcpServers` key:
```json
{
  "mcpServers": [
    {
      "name": "knowledge-graph",
      "command": "node",
      "args": ["MCP_SERVER_PATH"]
    }
  ]
}
```

⚠️ **After modifying MCP config, restart your IDE** for changes to take effect.

**JetBrains** — Instruct the user:
```
Open Settings → Tools → AI Assistant → MCP Servers → Add Server:
  Name: knowledge-graph
  Command: node
  Args: MCP_SERVER_PATH
```

⚠️ **After modifying MCP config, restart your IDE** for changes to take effect.

**VS Code (Claude extension)** — Write to `.vscode/mcp.json` in the workspace:
```json
{
  "servers": {
    "knowledge-graph": {
      "command": "node",
      "args": ["MCP_SERVER_PATH"]
    }
  }
}
```

⚠️ **After modifying MCP config, restart your IDE** for changes to take effect.

**Claude Desktop** — Add to the config file:
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "knowledge-graph": {
      "command": "node",
      "args": ["MCP_SERVER_PATH"]
    }
  }
}
```

**Important:** Replace `MCP_SERVER_PATH` with the actual absolute path from the earlier step. If the config file already exists, merge the `knowledge-graph` entry into the existing `mcpServers` object — do not overwrite the file.

**After configuration, go to Step 3 (Initialize Knowledge Graph).**

---

### Step 2C: Template-Only Installation (No MCP Support)

For platforms that do not support MCP (Aider, GitHub Copilot, local LLMs, or environments without Node.js), install the templates and directory structure directly.

#### 2C.1: Clone Repository

```bash
git clone https://github.com/technomensch/knowledge-graph.git
```

#### 2C.2: Create Knowledge Graph Directory Structure

**Ask the user:**

```
Where should the knowledge graph be stored?

1. Current project directory (./docs/) — for project-specific knowledge
2. Home directory (~/.knowledge-graph/) — for cross-project knowledge
3. Custom path — enter a path
```

Store the chosen path as `KG_PATH`.

```bash
mkdir -p "$KG_PATH/knowledge"
mkdir -p "$KG_PATH/lessons-learned/architecture"
mkdir -p "$KG_PATH/lessons-learned/process"
mkdir -p "$KG_PATH/lessons-learned/patterns"
mkdir -p "$KG_PATH/decisions"
mkdir -p "$KG_PATH/sessions"
mkdir -p "$KG_PATH/chat-history"
```

#### 2C.3: Copy Templates

```bash
REPO_PATH="./knowledge-graph"

# Knowledge templates
for f in patterns.md gotchas.md concepts.md architecture.md workflows.md index.md; do
  [ -f "$REPO_PATH/core/templates/knowledge/$f" ] && cp "$REPO_PATH/core/templates/knowledge/$f" "$KG_PATH/knowledge/"
done

# Lesson templates
for f in README.md lesson-template.md; do
  [ -f "$REPO_PATH/core/templates/lessons-learned/$f" ] && cp "$REPO_PATH/core/templates/lessons-learned/$f" "$KG_PATH/lessons-learned/"
done

# ADR templates
for f in README.md ADR-template.md; do
  [ -f "$REPO_PATH/core/templates/decisions/$f" ] && cp "$REPO_PATH/core/templates/decisions/$f" "$KG_PATH/decisions/"
done

# Session template
[ -f "$REPO_PATH/core/templates/sessions/session-template.md" ] && cp "$REPO_PATH/core/templates/sessions/session-template.md" "$KG_PATH/sessions/"
```

#### 2C.4: Create Configuration

```bash
mkdir -p "$HOME/.claude"
cat > "$HOME/.claude/kg-config.json" << 'CONFIGEOF'
{
  "version": "1.0.0",
  "active": "KG_NAME",
  "graphs": {
    "KG_NAME": {
      "name": "KG_NAME",
      "path": "KG_PATH",
      "type": "project-local",
      "categories": [
        { "name": "architecture", "prefix": null, "git": "commit" },
        { "name": "process", "prefix": null, "git": "commit" },
        { "name": "patterns", "prefix": null, "git": "commit" }
      ],
      "createdAt": "TIMESTAMP",
      "lastUsed": "TIMESTAMP"
    }
  },
  "sanitization": {
    "enabled": false,
    "patterns": [],
    "action": "warn"
  }
}
CONFIGEOF
```

Replace `KG_NAME` with the user's chosen name, `KG_PATH` with the actual path, and `TIMESTAMP` with the current ISO 8601 timestamp.

#### 2C.5: Create Instructions File

Write a `.kg-instructions.md` file to the KG directory root so the user's AI assistant knows how to work with the knowledge graph:

```markdown
# Knowledge Graph Instructions

This directory contains a knowledge graph for capturing lessons learned,
architecture decisions, and institutional knowledge.

## Directory Structure

- `knowledge/` — Core knowledge files (patterns, concepts, architecture)
- `lessons-learned/` — Problem/solution pairs organized by category
- `decisions/` — Architecture Decision Records (ADRs)
- `sessions/` — Session summaries
- `chat-history/` — Extracted chat logs

## How to Capture a Lesson

Create a new markdown file in `lessons-learned/<category>/` using this pattern:

**Filename:** `Lessons_Learned_<Topic>.md`

**Template:**
- Title: Descriptive title of the lesson
- Problem: What went wrong or needed solving
- Solution: How it was resolved
- Root Cause: Why the problem occurred
- Prevention: How to prevent recurrence
- Tags: Relevant keywords

## How to Create an ADR

Create a new file in `decisions/` following the `ADR-template.md` pattern.

## Configuration

The knowledge graph config is stored at `~/.claude/kg-config.json`.
```

**After creating the instructions file, go to Step 3 (Initialize Knowledge Graph).**

---

### Step 3: Initialize Knowledge Graph

**For Claude Code (Step 2A):**

Run the initialization command:
```
/kmgraph:init
```

This will prompt for KG name, location, and categories. Follow the wizard.

**For MCP IDEs (Step 2B):**

Use the MCP tool to initialize:
```
Call the kg_config_init tool with:
  name: (ask user for a name, e.g., "my-project")
  kgPath: (ask user for a path, e.g., "./docs" or "~/.knowledge-graph")
```

**For template-only installations (Step 2C):**

The configuration was already created in Step 2C.4. Verify it exists:

```bash
cat "$HOME/.claude/kg-config.json"
```

---

### Step 4: Verify Installation

Run these checks to confirm everything is working:

**Check config exists:**
```bash
[ -f "$HOME/.claude/kg-config.json" ] && echo "CONFIG_OK" || echo "CONFIG_MISSING"
```

**Check directory structure:**
```bash
KG_PATH=$(node -e "const c=require('$HOME/.claude/kg-config.json'); const g=c.graphs[c.active]; console.log(g.path.replace(/^~/, require('os').homedir()))" 2>/dev/null || echo "")
[ -d "$KG_PATH/knowledge" ] && echo "DIRS_OK" || echo "DIRS_MISSING"
[ -d "$KG_PATH/lessons-learned" ] && echo "LESSONS_OK" || echo "LESSONS_MISSING"
[ -d "$KG_PATH/decisions" ] && echo "DECISIONS_OK" || echo "DECISIONS_MISSING"
```

**For MCP IDEs, verify the MCP server responds:**
```
Call the kg_config_list tool. It should return the knowledge graph created in Step 3.
```

**If any check fails**, review the steps above and correct the issue before proceeding.

---

### Step 5: Capture First Lesson

The knowledge graph is ready. Encourage the user to try it immediately:

**For Claude Code:**
```
Try capturing your first lesson now. Think of a problem you recently solved — a bug fix,
a configuration issue, or a design decision. Run:

/kmgraph:capture-lesson

The wizard will walk you through documenting it.
```

**For MCP IDEs:**
```
Try creating your first lesson now. Think of a problem you recently solved.
Use the kg_scaffold tool:

  template: "lessons-learned/lesson-template.md"
  outputPath: "<your-kg-path>/lessons-learned/architecture/Lessons_Learned_My_First_Lesson.md"
  variables: { "TITLE": "My First Lesson", "CATEGORY": "architecture" }

Then open the generated file and fill in the Problem, Solution, and Root Cause sections.
```

**For template-only installations:**
```
Try creating your first lesson now. Copy the lesson template:

cp <kg-path>/lessons-learned/lesson-template.md \
   <kg-path>/lessons-learned/architecture/Lessons_Learned_My_First_Lesson.md

Open the new file and fill in:
- Title: A descriptive title
- Problem: What went wrong
- Solution: How you fixed it
- Root Cause: Why it happened
- Prevention: How to avoid it next time
```

---

## Platform Capabilities Reference

| Capability | Claude Code | MCP IDEs | Template-Only |
|-----------|-------------|----------|--------------|
| Capture lessons | Full wizard | MCP scaffold tool | Manual template |
| Search knowledge | Full-text recall | MCP search tool | Manual grep |
| Create ADRs | Full wizard | MCP scaffold tool | Manual template |
| Auto-link lessons to ADRs | Automatic | Manual | Manual |
| Session summaries | Full wizard | MCP scaffold tool | Manual template |
| Sensitive data scanning | Command + MCP | MCP tool | Not available |
| 22 slash commands | All available | Not available | Not available |
| Hooks and agents | All available | Not available | Not available |

---

## Manual Installation (No Shell Access Required)

If you don't have shell access, follow these steps manually:

### 1. Download the repository
- Clone or download as ZIP from [GitHub repo](https://github.com/technomensch/knowledge-graph)
- Extract to preferred location (e.g., `~/tools/knowledge-graph/`)
- Note the full path

### 2. (Claude Code only) Install as Extension

- Open Claude Code marketplace
- Search for "kmgraph" or "knowledge graph"
- Install and enable

### 3. (MCP Platforms) Configure MCP Server

**For Cursor:**
- Open `.cursor/mcp.json` in text editor
- Add entry for this tool (see [COMMAND-GUIDE.md](docs/COMMAND-GUIDE.md) for config format)
- Restart Cursor

**For Windsurf:**
- Open `~/.codeium/windsurf/mcp_config.json` in text editor
- Add entry for this tool
- Restart Windsurf

**For Continue.dev:**
- Open `~/.continue/config.json` in text editor
- Add entry under `mcpServers`
- Restart Continue.dev

**For VS Code:**
- Open `.vscode/mcp.json` in workspace
- Add entry for this tool
- Restart VS Code

**For Claude Desktop:**
- macOS: Open `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: Open `%APPDATA%/Claude/claude_desktop_config.json`
- Add entry under `mcpServers`
- Restart Claude Desktop

**For JetBrains:**
- Open Settings → Tools → AI Assistant → MCP Servers → Add Server
- Restart JetBrains IDE

### 4. Available Commands

Commands are available as reference documentation. Copy their content into your LLM:

- `/kmgraph:init` — Initialize a new knowledge graph
- `/kmgraph:capture-lesson` — Capture a lesson learned
- `/kmgraph:recall` — Search across all knowledge
- `/kmgraph:session-summary` — Generate session summary
- `/kmgraph:create-adr` — Create architecture decision record

See [COMMAND-GUIDE.md](docs/COMMAND-GUIDE.md) for complete command reference.

---

## Troubleshooting


**MCP server won't start:**
- Verify Node.js 18+: `node --version`
- Verify build succeeded: `ls knowledge-graph/mcp-server/dist/index.js`
- Check for build errors: `cd knowledge-graph/mcp-server && npm run build`

**IDE doesn't see MCP tools:**
- Restart the IDE after adding MCP config
- Verify the path in the config file is absolute (not relative)
- Check IDE-specific MCP documentation for additional setup steps

**Config file not found:**
- Verify `~/.claude/kg-config.json` exists
- Run the init step again if needed

**Templates not copied:**
- Verify the repo was cloned successfully: `ls knowledge-graph/core/templates/`
- Copy templates manually if needed

---

## Links

- **Repository:** https://github.com/technomensch/knowledge-graph
- **Documentation:** See `docs/` directory in the repository
- **MCP Server:** See `mcp-server/` directory for the Model Context Protocol integration

## Credits

- This installation approach is inspired by the [Mintlify `install.md` standard](https://mintlify.com/docs/quickstart) — a self-contained markdown file that any AI assistant can parse and execute for automated setup.
- Tier 1 installation is powered by the [Claude Code Plugin System](https://docs.anthropic.com/en/docs/claude-code/plugins), which provides the richest experience with full command, hook, and agent support.
