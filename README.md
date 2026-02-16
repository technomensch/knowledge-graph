# Knowledge Graph Plugin for Claude Code

Structured knowledge capture, lesson-learned documentation, and cross-session memory for Claude Code projects.

**Version:** 0.0.1-alpha
**Status:** Alpha Release - Testing & Feedback

---

## What is this?

A Claude Code plugin that provides:
- **Lesson-Learned Capture** with categorized storage and git metadata tracking
- **Knowledge Graph** with quick-reference entries linked to full lessons
- **MEMORY.md Bidirectional Sync** for persistent cross-session context
- **Meta-Issue Tracking** for complex multi-attempt problems
- **Automated Knowledge Sync** pipeline (4 steps → 1 command)
- **Chat History Extraction** from Claude Code and Gemini logs
- **Session Summaries** for work documentation
- **ADR Management** for architecture decisions
- **Multi-KG Support** with flexible configuration

---

## Installation

**Prerequisites:**
- Claude Code (latest version)
- Node.js 18+ (for MCP server)
- Python 3.7+ (for chat extraction)
- Git (for metadata tracking)

### From Source (Development)

```bash
# Clone or copy this repository
cd /path/to/knowledge-graph-plugin

# Test locally (MCP server builds automatically on first session start)
claude --plugin-dir .
```

### From Published Plugin (Future)

```bash
# Add marketplace (after publication)
/plugin marketplace add technomensch/knowledge-graph-plugin

# Install
/plugin install knowledge@technomensch-tools
```

---

## Quick Start

1. **Initialize your first knowledge graph:**
   ```bash
   /knowledge:init
   ```
   Follow the wizard to configure location, categories, and git strategy.

2. **Create your first lesson:**
   ```bash
   /knowledge:capture-lesson
   ```

3. **Search your knowledge:**
   ```bash
   /knowledge:recall "topic"
   ```

4. **Check status:**
   ```bash
   /knowledge:status
   ```

---

## Commands (16 Total)

### Configuration & Management
- `/knowledge:init` — Initialize new knowledge graph with wizard
- `/knowledge:list` — Display all configured knowledge graphs
- `/knowledge:switch` — Change active knowledge graph
- `/knowledge:add-category` — Add category to existing KG
- `/knowledge:status` — Show active KG info and quick reference

### Knowledge Capture
- `/knowledge:capture-lesson` — Document lessons with git metadata
- `/knowledge:meta-issue` — Track complex multi-attempt problems
- `/knowledge:session-summary` — Summarize current session
- `/knowledge:extract-chat` — Extract Claude/Gemini chat history

### Knowledge Sync
- `/knowledge:update-graph` — Extract KG entries from lessons
- `/knowledge:sync-all` — Automated full sync pipeline
- `/knowledge:update-issue-plan` — Sync KG → plan → issue → GitHub
- `/knowledge:recall` — Search across all memory systems

### Privacy & Security
- `/knowledge:configure-sanitization` — Set up pre-commit hooks
- `/knowledge:check-sensitive` — Scan for sensitive data
- `/knowledge:link-issue` — Link lessons to GitHub issues

---

## ⚠️ Critical: Skill Naming & Namespacing

**IMPORTANT DISCOVERY** (Feb 14, 2026):

Claude Code requires explicit namespace prefix in skill YAML `name:` field for autocomplete to show the full namespaced command.

### How It Works

**In SKILL.md frontmatter:**
```yaml
---
name: knowledge:capture-lesson    # ← Must include namespace prefix
description: Document lessons learned
---
```

**In Claude Code autocomplete:**
- When user types `/know` → shows `/knowledge:capture-lesson` (correct)
- Without prefix in `name:` field → shows only `/capture-lesson` (incomplete)

### The Fix

All 17 plugin commands now have `knowledge:` prefix in their `name:` field:
- ✅ `name: knowledge:capture-lesson`
- ✅ `name: knowledge:init`
- ✅ `name: knowledge:recall`
- ✅ All 17 commands follow this pattern

### Why This Matters

- **User Experience:** Users see correct full command names in autocomplete
- **Consistency:** All knowledge graph commands appear under `knowledge:` namespace
- **Prevention:** Prevents namespace collisions with existing global commands
- **Documentation:** Helps users understand command organization

**For plugin developers:** Always include namespace prefix in the `name:` field when creating Claude Code plugins with namespaced commands.

---

## ⚠️ Architecture: Commands vs Skills

**IMPORTANT DECISION** (Feb 2026):

This plugin uses the `commands/` directory instead of `skills/` based on research into Claude Code's distinction between these two patterns.

### Why Commands?

Knowledge graph operations are **deterministic workflows** that work best when:
- User explicitly invokes them (manual control)
- Full workflow loads immediately (not lazy-loaded)
- Predictable execution flow (not autonomous decisions)

### Commands vs Skills in Claude Code

