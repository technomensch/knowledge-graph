# Architecture Snapshot

**Snapshot Date:** 2026-07-14
**Current Release:** v0.6.18

---

## Project Purpose

Knowledge management plugin for Claude Code: capture, organize, and retrieve institutional knowledge across projects.

---

## Directory Structure

```
knowledge-graph/
├── commands/              🔒 PROTECTED — Slash commands (/kmgraph:...), 25 files
├── skills/                — Auto-triggered context providers, 15 skills
├── agents/                — Subagent definitions for heavy-lift tasks, 11 agents
├── hooks/                 — SessionStart automation (hooks.json, 6 hooks)
├── mcp-server/            — Cross-platform MCP server (TypeScript/Node.js), versioned independently
├── core/                  🔒 PROTECTED — Templates, examples, docs
│   ├── templates/         — YAML frontmatter structures
│   ├── examples/          — Reference implementations
│   └── scripts/           — Python extraction utilities
├── docs/                  — Docusaurus Material documentation site, 122 md/mdx files
│   ├── reference/         — Commands, skills, agents, hooks, templates
│   ├── guides/             — How-to guides
│   ├── quickstart.mdx
│   ├── pillars/            — Diátaxis-restructured concept pages (ADR-027)
│   └── docs-updates/       — Docs-only-branch feed posts (not CHANGELOG)
├── knowledge/              — Knowledge graph (sessions, decisions, lessons, enhancements, issues, plans)
│   ├── decisions/          — Architecture Decision Records (ADRs), 64 + template
│   ├── lessons-learned/    — Lessons by category (architecture/debugging/patterns/process), 61 files
│   ├── sessions/           — Session summaries (gitignored)
│   ├── enhancements/       — Enhancement specs (ENH-NNN/)
│   ├── issues/             — Issue tracking docs (issue-N/), incl. issue-13 and issue-14
│   └── plans/              — Implementation plans (LOCAL-ONLY, gitignored)
├── CLAUDE.md               — Project conventions and rules
├── .claude/                — Claude Code configuration
├── README.md                — Project overview (v0.6.18)
├── package.json              — Plugin version and dependencies
└── .claude-plugin/            — Plugin manifest (plugin.json, marketplace.json)
```

---

## Architectural Principles

1. **Modular KG system** — Multi-KG support with active/inactive switching
2. **Layered documentation** — Commands (CLI), Skills (context), Agents (heavy-lift)
3. **Approval gates** — Subagents wait for user approval before writes
4. **Git-aware** — Preserves commit metadata, branch context, issue links
5. **Privacy-first** — Sessions and chat history never committed to repo

---

## Key Decisions (from ADRs — most recent, full index in DOCUMENTATION-MAP.md)

