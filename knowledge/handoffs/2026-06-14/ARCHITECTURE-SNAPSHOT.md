# Architecture Snapshot (2026-06-14)

**Release:** v0.5.10.8 | **MCP server:** v0.3.11

---

## Project Purpose

Cross-platform knowledge management plugin: capture lessons, decisions, and session history across AI coding sessions. Works on Claude Code, Gemini CLI, and Codex CLI via a shared MCP server.

---

## Directory Structure

```
knowledge-graph/
├── commands/           🔒 PROTECTED — Slash commands (/kmgraph:...)
├── skills/            — Auto-triggered context providers (SKILL.md per skill)
├── agents/            — Subagent definitions for heavy-lift tasks
├── hooks/             — hooks.json (SessionStart automation)
├── mcp-server/        — Cross-platform MCP server (TypeScript/Node.js)
│   ├── src/tools/     — kg_capture, kg_search, kg_scaffold, etc.
│   └── src/utils.ts   — getProjectRoot, getActiveGraphPath
├── core/              🔒 PROTECTED — Distribution scaffolds
│   ├── default-templates/  — Frozen YAML templates (renamed from core/templates/ in v0.5.10.7)
│   ├── examples/      — Reference implementations
│   └── scripts/       — run_extraction.py (chat history extraction)
├── docs/              — MkDocs Material documentation site
│   └── reference/     — command-guide.md, commands.md, agents.md
├── knowledge/         — Active knowledge graph (gitignored content)
│   ├── decisions/     — ADRs (54 total)
│   ├── lessons-learned/ — Lessons by category
│   ├── sessions/      — Session summaries
│   ├── enhancements/  — ENH-NNN specs
│   └── plans/         — Local-only plan files (gitignored)
├── handoff-packages/  — Handoff docs (not committed)
├── CLAUDE.md          — Project conventions, protection rules, workflows
├── package.json       — Plugin version 0.5.10.8
└── .claude-plugin/plugin.json — Plugin manifest 0.5.10.8
```

---

## Architectural Principles

1. **Multi-KG:** `~/.claude/kg-config.json` tracks all registered KGs; `active` field routes writes
2. **Layered enforcement:** Commands (thin dispatchers) → Skills (context injection) → Agents (execution with guards)
3. **Write guard pattern:** Before any KG write, compare active KG's `projectRoot` vs CWD
   - Agent paths: enforced via Phase 0 in `lesson-capture-agent.md` / `session-summary-agent.md`
   - Data layer: `kg_capture` MCP tool (`capture.ts:252-266`) — model-independent
   - Command paths: model-layer Step 0 (extract-chat v0.5.10.8); sync-all/update-graph still unguarded (ENH-026)
4. **Cross-platform:** MCP server runs on all platforms; hooks/skills are model-layer for Gemini/Codex compat
5. **Privacy-first:** sessions/, chat-history/, plans/ are gitignored — never committed

---

## Key Architectural Decisions

| ADR | Decision | Status |
|---|---|---|
| ADR-001 | Centralized multi-KG config (`kg-config.json`) | Accepted |
| ADR-017 | Four-layer architecture: thin commands + agents | Accepted |
| ADR-019 | Write guard: agent instructions (Phase 1) + kg_capture (Phase 2, shipped) | Accepted, amended v0.5.10.8 |
| ADR-028 | `me.md` + `rules.md` as platform-agnostic source of truth | Accepted |
| ADR-029 | Plan file location: `knowledge/plans/` (ENH/issue routing) | Accepted |
| ADR-034 | Capture-level routing dispatcher/agent split | Accepted |
| ADR-040 | Template directory disambiguation (governs ENH-022) | Accepted |
| ADR-043 | PreToolUse hook injection for superpowers rule enforcement | Accepted |
| ADR-050 | Pre-push composite gate + inline recommendation gate | Accepted |
| ADR-052 | Docs-impact-scan user-facing guide | Accepted |

---

## Version Strategy

| Level | Format | Trigger |
|---|---|---|
| Minor bump | v0.5.x → v0.6.0 | New feature / significant behavior change |
| Patch | v0.5.8 → v0.5.9 | Small fix or enhancement |
| Hotfix | v0.5.8 → v0.5.8.1 | Urgent fix to released version |
| WIP append | (no version minted) | Added to in-progress version branch |

**Milestone themes:**
- v0.5.x — Multi-platform foundation, governance gates, write guards
- v0.6.0 — `kmg-` prefix normalization + multi-platform recall delivery (ENH-019 defines this)
- v0.7.0 — Analytics + full marketplace delivery (ENH-019 deferred scope)

**Version files to keep in sync:** `package.json`, `.claude-plugin/plugin.json`, `README.md`
(mcp-server/package.json versioned independently — do NOT sync)

---

## Branch Naming

- Feature: `v{ver}-{description}` (e.g., `v0.5.10.8-kg-write-guard-extract-chat`)
- Bug fix: `v{ver}-fix-{description}`
- Docs only: `docs-update-{description}` (no version prefix)
- Chained branches: branch from parent (if unmerged), not main

---

## Commit Format

```
type(scope): subject

[body]

Refs: ADR-NNN, ENH-NNN
Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```

Types: `feat` | `fix` | `docs` | `refactor` | `chore`

---

## Open Work Summary

| Item | Type | Priority |
|---|---|---|
| ENH-013: rename kg-recall skill | branch exists (v0.5.11) | next patch |
| ENH-026: write guard sync-all/update-graph | spec written | post-v0.5.10.8 |
| v0.6.0 brainstorm | NOT STARTED | **immediate next** |
| ENH-019: kmg- prefix normalization | proposed | v0.6.0 |
| ENH-023: marketplace skill injection | proposed | v0.6.0 |
| ENH-025: cross-platform extractor | proposed | v0.6.0 |
| ENH-018: rules H2 hardening | deferred | v0.6.x |
