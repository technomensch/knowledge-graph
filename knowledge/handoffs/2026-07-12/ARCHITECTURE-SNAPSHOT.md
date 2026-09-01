# Architecture Snapshot

**Snapshot Date:** 2026-07-12
**Current Release:** v0.6.18 (plugin/package), mcp-server at v0.6.15 (out of sync — see Version Strategy)

---

## Project Purpose

Knowledge management plugin for Claude Code: capture, organize, and retrieve institutional knowledge across projects.

---

## Directory Structure

```
knowledge-graph/
├── commands/              🔒 PROTECTED — Slash commands (/kmgraph:...)
├── skills/               — Auto-triggered context providers
├── agents/               — Subagent definitions for heavy-lift tasks
├── hooks/                — SessionStart automation (hooks.json)
├── mcp-server/            — Cross-platform MCP server (TypeScript/Node.js)
├── core/                 🔒 PROTECTED — Templates, examples, docs
│   ├── templates/        — YAML frontmatter structures
│   ├── examples/         — Reference implementations
│   └── scripts/          — Python extraction utilities
├── docs/                 — MkDocs Material documentation site
│   ├── reference/        — Commands, skills, agents, hooks, templates
│   ├── guides/           — How-to guides
│   ├── specs/            — Design specs (e.g. kg-config location refactor)
│   ├── quickstart.md
│   ├── CHEAT-SHEET.md
│   ├── plans/            — Implementation plans (gitignored)
│   ├── sessions/         — Session summaries (gitignored)
│   └── chat-history/     — Extracted chat logs (gitignored)
├── knowledge/            — Knowledge graph (sessions, decisions, lessons, enhancements, issues)
│   ├── decisions/        — Architecture Decision Records (ADRs)
│   ├── lessons-learned/  — Lessons by category
│   ├── sessions/         — Session summaries
│   ├── enhancements/     — Enhancement specs (ENH-NNN/)
│   └── issues/           — Issue-tracking working files (issue-N/)
├── CLAUDE.md             — Project conventions and rules
├── .claude/              — Claude Code configuration
├── README.md             — Project overview
├── package.json          — Plugin version and dependencies
└── .claude-plugin/       — Plugin manifest
```

---

## Architectural Principles

1. **Modular KG system** — Multi-KG support with active/inactive switching
2. **Layered documentation** — Commands (CLI), Skills (context), Agents (heavy-lift)
3. **Approval gates** — Subagents wait for user approval before writes
4. **Git-aware** — Preserves commit metadata, branch context, issue links
5. **Privacy-first** — Sessions and chat history never committed to repo

---

## Key Decisions (from ADRs)

Selected recent/high-relevance ADRs (full index in `knowledge/decisions/README.md`, 65 numbered ADRs total):

- **ADR-064 — Shared module pattern for slash command deduplication.** Consolidates repeated logic across commands into shared modules rather than duplicating per-command.
- **ADR-063 — Never destroy known-good state before confirmed write.** Governs atomic-write / backup-aside patterns (informed the kg-config migration work and the v0.6.18 extraction fixes).
- **ADR-062 — Gemini `.pb` project scoping fails closed.** Established fail-closed behavior for Gemini/Antigravity project-hash scoping (ENH-044).
- **ADR-061 — First-run repair notice is platform-specific, not unified.** Cross-platform repair UX must diverge per platform rather than share one notice.
- **ADR-060 — Narrow KG search scope away from raw chat history.** Keeps `kg_search` from indexing raw `.jsonl` chat logs.
- **ADR-059 — No hardcoded derivable counts in plans.** Counts (ADR totals, lesson totals, etc.) must be computed at generation time, not hardcoded — directly informed how this handoff package's counts were generated.
- **ADR-058 — Naming/scope upfront check for new commands/skills/docstrings.** Requires an explicit naming/scope check before adding new commands or skills.
- **ADR-057 — Detection layer requires unified design, not piecemeal growth.** Governance/detection logic (e.g. lesson-capture triggers) must be designed holistically.
- **ADR-056 — Reject plugin split for contributor-only doc commands.** Decided against splitting the plugin for doc-only commands.
- **ADR-001 — Centralized multi-KG configuration.** Foundational decision for the active/inactive multi-graph config model (currently being touched by the in-flight kg-config location migration — see Recent Architecture Changes).

---

## Code Protection Rules

