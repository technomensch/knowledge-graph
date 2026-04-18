# Knowledge Management Graph for Claude Code

Structured knowledge capture, lesson-learned documentation, and cross-session memory for Claude Code projects.

**Version:** 0.4.2-beta
**Status:** Beta Release — Bug fix: triggers.md now seeded during both project and personal KG init

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

See [Getting Started Guide](docs/GETTING-STARTED.md) for prerequisites and troubleshooting.

---

## Commands (23 Total)

**Quick Reference**: See [CHEAT-SHEET.md](docs/CHEAT-SHEET.md) for one-page quick reference guide
**Detailed Guide**: See [COMMAND-GUIDE.md](docs/COMMAND-GUIDE.md) for comprehensive command documentation with learning paths

### 🟢 Essential Commands (Start Here)

- `/kmgraph:init` — Initialize new knowledge graph with wizard-based setup
- `/kmgraph:capture-lesson` — Document lessons learned with git metadata tracking
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

### 🔴 Advanced Commands (Power Features)

- `/kmgraph:meta-issue` — Initialize meta-issue tracking for complex multi-attempt problems
- `/kmgraph:start-issue-tracking` — Initialize issue tracking with structured docs and Git branch
- `/kmgraph:update-issue-plan` — Sync knowledge graph → plan → issue → GitHub
- `/kmgraph:link-issue` — Manually link existing lesson or ADR to GitHub issue
- `/kmgraph:archive-memory` — Archive stale MEMORY.md entries to prevent bloat
- `/kmgraph:restore-memory` — Restore archived MEMORY.md entries
- `/kmgraph:sync-all` — Automated full sync pipeline (4 steps → 1 command)
- `/kmgraph:handoff` — Create comprehensive handoff documentation for transitions, context limits, or onboarding

---

## v0.4.x Feature Highlights

**v0.4.2-beta — 2026-04-18**

- **`triggers.md` seeded during init** — Fixed two bugs where `triggers.md` (the platform-agnostic rule-timing companion to `rules.md`) was never created during fresh init. `template-seed` now includes it in the root scaffold copy block; personal KG creation now seeds `~/.kmgraph/triggers.md` from the template (previously targeted wrong path `{KG_PATH}/triggers.md`).

**v0.4.1-beta — 2026-04-16**

- **Dependency vulnerability gate** — Pre-PR rule and trigger that stops pushes on unacknowledged Dependabot alerts, presents a findings table, and requires explicit approval. Project `knowledge/rules.md` and `CLAUDE.md` are the acknowledged-risk register.
- **hono override `>=4.12.12`** (mcp-server) — Forces upgrade from 4.12.8 via `@modelcontextprotocol/sdk` transitive chain.
- **follow-redirects override `>=1.16.0`** (root) — Resolves auth header leak (GHSA-r4q5-vmmm-2653) in the Docusaurus → webpack-dev-server → http-proxy chain.

**v0.4.0-beta — 2026-04-16**

- **`stuck-work-escalation` skill** — Auto-escalates stuck work at 3 attempts or 30 min: Opus diagnosis gate reviews all logged attempts and proposes a fresh hypothesis. At 5 attempts, forces a structured exit-path decision (Continue / Defer / Workaround / Descope / Rescope / User decision required) before any further work proceeds.
- **`docs-impact-scan` skill** — Pre-PR docs discovery layer. Fires on "push to origin", "open PR", "create PR", "finishing up", and "ready to push". Reads `git diff main...HEAD`, extracts changed identifiers, greps scoped docs, always surfaces obvious files (README.md, INSTALL.md, CHANGELOG.md, COMMAND-GUIDE.md), checks KG patterns for learned corrections, validates the list with the user, then dispatches `/kmgraph:update-doc --user-facing` for each confirmed file.
- **`--log-attempt` variant for `/kmgraph:meta-issue`** — Enforces a distinct hypothesis before each attempt; reminds the user to invoke `stuck-work-escalation` at attempt 3+.
- **Exit-path fields in meta-issue attempt template** — Hypothesis, distinct-from-prior, success-criterion, and exit-path checklist added to every attempt scaffold.

**v0.3.4-beta — 2026-04-10**

- **`rules-capture` skill** — Detects implicit behavioral corrections ("always X", "never X", "from now on X", "I prefer X") mid-session and offers to write them to one of four authoritative targets: `knowledge/rules.md` (project rule), `knowledge/me.md` (project personal), `~/.kmgraph/rules.md` (personal rule), or `~/.kmgraph/me.md` (personal style). Suggestion appended inline with 4-target shortcut menu.
- **`rules-capture-agent`** — Dedup check, house-style draft (Always/Never + Why/Source), Approve/Edit/Discard loop, atomic write, and MEMORY.md pointer stub.
- **MEMORY.md feedback backfill** — `/kmgraph:init` upgrade flow now offers to migrate behavioral rules from MEMORY.md feedback entries into `knowledge/rules.md` with per-entry preview and confirmation.

**v0.3.3-beta — 2026-04-10**

