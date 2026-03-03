# Knowledge Management Graph for Claude Code

Structured knowledge capture, lesson-learned documentation, and cross-session memory for Claude Code projects.

**Version:** 0.1.0-beta
**Status:** Beta Release — First External Testing Phase

Documentation available at - https://technomensch.github.io/knowledge-graph/

Buy me a coffee if you find this useful - https://buymeacoffee.com/technomensch
---

## What is this?

This is a platform-agnostic knowledge graph that was developed entirely using Gemini and Claude, leveraging very specific context and detailed natural language prompting.

It is designed to take chats sessions with large language models (LLMs) and turn them into a searchable, institutional knowledge, library.

The cool thing is, it helps users grab the important stuff (lessons learned, architecture decisions, recurring patterns, etc...) inside the development workflow without having to stop chatting.

Then, users can easily look up that information not only in their current chat, but also in any other chat session, even if they switch to a totally different LLM!

The key lies in the simple approach of embedding the knowledge directly within the project itself. This ensures the knowledge is always immediately available whenever and wherever the project is opened. Should the library become excessively large, users have the option to transfer it to an external third-party via MCP servers.

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

## Quick Install

Paste [INSTALL.md](INSTALL.md) into any AI assistant for automated setup on any platform — Claude Code, Cursor, Windsurf, Continue.dev, JetBrains, VS Code, Aider, or local LLMs.

**Claude Code users:** Run `claude plugin install kmgraph` or load with `claude --plugin-dir /path/to/knowledge-graph`, then run `/kmgraph:init`.

See [Getting Started Guide](docs/GETTING-STARTED.md) for prerequisites and troubleshooting.

---

## Commands (23 Total)

**Quick Reference**: See [CHEAT-SHEET.md](docs/CHEAT-SHEET.md) for one-page quick reference guide
**Detailed Guide**: See [COMMAND-GUIDE.md](docs/COMMAND-GUIDE.md) for comprehensive command documentation with learning paths

### 🟢 Essential Commands (Start Here)

First-time users need these for basic operation:

- `/kmgraph:init` — Initialize new knowledge graph with wizard-based setup
- `/kmgraph:capture-lesson` — Document lessons learned with git metadata tracking
- `/kmgraph:status` — View active knowledge graph info and quick reference
- `/kmgraph:recall` — Search across all memory systems (lessons, decisions, knowledge)

### 🟡 Intermediate Commands (Once Comfortable)

Active users leverage these for regular workflows:

- `/kmgraph:update-graph` — Extract knowledge graph entries from lessons
- `/kmgraph:add-category` — Add a new category to existing knowledge graph
- `/kmgraph:session-summary` — Create summary of current chat session
- `/kmgraph:list` — Display all configured knowledge graphs
- `/kmgraph:switch` — Change active knowledge graph
- `/kmgraph:check-sensitive` — Scan knowledge graph for potentially sensitive information
- `/kmgraph:config-sanitization` — Interactive wizard for pre-commit hook setup
- `/kmgraph:extract-chat` — Extract chat history from Claude and Gemini logs
- `/kmgraph:update-doc` — Update plugin/project documentation (`--user-facing`) or KG content

### 🔴 Advanced Commands (Power Features)

Power users use these for complex workflows:

- `/kmgraph:meta-issue` — Initialize meta-issue tracking for complex multi-attempt problems
- `/kmgraph:start-issue-tracking` — Initialize issue tracking with structured docs and Git branch
- `/kmgraph:update-issue-plan` — Sync knowledge graph → plan → issue → GitHub
- `/kmgraph:link-issue` — Manually link existing lesson or ADR to GitHub issue
- `/kmgraph:archive-memory` — Archive stale MEMORY.md entries to prevent bloat
- `/kmgraph:restore-memory` — Restore archived MEMORY.md entries
- `/kmgraph:sync-all` — Automated full sync pipeline (4 steps → 1 command)
- `/kmgraph:handoff` — Create comprehensive handoff documentation for transitions, context limits, or onboarding

---

## v0.0.10 Feature Highlights

**Released 2026-02-27**

- **5 Auto-Triggered Skills** — Context providers activate automatically: lesson-capture (bug solved), kg-recall (past decisions), session-wrap (context limits), adr-guide (architecture decisions), gov-execute-plan (plan execution)
- **2 Subagents** — Heavy-lift task handlers operating in approval-gated mode: knowledge-extractor (read-only parsing), session-documenter (git archaeology)
- **Optional KG Backfill** — Initialize knowledge graph with automatic extraction from README, CHANGELOG, existing lessons, decisions, and chat history
- **Handoff Command** — Generate comprehensive project transition packages (START-HERE, DOCUMENTATION-MAP, SESSION-COMPILATION, OPEN-ISSUES, ARCHITECTURE-SNAPSHOT)
- **Token Optimization Phase 2** — 46.9% context reduction via skills lazy-loading, subagent delegation for heavy reads, and consolidated automation hooks

---

## ⚠️ Critical: Namespace Visibility & Marketplace Installation

**IMPORTANT DISCOVERY** (Feb 16, 2026):

Namespace visibility in Claude Code works differently for local development vs. marketplace installation.

### Marketplace Installation (Distribution Mode)

When installed via marketplace, Claude Code correctly shows the `/kmgraph:` namespace prefix regardless of filename:

