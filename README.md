# Knowledge Graph Plugin for Claude Code

Structured knowledge capture, lesson-learned documentation, and cross-session memory for Claude Code projects.

**Version:** 0.0.2-alpha
**Status:** Validation & Enhancement Release - Testing & Feedback

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

# Install plugin from tm-sis marketplace
/plugin install knowledge@tm-sis
```

> **About the marketplace identifier:** The `tm-sis` marketplace identifier represents "technomensch-stayinginsync" and will host all plugins from this publisher. This allows for a consistent brand identity across multiple plugins.

### Verify Installation (Optional)

After installation, you can verify the MCP server is working:

```bash
# Quick automated test
./tests/test-mcp-direct.sh

# Interactive web-based test
./tests/test-mcp.sh
```

See [tests/README.md](tests/README.md) for detailed testing documentation.

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

## ⚠️ Critical: Namespace Visibility & Marketplace Installation

**IMPORTANT DISCOVERY** (Feb 16, 2026):

Namespace visibility in Claude Code works differently for local development vs. marketplace installation.

### Marketplace Installation (Distribution Mode)

When installed via marketplace, Claude Code correctly shows the `/knowledge:` namespace prefix regardless of filename:

**Command files:**
```
commands/
├── status.md          → Shows as /knowledge:status in UI ✅
├── init.md            → Shows as /knowledge:init in UI ✅
├── capture-lesson.md  → Shows as /knowledge:capture-lesson in UI ✅
```

**Autocomplete behavior:**
- User types `/know` → shows `/knowledge:status`, `/knowledge:init`, etc.
- Namespace prefix is automatically applied by Claude Code
- No filename prefix needed

### Key Insights

1. **File prefix workaround not needed:** Initial testing suggested using `knowledge-*.md` filenames, but marketplace installation handles namespacing correctly with clean base names

2. **Two-location sync for local testing:** When testing locally, changes must be synced from development directory to marketplace cache:
   ```bash
   rsync -av --delete \
     /path/to/plugin/ \
     ~/.claude/local-marketplace/plugins/plugin-name/
   ```

3. **Cross-LLM compatibility:** Shadow command strategies (intentional collisions) fail with non-Claude LLMs like Gemini

### For Plugin Developers

- **Use clean filenames:** `status.md`, not `plugin-status.md`
- **Test via marketplace:** Local testing may not reflect actual user experience
- **Namespace is automatic:** Claude Code applies namespace prefix in Distribution Mode
- **Avoid shadow commands:** They break cross-LLM compatibility

See lessons:
- [docs/lessons-learned/process/local-marketplace-testing-workflow.md](docs/lessons-learned/process/local-marketplace-testing-workflow.md)
- [docs/lessons-learned/debugging/namespace-visibility-shadow-command-failure.md](docs/lessons-learned/debugging/namespace-visibility-shadow-command-failure.md)

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
├── commands/                 # 16 commands (manual invocation)
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

See [ROADMAP.md](ROADMAP.md) for detailed version history and development progress.

**Current Release:** v0.0.2-alpha (2026-02-16)
- ✅ Knowledge Graph Usage Skill (~13,900 words total guidance)
- ✅ Plugin documents itself (2 lessons captured)
- ✅ Marketplace branding: tm-sis identity established
- ✅ Comprehensive validation: 0 critical issues
- ✅ Command filenames optimized (no redundant prefix)
- ✅ 16 commands with automatic namespace handling
- ✅ MCP server with 7 tools + 2 resources
- ✅ Platform-agnostic core system

**What's New in v0.0.2:**
- Autonomous knowledge capture guidance (skill)
- Local marketplace testing workflow documented
- Namespace visibility cross-LLM compatibility lesson
- Plugin validation and quality improvements

**Next:** v1.0.0 stable release (Q2 2026) incorporating alpha feedback

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

## Troubleshooting

### MCP Server Issues

If commands aren't working or MCP tools are unavailable:

1. **Verify MCP server is running:**
   ```bash
   ./tests/test-mcp-direct.sh
   ```
   Should show 7 tools listed.

2. **Check for errors:**
   - Restart Claude Code
   - Verify Node.js is installed: `node --version`
   - Check MCP server build exists: `ls mcp-server/dist/index.js`

3. **Interactive debugging:**
   ```bash
   ./tests/test-mcp.sh
   ```
   Opens web UI to test each tool individually.

See [tests/README.md](tests/README.md) for detailed troubleshooting.

### Command Not Found

If `/knowledge:command` doesn't autocomplete:
- Verify plugin is loaded (check Claude Code plugin list)
- Commands use `knowledge:` prefix with colon (not hyphen)
- Try restarting Claude Code

### Common Issues

**"Duplicate hooks file detected"** - Already fixed in v0.0.1-alpha

**Templates not found** - Ensure `core/templates/` exists and plugin loaded from correct directory

**Git metadata missing** - Commands must run from a git repository

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
