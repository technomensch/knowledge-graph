# Architecture Snapshot

**Date:** 2026-05-27
**Current Release:** v0.5.8
**In Development:** v0.5.9 (Decision Governance)

---

## Project Purpose

KMGraph is a Claude Code plugin + cross-platform MCP server for capturing, organizing, and retrieving institutional knowledge across projects and AI platforms. It bridges the context-gap between AI sessions by persisting decisions, lessons, patterns, and session history in structured markdown.

---

## Directory Structure

```
knowledge-graph/
├── commands/              🔒 PROTECTED — Slash commands (/kmgraph:...)
├── skills/               — Auto-triggered context providers (14 skills)
├── agents/               — Subagent definitions (2 agents)
├── hooks/                — SessionStart automation (hooks.json)
├── mcp-server/           — Cross-platform MCP server (TypeScript/Node.js)
├── core/                 🔒 PROTECTED — Templates, examples, platform docs
│   └── templates/        — YAML frontmatter structures
├── scripts/              — Shell hooks: pre-skill-rules-inject.sh, stop-plan-gate.sh
├── tests/                — Test suites for hooks and commands
├── docs/                 — Docusaurus documentation site
│   ├── plans/            — Implementation plans (gitignored)
│   └── sessions/         — Session summaries (gitignored)
├── knowledge/            — Active knowledge graph for this project
│   ├── decisions/        — 48 ADRs
│   ├── enhancements/     — ENH-001 through ENH-018
│   ├── lessons-learned/  — architecture/, debugging/, patterns/, process/
│   ├── sessions/         — YYYY-MM/ daily session summaries
│   ├── handoffs/         — Handoff packages (this file's home)
│   └── rules.md          — Project-level enforcement rules
├── CLAUDE.md             — Project conventions (lightweight pointer)
├── ROADMAP.md            — Feature backlog
├── CHANGELOG.md          — Released version history
├── package.json          — Plugin version + dependencies
└── .claude-plugin/       — Plugin manifest (plugin.json)
```

---

## Four-Layer Architecture (ADR-017)

```
Layer 1: Commands    — Thin dispatchers. No logic. Call shared modules or agents.
Layer 2: Skills      — Auto-triggered behavioral modifiers. Enhance, don't replace.
Layer 3: Agents      — Heavy-lift subagents. Isolated context. Approval-gated writes.
Layer 4: MCP Server  — Cross-platform tools (kg_*). Platform-agnostic.
```

**Rule:** Commands stay thin. Logic lives in shared modules (`commands/init-shared/`). Agents handle anything requiring multi-file reads or large-scale writes.

---

## Cross-Platform Architecture (ADR-028, ADR-032, ADR-041)

Profile files are the single source of truth — shared across Claude, Gemini, Cursor, and any other platform:

```
~/.kmgraph/
├── me.md              — Identity + platform tier_maps
├── rules.md           — Cross-project enforcement rules
├── plan-rules.md      — Plan protocol rules
├── governance-rules.md — Architectural governance + strict execution protocol
└── triggers.md        — When each rule fires

~/.claude/CLAUDE.md    — Read order pointer (3 lines) + Claude-specific notes
~/.gemini/GEMINI.md    — Read order pointer (3 lines) + Gemini-specific notes
```

**Tier label system (ADR-041):** Plans and templates use `fast-tier` / `standard-tier` / `powerful-tier`. Each platform resolves tiers to actual models via `me.md` tier_map at execution time — never hard-code model names in plans.

---

## Naming Conventions

### Branches
- Feature/release: `v{major}.{minor}.{patch}-{description}`
- Bug fix: `v{major}.{minor}.{patch}-fix-{description}`
- Docs-only: `docs-update-{description}` (no version prefix)

### Commits (Conventional Commits)
```
type(scope): subject

Closes #N

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```
Types: `feat` | `fix` | `docs` | `refactor` | `chore` | `test` | `perf` | `build` | `ci`

### ENH IDs
- Sequential: ENH-001 through ENH-018 (current max)
- Directories: `knowledge/enhancements/ENH-NNN/ENH-NNN-specification.md`
- Plans: `~/.claude/plans/ENH-NNN-{slug}.md` (local-only, never committed)

---

## Version Strategy

- Plugin and MCP server versioned independently
- Before pushing: sync `package.json`, `mcp-server/package.json`, `.claude-plugin/plugin.json`
- Plans are local-only (gitignored) — never commit `docs/plans/*.md`
- Sessions are local-only — never commit `docs/sessions/` or `knowledge/sessions/`

---

## Key Architectural Decisions (most load-bearing)

| ADR | Decision | Why it matters |
|---|---|---|
| ADR-002 | Commands vs. skills architecture | Skills can't write; commands dispatch agents |
| ADR-017 | Four-layer thin commands | All logic in shared modules, not command files |
| ADR-028 | me.md + rules.md as source of truth | Profile files shared across platforms |
| ADR-032 | Platform directives in platform config | CLAUDE.md for Claude, GEMINI.md for Gemini |
| ADR-041 | Tier label abstraction | Plans portable across platform upgrades |
| ADR-042 | ADR implements-commit mandatory | Every ADR must reference implementation commit |
| ADR-048 | Governance capture routing | Behavioral corrections → rules.md, not MEMORY.md |

---

## Approval Gates (non-negotiable)

- Never start a branch or implementation without explicit "Proceed" or "Start"
- Never push, merge, or open PRs without user confirmation
- Never modify `commands/` or `core/templates/` without explicit permission
- Plan execution uses gov-execute-plan strict mode (8-step protocol in `~/.kmgraph/governance-rules.md`)
