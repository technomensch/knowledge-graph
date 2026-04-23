# Knowledge Management Graph for Claude Code

Structured knowledge capture, lesson-learned documentation, and cross-session memory for Claude Code projects.

**Version:** 0.5.3
**Status:** Actively developed and in daily use

Documentation: https://kmgraph.stayinginsync.info

Buy me a coffee if you find this useful - https://buymeacoffee.com/technomensch

---

## What is this?

This is a platform-agnostic knowledge graph that was developed entirely using Gemini and Claude, leveraging very specific context and detailed natural language prompting.

It is designed to take chat sessions with large language models (LLMs) and turn them into a searchable, institutional knowledge library.

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

See the [Quickstart](docs/quickstart.mdx) for prerequisites and troubleshooting.

## Upgrading

Pull the latest version and run `/kmgraph:init` in any project that uses it. The upgrade wizard checks what has changed, previews any updates to existing files, and asks for confirmation before writing, or changing, anything. Existing knowledge graph content is never overwritten.

---

## Commands

**Quick Reference**: See [CHEAT-SHEET.md](docs/CHEAT-SHEET.md) for one-page quick reference guide
**Detailed Guide**: See [COMMAND-GUIDE.md](docs/COMMAND-GUIDE.md) for comprehensive command documentation with learning paths

### 🟢 Essential Commands (Start Here)

- `/kmgraph:init` — Initialize new knowledge graph with wizard-based setup
- `/kmgraph:capture-lesson` — Document lessons learned with git metadata tracking
- `/kmgraph:create-adr` — Create an Architecture Decision Record with automatic implementation commit capture
- `/kmgraph:status` — View active knowledge graph info and quick reference
- `/kmgraph:recall` — Search across all memory systems (lessons, decisions, knowledge)

### 🟡 Intermediate Commands (Once Comfortable)

- `/kmgraph:update-graph` — Extract knowledge graph entries from lessons
- `/kmgraph:add-category` — Add a new category to existing knowledge graph
- `/kmgraph:session-summary` — Create summary of current chat session
- `/kmgraph:list` — Display all configured knowledge graphs
- `/kmgraph:switch` — Change active knowledge graph
- `/kmgraph:check-sensitive` — Scan knowledge graph for potentially sensitive information
- `/kmgraph:config-sanitization` — Interactive wizard for pre-commit hook setup
- `/kmgraph:extract-chat` — Extract chat history from Claude and Gemini logs
- `/kmgraph:update-doc` — Update plugin/project documentation (`--user-facing`) or KG content
- `/kmgraph:init-personal-kg` — Initialize a personal knowledge graph at `~/.kmgraph/` shared across all projects

### 🔴 Advanced Commands (Power Features)

- `/kmgraph:meta-issue` — Initialize meta-issue tracking for complex multi-attempt problems
- `/kmgraph:start-issue-tracking` — Initialize issue tracking with structured docs and Git branch
- `/kmgraph:update-issue-plan` — Sync knowledge graph → plan → issue → GitHub
- `/kmgraph:link-issue` — Manually link existing lesson or ADR to GitHub issue
- `/kmgraph:sync-all` — Automated full sync pipeline (4 steps → 1 command)
- `/kmgraph:handoff` — Create comprehensive handoff documentation for transitions, context limits, or onboarding

---

## v0.5.x Feature Highlights

**v0.5.3 — 2026-04-23**

- **`extract-chat` now handles large export days automatically** — Prior to this update, lengthy chat-history files were causing Obsidian indexing to crash the vault.  After this update, exports exceeding 900 KB or 30,000 lines are split into `YYYY-MM-DD/`files. Boundaries respect message boundaries so no message is split mid-content.
- **`update-doc` no longer silently skips README and CHANGELOG** — After updating any Tier 1 doc with `--user-facing`, the command now prompts to continue with remaining Tier 1 files in order. Previously, targeting a specific file bypassed the full release sweep entirely.
- **KG-mismatch guardrails added to `create-adr` and `capture-lesson`** — Both commands now block writes when the active knowledge graph does not match the current working directory, preventing accidental cross-project entries.
- **New `update-profile` skill** — Auto-triggered when updating user profile files (`me.md`), guiding the update through a structured prompt flow (ADR-045).

**v0.5.2 — 2026-04-21**

- **Model configuration is now future-proof** — Instead of hardcoding specific model names in `me.md`, commands and agents now reference tier labels (`fast-tier`, `standard-tier`, `powerful-tier`). When a model gets updated or renamed, only one place needs to change. Getting started is straightforward: run `/kmgraph:init` and the wizard walks through tier mapping interactively, discovers any locally running Ollama or LM Studio instances automatically, and pre-populates `~/.kmgraph/me.md` with working defaults so no manual edits are needed. Upgrading works the same way — the upgrade wizard offers the same interactive walkthrough after relocating platform config. For full manual control, add a `platforms[]` block directly to `me.md`. Unrecognized model values surface a warning instead of silently failing.
- **ADRs now record where and when decisions were implemented** — When creating an ADR, the wizard automatically captures the commit and subject line so there is always a traceable link back to the implementation. No more guessing when or where something was decided.
- **Rules from `rules.md` are now enforced automatically** — A new PreToolUse hook checks `rules.md` before certain tools run, so behavioral rules don't have to be re-stated every session.
- **New projects get better default rules out of the box** — The `rules.md` template now seeds parallelism analysis and skill override rules automatically during init, giving new knowledge graphs a more useful starting point.
- **Bug fix: `extract-chat` was creating duplicate entries** — Timestamp comparison during dedup was broken, causing the same chat sessions to appear multiple times. Fixed.
- **`archive-memory` and `restore-memory` removed** — Both commands are no longer needed. Behavioral rules, identity, and working style now live in dedicated files (`me.md`, `rules.md`, `triggers.md`), making memory modular. Each file stays focused and can be split further as the project grows, removing the need to archive and restore from a single large MEMORY.md.