**Command files:**
```
commands/
├── status.md          → Shows as /kmgraph:status in UI ✅
├── init.md            → Shows as /kmgraph:init in UI ✅
├── capture-lesson.md  → Shows as /kmgraph:capture-lesson in UI ✅
```

**Autocomplete behavior:**
- User types `/know` → shows `/kmgraph:status`, `/kmgraph:init`, etc.
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
- `/kmgraph:capture-lesson`
- `/kmgraph:init`
- `/kmgraph:recall`

**For plugin developers:** Choose `commands/` when you want users to have explicit control over when workflows run. Choose `skills/` when you want Claude to autonomously discover and apply capabilities.

---

## Architecture

### Core Design
- **Platform-Agnostic Core** (`core/`) — Works with ANY LLM or IDE
- **Claude Code Automation** (commands, hooks) — Full automation layer
- **MCP Server** (`mcp-server/`) — Cross-platform data access

### Directory Structure
```
knowledge-graph/
├── .claude-plugin/           # Plugin manifest
├── commands/                 # commands (manual invocation)
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
└── docs/CHANGELOG.md         # Version history
```

### Developer vs. Distribution Structure

The root `package.json` `files` allowlist controls what is distributed when the plugin
is installed from the marketplace. Developer-only content in `docs/` is excluded:

| Directory    | In git | Distributed | Purpose                          |
|--------------|--------|-------------|----------------------------------|
| `commands/`  | ✅     | ✅          | Plugin commands                  |
| `skills/`    | ✅     | ✅          | Plugin skills                    |
| `core/`      | ✅     | ✅          | Platform-agnostic templates      |
| `scripts/`   | ✅     | ✅          | Hook scripts                     |
| `docs/`      | ✅     | ❌          | Plugin developer knowledge graph |
| `tests/`     | ✅     | ❌          | Internal test suite              |

---

## Development Status

See [ROADMAP.md](ROADMAP.md) for detailed version history and development progress.

**Current Release:** v0.1.0-beta (2026-03-03)
- ✅ Complete alpha cycle (v0.0.9 through v0.0.11-alpha integrated)
- ✅ Comprehensive pre-beta test suite (113 tests, 9 suites) validating all systems
- ✅ Production fixes (pre-commit sanitization hook bash 3.2 compatible)
- ✅ Skills system fully functional (6 context providers)
- ✅ Subagents operational with governance workflows (3 agents: knowledge-extractor, session-documenter, knowledge-reviewer)
- ✅ KG initialization with optional backfill
- ✅ Complete `/kmgraph:` namespace (no legacy `/knowledge:` references)
- ✅ MCP server auto-installs and upgrades cleanly
- ✅ Comprehensive documentation (CLAUDE.md, GETTING-STARTED, COMMAND-GUIDE, CHEAT-SHEET)
- ⚠️ Beta status: API subject to breaking changes before v1.0.0 stable

**Recent Versions:**
- v0.0.11-alpha (Mar 3): Pre-beta test suite, pre-commit hook bash 3.2 fix
- v0.0.10.4-alpha (Mar 1): MCP node_modules auto-install fix
- v0.0.10-alpha (Feb 27): Skills (5), Subagents (2), KG backfill, handoff
- v0.0.9-alpha (Feb 27): Namespace migration, CLAUDE.md, hook consolidation

**Next:** v1.0.0 stable release — TBD (post-beta feedback cycle)

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
- **MCP Server** (`mcp-server/`) — Cross-platform data access for any MCP-capable IDE

**For non-Claude users:** Paste [INSTALL.md](INSTALL.md) into any AI assistant for automated setup. The installer detects the platform and configures the appropriate components.

See: [Platform Adaptation Guide](core/docs/PLATFORM-ADAPTATION.md) for platform capability comparisons

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

If `/kmgraph:command` doesn't autocomplete:
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

## Documentation

📚 **Lost?** See the [Navigation Index](docs/NAVIGATION-INDEX.md) for complete sitemap and decision trees.

**New users**:
- [Getting Started](docs/GETTING-STARTED.md) - Installation and first steps

**Concepts**:
- [Concepts Guide](docs/CONCEPTS.md) - What is a knowledge graph?
- [Quick Reference](docs/CHEAT-SHEET.md) - One-page cheat sheet

**Command reference**:
- [Command Guide](docs/COMMAND-GUIDE.md) - All commands with learning path
- [Essential Commands](docs/COMMAND-GUIDE.md#essential-commands) - Start here

**Guides**:
- [Configuration](docs/CONFIGURATION.md) - Post-install setup
- [Platform Adaptation](core/docs/PLATFORM-ADAPTATION.md) - Cursor, Continue, Aider, etc.
- [Pattern Writing](core/docs/PATTERNS-GUIDE.md) - Writing effective entries
- [Manual Workflows](core/docs/WORKFLOWS.md) - Non-Claude workflows

**Resources**:
- [Templates](core/templates/) - Starting scaffolds
- [Examples](core/examples/) - Real-world samples

---

**Created:** 2026-02-12
**Current Phase:** Pre-Beta Quality Assurance (v0.0.11-alpha)
**Next Milestone:** v0.1.0-beta release (March 2026) — Comprehensive testing complete, production-ready
