# Architecture Snapshot

**Snapshot Date:** 2026-08-03
**Current Released Version:** v0.6.20 (branch `v0.7.0` in progress on the main checkout, not yet released; a separate isolated worktree `.worktrees/v0.7.0-adr-067-c1` on branch `v0.7.0-adr-067-c1` is where active ADR-067 implementation is happening)

---

## Project Purpose

Knowledge management plugin for Claude Code: capture, organize, and retrieve institutional knowledge across projects, via a cross-platform MCP server (`kg_*` tools) plus Claude Code-specific slash commands/skills/agents.

---

## Directory Structure

```
knowledge-graph/
├── commands/              🔒 PROTECTED — Slash commands (/kmgraph:...)
├── skills/                — Auto-triggered context providers
├── agents/                — Subagent definitions for heavy-lift tasks
├── hooks/                 — SessionStart/Stop/PreToolUse automation (hooks.json)
├── scripts/                — Hook implementation scripts (bash)
├── mcp-server/             — Cross-platform MCP server (TypeScript/Node.js)
├── core/                  🔒 PROTECTED — Templates, examples, docs (core/default-templates/)
├── docs/                  — MkDocs Material documentation site
├── knowledge/              — Knowledge graph (sessions, decisions, lessons, issues, enhancements, plans)
│   ├── decisions/         — 70 Architecture Decision Records (ADRs)
│   ├── issues/             — Numbered issue/bug tracking (some GitHub-linked, some local-only)
│   ├── enhancements/       — Enhancement specs (ENH-NNN/)
│   ├── plans/              — Commit-group implementation plans (gitignored)
│   ├── sessions/           — Session summaries
│   ├── handoffs/           — Cross-session handoff notes
│   └── analysis/           — Ad hoc review/finding documents
├── handoff-packages/       — Generated `/kmgraph:kmg-handoff` output, one dated dir per run
├── tests/                  — Bash test suites, hardcoded array in run-all-tests.sh (not glob-discovered)
├── .worktrees/             — Git worktree isolation dirs (gitignored, e.g. v0.7.0-adr-067-c1)
├── CLAUDE.md               — Project conventions and rules
├── ROADMAP.md
└── package.json
```

---

## Current Branch State: v0.7.0

**Main checkout** (`/Users/mkaplan/GitHub/knowledge-graph`, branch `v0.7.0`, HEAD `963b3e96`) is **unchanged since the 2026-08-02 handoff** — same uncommitted working tree (`ROADMAP.md`, `ADR-054`, `ADR-055`, `ENH-054-specification.md`, `issue-31-description.md` modified; same untracked files: `knowledge/analysis/adr-067-plan-review-findings.md`, `knowledge/decisions/ADR-067-implementation-spec.md`, `knowledge/enhancements/ENH-057/`, `knowledge/enhancements/ENH-059/`, `knowledge/handoffs/2026-07-28-adr-067-implementation-spec-ready.md`, `knowledge/issues/issue-32/`, `knowledge/issues/issue-36/`, `knowledge/issues/issue-37/`). All new activity since 2026-08-02 happened in the isolated worktree below.

**Separate isolated worktree** at `.worktrees/v0.7.0-adr-067-c1` (branch `v0.7.0-adr-067-c1`) is where the actual ADR-067 implementation work is being carried out. **This is the branch/worktree relationship to keep straight: the worktree's commits are NOT reachable from the main checkout's `v0.7.0` branch shown above** — the two diverge, and this handoff package's own commit hash (`963b3e96`) refers only to the main checkout, not the worktree's progress.

