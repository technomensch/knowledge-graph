---
description: Generate installation instructions for colleagues on other AI coding platforms (Cursor, Windsurf, Continue.dev, JetBrains, VS Code, Aider)
allowed-tools: Bash, Read, Write, Edit, Glob, Grep, AskUserQuestion
---

# Cross-Platform Setup Helper

**Purpose:** Generate ready-to-paste installation instructions for a colleague who uses a different AI coding platform. Reads from INSTALL.md (single source of truth) and customizes with current project paths.

**Version:** 1.0 (Created: 2026-02-20)

**Note:** This command generates instructions for other users. For self-installation, paste INSTALL.md directly into the target AI assistant.

---

## Syntax Detection

```
/kmgraph:setup-platform
/kmgraph:setup-platform <platform>
```

**Examples:**
- `/kmgraph:setup-platform` → Interactive wizard (prompts for platform)
- `/kmgraph:setup-platform cursor` → Generate Cursor-specific instructions directly

---

## Step 1: Detect Current Project Context

**Collect project information automatically:**

```bash
# Plugin root
echo "${CLAUDE_PLUGIN_ROOT}"

# Repo URL (if available)
git remote get-url origin 2>/dev/null

# MCP server path
ls "${CLAUDE_PLUGIN_ROOT}/mcp-server/dist/index.js" 2>/dev/null
```

Store the repo URL and MCP server path for use in generated instructions.

---

## Step 2: Select Target Platform (INTERACTIVE)

If a platform was passed as argument, use it directly. Otherwise, prompt:

```
Which platform does the recipient use?

1. Cursor
2. Windsurf
3. Continue.dev
4. JetBrains (IntelliJ, WebStorm, PyCharm, etc.)
5. VS Code (with Claude extension)
6. Claude Desktop
7. Aider
8. GitHub Copilot
9. Other / Local LLM
```

**Wait for user selection.**

---

## Step 3: Select Output Format

```
How should the instructions be delivered?

1. Copy-pasteable text block (default) — Ready to paste into a message or doc
2. INSTALL.md reference — Point them to the universal installer
3. MCP config JSON only — Just the IDE configuration snippet
```

**Wait for user selection.**

---

## Step 4: Generate Instructions

### 4.1 Read INSTALL.md

```
Action: Read ${CLAUDE_PLUGIN_ROOT}/INSTALL.md
```

Use INSTALL.md as the authoritative source for all installation steps.

### 4.2 Generate Platform-Specific Output

**For MCP-capable platforms (Cursor, Windsurf, Continue.dev, JetBrains, VS Code, Claude Desktop):**

Generate a message containing:

1. **Prerequisites:** Git, Node.js 18+
2. **Clone command:** Using the detected repo URL
3. **Build command:** `cd mcp-server && npm install && npm run build`
4. **MCP config:** The correct JSON block for the target platform

To get the MCP config JSON, run:
```bash
node "${CLAUDE_PLUGIN_ROOT}/mcp-server/dist/cli.js" config <platform>
```

5. **Init instruction:** "After configuring MCP, use the `kg_config_init` tool to create a knowledge graph"
6. **First use prompt:** "Try capturing a lesson about a recent problem you solved"

**For non-MCP platforms (Aider, Copilot, Other):**

Generate a message containing:

1. **Clone command**
2. **Directory structure creation** (from INSTALL.md Step 2C)
3. **Template copying instructions**
4. **Manual config creation**
5. **Instructions file reference**

### 4.3 Format Output

**If copy-pasteable text block:**

Present the full instructions in a fenced code block that the user can copy:

```
Here are the instructions for [platform]. Copy everything below and send to the recipient:

---

[Generated instructions]

---
```

**If INSTALL.md reference:**

```
Share this with the recipient:

"Paste the contents of INSTALL.md into your AI assistant for automated setup:
https://github.com/[repo]/blob/main/INSTALL.md

Or download and paste locally:
curl -sL https://raw.githubusercontent.com/[repo]/main/INSTALL.md | pbcopy"
```

**If MCP config JSON only:**

Output just the JSON block from the CLI tool.

---

## Step 5: Offer Follow-Up

After generating instructions:

```
Instructions generated. Would you like to:

1. Generate instructions for another platform
2. Test the MCP config locally (verify it works)
3. Done
```

**Wait for user selection.**

If "Generate for another platform" → return to Step 2.
If "Test MCP config" → Run: `node ${CLAUDE_PLUGIN_ROOT}/mcp-server/dist/cli.js config <platform>` and verify output.
If "Done" → End command.

---

## Checklist

- [ ] Current project context detected (repo URL, MCP server path)
- [ ] Target platform selected
- [ ] Output format selected
- [ ] INSTALL.md read as source of truth
- [ ] Platform-specific instructions generated with correct config paths
- [ ] MCP config JSON generated via CLI tool (for MCP platforms)
- [ ] Output formatted for easy copy-paste

---

## Related Commands

- `/kmgraph:init` — Initialize a knowledge graph on the current machine
- `/kmgraph:help` — Get help with any command
- `/kmgraph:status` — Check current knowledge graph status

---

**Created:** 2026-02-20
**Version:** 1.0
**Usage:** Type `/kmgraph:setup-platform` to generate installation instructions for another platform
