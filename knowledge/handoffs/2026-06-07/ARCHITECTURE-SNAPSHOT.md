# Architecture Snapshot

**Snapshot Date:** 2026-06-07
**Current Release:** v0.5.10

---

## Project Purpose

Knowledge management plugin for Claude Code: capture, organize, and retrieve institutional knowledge across projects. Operates as a Claude Code extension (slash commands + skills + hooks) and a cross-platform MCP server.

---

## Directory Structure

```
knowledge-graph/
├── commands/              PROTECTED — Slash commands (/kmgraph:...)
├── skills/               — Auto-triggered context providers (5 skills)
├── agents/               — Subagent definitions for heavy-lift tasks (2 agents)
├── hooks/                — SessionStart automation (hooks.json)
│   └── scripts/          — Hook shell scripts (hooks-master.sh, recommendation-gate.sh, etc.)
├── mcp-server/           — Cross-platform MCP server (TypeScript/Node.js)
│   └── package.json      — v0.3.10 (versioned independently)
├── core/                 PROTECTED — Templates, examples, docs
│   ├── templates/        — YAML frontmatter structures (parsing targets)
│   ├── examples/         — Reference implementations
│   └── scripts/          — Python extraction utilities
├── docs/                 — Obsidian documentation vault
│   ├── reference/        — Commands, skills, agents, hooks, templates reference
│   ├── guides/           — How-to guides
│   ├── pillars/          — Core pillars (capturing, organizing, portability, recalling, tailoring)
│   ├── concepts/         — Conceptual documentation
│   ├── specs/            — Feature specifications
│   ├── plans/            — Implementation plans (GITIGNORED — local only)
│   └── templates/        — Documentation templates
├── knowledge/            — Active knowledge graph (project-local)
│   ├── decisions/        — Architecture Decision Records (ADR-001 through ADR-051)
│   ├── enhancements/     — Enhancement specs (ENH-001 through ENH-023+)
│   ├── lessons-learned/  — Lessons by category (architecture, process, patterns, debugging, governance)
│   ├── sessions/         — Session summaries (GITIGNORED — local only)
│   ├── issues/           — Issue tracking files
│   ├── concepts/         — Knowledge concepts (mutable working files)
│   ├── analysis/         — Analysis artifacts
│   ├── rules.md          — Project-specific behavioral rules
│   ├── triggers.md       — Rule trigger conditions
│   └── kg-index.md       — Knowledge graph index
├── CLAUDE.md             — Project conventions and rules
├── .claude/              — Claude Code configuration
│   └── settings.json     — Tool permissions, hook configuration
├── .claude-plugin/       — Plugin manifest
│   └── plugin.json       — v0.5.10
├── README.md             — Project overview
└── package.json          — Plugin version v0.5.10
```

---

## Architectural Principles

1. **Modular KG system** — Multi-KG support with active/inactive switching via `~/.claude/kg-config.json`
2. **Layered documentation** — Commands (CLI slash), Skills (context injection), Agents (heavy-lift subagents)
3. **Approval gates** — Subagents wait for user approval before writes; pre-push gates enforce rule compliance
4. **Git-aware** — Preserves commit metadata, branch context, issue links in all captured artifacts
5. **Privacy-first** — Sessions and chat history are gitignored; never committed to repo
6. **Asymmetric coupling** — Document relationships use one-way coupling (ADR-051: session-summary reads handoff, not vice versa)
7. **Hook-driven automation** — SessionStart, PostToolUse, PreToolUse, Stop hooks automate knowledge capture and enforcement gates

---

## Key Decisions (ADRs)

**Total ADRs: 51** (knowledge/decisions/)

Selected architectural decisions:

| ADR | Title | Status |
|---|---|---|
| ADR-001 | Centralized multi-KG configuration | Accepted |
| ADR-002 | Commands vs skills architecture | Accepted |
| ADR-009 | Three-tier installation architecture | Accepted |
| ADR-012 | Hook security model | Accepted |
| ADR-014 | Maintain dual plan file locations | Accepted |
| ADR-015 | Node SQLite3 WASM for FTS5 search | Accepted |
| ADR-017 | Four-layer architecture: thin commands | Accepted |
| ADR-020 | Lifecycle hooks suite — automated capture | Accepted |
| ADR-021 | Single source of truth — DRY documentation | Accepted |
| ADR-023 | Single source of truth — CHANGELOG | Accepted |
| ADR-028 | me.md and rules.md as platform-agnostic source of truth | Accepted |
| ADR-029 | Plan file location in knowledge graph | Accepted |
| ADR-036 | Docs impact scan | Accepted |
| ADR-040 | Knowledge templates subdirectory structure | Accepted |
| ADR-042 | ADR implements commit reference mandatory | Accepted |
| ADR-043 | PreToolUse hook injection for superpowers rule enforcement | Accepted |
| ADR-048 | Governance capture routing | Accepted |
| ADR-049 | Review audit protocol — post-plan, pre-push review governance | Accepted |
| ADR-050 | Pre-push composite gate + inline recommendation gate | Accepted |
| ADR-051 | Session-summary / handoff asymmetric coupling *(most recent)* | Accepted |