- **Obsidian wiki link pass** — `/kmgraph:init` and `/kmgraph:init-personal-kg` automatically convert bare cross-references (`ENH-010`, `ADR-028`, `#123`, `Lessons_Learned_X`) to `[[wiki link]]` format for Obsidian graph navigation and backlink tracking
- **ADR collision-safe links** — Pre-pass filename map ensures `[[ADR-028-full-title]]` is always emitted (never ambiguous bare `[[ADR-028]]`); collision detection warns and skips when two files share a number
- **Atomic writes + idempotency** — Temp-file + rename pattern prevents truncation on crash; `wiki_pass_complete` config flag makes re-runs no-ops

**v0.3.2-beta — 2026-04-10**

- **Draft-and-approve UX** — Lesson capture and ADR creation now extract full context from the conversation, generate a complete draft silently, then present Approve / Edit / Discard flow — no wizard required
- **init-shared module layer** — Five reusable shared modules extracted; `/kmgraph:init` and `/kmgraph:init-personal-kg` refactored to thin orchestrators
- **Cross-branch collision detection** — ADR and ENH number collision checks across all branches before assignment

**v0.3.1-beta — 2026-04-10**

- **init-shared module layer** — Five reusable shared modules extracted into `commands/init-shared/`; `/kmgraph:init` and `/kmgraph:init-personal-kg` refactored to thin orchestrators eliminating duplicated scaffold, template-seed, FTS5-rebuild, config-write, and upgrade-inspector logic
- **upgrade-inspector hardening** — Trimmed to only check verifiable steps; phantom parameter removed; `{preserve_active}` param restored

**v0.3.0-beta — 2026-04-10**

- **Default KG path → `knowledge/`** — New projects initialize at `./knowledge/` instead of `./docs/` to avoid collision with documentation site roots
- **Guided migration** — Opt-in migration from `docs/`-based layouts with symlink guard, rollback, and cross-reference rewrite
- **me.md + rules.md scaffold** — Identity and behavioral convention files scaffolded at init; `rules.md` supports `Why:` and `Source:` evidence backlinks

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

See [ROADMAP.md](ROADMAP.md) for detailed version history and development progress.

**Current Release:** v0.4.2-beta (2026-04-18)
- ✅ triggers.md seeded during init — fixed missing scaffold in project KG and wrong-path bug in personal KG creation
- ✅ Dependency vulnerability gate — pre-PR Dependabot check with findings table and approval gate
- ✅ hono override >=4.12.12 + follow-redirects override >=1.16.0 — security patches
- ✅ Stuck-work escalation — Opus diagnosis gate at 3 attempts, mandatory exit-path decision at 5
- ✅ Docs impact scan — pre-PR docs discovery, KG pattern learning, update wizard dispatch
- ✅ `--log-attempt` meta-issue variant with hypothesis enforcement
- ✅ Exit-path fields in meta-issue attempt template
- ✅ Behavioral rule live-capture — `rules-capture` skill + agent with 4-target routing
- ✅ Obsidian wiki link pass with ADR collision detection and atomic writes
- ✅ Draft-and-approve UX for lesson capture and ADR creation
- ✅ init-shared module layer — thin command orchestrators with shared modules
- ✅ `knowledge/` default path with guided migration from `docs/`-based layouts
- ✅ me.md + rules.md scaffold with Why/Source evidence backlinks
- ✅ Personal KG support with `/kmgraph:init-personal-kg`
- ✅ FTS5 full-text search with native SQLite3 WASM
- ✅ MCP server with full cross-platform support (Cursor, Windsurf, Continue.dev, JetBrains, VS Code)
- ⚠️ Beta status: API subject to breaking changes before v1.0.0 stable

**Recent Versions:**
- v0.4.2-beta (Apr 18): Bug fix — triggers.md seeded during both project and personal KG init
- v0.4.1-beta (Apr 16): Security patch — vulnerability gate, hono + follow-redirects dependency overrides
- v0.4.0-beta (Apr 16): Stuck-work escalation skill, docs-impact-scan skill, --log-attempt meta-issue variant
- v0.3.4-beta (Apr 10): Behavioral rule live-capture, rules-capture skill + agent, 4-target routing
- v0.3.3-beta (Apr 10): Obsidian wiki links, ADR collision detection, atomic writes, personal KG pass
- v0.3.2-beta (Apr 10): Draft-and-approve UX, init-shared modules, cross-branch collision detection
- v0.3.1-beta (Apr 10): init-shared module extraction, upgrade-inspector hardening
- v0.3.0-beta (Apr 10): Default path `knowledge/`, guided migration, me.md/rules.md scaffold

**Next:** v0.4.x — Expanded wiki link coverage (kebab-case lesson files), automated knowledge graph extraction improvements

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
- Commands use `kmgraph:` prefix with colon
- Try restarting Claude Code

### Common Issues

**"Duplicate hooks file detected"** — Already fixed in v0.0.1-alpha

**Templates not found** — Ensure `core/templates/` exists and plugin loaded from correct directory

**Git metadata missing** — Commands must run from a git repository

---

## Contributing

This plugin is under active development. Contributions welcome after Phase 5 (publication).

---

## License

MIT License - See [LICENSE](LICENSE)

---

**Created:** 2026-02-12
**Current Phase:** Beta Release Cycle (v0.4.2-beta)
**Next Milestone:** v0.4.x — Expanded wiki link coverage and automated knowledge graph extraction improvements

📚 **Full documentation:** https://kmgraph.stayinginsync.info