- **Worktree HEAD:** advanced from `44838559` (2026-08-02 handoff) to **`ac528b6a`** — 24 commits landed.
- **Plan progress: Phases 0-5 of the 11-phase ADR-067 implementation plan are now complete**, up from Phases 0-1 at the last handoff.
- Working tree in the worktree is clean (no uncommitted changes) as of this snapshot.
- Commit range covers Phase 2 (config read/write hardening: crash-safe atomic writes, legacy-path reconciliation, guarded merge-on-conflict updateConfig), Phase 3 (interactivity/gate() chokepoint: `resolveInteractionMode()`, bounded-timeout `gate()`/`ask()` with `KMG_INPUT_REQUIRED` shape, decline/cancel handling), Phase 4 (duplicate-graphId detection and resolution: content-hash + relpath comparison, gitignored-marker detection via `isMarkerTracked()`, broad-ancestor ($HOME/root) hard-block and confirmation gating, four-answer reattach/worktree/fork/decline prompt at `kmg-init`, mandatory pre-merge backup, standalone `kg_config_remint_id` tool), and Phase 5 (compare-view: `kg_compare_graphs` MCP tool, recency/recoverability/worktree-fingerprint summary builder, `topExamples()` wiring). Each phase closed out with a "final review fixes" commit addressing reviewer findings before the next phase started.
- **For full Phase 2-5 narrative detail (design decisions, review findings resolved, test coverage added):** see the linked session summary — `knowledge/sessions/2026-08/2026-08-02-2026-08-02-v070-adr-067-c1.md` — which is the authoritative source, not this snapshot.

Most recent commits on the main checkout's `v0.7.0` branch (unchanged from 2026-08-02, newest first):
- `963b3e96` — chore: ignore `.worktrees/` for git worktree isolation
- `88d665ff` — docs(issue-38,issue-39): file two tracking-only issues found during ADR-068 verification
- `c3081d5a` — docs(issue-34,issue-35): mark resolved, cross-reference fix commits and unblock ENH-056
- `50d839f8` — fix(mcp-server): add issues/enhancements to FTS5 index and search fallback dirs
- `d3db547e` — fix(mcp-server): remove dead knowledge path literal from FTS5/search dir lists
- `4f092b62` — docs(ENH-056): update stale ENH-058 cross-reference to match resolved design

Most recent commits on the worktree's `v0.7.0-adr-067-c1` branch (newest first, since 2026-08-02):
- `ac528b6a` — fix(ADR-067): remove stray null byte introduced by prior edit in compare.ts
- `06a16adc` — fix(ADR-067): Phase 5 final review fixes (worktreeFingerprint false-positive, recency scoping, moved-category visibility, redundant recomputation, vacuous sort test)
- `5e15d570` — fix(ADR-067): wire topExamples() into kg_compare_graphs output, implement recency-based sorting
- `a5cd8ff3` — feat(ADR-067): register standalone kg_compare_graphs MCP tool
- `ec967c26` — feat(ADR-067): compare-view summary builder (recency, recoverability, worktree fingerprint)
- `9db33224` — fix(ADR-067): Phase 4 final review fixes (broad-ancestor schema gap, hashDirectory bugs, updateConfig migration, remint ordering+path guard)
- `1656732b` — feat(ADR-067): standalone kg_config_remint_id tool, reachable outside kmg-init
- `024c9031` — feat(ADR-067): four-answer duplicate-graphId prompt at kmg-init (reattach/worktree/fork/decline)
- `a331e4e9` — feat(ADR-067): hard-block $HOME/root KG registration, gate broad-ancestor registrations
- `1b922c77` — fix(ADR-067): address Phase 2 final review findings
- `b571de70` — feat(ADR-067): guarded config parse + merge-on-conflict updateConfig for disjoint concurrent writes
- `7df621d7` — fix(ADR-067): make writeConfig crash-safe (temp file + fsync + atomic rename)
- (full range: `44838559..ac528b6a`, 24 commits — see `git log` in the worktree for the complete list)

---

## Key Decisions Relevant to Current Work