---

## Code Protection Rules

**PROTECTED DIRECTORIES** (require explicit user permission):
- **commands/** — Contains LLM execution prompts; changes break slash commands
- **core/templates/** — Structured YAML formats; changes break parsing

**Allowed Modifications** (no permission needed):
- Documentation files (*.md)
- Test files and examples
- Template comments and field glossaries

---

## Naming Conventions

### Branch Names
- Feature: `v{major}.{minor}.{patch}-{description}` (e.g., v0.5.10-ux-session-handoff)
- Bug fix: `v{major}.{minor}.{patch}.{subpatch}-fix-{description}` (e.g., v0.0.8.7.3-alpha-fix-installer)
- Docs site only: `docs-update-{description}` — no version prefix

### Commit Format
```
type(scope): subject

[bullet summary of changes]

Closes #[issue-number]

Co-Authored-By: Claude [Model] <noreply@anthropic.com>
```

Types: `feat` | `fix` | `docs` | `refactor` | `chore` | `perf` | `style` | `test` | `build` | `ci` | `revert`

### Skills & Agents
- Skills: lowercase kebab-case (e.g., lesson-capture, kg-recall)
- Agents: descriptive kebab-case (e.g., knowledge-extractor, session-documenter)

---

## Version Strategy

**Current Version:** v0.5.10

**Versioning rules:**
- `package.json`, `.claude-plugin/plugin.json`, `README.md` must stay in sync
- `mcp-server/package.json` is versioned independently (currently v0.3.10)
- Version sync verified by pre-push Gate 2 (hooks)
- Docs changes use `docs-update-*` branches, not version-prefixed branches

---

## Hook Architecture

The hook system enforces 11+ automated behaviors across 5 lifecycle events:

| Lifecycle Event | Scripts | Purpose |
|---|---|---|
| SessionStart | hooks-master.sh | KG validation, recent lessons display, profile staleness check |
| PostToolUse | post-tool-lesson-check.sh, platform-file-change-check.sh, plan-mirror.sh, post-plan-validate-checklist.sh, rules-size-check.sh, plan-docs-xref-check.sh | Knowledge capture prompts, sync, validation |
| PreToolUse | pre-skill-rules-inject.sh, pre-commit-knowledge-gate.sh, version-sync+docs-impact gates, recommendation-gate.sh | Rule injection, commit gates, push gates, inline recommendation gate |
| Stop | session-end-prompt.sh | Surface open plans, draft ADRs, uncaptured lessons |

---

## Recent Architecture Changes (Last 5 ADRs)

| ADR | Date (approx) | Change |
|---|---|---|
| ADR-047 | v0.5.x | Profile auto-load routing layer only |
| ADR-048 | v0.5.9 | Governance capture routing (MEMORY.md → rules/triggers) |
| ADR-049 | v0.5.9.1 | Review audit protocol — post-plan, pre-push review governance |
| ADR-050 | v0.5.9.3 | Pre-push composite gate + inline recommendation gate |
| ADR-051 | v0.5.10 | Session-summary / handoff asymmetric coupling |

---

## Enhancement Tracking

Enhancements are tracked in `knowledge/enhancements/ENH-NNN/` with specification files. Current range: ENH-001 through ENH-023+.

Key recent enhancements:
- **ENH-016**: Rules file auto-split recommendation (trigger-based)
- **ENH-017**: start-issue-tracking Step 1.2 version-impact UX (completed v0.5.10)
- **ENH-021**: continues_from handoff/session-summary coupling (completed v0.5.10)
- **ENH-022**: Template Directory Disambiguation (proposed — BRAINSTORM REQUIRED)
- **ENH-023**: Extend pre-skill-rules-inject.sh to marketplace skills (GitHub issue #130)
