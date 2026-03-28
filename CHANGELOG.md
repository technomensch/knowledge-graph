# Changelog

All notable changes to KMGraph are documented here. Version format follows [Semantic Versioning](https://semver.org/).

---

## [0.2.1-beta] — 2026-03-27

**TL;DR:** Four-layer architecture refactor — thin commands + 8 agents + lifecycle hooks + MCP auto-registration. Reduced command complexity by 65-80% (thick 200-950 line commands → thin 80-150 line dispatchers). Introduced automated knowledge capture via lifecycle hooks.

### Added

- **Four-layer architecture** — Context Layer (skills), Logic Layer (agents), Lifecycle Layer (hooks), Data Layer (MCP)
  - Separates concerns: skills detect moments, agents own execution logic, hooks automate at the right time, MCP handles persistence
  - Enables platform portability — agents are plain markdown, usable by any LLM

- **8 Agent implementations** (3 original + 5 new)
  - `lesson-capture-agent` — Real-time lesson capture with git metadata + similar-lesson check
  - `session-summary-agent` — Session summaries with open plans, pending ADRs, lesson-worthy commits tracking
  - `recall-agent` — Natural-language knowledge graph search with conversational formatting
  - `platform-sync-agent` — Cross-platform configuration file management (Gemini, Cursor, Windsurf, Continue.dev)
  - `mcp-setup-agent` — IDE detection + MCP server registration + connection testing + retry logic
  - `sync-all-agent` — Extracted execution logic from thick `sync-all.md` command
  - `create-adr-agent` — Architecture Decision Record creation wizard

- **Lifecycle hook suite** — Automated knowledge capture without user invocation
  - **SessionStart** — Display recent lessons, check for stale MEMORY.md, offer sync
  - **PostToolUse** (File writes) — Detect lesson-worthy changes, suggest capture
  - **Stop** (Session end) — Prompt for session summary, check for open plans/ADRs
  - **PreToolUse** (Git commit) — Check for undocumented lesson-worthy commits before committing
  - **Notification** — Optional webhook/Slack dispatch on lesson/ADR save

- **MCP auto-registration** — Detects installed AI tools (Gemini CLI, Cursor, Windsurf, Continue.dev, VS Code, Claude Code) and auto-configures MCP connections with retry logic

- **AGENTS-template.md** — Platform-agnostic agent behavior specification for non-Claude Code LLMs (Gemini CLI, Cursor, etc.)

- **KG/CWD alignment guard** — lesson-capture-agent and session-summary-agent block writes if active knowledge graph doesn't match current project directory (prevents cross-project knowledge leakage)

- **Write tool clarity** — Documented distinction: new files use Write directly; existing files need Read first (prevents circular reasoning about tool semantics)

### Changed

- **Command refactoring** — 3 high-value commands reduced from 200-950 lines to 80-153 lines
  - `capture-lesson.md` — 710 → 108 lines (thin dispatcher + guided UX)
  - `recall.md` — 437 → 79 lines (thin dispatcher + guided UX)
  - `session-summary.md` — 595 → 80 lines (thin dispatcher + guided UX)
  - `sync-all.md` — 263 → 151 lines (thin dispatcher)
  - `update-graph.md` — 951 → 153 lines (thin dispatcher with 6 preserved flags)

- **Skill modernization** — Updated to reflect agent-dispatch pattern
  - `lesson-capture` — Pre-structures context before dispatching to lesson-capture-agent
  - `kg-recall` — Dispatches to recall-agent instead of suggesting command invocation
  - `session-wrap` — Triggers Stop hook behavior with multi-signal detection (open plans, pending ADRs, lesson-worthy commits)
  - `adr-guide` — Dispatches to create-adr-agent for lightweight ADR creation
  - `gov-execute-plan` — Maintained as skill-only (behavioral constraint needs conversation context)

- **Documentation pattern** — Established "Update + Deprecate" strategy for breaking changes
  - Deprecated sections marked with clear migration paths
  - Three-phase lifecycle: Deprecation (v0.X.0) → Cleanup (v0.X+1.0) → Removal (v0.X+2.0)
  - See `/kmgraph:update-doc` command for full deprecation guidelines

- **Namespace cleanup** — Migrated all `/knowledge:` references to `/kmgraph:` (33 references across 9 files)

### Fixed

- **Plan language ambiguity** — Explicit "Create" vs "Update" distinction in implementation plans prevents token waste on file-existence checks
  - "Create `filename` (new file — does not exist)" for new files
  - "Update `filename`" for existing files

- **Feedback consistency** — Corrections to execution approach now propagate across all dependent parallel work, not just the immediate next task

- **Plan file confusion** — Clarified that `docs/plans/` is gitignored and local-only; work in `~/.claude/plans/`, copy to `docs/plans/` for reference only

### Deprecated

> ⚠️ **DEPRECATED (v0.2.1-beta):** Thick command pattern (200+ lines all-in-one implementation)
>
> **Reason:** Four-layer architecture with thin commands + agents reduces code duplication and improves maintainability across platforms.
>
> **Migration path:** Old thick command → Thin dispatcher (80-150 lines) + Agent in `agents/` with execution logic. Use `/kmgraph:create-agent` to scaffold new agents.
>
> **Removal timeline:** Scheduled for removal in v0.3.0 (Q3 2026)
>
> **Affected users:** Anyone maintaining custom commands or extending KMGraph with new commands should adopt thin-command + agent pattern.

### Test Coverage

- All 9 test suites passing (MCP connectivity, commands, skills/agents, hooks, extraction)
- 20 end-to-end verification tests (KG/CWD guard, FTS5 searchability, MCP auto-registration, fallback guarantees)
- No performance regression (< 5% overhead vs v0.2.0)

### Known Limitations

- MCP server binary registration per-IDE (Gemini CLI, Cursor, Windsurf, etc.) — auto-registration in Phase 1 of v0.2.1-beta; manual fallback available
- User-level global knowledge graphs deferred to v0.2.2 (requires multi-KG search enhancements + SessionStart context awareness)

### Breaking Changes

- None — All changes are additive. v0.2.0 workflows remain fully compatible.
- Old thick-command pattern is deprecated but functional; migration path documented above.

---

## [0.2.0-alpha] — [Previous Release Notes]

*See git history for v0.2.0-alpha and earlier releases.*

---

**Questions?** See [COMMAND-GUIDE.md](docs/COMMAND-GUIDE.md) for command details, [CONCEPTS.md](docs/CONCEPTS.md) for architecture overview, or run `/kmgraph:help` for interactive guidance.
