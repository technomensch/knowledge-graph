# Architecture Snapshot — 2026-05-25

**Release:** v0.5.8 (plugin) / v0.3.10 (mcp-server)
**Next:** v0.6.0 — multi-platform expansion (planning in progress)

---

## Project Purpose

KMGraph: knowledge management plugin for Claude Code + cross-platform MCP server. Captures, organizes, and retrieves institutional knowledge across projects and AI platforms.

---

## Directory Structure

```
knowledge-graph/
├── commands/              🔒 PROTECTED — Slash commands (/kmgraph:...)
├── skills/               — Auto-triggered context providers (14 skills)
├── agents/               — Subagent definitions (11 agents)
├── hooks/                — SessionStart automation (hooks.json)
├── mcp-server/           — Cross-platform MCP server (TypeScript/Node.js)
├── core/                 🔒 PROTECTED — Templates, examples, docs
│   ├── templates/        — YAML frontmatter structures
│   │   ├── knowledge/    — KG entry templates
│   │   └── platforms/    — Per-platform behavioral instruction templates (v0.6.0)
│   ├── examples/         — Reference implementations
│   └── scripts/          — Python extraction utilities
├── docs/                 — Docusaurus documentation site
│   ├── reference/        — Commands, skills, agents, hooks, templates
│   ├── guides/           — How-to guides
│   ├── quickstart.md
│   ├── CHEAT-SHEET.md
│   ├── plans/            — Implementation plans (gitignored, local only)
│   └── sessions/         — Session summaries (gitignored)
├── decisions/            — Architecture Decision Records (ADRs, ~50)
├── lessons-learned/      — Lessons by category (~46)
├── knowledge/            — Project KG (rules.md, me.md gitignored)
│   ├── rules.md          — Project-specific behavioral rules
│   ├── me.md             — Project-specific identity (gitignored)
│   ├── enhancements/     — ENH-NNN enhancement specs
│   └── sessions/         — Session summaries (committed)
├── CLAUDE.md             — Project conventions and rules
├── .claude-plugin/       — Plugin manifest (plugin.json)
├── package.json          — Plugin version v0.5.8
└── README.md             — Project overview
```

**Personal profile files (outside repo):**
```
~/.kmgraph/
├── rules.md              — Cross-project behavioral rules
├── me.md                 — Cross-project identity
└── triggers.md           — When rules apply
~/.claude/kg-config.json  — Active KG configuration (v0.6.0 → ~/.kmgraph/config.json)
```

---

## Architectural Principles

1. **MEMORY.md = index only** — Content lives in profile files. MEMORY.md is a pointer table, never written to directly (post-ENH-014).
2. **Profile file hierarchy** — `~/.kmgraph/rules.md` (cross-project) ← `knowledge/rules.md` (project). Project overrides personal on conflict.
3. **Platform files = thin shims** — Each platform file (CLAUDE.md, GEMINI.md, etc.) = pointer line + minimal behavioral instructions. Heavy content lives in profile files.
4. **Pointer injection at install time** — `init`/`setup-platform` inject pointer lines; templates never contain live pointers.
5. **Modular KG system** — Multi-KG support with active/inactive switching (`~/.claude/kg-config.json`).
6. **Approval gates** — Subagents wait for user approval before writes.
7. **Git-aware** — Preserves commit metadata, branch context, issue links.
8. **Privacy-first** — `knowledge/me.md` gitignored; personal profile files outside repo.

---

## Key Architecture Decisions (Recent ADRs)

| ADR | Title | Status |
|---|---|---|
| ADR-048 | Governance routing | Active |
| ADR-047 | Profile auto-load | Active |
| ADR-041 | Tier abstraction label system | Active (alias map sunset in v0.6.0) |
| ADR-039 | Profile terminology | Active |
| ADR-032 | Platform-specific directives in platform config | Active |
| ADR-028 | Platform-agnostic source | Active |
| ADR-018 | AGENTS-template platform portability | Active |
| ADR-001 | Centralized multi-KG configuration | Active |

---

## Platform Support (v0.5.8 current / v0.6.0 target)

**Current:** Claude Code only (full support)

**v0.6.0 Tier 1 (full support — 10 platforms):**
claude, gemini, codex, copilot, cursor, windsurf, continue, aider, factory, opencode

**v0.6.0 Tier 2 (detection + tier-map only — 2 platforms):**
lm-studio, ollama

**Platform files per platform:**
- Claude Code: `CLAUDE.md`
- Gemini CLI: `GEMINI.md`
- Codex: `AGENTS.md`
- Copilot: `.github/copilot-instructions.md`
- Cursor: `.cursor/rules/project-preferences.mdc` (detection: `.cursorrules`)
- Windsurf: `.windsurfrules`
- Continue: `.continue/config.yaml`
- Aider: `.aider.conf.yml`
- Factory: `.factory/instructions.md`
- OpenCode: `opencode.json`

---

## v0.5.8 — What Was Fixed

Branch: `v0.5.8-fix-plan-rules-injection`
Status: **Fully implemented, unpushed — needs PR**

Key fixes:
- `fix(hooks)`: inject `knowledge/rules.md` into plan gate; hard block on promotion
- `fix(hooks)`: restore `stop-plan-gate.sh`; fix `${CLAUDE_PROJECT_DIR}` → `${CLAUDE_PLUGIN_ROOT}`
- `fix(commands)`: relay subagent draft to main thread before save/edit/cancel prompt
- `fix(capture)`: route behavioral captures to profile files, not MEMORY.md (ENH-014)
- `docs(core)`: update PATTERNS-GUIDE MEMORY.md section for profile-file architecture
- `test`: pre-skill-rules-inject suite; profile-file staleness tests with fake HOME

---

## v0.6.0 — What's Coming

Plan: `docs/plans/v0.6.0-multi-platform-expansion.md`

**Phase 1 (decisions — in progress):**
- 13 blocking/design decisions must be locked before implementation begins
- 6 of 13 complete as of 2026-05-25

**Phase 2 (implementation — not started):**
- npm publish `@stayinginsync/kmgraph`
- Per-platform templates in `core/templates/platforms/`
- `init`/`setup-platform` updated for all 10 Tier 1 platforms
- kg-config migration: `~/.claude/kg-config.json` → `~/.kmgraph/config.json`
- ENH-013: rename `kg-recall` → `auto-recall` (must precede Task 2.4)
- 140 tool mapping files (14 skills × 10 platforms) — Task 2.4

---

## Naming Conventions

**Branch names:**
- Feature: `v{ver}-{description}` (e.g., `v0.6.0-multi-platform-expansion`)
- Bug fix: `v{ver}-fix-{description}` (e.g., `v0.5.8-fix-plan-rules-injection`)
- Docs only: `docs-update-{description}` (no version prefix)

**Commit format:** `type(scope): subject` — `Closes #N` in body
Types: `feat | fix | docs | refactor | chore | perf | style | test | build | ci | revert`

**Skills:** lowercase kebab-case (`lesson-capture`, `kg-recall`)
**Agents:** kebab-case (`recall-agent`, `session-documenter`)
**Commands:** kebab-case (`create-adr`, `session-summary`)

---

## Code Protection Rules

**🔒 PROTECTED (explicit permission required):**
- `commands/` — LLM execution prompts; breaks slash commands if modified
- `core/templates/` — Structured formats with YAML frontmatter for parsing

**✅ Allowed without permission:**
- `*.md` documentation files
- `tests/`, test scripts
- `knowledge/`, `lessons-learned/`, `decisions/`
- Template comments and field glossaries