- **ADR-067** — two linked documents: `ADR-067-mutable-active-switch-vs-context-derived-kg-resolution.md` (status Proposed, 2026-07-15 — the original architecture decision: replaces the mutable `.active` KG-switch pointer with context-derived/cwd-based resolution, retiring `kmg-switch`/`kg_config_switch`/`KG_MISMATCH`) and `ADR-067-implementation-spec.md` (status "Ready for implementation", 2026-07-28, untracked on main checkout — the detailed KG Resolution Model spec being executed against in the `v0.7.0-adr-067-c1` worktree, **Phases 0-5 of 11 complete** as of this snapshot).
- **ADR-068** (Accepted, 2026-08-01) — Lightweight-vs-Full Workflow Rule and a piloted hard-stop `Stop` hook (`scripts/handoff-file-tracing-gate.sh`) for handoff/recall file-tracing completion checks. First hard-stop-capable hook in this repo; every other hook only ever `exit 0`.
- **ADR-066** (Accepted, 2026-07-14) — content-storage taxonomy for global-topic and cowork modes; source of the project-local vs. personal KG split ADR-067's resolution model implements.
- **ADR-065** (Accepted, 2026-07-12) — ROADMAP.md/CHANGELOG.md duplication resolved: CHANGELOG is the single source of truth for shipped history.
- **ADR-064** (Accepted) — Shared Module Pattern for Slash Command Deduplication.

## Pre-Existing Decisions Still Governing This Branch

- **ADR-063** — archive-never-hard-delete invariant; governs ADR-067's registry-entry lifecycle design.
- **ADR-035** — `kmg-stuck-work-escalation`; a stuck-work forced-decision gate, separate from other in-progress attempt-loop tracking work (ENH-058).
- **ADR-014** — commit-per-governing-group convention.

---

## Naming Conventions

- Feature/minor branch: `v{ver}-{description}` (main branch here: `v0.7.0`; isolated worktree branch: `v0.7.0-adr-067-c1`)
- Bug-fix/patch branch: `v{ver}-fix-{description}`
- Commit format: `type(scope): subject`, Conventional Commits types, `Closes #N` in body.
- Commit-group plan files: `v{ver}-c{N}-{slug}.md` under `knowledge/plans/` (gitignored, local reference only).
- Skills/agents: `kmg-`-prefixed for Claude Code-namespace items.

## Version Strategy

- MCP server versioned independently, currently in sync (`0.6.20` across `package.json`, `mcp-server/package.json`, `.claude-plugin/plugin.json`, and README.md's stated version) on the main checkout.
- No version bump has landed on the main checkout yet. The ADR-067 implementation (in progress on the separate worktree/branch, Phases 0-5 of 11 done) is the work expected to eventually bump this to `0.7.0` (minor: schema change + surface retirement + mandatory migration).

## Code Protection Rules

**🔒 PROTECTED DIRECTORIES** (require explicit permission):
- **commands/** — Contains LLM execution prompts; changes break slash commands
- **core/default-templates/** — Structured YAML formats; changes break parsing

**✅ Allowed Modifications** (no permission needed):
- Documentation files (*.md)
- Test files and examples
- Template comments and field glossaries

---

## Most Recent ADRs (by date)

| ADR | Status | Date | Rationale (short) |
|---|---|---|---|
| ADR-068 | Accepted | 2026-08-01 | Lightweight-vs-full workflow rule; piloted hard-stop Stop hook for handoff file-tracing completion checks |
| ADR-067-implementation-spec | Ready for implementation | 2026-07-28 | Detailed KG Resolution Model spec derived from ADR-067's decision; Phases 0-5 of 11 now executed in the isolated worktree |
| ADR-066 | Accepted | 2026-07-14 | KG content-storage location for global-topic and cowork modes |
| ADR-067 (decision record) | Proposed | 2026-07-15 | Mutable `.active` switch vs. context-derived KG resolution — decision made, implementation ongoing (Phases 0-5/11 done) |
| ADR-065 | Accepted | 2026-07-12 | ROADMAP/CHANGELOG duplication — CHANGELOG is single source of truth for shipped history |

---

**Snapshot generated by:** `/kmgraph:kmg-handoff`, generated 2026-08-03, from the main checkout (`/Users/mkaplan/GitHub/knowledge-graph`, branch `v0.7.0`). This snapshot describes the whole-project state on the main checkout; it does not itself trace the separate `.worktrees/v0.7.0-adr-067-c1` worktree's implementation progress in full detail — see the linked session summary for that.
