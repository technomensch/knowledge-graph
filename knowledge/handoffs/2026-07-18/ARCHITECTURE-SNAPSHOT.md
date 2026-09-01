# Architecture Snapshot

**Snapshot Date:** 2026-07-21
**Current Release:** v0.6.19 (v0.6.20 functionally complete on this branch, not yet pushed)

---

## Project Purpose

Knowledge management plugin for Claude Code (+ cross-platform via MCP: Codex CLI, Gemini CLI): capture, organize, and retrieve institutional knowledge across projects.

---

## Directory Structure

```
knowledge-graph/
├── commands/              🔒 PROTECTED — Slash commands (/kmgraph:...), 25 files
├── skills/                — Auto-triggered context providers, 16 skills (incl. new
│                             kmg-paperwork-audit, added this branch — companion to the
│                             pre-push-gate.sh Gate 6 check)
├── agents/                — Subagent definitions, 11 agents
├── hooks/                 — SessionStart/PostToolUse automation (hooks.json, 13 entries)
├── mcp-server/            — Cross-platform MCP server (TypeScript/Node.js)
│   ├── src/tools/         — kg_config_*, kg_search, kg_fts5_*, kg_scaffold, kg_upgrade, kg_version
│   ├── src/cli.ts         — non-Claude-Code init wizard (Codex/Gemini path)
│   └── dist/              — built bundles (esbuild), version baked at build time via __SERVER_VERSION__
├── core/                  🔒 PROTECTED — templates, examples, docs
│   ├── default-templates/ — YAML frontmatter structures for new KG scaffolding
│   ├── examples/          — reference implementations
│   └── docs/              — bundled reference docs (separate from docs/ site; was stale
│                             re: docs/->knowledge/ migration, fixed by v0.6.20 Task 6 and a
│                             follow-up Fable review pass that caught two remaining misses)
├── docs/                  — Docusaurus documentation site (122 files)
│   ├── reference/         — commands, skills, agents, hooks, templates
│   ├── pillars/           — organizing/capturing/portability guides
│   └── demos/             — recorded terminal-session GIFs (init.tape etc.)
├── knowledge/             — the project's OWN knowledge graph (dogfooding its own product)
│   ├── decisions/         — 68 ADRs
│   ├── enhancements/      — 46 ENH-NNN specs
│   ├── issues/            — 28 issue-N docs
│   ├── lessons-learned/   — 57 lessons (architecture/process/patterns/debugging)
│   ├── sessions/          — session summaries (gitignored)
│   ├── plans/             — local working copies of ~/.claude/plans/ (gitignored)
│   └── chat-history/      — extracted chat logs (gitignored)
├── CLAUDE.md              — project conventions and rules
├── ROADMAP.md             — prioritized backlog + version-history table
├── README.md, INSTALL.md, CHANGELOG.md
├── package.json           — plugin version (v0.6.19, v0.6.20 in progress)
└── .claude-plugin/, .codex-plugin/ — marketplace manifests for each platform
```

---

## Architectural Principles

1. **Multi-KG system** — personal (`~/.kmgraph/` root), project-local (in-repo `knowledge/`), and (as of v0.6.20) global-topic (`~/.kmgraph/knowledge-graphs/<name>/`) modes, switchable via a single `active` pointer in `~/.kmgraph/kg-config.json`.
2. **Layered documentation** — Commands (thin CLI dispatchers) → Skills (auto-invoked context) → Agents (heavy-lift, approval-gated writes).
3. **Platform-agnostic by design** — ADR-028 established moving kmgraph data out of `~/.claude/` (Claude-Code-specific) into `~/.kmgraph/` (reachable by Gemini CLI, Codex, Copilot, etc.). v0.6.19/v0.6.20 close out the last gaps in that migration.
4. **Approval gates on writes** — subagents present drafts and wait for explicit confirmation before calling `kg_capture` or pushing/committing.
5. **Never destroy known-good state** (ADR-063) — migrations detect-and-archive rather than silently delete or overwrite.

---

## Key Decisions Currently Live (from ADRs)

- **ADR-066 (Accepted, resolved 2026-07-17)** — Cowork KG mode retired from new setups (existing content archived, not dropped); global-topic KG mode kept, relocates to `~/.kmgraph/knowledge-graphs/<name>/`; `cli.ts`/MCP server becomes authoritative for storage-mode logic once its own bugs are fixed. **Implementation complete on this branch (v0.6.20); not yet pushed.**
- **ADR-067 (Proposed, open)** — mutable `.active` switch vs. context-derived KG resolution. Directly motivated by a live incident this session: the active KG drifted to an unrelated project mid-session because of a parallel plugin install elsewhere. Not yet decided.
- **ADR-028 (Accepted)** — personal KG lives directly at `~/.kmgraph/` root; NOT reopened by ADR-066's global-topic relocation.
- **ADR-063 (Accepted)** — never destroy known-good state before a confirmed write; governs the cowork-content archive-not-delete requirement in v0.6.20.

