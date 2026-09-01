# Architecture Snapshot

**Snapshot Date:** 2026-08-04
**Current Release:** v0.7.0

---

## Project Purpose

Knowledge management plugin for Claude Code: capture, organize, and retrieve institutional knowledge across projects. Ships as a Claude Code extension (slash commands, skills, agents, hooks) plus a cross-platform MCP server (`kg_*` tools).

---

## Directory Structure

```
knowledge-graph/
├── commands/              🔒 PROTECTED — Slash commands (/kmgraph:...)
├── skills/                — Auto-triggered context providers (16)
├── agents/                — Subagent definitions for heavy-lift tasks (11)
├── hooks/hooks.json       — SessionStart + PostToolUse/PreToolUse/Stop/UserPromptSubmit/Notification automation
├── mcp-server/            — Cross-platform MCP server (TypeScript/Node.js), versioned independently
├── core/                  🔒 PROTECTED — Templates, examples, docs
│   ├── templates/         — YAML frontmatter structures
│   └── examples/          — Reference implementations
├── docs/                  — MkDocs Material documentation site
│   ├── reference/         — Commands, skills, agents, hooks, templates
│   └── guides/            — How-to guides
├── knowledge/             — Knowledge graph (sessions, decisions, lessons, enhancements)
│   ├── decisions/         — Architecture Decision Records (70 ADRs)
│   ├── lessons-learned/   — Lessons by category (process, patterns, architecture, debugging)
│   ├── sessions/          — Session summaries
│   └── enhancements/      — Enhancement specs (ENH-NNN/)
├── CLAUDE.md              — Project conventions and rules
├── .claude/               — Claude Code configuration
├── README.md              — Project overview
├── package.json           — Plugin version (v0.7.0) and dependencies
└── .claude-plugin/        — Plugin manifest (v0.7.0)
```

---

## Architectural Principles

1. **Modular KG system** — Multi-KG support, resolved by cwd rather than a mutable `.active` pointer (see ADR-067 below — this is the headline architecture change of the most recent branch)
2. **Layered documentation** — Commands (CLI), Skills (context), Agents (heavy-lift)
3. **Approval gates** — Subagents wait for user approval before writes
4. **Git-aware** — Preserves commit metadata, branch context, issue links
5. **Privacy-first** — Sessions and chat history never committed to repo

---

## Key Decisions (from ADRs)

**ADR-067 — Mutable `.active` switch vs context-derived KG resolution** (implements/replaces the mechanism formerly covering ADR-1, ADR-19, ADR-60, ADR-66; closes issues #10, #14, #18)
Decision: replace the mutable `.active` KG-config pointer with a `kg_resolve` tool that derives the active KG from the caller's cwd, eliminating a class of silent cross-KG bleed bugs where a stale `.active` pointer caused reads/writes to land in the wrong graph. Fully implemented across 9 phases in branch `v0.7.0-adr-067-c1`, including a whole-branch verification sweep (13 additional issues found: 4 Critical, 9 Important, none from any single per-phase review), pre-push governance fixes (version-sync, KG-index reconciliation, a content-restoration correction after an earlier fix wrongly flagged 4 real lessons as fabricated), then merged via PR #212 → `v0.7.0` → `main`.
**Status caveat:** frontmatter on `ADR-067-mutable-active-switch-vs-context-derived-kg-resolution.md` still reads `status: Proposed` as of this snapshot, despite full implementation and merge — this is an open documentation-accuracy gap (see Recent Architecture Changes below), not yet corrected.

**ADR-068 — Lightweight vs full workflow rule, piloted command-completion check** — Accepted. Most recently accepted ADR prior to this snapshot.

**ADR-066 — KG content storage location for global and cowork modes** — Accepted.

**ADR-065 — Roadmap/changelog duplication; changelog is source of truth** — Accepted.

**ADR-064 — Shared module pattern for slash command deduplication** — Accepted.

Status distribution across all 70 ADRs: 52 Accepted, 5 Proposed, 2 Superseded, 1 "Ready for implementation" (the ADR-067 implementation-spec companion doc), remainder minor casing variants.

---

## Code Protection Rules

**🔒 PROTECTED DIRECTORIES** (require explicit permission):
- **commands/** — Contains LLM execution prompts; changes break slash commands
- **core/** (including `core/templates/`) — Structured YAML formats; changes break parsing

**✅ Allowed Modifications** (no permission needed):
- Documentation files (*.md)
- Test files and examples
- Template comments and field glossaries

---

## Naming Conventions

### Branch Names
- Feature: `v{ver}-{description}` (e.g., `v0.0.9.1-alpha-claude-md`)
- Bug fix: `v{ver}-fix-{description}` (e.g., `v0.0.8.7.3-alpha-fix-installer-page`)
- Docs site only: `docs-update-{description}` — no version prefix
- Chained branches must branch from their parent branch (not `main`), e.g. `v0.0.10.2` branches from `v0.0.10.1`

### Commit Format
```
type(scope): subject

[bullet summary of changes]

Closes #[issue-number]

Co-Authored-By: Claude [Model] <noreply@anthropic.com>
```

Types: `feat` | `fix` | `docs` | `refactor` | `chore` | `perf` | `style` | `test` | `build` | `ci` | `revert`

### Skills & Agents
- Skills: lowercase, kebab-case (e.g., `kmg-lesson-capture`, `kmg-auto-recall`)
- Agents: kebab-case filenames under `agents/*.md` (e.g., `session-documenter`, `recall-agent`)

---

## Version Strategy

**Current Version:** v0.7.0 (package.json, plugin.json, mcp-server/package.json all in sync as of this snapshot)

**Versioning:**
- Version consistency required across: package.json, .claude-plugin/plugin.json, mcp-server/package.json
- MCP server versioned independently (may not match plugin version in general, though currently aligned)
- Installed plugin from marketplace confirmed updated `0.6.20` → `0.7.0` on disk this session; pending Claude Code restart to take effect in the running session

---

## Recent Architecture Changes

1. **ADR-067 (this branch)** — Mutable `.active` KG pointer replaced with cwd-derived `kg_resolve`. Merged to `main` via PR #212. Frontmatter status not yet flipped to reflect merge — **open next action**.
2. **ADR-068** — Lightweight vs full workflow rule, piloted command-completion check. Accepted.
3. **ADR-066** — KG content storage location for global/cowork modes. Accepted.
4. **ADR-065** — Roadmap/changelog duplication resolved: changelog is source of truth. Accepted.
5. **ADR-064** — Shared module pattern adopted for slash command deduplication. Accepted.

**Open follow-up (not yet actioned, from 2026-08-04 session):**
- GitHub issue #187 (tracks ENH-051, `cli.ts`/`kg_config_init` path-resolution dedup) is still open despite its underlying fix having merged as part of the ADR-067 branch. Needs mapping confirmation, then closure.

---

## See Also

- `knowledge/sessions/2026-08-04-main.md` — full narrative for this handoff's originating session
- `/kmgraph:kmg-session-summary` — document individual sessions (operational state lives here)
- `/kmgraph:kmg-recall` — search across captured knowledge
- `knowledge/decisions/` — Architecture Decision Records
- `knowledge/lessons-learned/` — Lessons by category
