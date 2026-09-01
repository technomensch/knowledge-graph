# Architecture Snapshot

**Snapshot Date:** 2026-06-17
**Current Release:** v0.6.0 (two unmerged bug fixes on local main)

---

## Project Purpose

KMGraph is a knowledge management plugin for Claude Code, Codex, and Gemini: capture, organize, and retrieve institutional knowledge across projects and AI sessions.

---

## Directory Structure

```
knowledge-graph/
├── commands/              🔒 PROTECTED — Slash commands (/kmgraph:...)
│   └── kmg-init-shared/  — Shared init/upgrade sub-commands
├── skills/               — Auto-triggered context providers (15 skills)
├── agents/               — Subagent definitions (11 agents)
├── hooks/
│   └── hooks.json        — Claude Code lifecycle hooks
├── .codex-plugin/
│   └── hooks/hooks.json  — Codex-specific lifecycle hooks
├── scripts/              — Shell scripts called by hooks
│   ├── session-end-prompt.sh   — Stop hook (platform-aware JSON output)
│   ├── hooks-master.sh         — SessionStart master hook
│   └── recommendation-gate.sh — Pre-push recommendation gate
├── mcp-server/           — Cross-platform MCP server (TypeScript/Node.js)
│   ├── src/tools/        — Tool implementations (search, capture, upgrade, etc.)
│   └── dist/             — Built output
├── core/                 🔒 PROTECTED — Templates and examples
│   ├── default-templates/ — YAML frontmatter structures used during init
│   │   ├── concepts/     — KG scaffold files (entry-template, kg-category-index, etc.)
│   │   ├── decisions/    — ADR-template.md, README.md
│   │   ├── lessons-learned/ — lesson-template.md, README.md
│   │   └── sessions/     — session-template.md
│   └── scripts/          — Python extraction utilities (run_extraction.py)
├── docs/                 — Docusaurus documentation site
├── knowledge/            — This repo's own knowledge graph
│   ├── decisions/        — ADRs (55 records)
│   ├── lessons-learned/  — Lessons by category (54 records)
│   ├── sessions/         — Session summaries
│   ├── enhancements/     — Enhancement specs (ENH-NNN/)
│   └── chat-history/     — Extracted chat logs (gitignored)
├── CLAUDE.md             — Project conventions and rules
├── package.json          — Plugin version (0.6.0)
└── .claude-plugin/
    └── plugin.json       — Plugin manifest (version 0.6.0)
```

---

## Architectural Principles

1. **Multi-KG support** — Multiple knowledge graphs, one active at a time (`~/.claude/kg-config.json`)
2. **Layered automation** — Commands (explicit), Skills (auto-triggered), Agents (heavy-lift subagents)
3. **Approval gates** — Subagents present diffs for approval before writing
4. **Cross-platform** — Claude Code hooks + Codex hooks + MCP tools work across all three platforms
5. **Platform detection** — `$CLAUDECODE` env var distinguishes Claude Code from Codex at runtime
6. **Privacy-first** — Sessions and chat history are gitignored; never committed

---

## Platform Support Matrix

| Hook Event | Claude Code | Codex | Gemini |
|---|---|---|---|
| SessionStart | ✓ | ✓ | ✓ |
| UserPromptSubmit | ✓ | ✓ | — |
| Stop | ✓ (hookSpecificOutput) | ✓ (decision:continue) | — (no Stop hook) |
| PreToolUse | ✓ | ✓ | — |
| PostToolUse | ✓ | ✓ | — |

Stop hook output is platform-aware via `$CLAUDECODE` env var (set only by Claude Code).

---

## Key Architectural Decisions

| ADR | Decision |
|---|---|
| ADR-053 | `kmg-` prefix as canonical cross-platform skill/agent naming convention |
| ADR-054 | Cache-clear is the official upgrade path for Claude Code (not in-session reload) |
| ADR-049 | Review audit protocol: post-plan/pre-push review gate |
| ADR-048 | Governance capture routing: corrections route to rules.md, not feedback files |
| ADR-040 | Template directory disambiguation: `core/templates/` (protected) vs `knowledge/concepts/` (mutable) |

---

## Naming Conventions

### Branch Names
| Type | Format | Example |
|---|---|---|
| Feature | `v{ver}-{description}` | `v0.6.0-kg-recall-rename` |
| Bug fix | `v{ver}-fix-{description}` | `v0.6.1-fix-recommendation-gate-schema` |
| Docs only | `docs-update-{description}` | `docs-update-command-guide` |

### Commit Format (Conventional Commits)
```
type(scope): subject

Body (why, not what) — omit if subject is self-explanatory.

Closes #N
```
Types: `feat` | `fix` | `docs` | `refactor` | `chore` | `perf` | `style` | `test` | `build` | `ci` | `revert`

### Slash Commands
All prefixed `/kmgraph:kmg-*` (v0.6.0+ after prefix normalization, ADR-053).

---

## Version Strategy

- All version files must be in sync before pushing: `package.json`, `.claude-plugin/plugin.json`, `mcp-server/package.json`
- MCP server can be versioned independently when its changes are server-only
- Branch naming encodes the target version
- Local main currently ahead of origin by two bug fix merges (0.6.1, 0.6.2) — versions not yet bumped

---

## Known Open Issues (as of 2026-06-17)

1. **MCP `upgrade.ts` template path mismatch** — `checkTemplates`/`applyTemplates` check `lessons-learned/lesson-template.md` etc., but v0.5.0+ installs store these at `knowledge/templates/`. The slash command handles this correctly; the MCP tool does not. Next fix branch: `v0.6.3-fix-upgrade-template-paths`.

2. **Version bump pending** — Both v0.6.1 and v0.6.2 fixes are merged locally but version files still say 0.6.0. Bump + push + PR needed.

3. **Untracked files** — `AGENTS.md`, `knowledge/enhancements/ENH-013/v0.5.11-plan.md`, `knowledge/enhancements/ENH-027/` not yet committed.