---

## Code Protection Rules

**🔒 PROTECTED DIRECTORIES** (require explicit permission):
- **commands/** — LLM execution prompts; changes break slash commands
- **core/default-templates/**, **core/templates/** — structured YAML formats; changes break parsing

**Currently approved for v0.6.20 only** (do not assume this carries to other branches): `core/docs/`, `core/README.md`, `core/examples/`, `commands/kmg-init.md`, `commands/kmg-list.md`.

**✅ Allowed without permission:** documentation files outside `commands/`/`core/`, test files, examples/guides, template comments.

---

## Naming Conventions

### Branch Names
- Feature/patch: `v{major}.{minor}.{patch}[.{hotfix}]-{description}` (e.g., `v0.6.20-storage-migration-completion`)
- Docs-only: `docs-update-{description}` — no version prefix

### Commit Format
```
type(scope): subject

[body]

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
```
Types: `feat` | `fix` | `docs` | `refactor` | `chore` | `perf` | `style` | `test` | `build` | `ci` | `revert`

### Skills & Agents
- Skills: lowercase kebab-case, `kmg-` prefix for shipped project skills (e.g., `kmg-auto-recall`); `gov-*`/`proj-*`/`plan-*` prefix denotes the author's separate PERSONAL cross-project tooling in `~/.claude/skills/` — NOT part of this shipped plugin (see issue-18 for why this distinction matters).
- Agents: kebab-case file names (e.g., `session-summary-agent.md`, `create-adr-agent.md`).

### Issue/Enhancement ID scheme
- **Local ID is authoritative**, GitHub issue number is mapped but allowed to drift (PRs/discussions consume numbers). Both directions recorded: local doc's frontmatter has `github-issue`, GH issue body references the local ID.
- **Verify "next number" against full history, not just current directory** — retired-and-removed numbers (e.g. old ENH-043/044/045/046/047, consolidated into ENH-038) look free from a directory listing alone. Check `git log --all` and `CHANGELOG.md` too before assigning a new number.

---

## Version Strategy

**Current:** v0.6.19 on main; v0.6.20 fully bumped and synced on this branch (not yet merged) — plugin and `mcp-server` bump together, since `mcp-server` source changed again this release.

- Pre-1.0, four-segment scheme: `major.minor.patch.hotfix`.
- Version sync required across 6+ files on every release (see `knowledge/rules.md` § Version & Release) — this has drifted before; on this branch, version 0.6.20 has been confirmed consistent across `package.json`, `.claude-plugin/plugin.json`, `.codex-plugin/plugin.json`, `.claude-plugin/marketplace.json`'s embedded plugin entry, `mcp-server/package.json`, both `package-lock.json` files, and `README.md`.
- `mcp-server` versioned independently but tracks the plugin release cadence in practice.
- `kg_version`/MCP handshake version is baked at BUILD time via esbuild's `__SERVER_VERSION__` define, sourced from `package.json` — previously hardcoded and stale (issue-16/#174, fixed 2026-07-17).

---

## Recent Architecture Changes (last ~5 ADRs)

- **ADR-067** — mutable `.active` switch vs. context-derived resolution (Proposed, open)
- **ADR-066** — KG content-storage location for global-topic/cowork modes (Accepted, resolved 2026-07-17, implementation complete as v0.6.20)
- **ADR-065, ADR-064, ADR-063** — see `knowledge/decisions/` for full detail; ADR-063 (never destroy known-good state) is the most operationally relevant to current work.

---

## Active Work In Progress (this branch)

Branch `v0.6.20-storage-migration-completion`, commit `4f5beeff`. All 13 tasks of the original plan are complete and verified (mcp-server 147/147 tests, `tsc`/build clean), plus additional work discovered along the way (a data-loss bug fix with regression test, two adversarial review passes, new tracked issues/enhancements, a new pre-push paperwork-enforcement mechanism). Only step remaining: push + open PR, held pending explicit user go-ahead. See `knowledge/sessions/2026-07-18-v0.6.20-storage-migration-completion.md` for full detail; original task list at `~/.claude/plans/v0.6.20-storage-migration-completion.md`.