- **ADR-065** — ROADMAP/CHANGELOG duplication resolved: CHANGELOG is the source of truth
- **ADR-064** — Shared module pattern for slash command deduplication (restored this session after prior removal)
- **ADR-063** — Never destroy known-good state before a confirmed write
- **ADR-062** — Gemini `.pb` project scoping fails closed
- **ADR-061** — First-run repair notice is platform-specific, not unified
- **ADR-059** — No hardcoded, derivable counts in plans (governs this handoff package's live-count requirement)
- **ADR-027** — Docusaurus restructure to Diátaxis docs feed (root cause of most current docs broken-link clusters — see issue-13)

64 ADRs total (+ template), the large majority status `Accepted`; open/Proposed: ADR-035, ADR-037, ADR-046, ADR-060. One Superseded: ADR-032.

---

## Code Protection Rules

**🔒 PROTECTED DIRECTORIES** (require explicit permission):
- **commands/** — Contains LLM execution prompts; changes break slash commands
- **core/templates/** — Structured YAML formats; changes break parsing

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

### Commit Format
```
type(scope): subject

[bullet summary of changes]

Closes #[issue-number]

Co-Authored-By: Claude [Model] <noreply@anthropic.com>
```

Types: `feat` | `fix` | `docs` | `refactor` | `chore` | `perf` | `style` | `test` | `build` | `ci` | `revert`

### Skills & Agents
- Skills: lowercase, kebab-case, `kmg-` prefixed (e.g., `kmg-lesson-capture`, `kmg-auto-recall`)
- Agents: kebab-case, `-agent` suffixed where applicable (e.g., `rules-capture-agent`, `session-documenter`)

---

## Version Strategy

**Current Version:** v0.6.18 (aligned across package.json, plugin.json, mcp-server/package.json, README.md)

**Versioning:**
- Major.minor.patch(.subpatch) format
- Version consistency required across: package.json, plugin.json, README.md, mcp-server/package.json
- MCP server versioned independently (may not match plugin version) — currently both at 0.6.18 but this is coincidental, not a guarantee
- Chained branches must branch from their parent branch, not main

---

## Recent Architecture Changes

1. **v0.6.18-misc-patches fully merged to `main` this session.** PR #167 ("v0.6.18 misc patches: issue-10/11/12 fixes, kg-config migration, status cleanup") merged 2026-07-14, bringing `main` to the current tip `08c04d0e`. Two Dependabot remediation branches also merged the same day: PR #168 ("fix(deps): resolve 16 Dependabot alerts in docs-site dependency tree") and PR #169 ("fix(deps): bump js-yaml to 3.15.0 in mcp-server (Dependabot #90)"). Notably, PR #167 itself carried the `kg-config.json` default-path migration (`654c13fb`, `2d0aba01`, `dd62385b`) that moved the MCP server's config default from `~/.claude/kg-config.json` to the platform-neutral `~/.kmgraph/kg-config.json` — a migration that turned out to be incomplete (see item 2 below).

2. **v0.6.19 work is queued but not started.** A second worktree exists at `/Users/mkaplan/GitHub/knowledge-graph-v0.6.19-polish` on branch `v0.6.19` (renamed this session from `v0.6.19-polish-release`), currently sitting at zero commits beyond `main`'s tip (`08c04d0e`). Two pieces of work are queued to land there as sequential commits on the same branch:
   - **issue-14 / GitHub #171** — "kg-config.json write-path split-brain": the `654c13fb` migration above was correct inside `mcp-server/src/` but was never propagated to the command/agent/script layer — 35 files across `commands/`, `agents/`, `scripts/`, `skills/`, `core/docs/`, and `mcp-server/src/cli.ts` still hardcode the old `~/.claude/kg-config.json` path, several with raw bash (`jq`/`mv`) that silently writes to the wrong file. Filed with a 3-tier severity triage; will land as commits c1/c2/c3. As of this snapshot, c1's implementation plan has not even been written yet.
   - **v0.6.19 polish-release plan** (`knowledge/plans/v0.6.19-polish-release.md`) — already written and reviewed, depends on issue-14's c1/c2/c3 landing first on the same branch. Its own Tasks 1-3 (broken-link fixes across docs-site clusters 1/4/5, a `.gitignore` pattern addition for stray plan-mirror files, and the version bump + CHANGELOG cut) are sequenced to land after the config-path fix, since Task 3 explicitly depends on issue-14 being resolved first.

3. **issue-13 / GitHub #170 filed separately, Mode 3 track-only/deferred — not blocking v0.6.19.** "No automated broken-link detection anywhere in the docs pipeline": a real `npm run build` found 45 broken links in the live Docusaurus build; `docusaurus.config.js` has `onBrokenLinks`/`onBrokenMarkdownLinks` both set to `'warn'` (never hard-fails), and the existing `kmg-docs-impact-scan` skill does prose-identifier matching rather than an actual build/link check, so no stage in the pipeline can catch a dead link. Root cause traced to ADR-027's Diátaxis restructure (2026-04-08) — links have likely been broken in production for ~3 months. This is explicitly deferred/track-only and does not block the v0.6.19 polish-release plan, which only touches link clusters 1, 4, and 5 and deliberately leaves clusters 2 and 3 (and the `onBrokenLinks` config itself) untouched.
