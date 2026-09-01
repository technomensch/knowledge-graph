# Architecture Snapshot

**Snapshot Date:** 2026-08-01
**Current Released Version:** v0.6.20 (branch `v0.7.0` in progress, not yet released)

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
│   └── handoffs/           — Cross-session handoff notes
├── tests/                  — Bash test suites, hardcoded array in run-all-tests.sh (not glob-discovered)
├── CLAUDE.md               — Project conventions and rules
├── ROADMAP.md
└── package.json
```

---

## Current Branch State: v0.7.0, Commit-Group Model

This branch runs multiple sequential commit-groups (C1-C4, plus ad hoc docs/fix commits), not one linear feature. Tracked in `knowledge/plans/v0.7.0-overview.md` (gitignored, local reference — read it directly, not summarized further here since it changes frequently).

- **C1 (ADR-067)** — replaces mutable `.active` KG-switch pointer with context-derived (cwd-based) resolution; retires `kmg-switch`/`kg_config_switch`/`KG_MISMATCH`. Owned by a **concurrent session**, status: Proposed, plan fully reviewed (25 findings across 2 independent models) and hardened, now split into an executable multi-file set (`knowledge/plans/v0.7.0-adr-067-orchestration.md` + `v0.7.0-adr-067-p0.md`...`p9.md`). **Not yet executed** — zero `mcp-server/src` code written. **Known hazard confirmed during this work:** the `~/.claude/plans/` mirror referenced above is a real, live corruption vector for concurrent sessions on this branch — a race between two sessions (this C1 work and a concurrent session's own edits) silently reverted 3 already-fixed findings mid-session via that exact mirror path, recovered via chat-history forensics, lesson captured to `~/.kmgraph/lessons-learned/process/`. Anyone touching `knowledge/plans/` or its `~/.claude/plans/` mirror while another session may also be active should treat this as a live risk, not a historical footnote.
- **C2 (issue-34/issue-35)** — FTS5 index + search fallback dir-list fixes. **Already landed** (commits `50d839f8`, `d3db547e`), run by the user in a separate session.
- **C3 (ADR-068)** — **shipped this session.** Two halves: (A) issue-25's lightweight-vs-full workflow capture rule, now in `knowledge/rules.md`; (B) a piloted hard-stop `Stop` hook (`scripts/handoff-file-tracing-gate.sh`) blocking a handoff/recall session from finalizing until every manifest-listed file was actually opened.
- **C4 (ENH-058)** — meta-issue attempt-loop diminishing-returns comparison, extends `commands/kmg-meta-issue.md`'s `--log-attempt` flow. Plan written and reviewed (Opus + Fable found 2 real blockers, both fixed pre-execution). Awaiting user "Proceed"/"Start".

**Confirmed cross-plan collisions** (both already documented in the relevant plan files, not hypothetical):
- C1 ↔ C2: both touch `mcp-server/src/tools/search.ts`. Order confirmed (independently, by Opus and Fable separately): **C2 lands first**, C1 absorbs it during its own fresh re-read.
- C1 ↔ C4: both touch `commands/kmg-meta-issue.md` for unrelated reasons. C1's own plan already notes C4 lands after it, no coordination needed on C1's side.

**issue-18** (`gov-capture-routing` unreachable) stays held, separate from the C1-C4 sequence — its fix-vs-retire decision depends on how C1 resolves, per a handoff written this session (`knowledge/handoffs/2026-08-01-issue-18-adr-067-overlap-findings.md`).

---

## Key Decisions From This Session

- **ADR-068** (Accepted, implemented) — see above. First hard-stop-capable hook in this repo's `hooks/`; every other existing hook only ever `exit 0`.
- **ENH-056** retyped `Enhancement` → `Hardening` — this work hardens existing documented behavior rather than adding new capability. Stays the umbrella tracking artifact (GitHub #199). One of its four documented instances (kmg-handoff/kmg-meta-issue prose steps silently skipped) is closed by ADR-068's pilot; instances #1 and #4 (partially, via C4) remain open.
- **issue-25** — lightweight-vs-full workflow capture rule, formalized permanently in `knowledge/rules.md` § Bug/Enhancement Triage.

## Pre-Existing Decisions Still Governing This Branch

- **ADR-063** — archive-never-hard-delete invariant; governs C1's registry-entry lifecycle design.
- **ADR-066** — content-storage taxonomy; source of the project-local vs. personal KG split C1's resolution model implements.
- **ADR-035** — `kmg-stuck-work-escalation`; a different, non-overlapping mechanism from C4/ENH-058 (whole-problem forced-decision gate vs. per-test descriptive comparison).
- **ADR-014** — commit-per-governing-group convention; why C2's issue-34/issue-35 fix landed as two commits within one plan rather than one squashed commit.

---

## Naming Conventions

- Feature/minor branch: `v{ver}-{description}` (this branch: `v0.7.0`)
- Bug-fix/patch branch: `v{ver}-fix-{description}`
- Commit format: `type(scope): subject`, Conventional Commits types, `Closes #N` in body.
- Commit-group plan files: `v{ver}-c{N}-{slug}.md` under `knowledge/plans/` (gitignored).

## Version Strategy

- MCP server versioned independently, currently in sync (`0.6.20` across `package.json`/`mcp-server/package.json`/`.claude-plugin/plugin.json`).
- No version bump has landed on this branch yet — C1 is the plan that will bump to `0.7.0` (minor: schema change + surface retirement + mandatory migration).

## Code Protection Rules

**🔒 PROTECTED DIRECTORIES** (require explicit permission):
- **commands/** — Contains LLM execution prompts; changes break slash commands
- **core/default-templates/** — Structured YAML formats; changes break parsing

**✅ Allowed Modifications** (no permission needed):
- Documentation files (*.md)
- Test files and examples
- Template comments and field glossaries

---

## Known Gaps / Open Findings, Not Yet Fixed

- **Stale pre-migration path literals** — recurring pattern (issue-31, issue-34, issue-35, issue-38): the v0.6.20 storage migration never had its verification scope extended to catch every hardcoded path reference. issue-38 (GitHub #201) is the latest instance (test-suite paths). `commands/kmg-handoff.md`'s own default output dir (`./handoff-packages/YYYY-MM-DD/`, used to create this very package) is itself flagged by issue-31 as one of these stale paths — should be `knowledge/handoffs/` per the same migration.
- **issue-39** (GitHub #202) — `kg_capture`'s `existingFile` update path duplicates frontmatter instead of replacing it. Root cause confirmed (`mcp-server/src/tools/capture.ts:267-293`), tracking only, not yet fixed.
- **ENH-056 instances #1 and #4** — `kmg-handoff`/`kmg-session-wrap` still never actually invoke `kmg-session-summary` (only reference it); `kmg-meta-issue`'s attempt-logging auto-capture is only partially addressed by C4 (a comparison step, not full auto-capture). Both still open even once C4 lands.
- **issue-33's second gap** — a recommendation buried in a linked file's prose still doesn't get promoted to the actionable checklist. Explicitly out of scope for ADR-068's pilot.

---

**Snapshot generated by:** `/kmgraph:kmg-handoff`, regenerated 2026-08-01 (supersedes an earlier same-day Thread A/Thread B version — issue-32/Thread A shipped separately, this snapshot reflects the current C1-C4 model).