**v0.4.x Feature Highlights** *(2026-04-16 to 2026-04-18)*

- **Stuck on a bug? The plugin now helps get unstuck** — After 3 attempts or 30 minutes on the same problem, the `stuck-work-escalation` skill kicks in, reviews what has been tried, and proposes a fresh approach. At 5 attempts it requires a decision before continuing — useful for avoiding rabbit holes.
- **Docs are now checked automatically before a PR** — The `docs-impact-scan` skill runs before pushing and identifies which documentation files need updating based on what changed in the code. It then dispatches the update wizard for each confirmed file.
- **Meta-issue tracking improved** — Each attempt on a complex problem now requires a distinct hypothesis before starting, making it easier to track what was tried and why.
- **Security: stops pushes when known vulnerabilities are unacknowledged** — A pre-PR check now surfaces any open Dependabot alerts before a push goes through. Users see a findings table and must explicitly approve before proceeding.
- **Dependency security patches** — Two transitive dependency vulnerabilities patched in the MCP server and docs toolchain. No user action required.
- **Bug fix: `triggers.md` was missing after a fresh init** — Two bugs caused `triggers.md` to never be created during new project and personal KG setup. Both are fixed. If `triggers.md` is missing from an existing KG, re-running `/kmgraph:init` will create it.

**v0.3.x — Major Architectural Change** *(2026-04-10)*

> **Existing setups:** Migration to `knowledge/` is optional. Your `docs/`-based setup continues to work as-is. A guided wizard is available if you want to migrate.

- **Knowledge graph now lives at `knowledge/` by default** — New projects initialize at `./knowledge/` instead of `./docs/` to avoid conflicts with documentation site roots. Existing `docs/`-based setups can migrate with a guided wizard that handles symlinks, rollbacks, and cross-reference rewrites.
- **`me.md` and `rules.md` are now scaffolded automatically** — These identity and convention files are created during init. Rules support optional `Why:` and `Source:` annotations so the reasoning behind each rule stays with the rule.
- **Lesson capture and ADR creation no longer require a full wizard** — Both commands now draft the content silently from conversation context and present an Approve / Edit / Discard flow instead. Faster and less interruption.
- **Behavioral rules now get captured mid-session** — When a correction is made ("always X", "never do Y again"), the `rules-capture` skill detects it and offers to write it to the right place — project rules, personal rules, or identity files. No more losing good workflow corrections at the end of a session.
- **Obsidian users: cross-references now work as wiki links** — ADRs, lessons, and issues referenced in the knowledge graph are automatically converted to `[[wiki link]]` format so Obsidian graph navigation and backlinks work out of the box.

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
├── commands/                 # Commands (manual invocation)
├── agents/                   # Subagents
├── skills/                   # Auto-triggered context providers
├── hooks/                    # SessionStart hooks
├── scripts/                  # Helper scripts
├── config/                   # Config templates
├── core/                     # Platform-agnostic core
│   ├── templates/            # KG, lessons, ADRs, meta-issues
│   ├── examples/             # ~30 generalized examples
│   ├── scripts/              # Python extraction scripts
│   ├── examples-hooks/       # Pre-commit sanitization
│   └── docs/                 # Documentation
├── mcp-server/               # MCP data layer
├── README.md                 # This file
├── LICENSE                   # MIT
└── CHANGELOG.md              # Version history
```

### Developer vs. Distribution Structure

| Directory    | In git | Distributed | Purpose                          |
|--------------|--------|-------------|----------------------------------|
| `commands/`  | ✅     | ✅          | Claude Code plugin commands — not applicable to other platforms |
| `skills/`    | ✅     | ✅          | Claude Code plugin skills — not applicable to other platforms  |
| `agents/`    | ✅     | ✅          | Claude Code subagents — not applicable to other platforms      |
| `hooks/`     | ✅     | ✅          | Claude Code session hooks — not applicable to other platforms  |
| `core/`      | ✅     | ✅          | Platform-agnostic templates      |
| `scripts/`   | ✅     | ✅          | Hook scripts                     |
| `docs/`      | ✅     | ❌          | Plugin developer knowledge graph |
| `tests/`     | ✅     | ❌          | Internal test suite              |

> **Note:** The `commands/`, `skills/`, `agents/`, and `hooks/` directories are loaded exclusively
> by the Claude Code plugin system. All cross-platform functionality is provided by the MCP server
> (`mcp-server/`) as `kg_*` tools.

---

## Development Status

**Current Release:** v0.5.3 (2026-04-23)

Actively developed and in daily use. Behavior may evolve between minor versions.

See [ROADMAP.md](ROADMAP.md) for detailed version history and development progress.

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

---

## Troubleshooting

### MCP Server Issues

If commands aren't working or MCP tools are unavailable:

1. **Verify MCP server is running:**
   ```bash
   ./tests/test-mcp-direct.sh
   ```
   Should show 12 tools listed.

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
- Commands use `kmgraph:` prefix with colon
- Try restarting Claude Code

### Common Issues

**Templates not found** — Ensure `core/templates/` exists and plugin loaded from correct directory

**Git metadata missing** — Commands must run from a git repository

---

## Contributing

This plugin is under active development. Contributions welcome — open an issue to discuss before submitting a PR.

---

## License

MIT License - See [LICENSE](LICENSE)

---

**Created:** 2026-02-12
**Current Version:** v0.5.3 (2026-04-23)

📚 **Full documentation:** https://kmgraph.stayinginsync.info
