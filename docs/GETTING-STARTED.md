# Getting Started with Knowledge Graph

A step-by-step guide for setting up the knowledge graph system and capturing the first lesson. This guide covers all supported setup paths and takes 5–20 minutes to complete depending on the chosen approach.

**Version**: 0.0.7-alpha

---

## Choose a Setup Path

The knowledge graph system supports three distinct setup paths. Select the path that matches the current environment:

| Setup Path | Best For | Time to First Lesson |
|---|---|---|
| [Path A: Claude Code](#path-a-claude-code-setup) | Claude Code plugin users | ~5 minutes |
| [Path B: Other AI Assistant](#path-b-other-ai-assistant-setup) | Cursor, Continue.dev, Aider users | ~10 minutes |
| [Path C: Manual / No AI](#path-c-manual-setup) | Terminal and editor-only workflows | ~15 minutes |

**Not sure which path fits?** Read [CONCEPTS.md](CONCEPTS.md) for a plain-English overview of the system before proceeding.

---

## Path A: Claude Code Setup

**For**: Users with the Claude Code plugin installed.

**Time to first lesson**: ~5 minutes

### Prerequisites

- Claude Code (latest version)
- Git (recommended; enables automatic code linking)
- Node.js 18+ (required for the MCP server)

### Step 1: Load the Plugin

Start Claude Code from the plugin directory to load the knowledge graph commands:

```bash
claude --plugin-dir /path/to/knowledge-graph
```

Verify the plugin loaded by typing `/knowledge` — the autocomplete menu should display available commands.

### Step 2: Initialize the Knowledge Graph

```bash
/knowledge:init
```

The initialization wizard prompts for:
- **Project name** — the name of the current project
- **Git tracking** — enable to automatically capture branch and commit metadata

After completion, the command creates the knowledge graph directory structure in the project.

### Step 3: Verify Setup

```bash
/knowledge:status
```

Expected output: `Knowledge Graph: [project-name] | 0 lessons | 0 decisions`

### Step 4: Capture the First Lesson

```bash
/knowledge:capture-lesson
```

Claude Code guides the session through documenting a problem solved recently. The command auto-fills metadata fields (`created`, `author`, `git.*`) and asks for the manual fields (`title`, `category`, `tags`).

**Tip**: The best time to document is immediately after solving a problem — details are freshest then.

### Step 5: Verify the Lesson Was Saved

```bash
/knowledge:status
```

Expected output now shows: `1 lesson`

### Next Steps for Claude Code Users

**Next steps**:
- Learn commands: [Essential Commands](COMMAND-GUIDE.md#essential-commands)
- See examples: [Real-World Examples](../core/examples/)
- Set up sharing: [Sanitization](CONFIGURATION.md#privacy--public-sharing)

---

## Path B: Other AI Assistant Setup

**For**: Users working with Cursor, Continue.dev, Aider, or any AI assistant other than Claude Code.

**Time to first lesson**: ~10 minutes

### Prerequisites

- An AI assistant installed (Cursor, Continue.dev, Aider, etc.)
- Git (recommended)
- Terminal access

### Step 1: Clone the Core System

The `core/` directory contains the platform-agnostic templates, examples, and documentation that work with any AI assistant:

```bash
# Download the core system
git clone https://github.com/technomensch/knowledge-graph.git /tmp/kg-source

# Copy the core directory into the project
cp -r /tmp/kg-source/core your-project/
```

### Step 2: Initialize the Directory Structure

```bash
cd your-project
mkdir -p docs/{lessons-learned/{architecture,debugging,process,patterns},decisions,knowledge,sessions}
cp -r core/templates/. docs/templates/
```

The directory structure after setup:

```
docs/
├── lessons-learned/    # Problem-solving documentation
│   ├── architecture/
│   ├── debugging/
│   ├── patterns/
│   └── process/
├── decisions/          # Architecture Decision Records
├── knowledge/          # Quick-reference patterns and concepts
├── sessions/           # Work session summaries
└── templates/          # Fill-in-the-blank forms
```

### Step 3: Configure the AI Assistant

Add the knowledge graph templates to the AI assistant's context so it can create entries automatically.

**Continue.dev** — add to `~/.continue/config.json`:

```json
{
  "contextProviders": [
    {
      "name": "knowledge",
      "params": {
        "folders": ["docs/knowledge", "docs/lessons-learned", "docs/decisions"]
      }
    }
  ],
  "slashCommands": [
    {
      "name": "lesson",
      "description": "Create lesson learned",
      "prompt": "Help me create a lesson learned document using the template at docs/templates/lessons-learned/lesson-template.md. Save to docs/lessons-learned/{category}/{Title}.md and fill in [MANUAL] fields only."
    }
  ]
}
```

**Cursor** — add to `.cursor/settings.json`:

```json
{
  "cursor.includeDirectories": [
    "docs/knowledge",
    "docs/lessons-learned",
    "docs/decisions"
  ]
}
```

**Aider** — add to `.aider.conf.yml`:

```yaml
read-only-paths:
  - docs/knowledge/
  - docs/lessons-learned/
  - docs/decisions/
```

For additional platform configurations, see [Platform Adaptation Guide](../core/docs/PLATFORM-ADAPTATION.md).

### Step 4: Create the First Lesson

Open a conversation with the AI assistant and ask it to document a recently solved problem:

```
"Help me create a lesson learned about [describe the problem and solution]."
```

The AI assistant uses the template to create a structured entry in `docs/lessons-learned/`.

### Next Steps for AI Assistant Users

**Next steps**:
- See platform tips: [Platform Adaptation Guide](../core/docs/PLATFORM-ADAPTATION.md)
- Follow manual workflows: [Workflows Guide](../core/docs/WORKFLOWS.md)
- See examples: [Real-World Examples](../core/examples/)

---

## Path C: Manual Setup

**For**: Users who prefer to work without an AI assistant, or who want to understand the system before adding automation.

**Time to first lesson**: ~15 minutes

### Prerequisites

- A text editor (any editor works — VSCode, vim, Sublime, Notepad++)
- Terminal or command prompt
- Git (optional but recommended)

### Step 1: Get the Templates

```bash
# Download or clone the core system
git clone https://github.com/technomensch/knowledge-graph.git /tmp/kg-source

# Copy the core directory into the project
cp -r /tmp/kg-source/core your-project/
```

### Step 2: Create the Directory Structure

```bash
cd your-project
mkdir -p docs/{lessons-learned/{architecture,debugging,process,patterns},decisions,knowledge,sessions}
cp -r core/templates/. docs/templates/
touch docs/knowledge/{patterns.md,concepts.md,gotchas.md}
```

### Step 3: Create the First Lesson

**3a. Choose a category** based on the type of problem:

| Category | Use For |
|---|---|
| `architecture/` | System design, component structure |
| `debugging/` | Bug fixes, troubleshooting |
| `process/` | Workflow improvements, tools |
| `patterns/` | Reusable solutions, best practices |

**3b. Copy the lesson template** with a descriptive filename:

```bash
cp docs/templates/lessons-learned/lesson-template.md \
   docs/lessons-learned/debugging/My_First_Lesson.md
```

**3c. Open the file** and fill in the `[MANUAL]` fields:

```yaml
---
title: "Lesson: [Short description of what was learned]"  # [MANUAL]
category: debugging                                         # [MANUAL]
tags: [relevant, keywords, here]                           # [MANUAL]
# Fields marked [AUTO] are filled by commands — leave blank for manual workflow
---
```

**3d. Write the body** — answer these four questions:

- **Problem:** What went wrong or what needed solving?
- **Root Cause:** Why did it happen?
- **Solution:** What fixed it, step by step?
- **Prevention:** How to avoid this in the future?

**3e. Commit** (if using git):

```bash
git add docs/lessons-learned/debugging/My_First_Lesson.md
git commit -m "docs: add first lesson"
```

### Next Steps for Manual Users

**Next steps**:
- Follow all 9 workflows: [Manual Workflows Guide](../core/docs/WORKFLOWS.md)
- Speed up with aliases: [Tips & Shortcuts](../core/docs/WORKFLOWS.md#tips-and-shortcuts)
- Improve quality: [Pattern Writing Guide](../core/docs/PATTERNS-GUIDE.md)

---

## Troubleshooting

### Commands do not appear in Claude Code autocomplete

- Verify the plugin is loaded: start Claude Code with `claude --plugin-dir /path/to/knowledge-graph`
- Commands use the `knowledge:` prefix with a colon, not a hyphen: `/knowledge:init` (correct), `/knowledge-init` (incorrect)
- Restart Claude Code completely if commands still do not appear

### The MCP server does not start

```bash
# Verify Node.js is installed
node --version  # Should show 18.x or higher

# Check the MCP server binary exists
ls mcp-server/dist/index.js

# Test the MCP server directly
./tests/test-mcp-direct.sh
```

### Templates are not found

Verify that `core/templates/` exists in the project directory and that templates were copied to `docs/templates/` with `cp -r core/templates/. docs/templates/`.

### Which category should this lesson use?

| Category | Use for |
|---|---|
| `architecture` | System design decisions, component relationships |
| `process` | Workflow improvements, tool configurations, procedures |
| `patterns` | Reusable solutions discovered through experience |
| `debugging` | Bug investigations, troubleshooting sessions, root cause analysis |

When uncertain, choose `debugging` for problem-solving documentation and `process` for workflow-related insights.

### Is git required?

Git is recommended but not required. With git, the system automatically captures branch name, commit hash, and PR/issue numbers as lesson metadata. Without git, all features remain available — only automatic code linking is unavailable.

---

## Related Documentation

**Getting deeper into the system**:
- [Concepts Guide](CONCEPTS.md) — Plain-English definitions of every term used in documentation
- [Command Reference](COMMAND-GUIDE.md) — All 19 commands with examples and learning path
- [Quick Reference](CHEAT-SHEET.md) — One-page cheat sheet for common tasks

**Configuration and customization**:
- [Configuration Guide](CONFIGURATION.md) — Post-install setup: sanitization, team workflows, MCP server
- [Platform Adaptation](../core/docs/PLATFORM-ADAPTATION.md) — Detailed guides for Cursor, Continue.dev, Aider, and other platforms

**Writing effective entries**:
- [Manual Workflows](../core/docs/WORKFLOWS.md) — Step-by-step guides for all 9 workflow types
- [Pattern Writing Guide](../core/docs/PATTERNS-GUIDE.md) — How to write high-quality knowledge entries
- [Examples](../core/examples/) — Completed examples to learn from

---

**Version**: 0.0.7-alpha
**Last Updated**: 2026-02-20
