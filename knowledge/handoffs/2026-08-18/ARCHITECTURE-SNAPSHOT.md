# Architecture Snapshot

**Snapshot Date:** 2026-08-18
**Current Release (as committed):** v0.7.1.4 — a v0.7.2 bump has been discussed but not yet executed (see DOCUMENTATION-MAP.md, Version Consistency)

---

## Project Purpose

Knowledge management plugin for Claude Code: capture, organize, and retrieve institutional knowledge across projects.

---

## Directory Structure

```
knowledge-graph/
├── commands/              🔒 PROTECTED — Slash commands (/kmgraph:...), 24 files
├── skills/                — Auto-triggered context providers, 16 skills
├── agents/                — Subagent definitions for heavy-lift tasks, 11 agents
├── hooks/                 — SessionStart/PreToolUse/PostToolUse/etc. automation (hooks.json)
├── mcp-server/            — Cross-platform MCP server (TypeScript/Node.js), v0.7.0 (independent)
├── core/                  🔒 PROTECTED — Templates, examples, docs, scripts
│   ├── default-templates/ — YAML frontmatter structures
│   ├── examples/           — Reference implementations
│   ├── examples-hooks/     — Example hook configs
│   ├── rules-registry/     — Rules registry source
│   └── scripts/            — Extraction/utility scripts
├── docs/                  — Docusaurus documentation site
│   ├── reference/         — Commands, skills, agents, hooks, templates
│   ├── concepts/, pillars/, specs/, superpowers/, templates/, examples/, design/
│   ├── quickstart.mdx, CHEAT-SHEET.md, INSTALL.md, CONFIGURATION.md, FAQ.md, GLOSSARY.md
│   └── contributing/, troubleshooting/, demos/
├── knowledge/             — Knowledge graph (this project's own KG instance)
│   ├── decisions/         — Architecture Decision Records (ADRs), 70 files
│   ├── lessons-learned/   — Lessons by category (architecture, debugging, patterns, process), 68 files
│   ├── issues/            — Per-issue tracking dirs (issue-46 .. issue-51 active this cycle)
│   ├── enhancements/      — Enhancement specs (ENH-NNN/)
│   ├── sessions/          — Session summaries (gitignored)
│   ├── plans/             — Implementation plans (gitignored, dual-copy with ~/.claude/plans/ per ADR-014)
│   ├── handoffs/          — Prior handoff packages
│   ├── analysis/, chat-history/, concepts/, templates/, tmp/
│   ├── me.md, rules.md, triggers.md — profile/rules/timing (gitignored personal files)
│   └── kg-index.md        — graph index
├── handoff-packages/      — Generated handoff packages (this one: 2026-08-18/)
├── CLAUDE.md              — Project conventions and rules
├── .claude/               — Claude Code configuration (incl. worktrees/ for parallel branch work)
├── README.md              — Project overview
├── package.json           — Plugin version and dependencies
└── .claude-plugin/        — Plugin manifest
```

---

## Architectural Principles