**🔒 PROTECTED DIRECTORIES** (require explicit permission):
- **commands/** — Contains LLM execution prompts; changes break slash commands
- **core/default-templates/** — Structured YAML formats; changes break parsing

**✅ Allowed Modifications** (no permission needed):
- Documentation files (*.md)
- Test files and examples
- Template comments and field glossaries

---

## Naming Conventions

### Branch Names
- Feature: `v{ver}-{description}` (e.g., v0.0.9.1-alpha-claude-md)
- Bug fix: `v{ver}-fix-{description}` (e.g., v0.0.8.7.3-alpha-fix-installer-page)
- Docs site only: `docs-update-{description}` (e.g., docs-update-command-guide) — no version prefix
- Chained branches must branch from their parent branch, not main (e.g., a `.2` branch from a `.1` branch); verify the parent is fully committed before branching a child.

### Commit Format
```
type(scope): subject

[bullet summary of changes]

Closes #[issue-number]

Co-Authored-By: Claude [Model] <noreply@anthropic.com>
```

Types: `feat` | `fix` | `docs` | `refactor` | `chore` | `perf` | `style` | `test` | `build` | `ci` | `revert`

### Skills & Agents
- Skills: Lowercase, kebab-case (e.g., kmg-lesson-capture, kmg-auto-recall)
- Agents: kebab-case file names in `agents/` (e.g., knowledge-extractor.md, session-documenter.md)

---

## Version Strategy

**Current versions (live, checked 2026-07-12):**
- `package.json`: 0.6.18
- `.claude-plugin/plugin.json`: 0.6.18
- `mcp-server/package.json`: 0.6.15 — **not yet synced** to 0.6.18. mcp-server is versioned independently by design, but this particular gap is a known pending cleanup item (tracked as step "c3" in the current session's plan), not an intentional divergence.

**Versioning:**
- package.json + plugin.json kept in sync before pushing a release
- mcp-server versioned independently (may lag or lead the plugin version)
- Version consistency required across: package.json, plugin.json, README.md; mcp-server checked separately

---

## Recent Architecture Changes

Work in progress on branch `v0.6.18-misc-patches` (8 commits ahead of `main`, not yet pushed) — full detail in the linked session summary (`knowledge/sessions/2026-07/2026-07-12-2026-07-11-main.md`):

1. **Fixed `getProjectRoot()` KG_MISMATCH bug** (issue-10) — root-cause and patch documented in `knowledge/issues/issue-10/`.
2. **Migrated `kg-config.json` to a platform-neutral default location** (`~/.kmgraph/`) — design spec at `docs/specs/2026-07-11-kg-config-location-refactor-design.md`, now `status: implemented`, verified via a two-cycle Fable-review/Opus-fix process.
3. **Discovered and documented two governance-pattern gaps**, not yet implemented:
   - **issue-11** — GitHub-issue-sync scan invariant.
   - **issue-12** — `kmg-execute-plan` needs a platform guard to scope certain protocol steps to Gemini/Antigravity only.
4. **Pending follow-up steps** (not yet executed as of this snapshot): c3 (mcp-server version sync — see Version Strategy above), c4 (status-flip cleanup), c5 (issue-11 scan script + issue-12 platform guard implementation).
5. **OPEN, UNRESOLVED: `kg_config_switch` test coverage quality.** A Haiku subagent added `mcp-server/tests/config-switch-legacy.test.ts` (4 tests, reported passing) for the c2 kg-config location refactor, but on direct review the tests call `readConfig()`/`writeConfig()` and reimplement the switch logic inline rather than exercising `kg_config_switch`'s real handler in `mcp-server/src/tools/config.ts` — a bug in the actual handler would go undetected. Root cause: `config.ts` has no exported, directly-testable handler (unlike `upgrade.ts`'s `handleUpgrade()`). Decision not yet made: (a) extract an exported `handleConfigSwitch()` for real testability, or (b) accept directional-only coverage and proceed to c3. `config-switch-legacy.test.ts` remains on disk, untracked, unfixed. Blocks/adjacent to c3 — resolve before treating c3 as a clean start.

   **RESOLVED (commit `015d660f`):** Option (a) chosen. Extracted an exported `handleConfigSwitch()` in `mcp-server/src/tools/config.ts` (mirroring `upgrade.ts`'s `handleUpgrade()` pattern) and rewrote `config-switch-legacy.test.ts` to call it directly, with a genuinely verified RED/GREEN cycle and a new error-path test for a missing target graph. Full suite 144/144 passing, `tsc --noEmit` clean. c3 can now be treated as a clean start.

For operational detail, open issues, and exact next steps, see the session summary linked from START-HERE.md.
