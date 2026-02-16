# Knowledge Graph Core

**Platform-Agnostic Knowledge Management System**

This directory contains the core, platform-independent components of the Knowledge Graph system. Use this if you're not using Claude Code, or want to adapt the system for other AI platforms (Continue.dev, Cursor, Aider, etc.).

---

## What's in Core?

```
core/
├── docs/                    # Platform-agnostic documentation
├── scripts/                 # Python/bash utilities
├── templates/               # Document templates
├── examples/                # Sample knowledge entries
└── examples-hooks/          # Optional git hooks
```

---

## Usage Without Claude Code

### Manual Workflows

If you're not using Claude Code (or any AI platform), you can still use this knowledge system manually:

**1. Create a lesson learned:**
```bash
# Copy template
cp core/templates/lessons-learned/lesson-template.md \
   docs/lessons-learned/process/my-lesson.md

# Edit the file
# Add to category README manually
```

**2. Create an ADR:**
```bash
# Find next number
ls docs/decisions/ | grep "ADR-" | sort | tail -1
# ADR-005.md (last one)

# Copy template with next number
cp core/templates/decisions/ADR-template.md \
   docs/decisions/ADR-006-my-decision.md
```

**3. Extract chat history:**
```bash
# For Claude Code
python3 core/scripts/extract_claude.py

# For Gemini/Antigravity  
python3 core/scripts/extract_gemini.py
```

See [core/docs/WORKFLOWS.md](./docs/WORKFLOWS.md) for detailed manual workflows.

---

## Adapting for Other Platforms

### Continue.dev

```javascript
// .continue/config.json
{
  "contextProviders": [
    {
      "name": "knowledge",
      "params": {
        "folders": ["docs/knowledge", "docs/lessons-learned"]
      }
    }
  ]
}
```

### Cursor

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

### Aider

```bash
# In .aider.conf.yml
read-only-paths:
  - docs/knowledge/
  - docs/lessons-learned/
  - docs/decisions/

# Launch with knowledge context
aider --read docs/knowledge/patterns.md
```

See [core/docs/PLATFORM-ADAPTATION.md](./docs/PLATFORM-ADAPTATION.md) for complete platform-specific guides.

---

## MCP Server (Model Context Protocol)

Run knowledge graph as MCP server for any compatible platform:

```bash
# Install dependencies
npm install @anthropic/mcp

# Start MCP server
node core/mcp-server.js

# Configure in your platform (Claude Desktop, etc.)
```

See [core/docs/PLATFORM-ADAPTATION.md#mcp-server](./docs/PLATFORM-ADAPTATION.md#mcp-server) for setup details.

---

## Python Scripts

### Chat Extraction

Extract chat history from platform log files:

```bash
# Extract from Claude Code
python3 core/scripts/extract_claude.py \
  --output chat-history/

# Extract from Gemini
python3 core/scripts/extract_gemini.py \
  --output chat-history/
```

### Knowledge Sync

Sync knowledge between systems (manual version of automated workflow):

```bash
# After creating lesson, update knowledge graph
python3 core/scripts/sync_knowledge.py \
  --lesson docs/lessons-learned/process/my-lesson.md \
  --update-kg docs/knowledge/patterns.md
```

---

## Templates

All document types have standardized templates:

| Template | Location | Use Case |
|----------|----------|----------|
| Lesson Learned | `core/templates/lessons-learned/` | Problem-solving journeys |
| ADR | `core/templates/decisions/` | Architectural decisions |
| KG Entry | `core/templates/knowledge/` | Quick-reference concepts |
| Session Summary | `core/templates/sessions/` | Work session snapshots |
| Meta-Issue | `core/templates/meta-issue/` | Complex multi-attempt problems |

See [core/docs/PATTERNS-GUIDE.md](./docs/PATTERNS-GUIDE.md) for template usage.

---

## Examples

The `core/examples/` directory contains generalized examples from real projects:

- **12 Patterns** - Design patterns for knowledge systems
- **6 Concepts** - Core architectural concepts
- **6 Gotchas** - Common pitfalls and solutions
- **7 Lessons** - Example problem-solving narratives
- **2 ADRs** - Example architectural decisions
- **1 Meta-Issue** - Complex problem tracking example

Use these as inspiration for your own knowledge entries.

---

## Quick Start (Manual)

1. **Initialize directory structure:**
   ```bash
   mkdir -p docs/{lessons-learned/{architecture,debugging,process,patterns},decisions,knowledge,sessions}
   ```

2. **Copy templates:**
   ```bash
   cp -r core/templates/* docs/
   ```

3. **Create first lesson:**
   ```bash
   cp core/templates/lessons-learned/lesson-template.md \
      docs/lessons-learned/process/first-lesson.md
   # Edit docs/lessons-learned/process/first-lesson.md
   ```

4. **Add to version control:**
   ```bash
   git add docs/
   git commit -m "docs: initialize knowledge graph"
   ```

---

## Documentation

- **[ARCHITECTURE.md](./docs/ARCHITECTURE.md)** - System design and concepts
- **[PATTERNS-GUIDE.md](./docs/PATTERNS-GUIDE.md)** - Writing good knowledge entries
- **[WORKFLOWS.md](./docs/WORKFLOWS.md)** - Manual workflows for non-platform users
- **[META-ISSUE-GUIDE.md](./docs/META-ISSUE-GUIDE.md)** - Complex problem tracking
- **[PLATFORM-ADAPTATION.md](./docs/PLATFORM-ADAPTATION.md)** - Adapting for your platform
- **[SANITIZATION-CHECKLIST.md](./docs/SANITIZATION-CHECKLIST.md)** - Privacy before sharing

---

## License

Same as parent project (see root README.md).

---

## Contributing

This is a framework, not a product. Customize it for your needs:

1. Fork/copy for your project
2. Modify templates for your workflow
3. Add/remove knowledge categories as needed
4. Customize scripts for your platforms
5. Share improvements back (optional)

---

## Support

- **Issues:** Not applicable (this is a framework to copy, not a service)
- **Questions:** Adapt the examples to your needs
- **Customization:** Modify freely for your project

For platform-specific setup help, see the adaptation guides in `core/docs/`.
