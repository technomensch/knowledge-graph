# Platform Adaptation Guide

**Navigation**: [Home](../../README.md) > [Getting Started](../../docs/GETTING-STARTED.md) > Platform Adaptation

**Using the knowledge graph with different AI coding platforms**

The knowledge graph core is platform-agnostic. This guide shows how to adapt it for various platforms beyond Claude Code.

---

## Prerequisites

Before adapting to your platform:
- ✅ Complete [Getting Started](../../docs/GETTING-STARTED.md) setup
- ✅ Have templates in your project (`core/templates/`)
- ✅ Understand [basic concepts](../../docs/CONCEPTS.md)

See [Installation Guide](../../docs/GETTING-STARTED.md#ai-assistant-setup) for initial setup.

---

## Quick Reference

| Platform | Automation Level | Setup Method |
|----------|-----------------|--------------|
| **Claude Code** | Full | Install plugin (native support) |
| **Continue.dev** | Medium | Configure context providers |
| **Cursor** | Medium | Add to indexed directories |
| **Aider** | Low | Reference docs in commands |
| **Copilot Chat** | Low | Manual reference in prompts |
| **Local LLMs** | Custom | System prompts + templates |
| **MCP Server** | Universal | Run as MCP server |

---

## Claude Code (Native - Full Automation)

**Status:** ✅ Fully supported (this plugin)

**Features:**
- 18 commands for automation
- SessionStart hooks (check-memory, recent-lessons, memory-diff-check)
- Subagents for review
- MEMORY.md bidirectional sync with archive/restore

**Setup:** See main README.md and [GETTING-STARTED.md](../../docs/GETTING-STARTED.md) for installation, [CONFIGURATION.md](../../docs/CONFIGURATION.md) for post-install configuration

---

## Continue.dev

**Platform:** VS Code / JetBrains extension  
**Automation:** Medium (context providers + custom commands)

### Setup

**1. Configure context providers:**

```json
// ~/.continue/config.json
{
  "contextProviders": [
    {
      "name": "knowledge",
      "params": {
        "folders": [
          "docs/knowledge",
          "docs/lessons-learned",
          "docs/decisions"
        ]
      }
    }
  ]
}
```

**2. Create custom commands:**

```json
// ~/.continue/config.json
{
  "slashCommands": [
    {
      "name": "lesson",
      "description": "Create lesson learned",
      "prompt": "Help me create a lesson learned document. Ask for: topic, category (architecture/debugging/process/patterns), problem description, solution, and lessons. Use template from docs/templates/lessons-learned/lesson-template.md. Save to docs/lessons-learned/{category}/{topic}.md"
    },
    {
      "name": "recall",
      "description": "Search knowledge base",
      "prompt": "Search docs/lessons-learned/, docs/knowledge/, and docs/decisions/ for: {input}. Show relevant passages and file paths."
    }
  ]
}
```

**3. Use knowledge in context:**

```
@knowledge what patterns do we have for database connections?
```

Continue.dev will search indexed folders.

**Limitations:**
- No automated git metadata tracking
- No bidirectional MEMORY.md sync
- Manual category README updates

**Workaround:** Use manual workflows from [WORKFLOWS.md](./WORKFLOWS.md)

---

## Cursor

**Platform:** VS Code fork with AI features  
**Automation:** Medium (indexed directories + rules)

### Setup

**1. Add knowledge dirs to index:**

```json
// .cursor/settings.json
{
  "cursor.includeDirectories": [
    "docs/knowledge",
    "docs/lessons-learned",
    "docs/decisions"
  ]
}
```

**2. Create Cursor rules:**

```
// .cursorrules

When documenting lessons learned:
1. Use template from docs/templates/lessons-learned/lesson-template.md
2. Save to docs/lessons-learned/{category}/
3. Categories: architecture, debugging, process, patterns
4. Update category README.md with link
5. Extract patterns to docs/knowledge/patterns.md

When searching for knowledge:
1. Check docs/knowledge/ first (quick reference)
2. Then docs/lessons-learned/ for details
3. Then docs/decisions/ for architectural context
```

**3. Use in composer:**

```
@docs/knowledge what validation patterns exist?
```

Cursor will search indexed knowledge.

**Limitations:**
- No automated pipelines (/knowledge:sync-all)
- Manual lesson creation
- No meta-issue tracking automation

**Workaround:** Use manual workflows + Cursor composer for assistance

---

## Aider

** Platform:** Terminal-based AI pair programming  
**Automation:** Low (manual workflows with AI assistance)

### Setup

**1. Configure read-only paths:**

```yaml
# .aider.conf.yml
read-only-paths:
  - docs/knowledge/
  - docs/lessons-learned/
  - docs/decisions/
```

**2. Create helper script:**

```bash
#!/bin/bash
# aider-lesson.sh

cat << EOF
I want to create a lesson learned.

Template location: docs/templates/lessons-learned/lesson-template.md
Target directory: docs/lessons-learned/\$CATEGORY/

Please:
1. Ask me for topic, category, problem, solution
2. Create file using template
3. Fill in with provided information
4. Update docs/lessons-learned/\$CATEGORY/README.md
EOF

aider \
  --read docs/templates/lessons-learned/lesson-template.md \
  --read docs/lessons-learned/
```

**3. Search knowledge:**

```bash
# Launch Aider with knowledge context
aider --read docs/knowledge/patterns.md

# In Aider:
# "What patterns exist for database connections?"
```

**Limitations:**
- Fully manual workflow
- No automation
- AI assists but doesn't execute

**Workaround:** Use manual workflows from [WORKFLOWS.md](./WORKFLOWS.md), Aider helps write content

---

## GitHub Copilot Chat

**Platform:** VS Code extension  
**Automation:** Low (manual prompting)

### Setup

**1. Reference knowledge in workspace:**

Copilot indexes workspace automatically. Ensure knowledge docs exist:

```bash
# Verify structure
ls docs/knowledge/
ls docs/lessons-learned/
```

**2. Reference in prompts:**

```
@workspace What patterns are in docs/knowledge/patterns.md?

#file:docs/lessons-learned/process/ show lessons about workflows

Based on docs/decisions/, what architectural decisions have we made?
```

**Limitations:**
- No skills/commands
- No automation
- Manual searching and creation

**Workaround:** Use entirely manual workflows, Copilot assists with writing

---

## Local LLMs (Ollama, LM Studio, etc.)

**Platform:** Self-hosted models  
**Automation:** Custom (system prompts + scripts)

### Setup

**1. Create system prompt:**

```markdown
# system-prompt.md

You are a knowledge management assistant for this project.

The project uses a knowledge graph with four components:
1. Lessons Learned (docs/lessons-learned/) - Detailed problem-solving
2. ADRs (docs/decisions/) - Architectural decisions
3. Knowledge Graph (docs/knowledge/) - Quick reference
4. Sessions (docs/sessions/) - Historical snapshots

Templates available at: docs/templates/

When user asks to create lesson:
1. Use docs/templates/lessons-learned/lesson-template.md
2. Ask for category (architecture/debugging/process/patterns)
3. Fill in template with user input
4. Save to docs/lessons-learned/{category}/{filename}.md

When user asks to recall knowledge:
1. Search docs/knowledge/ first
2. Then docs/lessons-learned/
3. Provide file paths and relevant quotes
```

**2. Launch with system prompt:**

```bash
# Ollama
ollama run codellama --system "$(cat system-prompt.md)"

# LM Studio
# Paste system prompt into system message field
```

**3. Provide templates as context:**

```bash
# Include template in each request
cat docs/templates/lessons-learned/lesson-template.md | \
  ollama run codellama "Create lesson on database pooling"
```

**Limitations:**
- No IDE integration
- No git automation
- Manual file operations

**Workaround:** Use LLM to generate content, manually save files

---

## MCP Server (Universal Access)

**Platform:** Any MCP-compatible client  
**Automation:** High (server handles automation)

### Setup

**1. Install dependencies:**

```bash
npm install @anthropic/mcp
```

**2. Configure MCP server:**

```javascript
// core/mcp-server.js
import { McpServer } from '@anthropic/mcp'

const server = new McpServer({
  name: 'knowledge-graph',
  version: '1.0.0'
})

// Resources
server.resource({
  uri: 'knowledge://patterns',
  name: 'Design Patterns',
  mimeType: 'text/markdown',
  handler: async () => {
    return fs.readFileSync('docs/knowledge/patterns.md', 'utf8')
  }
})

// Tools
server.tool({
  name: 'search_knowledge',
  description: 'Search knowledge base',
  parameters: {
    query: { type: 'string', description: 'Search query' }
  },
  handler: async ({ query }) => {
    // Implement search
  }
})

server.listen(3000)
```

**3. Configure client:**

```json
// claude_desktop_config.json (Claude Desktop)
{
  "mcpServers": {
    "knowledge-graph": {
      "command": "node",
      "args": ["core/mcp-server.js"],
      "cwd": "/absolute/path/to/project"
    }
  }
}
```

**4. Use from any MCP client:**

```
# In Claude Desktop or any MCP client
What patterns are available?
[MCP fetches from knowledge://patterns]

Search for lessons about performance
[MCP executes search_knowledge tool]
```

**Benefits:**
- Works with any MCP-compatible platform
- Centralized knowledge access
- Can add authentication/authorization

**See:** `core/mcp-server.js` (Phase 4 implementation)

---

## Custom Integration

For platforms not listed:

### 1. Identify Platform Capabilities

- Can it read local files? → Point to `docs/`
- Can it run scripts? → Use Python extraction scripts
- Can it execute commands? → Create platform-specific commands
- Can it use system prompts? → Include knowledge graph instructions

### 2. Choose Integration Level

**Level 1: Manual (No integration)**
- Copy templates manually
- Edit in any editor
- Use grep for search

**Level 2: Context-aware (Read-only)**
- Platform reads `docs/` directories
- AI can reference knowledge
-  Manual creation

**Level 3: Semi-automated (Commands)**
- Platform runs scripts to create lessons
- AI assists with content
- Some automation (git commits, indexing)

**Level 4: Fully automated (Plugin)**
- Custom plugin for platform
- Full automation (like Claude Code version)

### 3. Use Core Components

All platforms can use:
- ✅ Templates (copy and fill)
- ✅ Directory structure (create manually)
- ✅ Manual workflows (see WORKFLOWS.md)
- ✅ Python scripts (chat extraction)

Platform-specific automation optional.

---

## Migration Between Platforms

### From Claude Code to Another Platform

**1. Keep core knowledge:**

```bash
# Knowledge stays in docs/ (platform-agnostic)
git commit -m "docs: knowledge graph export"
```

**2. Recreate automation for new platform:**

- Review workflows in Claude Code skills
- Implement equivalent in new platform
- Or: Use manual workflows

**3. Use MCP server:**

Run knowledge graph as MCP server, access from new platform.

### From Manual to Automated

**1. Organize existing docs:**

```bash
# Move to standard structure
mkdir -p docs/{lessons-learned,decisions,knowledge}
mv old-docs/* docs/lessons-learned/process/
```

**2. Convert to templates:**

Study existing docs, identify pattern, create templates.

**3. Add git metadata retroactively:**

```markdown
**Branch:** (unknown - created before tracking)
**Commit:** (see git log for related commits)
```

### Between AI Platforms

**Knowledge is portable:**

```bash
# Same docs/ work with all platforms
# Just configure platform to read from docs/
```

**Automation requires platform-specific implementation.**

---

## Recommended Approach by Team Size

### Solo Developer

**Platform:** Any (even manual)  
**Recommendation:** Start simple (manual + templates), add automation if needed

### Small Team (2-5)

**Platform:** Continue.dev or Cursor (good IDE integration)  
**Recommendation:** Context providers + manual workflows

### Medium Team (6-20)

**Platform:** Custom MCP server + any IDE  
**Recommendation:** Centralized knowledge access, team can use different IDEs

### Large Team (20+)

**Platform:** Custom integration + knowledge curator  
**Recommendation:** Dedicated tools, formal processes

---

## Learn More

**Core Concepts & Setup**:
- [Getting Started](../../docs/GETTING-STARTED.md) - Installation and first steps
- [Concepts Guide](../../docs/CONCEPTS.md) - Plain-English term explanations
- [Configuration](../../docs/CONFIGURATION.md) - Post-install customization

**Guides & References**:
- [Architecture Guide](./ARCHITECTURE.md) - System design overview
- [Patterns Guide](./PATTERNS-GUIDE.md) - Writing quality lessons and ADRs
- [Manual Workflows](./WORKFLOWS.md) - Step-by-step processes for non-Claude users

**Resources**:
- [Templates](../templates/) - Starter scaffolds for all document types
- [Examples](../examples/) - Real-world samples to study
- [Command Guide](../../docs/COMMAND-GUIDE.md) - All 19 commands (Claude Code users)
