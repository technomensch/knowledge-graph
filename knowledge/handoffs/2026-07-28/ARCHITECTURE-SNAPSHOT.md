# Architecture Snapshot

**Snapshot Date:** 2026-07-28
**Current Release:** v0.6.20

---

## Project Purpose

KMGraph: a knowledge management plugin for Claude Code (+ Codex, + Gemini) — capture, organize, and retrieve institutional knowledge across projects, with a cross-platform MCP server.

---

## Directory Structure

```
knowledge-graph/
├── commands/              🔒 PROTECTED — 25 slash commands (/kmgraph:...)
├── skills/                — 16 auto-triggered context providers
├── agents/                — 11 subagent definitions for heavy-lift tasks
├── hooks/                 — SessionStart/lifecycle automation (hooks.json, 6 hooks)
├── mcp-server/            — Cross-platform MCP server (TypeScript/Node.js)
│   ├── src/index.ts       — the actual MCP server every platform spawns
│   ├── src/cli.ts         — separate standalone setup/init CLI wizard (not the MCP entry point)
│   └── src/utils.ts       — config read/write, getProjectRoot() (guard, not a router — see ADR-067)
├── core/                  🔒 PROTECTED — templates, examples, docs
├── docs/                  — Docusaurus documentation site
│   └── specs/             — design specs (includes a SUPERSEDED ADR-067 draft, see note below)
├── knowledge/             — the project's own knowledge graph
│   ├── decisions/         — 68 ADRs
│   ├── lessons-learned/   — 65 lessons by category
│   ├── issues/            — 28 numbered issues + named meta-issues
│   ├── enhancements/      — ~55 ENH specs
│   ├── sessions/          — session summaries
│   └── chat-history/      — extracted chat logs (gitignored)
├── .codex-plugin/         — Codex CLI plugin registration (mcp.json has a known cwd bug)
├── CLAUDE.md              — project conventions and rules
├── package.json           — plugin version (v0.6.20)
└── .claude-plugin/        — Claude Code plugin manifest
```

---

## Architectural Principles

1. **Multi-KG system, currently mid-redesign** — project-local (many, one per repo) + personal (exactly one, cross-project) KG shapes. A third shape (global-topic KGs) was descoped 2026-07-26 (see ADR-067, ENH-053).
2. **Layered documentation** — Commands (CLI), Skills (auto-triggered context), Agents (heavy-lift, approval-gated writes).
3. **Approval gates** — subagents wait for user approval before writes; a dispatched subagent structurally cannot accept a relayed "approve" from the coordinating session — only the user's own direct message counts.
4. **Git-aware** — preserves commit metadata, branch/issue links.
5. **Privacy-first, imperfectly enforced today** — sessions/chat-history are meant to stay uncommitted and project-scoped; **a real cross-project content-bleed bug was found and filed this session** (issue-29 / GitHub #197) — `/kmgraph:kmg-extract-chat` defaults to scanning ALL projects on the machine unless explicitly scoped with `--project=`, and has been doing so since at least 2026-02.

---

## Key Decisions In Flight (ADR-067)

**ADR-067** — replacing the mutable `.active` KG-resolution pointer (shared, global, drift-prone) with per-call context-derived resolution — is the active architectural thread as of this snapshot. Status: design substantially resolved across 3 brainstorming rounds + 2 Opus reviews + 1 Fable review + 1 Opus-validates-Fable pass, but **not yet implementation-ready**. Key resolved points:
- Project-local KGs resolve from cwd/project-root per call (verified empirically: Claude Code and Gemini's cwd is reliable per-session; Codex's process cwd is NOT reliable, but Codex exposes a real, verified alternative — the `codex/sandbox-state-meta` experimental MCP capability, injecting the live turn's cwd into `_meta` on every tool call).
- **Nested project-local KGs are allowed** (as of 2026-07-28), resolved via deepest-registered-path-wins — reversing an earlier "ban nesting entirely" decision after a 3-model (Claude/Opus/Fable) joint complexity check found allowing it removes more validation logic than it adds.
- Personal KG addressed via explicit `scope` param, never a persisted switch; `kmg-switch` is retired as a config-mutating command entirely.
- Registry entries gain a lightweight `status`/`statusChangedAt` lifecycle (archive/delete, never hard-delete); a **live split-brain was caught mid-session** between `~/.kmgraph/kg-config.json` (current) and legacy `~/.claude/kg-config.json` (still being written by at least one code path) — direct, reproducible evidence for why this migration must retire the legacy path outright.
- **13 items from the Fable review remain to be resolved one at a time** (§ Fable Review Findings in the ADR) — in progress as of this snapshot; item 1 and 2 are done, item 3 ($HOME/CI identity check) was the live discussion when this handoff was generated.

**The original 2026-07-26 draft spec** (`docs/specs/2026-07-26-adr-067-kg-resolution-v0.7-spec.md`) is **SUPERSEDED** — do not read it for current state, do not edit it further. ADR-067 itself is the sole authoritative source until a new implementation-ready spec is written.

---

## Code Protection Rules

**🔒 PROTECTED** (require explicit permission): `commands/`, `core/default-templates/`.
**✅ Allowed without permission:** documentation, tests, examples, template comments.

---

## Naming Conventions

**Branches:** `v{ver}-{description}` (feature), `v{ver}-fix-{description}` (bugfix), `docs-update-{description}` (docs-only), `issue/{N}-{slug}` (issue-tracking workflow branches, e.g. current branch `issue/29-chat-extraction-cross-project-bleed`).

**Commits (Conventional):** `type(scope): subject`, types = `feat|fix|docs|refactor|chore|perf|style|test|build|ci|revert`, body includes `Closes #N` or `Refs #N` (use `Refs` for tracking-only issues where implementation hasn't started — established this session for issue-29).

**Local ID schemes:** `issue-N` and `ENH-NNN` are two independent, deliberately un-unified sequences — no design rationale was ever found for the split (investigated in issue-11), and unifying them was explicitly rejected (blast radius too large for the benefit).

---

## Version Strategy

**Current:** v0.6.20, all version files in sync. `mcp-server/` versions independently in principle but currently matches. **Known gap:** installed plugin-cache code can silently lag behind these version files (see DOCUMENTATION-MAP.md's version-consistency note) — a real, currently-running instance of this was found on this machine during the ADR-067 brainstorm.

---

## Recent Architecture Changes (most recent first)

1. **ADR-067** (Proposed, in-progress) — mutable `.active` switch → context-derived KG resolution.
2. **ADR-066** (Accepted, 2026-07-17) — KG content storage location for global/cowork modes; cowork retired, global-topic KGs kept as a taxonomy concept (later descoped from ADR-067's scope specifically).
3. **ADR-063** (Accepted) — never destroy known-good state before a confirmed write; governs archive-not-delete patterns throughout ADR-067's design.
4. **ADR-060** (Proposed) — context-mode contrast, cited as prior art for why the KG switch was originally manual/git-like rather than auto-detected.

---

## See Also

- `/kmgraph:kmg-session-summary` — generate today's session summary (not yet run today — see START-HERE.md)
- `/kmgraph:kmg-recall` — search across captured knowledge
- `knowledge/decisions/ADR-067-mutable-active-switch-vs-context-derived-kg-resolution.md` — read this in full before continuing the active work
- `knowledge/issues/issue-29/` — chat-extraction bleed bug, tracking-only, not yet implemented
