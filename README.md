# Knowledge Graph Plugin for Claude Code

Structured knowledge capture, lesson-learned documentation, and cross-session memory for Claude Code projects.

**Version:** 1.0.0 (Development)
**Status:** Phase 1 - Foundation (In Progress)

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
cd /Users/mkaplan/Documents/GitHub/knowledge-graph-plugin

# Test locally
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

## Skills (16 Total)

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

## Architecture

### Core Design
- **Platform-Agnostic Core** (`core/`) — Works with ANY LLM or IDE
- **Claude Code Automation** (root-level skills, hooks) — Full automation layer
- **MCP Server** (`mcp-server/`) — Cross-platform data access

### Directory Structure
```
knowledge-graph-plugin/
├── .claude-plugin/           # Plugin manifest
├── skills/                   # 16 skills (8 complete, 8 pending)
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

### Phase 1: Foundation ✅ (In Progress)
- [x] Plugin scaffold (plugin.json, config, LICENSE, CHANGELOG)
- [x] Directory structure (16 skill dirs + core/)
- [x] 8 skills converted with full detail preservation
  - [x] capture-lesson (with git metadata)
  - [x] recall (multi-KG support)
  - [x] update-graph (preserves git metadata)
  - [x] sync-all (automated pipeline)
  - [x] update-issue-plan (PR integration)
  - [x] session-summary (smart defaults)
  - [x] extract-chat (OUTPUT_DIR fix)
  - [x] meta-issue (ADR-008 pattern)
- [ ] Python scripts (5 files with OUTPUT_DIR fix)
- [ ] Templates (14 files in core/templates/)
- [ ] Hooks & subagent
- [ ] ROADMAP.md

### Phase 2: New Skills (Pending)
7 new skills from scratch (init, list, switch, add-category, configure-sanitization, check-sensitive, link-issue, status)

### Phase 3: Examples + Docs (Pending)
~30 example files + 10 documentation files

### Phase 4: MCP Server (Pending)
7 tools + 2 resources

### Phase 5: Sanitization & Publishing (Pending)
Full sanitization, testing, extraction, publication

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
- **Automation** (skills, hooks) — Claude Code specific

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
- **Source Project:** [optimize-my-resume](https://github.com/technomensch/optimize-my-resume) (original development)

---

**Created:** 2026-02-12
**Current Phase:** Phase 1 - Foundation
**Next Milestone:** Complete Python scripts + templates