1. **Modular KG system** — Multi-KG support with active/inactive switching (see ADR-001, ADR-067)
2. **Layered documentation** — Commands (CLI), Skills (context), Agents (heavy-lift)
3. **Approval gates** — Subagents wait for user approval before writes; version bumps, commits, and pushes require explicit user go-ahead (see this session's c1 remaining steps, in the session summary once written)
4. **Git-aware** — Preserves commit metadata, branch context, issue links
5. **Privacy-first** — Sessions, plans, and chat history never committed to repo (gitignored)
6. **Never destroy known-good state before a confirmed write** (ADR-063) — directly relevant to the c1/issue-46 data-loss bug fixed this session in `mcp-server/src/tools/upgrade.ts`
7. **Dual plan-file locations** (ADR-014) — every plan lives in both `knowledge/plans/` and `~/.claude/plans/`, kept byte-identical; this convention was followed throughout this session's plan-drafting work for c2/c3/c5/c6/c7/c8

---

## Code Protection Rules

**🔒 PROTECTED DIRECTORIES** (require explicit permission):
- **commands/** — Contains LLM execution prompts; changes break slash commands
- **core/** (default-templates, examples, scripts) — Structured formats; changes break parsing

**✅ Allowed Modifications** (no permission needed):
- Documentation files (*.md)
- Test files and examples
- Template comments and field glossaries

---

## Naming Conventions

### Branch Names
- Feature: `v{major}.{minor}.{patch}-{description}` (e.g., v0.0.10.1-alpha-skills)
- Bug fix: `v{major}.{minor}.{patch}.{subpatch}-fix-{description}`
- Docs site only: `docs-update-{description}` — no version prefix
- Chained branches must branch from their parent branch, not main
- This session's active branch, `v0.7.2-issues-46-51`, was itself renamed mid-session from `v0.7.1.5-issues-46-47-48-49` as a version-line bump decision; all 9 associated plan files and cross-references were updated to match.

### Commit Format
```
type(scope): subject

[bullet summary of changes]

Closes #[issue-number]

Co-Authored-By: Claude [Model] <noreply@anthropic.com>
```

Types: `feat` | `fix` | `docs` | `refactor` | `chore` | `perf` | `style` | `test` | `build` | `ci` | `revert`

### Skills & Agents
- Skills: Lowercase, kebab-case, `kmg-` prefix (e.g., kmg-lesson-capture, kmg-auto-recall)
- Agents: kebab-case with `-agent` suffix in most cases (e.g., create-adr-agent, session-summary-agent)

---

## Version Strategy

**Current committed version:** v0.7.1.4 (package.json, plugin.json, README.md); mcp-server independently at v0.7.0

**Versioning:**
- Major.minor.patch.subpatch format
- Version consistency required across: package.json, plugin.json, README.md, mcp-server/package.json
- MCP server versioned independently (may not match plugin version)
- A bump to v0.7.2 has been discussed this session (to match the branch name `v0.7.2-issues-46-51`) but **not yet executed** — this is part of c1's remaining Step 16 (release checklist), pending explicit user confirmation.

---

## Recent Architecture Changes

- **ADR-068** — Lightweight vs. full workflow rule and piloted command completion check (Accepted)
- **ADR-067** (+ implementation spec) — Mutable active-switch vs. context-derived KG resolution (Proposed; design agreed 2026-07-26, independently reviewed 3 rounds by Opus and Fable, all findings resolved as of 2026-07-28)
- **ADR-066** — KG content storage location for global and cowork modes (Accepted — resolved 2026-07-17; implementation planned via v0.6.20, not yet started)
- **ADR-065** — Roadmap/changelog duplication: changelog is source of truth (Accepted)
- **ADR-064** — Shared module pattern for slash command deduplication (Accepted)
- **ADR-063** — Never destroy known-good state before a confirmed write (Accepted) — the principle this session's c1 data-loss fix in `mcp-server/src/tools/upgrade.ts` directly upholds

---

## Current Multi-Branch/Worktree State (as of this snapshot)

This project is mid-way through a multi-track release cycle (issues 46–51, tracks labeled c1–c8). Verify against `git worktree list` and `git status` before acting — do not assume this is still accurate if time has passed since this snapshot.

- **Main checkout** (`/Users/mkaplan/GitHub/knowledge-graph`, branch `v0.7.2-issues-46-51`, HEAD `671268f0`): has substantial **uncommitted** changes — this is c1 (issue-46 fix), fully implemented and paperwork-complete, awaiting Steps 16–18 (version-bump confirmation, commit/push/PR, capture checkpoint), each gated on explicit user go-ahead.
- **Worktree `.claude/worktrees/c4-dependabot`** (branch `v0.7.2-c4-dependabot`, HEAD `cd3ed1da`): c4 (dependabot fixes) is implemented and committed, but as of this snapshot has one **uncommitted** change in `package.json` — the `nanoid` version ceiling (`>=3.3.18 <4.0.0`) has been loosened to `>=3.3.18`, origin unknown, flagged to the user, awaiting their decision. This branch has not yet been merged into `v0.7.2-issues-46-51`.
- **Other worktree** `knowledge-graph-wip-stash` (branch `wip-stash-2026-08-12`) exists alongside the two above — not part of this session's active work; treat as pre-existing stash state, not something to modify without checking its purpose first.
- Plan documents for c2, c3, c5, c6 are deeply revised and execution-ready pending user approval; c7/c8 are drafted but only lightly reviewed. See `knowledge/plans/v0.7.2-orchestration-plan.md` for full sequencing, dependency order (c5 must land before c2/c6; c3 depends only on c1 + its own PROTECTED-file gate; c4 and c7/c8 are independent), and worktree strategy.