| Feature | Commands | Skills |
|---------|----------|--------|
| Location | `commands/` | `skills/` |
| Invocation | Manual only | Manual + autonomous |
| Loading | Full content on invocation | Lazy-loaded description first |
| Use Case | Surgical operations | Complex capabilities |
| Token Usage | Higher (full load) | Lower (on-demand) |

### Invocation Pattern

All knowledge graph commands use the `knowledge:` namespace:
- `/knowledge:capture-lesson`
- `/knowledge:init`
- `/knowledge:recall`

**For plugin developers:** Choose `commands/` when you want users to have explicit control over when workflows run. Choose `skills/` when you want Claude to autonomously discover and apply capabilities.

---

## Architecture

### Core Design
- **Platform-Agnostic Core** (`core/`) — Works with ANY LLM or IDE
- **Claude Code Automation** (commands, hooks) — Full automation layer
- **MCP Server** (`mcp-server/`) — Cross-platform data access

### Directory Structure
```
knowledge-graph-plugin/
├── .claude-plugin/           # Plugin manifest
├── commands/                 # 17 commands (manual invocation)
├── agents/                   # Subagents (knowledge-reviewer)
├── hooks/                    # SessionStart hooks
├── scripts/                  # Helper scripts
├── config/                   # Config templates
├── core/                     # Platform-agnostic core
│   ├── templates/            # KG, lessons, ADRs, meta-issues
│   ├── examples/             # ~30 generalized examples
│   ├── scripts/              # Python extraction scripts
│   ├── examples-hooks/       # Pre-commit sanitization
│   └── docs/                 # Documentation
├── mcp-server/               # MCP data layer (Phase 4)
├── docs/
│   └── plans/                # Implementation plans (Phase 1-5)
├── README.md                 # This file
├── LICENSE                   # MIT
└── CHANGELOG.md              # Version history
```

---

## Development Status

### Phase 1: Foundation ✅
- [x] Plugin scaffold (plugin.json, config, LICENSE, CHANGELOG)
- [x] Directory structure (16 skill dirs + core/)
- [x] 8 initial skills converted with full detail preservation
- [x] Python scripts (5 files with OUTPUT_DIR fix)
- [x] Templates (14 files in core/templates/)
- [x] Hooks & subagent
- [x] ROADMAP.md

### Phase 2: New Skills ✅
- [x] 8 new skills implemented from scratch (init, list, switch, add-category, configure-sanitization, check-sensitive, link-issue, status)

### Phase 3: Examples + Docs ✅
- [x] 10 Lesson learned examples with reference tracking
- [x] 3 Knowledge graph sample entries
- [x] 2 Architecture Decision Record (ADR) examples
- [x] 1 Complex Meta-Issue implementation saga example
- [x] 6 Core documentation files (Architecture, Patterns, Workflows, Sanitization, etc.)
- [x] All ~30 generalized examples completed

### Phase 4: MCP Server ✅
- [x] 7 Core tools implemented (init, list, switch, add-category, scaffold, search, sanitization)
- [x] MCP server scaffolded and built
- [x] 2 Resources implemented (config, templates)

### Phase 5: Sanitization & Publishing (In Progress)
- [x] Sanitization Checklist (8 Categories implemented)
- [ ] Full sanitization pass, testing, extraction, publication

---

## Design Principles

### Framework vs. Content
- **Plugin provides:** Structure, templates, automation, best practices
- **Users provide:** Their own lessons, patterns, insights
- **Examples:** Illustrative only, not prescriptive

### Privacy by Default
- No personal information in examples
- No sensitive data in templates
- Sanitization tools for user content
- Clear privacy guidelines

### Abstraction & Generalization
- Patterns, not specifics
- Generic terminology
- Reusable insights
- Collaboration-friendly

---

## Portability Strategy

**Core + Automation Architecture:**
- **Core** (`core/`) — Pure markdown, works with ANY LLM
- **Automation** (commands, hooks) — Claude Code specific

**For non-Claude users:**
1. Copy `core/` to your project
2. Follow manual workflows in `core/docs/WORKFLOWS.md`
3. Use templates directly
4. Optionally use MCP server standalone

**Platform adaptation:**
- Continue.dev: Create commands using core templates
- Cursor: Create rules referencing core patterns
- Aider: Create scripts populating core structure
- Local LLMs: Use core templates with system prompts

See: `core/docs/PLATFORM-ADAPTATION.md` (Phase 3)

---

## Contributing

This plugin is under active development. Contributions welcome after Phase 5 (publication).

---

## License

MIT License - See [LICENSE](LICENSE)

---

## Links

- **Plans:** [docs/plans/](docs/plans/) — Phase 1-5 implementation roadmap
- **Master Plan:** [docs/plans/v9.5.0-master-plan.md](docs/plans/v9.5.0-master-plan.md)
- **Source:** Originally extracted from a production Claude Code project

---

**Created:** 2026-02-12
**Current Phase:** Phase 5 - Sanitization & Publishing
**Next Milestone:** Integration testing and GitHub publication
