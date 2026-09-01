# Documentation Map

**Last Updated:** 2026-08-03

---

## Quick Reference

| Component | Count | Purpose |
|---|---|---|
| Commands (`commands/`) | 25 | Slash commands (`/kmgraph:...`) — PROTECTED |
| Skills (`skills/`) | 16 | Auto-triggered context providers |
| Agents (`agents/`) | 11 | Subagent definitions |
| ADRs (`knowledge/decisions/`) | 70 | Architecture decisions |
| Lessons (`knowledge/lessons-learned/`) | 65 | Lessons by category |

---

## Directory Structure

### commands/ — Slash Commands
PROTECTED: Do NOT modify without explicit permission.

25 commands under `commands/`, `kmg-`-prefixed (e.g. `kmg-handoff.md`, `kmg-session-summary.md`, `kmg-meta-issue.md`, `kmg-create-adr.md`). Full list: `ls commands/*.md`.

### skills/ — Auto-Triggered Providers

16 skills under `skills/`, `kmg-`-prefixed, auto-invoked by trigger keywords/context (see each `SKILL.md`'s frontmatter description). Notable: `kmg-auto-recall`, `kmg-lesson-capture`, `kmg-adr-guide`, `kmg-session-wrap`, `kmg-stuck-work-escalation`, `kmg-execute-plan`.

### agents/ — Subagents

11 agents under `agents/` — heavy-lift task handlers (e.g. `knowledge-extractor`, `session-documenter`, `session-summary-agent`, `recall-agent`, `create-adr-agent`).

### hooks/hooks.json — Lifecycle Automation

SessionStart runs `hooks-master.sh` (config validation, recent-lessons display, profile-staleness check). PostToolUse hooks fire on Write/Edit/Bash for lesson-capture prompts, platform-file-change detection, and plan mirroring.

### knowledge/decisions/ — Architecture Decision Records
70 ADRs, unchanged count since the 2026-08-02 handoff (no new ADR filed on the main checkout). Two ADR-067 documents exist in parallel: **ADR-067-mutable-active-switch-vs-context-derived-kg-resolution.md** (status Proposed, dated 2026-07-15 — the original decision record) and **ADR-067-implementation-spec.md** (status "Ready for implementation", dated 2026-07-28, untracked/new — the detailed KG Resolution Model implementation spec that the isolated worktree at `.worktrees/v0.7.0-adr-067-c1` (branch `v0.7.0-adr-067-c1`) is executing against, **Phases 0-5 done** as of this handoff, up from Phases 0-1 on 2026-08-02 — see the linked session summary for detail).

### knowledge/issues/ and knowledge/enhancements/
Same untracked/new items on the main checkout as the 2026-08-02 handoff: issues `issue-32`, `issue-36`, `issue-37`, and enhancements `ENH-057`, `ENH-059` — each has a single description/specification file. Still not committed. Out of scope for this handoff package (see linked session summary for the ADR-067 worktree's own state).

### knowledge/analysis/ and knowledge/handoffs/
`knowledge/analysis/adr-067-plan-review-findings.md` (untracked) and `knowledge/handoffs/2026-07-28-adr-067-implementation-spec-ready.md` (untracked) — supporting artifacts for the ADR-067 implementation-spec work, unchanged since 2026-08-02.

## Key Files

| File | Purpose | Status |
|---|---|---|
| README.md | Project overview | version 0.6.20, unchanged |
| CLAUDE.md | Project conventions and rules | unchanged |
| ROADMAP.md | Forward-looking plan | modified, uncommitted on main checkout (unchanged since 2026-08-02) |
| package.json / mcp-server/package.json / .claude-plugin/plugin.json | Version | all synced at `0.6.20` on main checkout |
| hooks/hooks.json | SessionStart/PostToolUse/Stop automation | present, no changes pending on main checkout |
| knowledge/decisions/ADR-054, ADR-055 | Upgrade-workaround / version-sentinel ADRs | modified, uncommitted on main checkout |
| knowledge/enhancements/ENH-054/ENH-054-specification.md | Modified, uncommitted on main checkout | |
| knowledge/issues/issue-31/issue-31-description.md | Modified, uncommitted on main checkout | |

**Note:** The main checkout (`/Users/mkaplan/GitHub/knowledge-graph`, branch `v0.7.0`, HEAD `963b3e96`) is unchanged since the 2026-08-02 handoff package — all activity since then happened in the isolated `.worktrees/v0.7.0-adr-067-c1` worktree, whose HEAD advanced from `44838559` to `ac528b6a` (24 commits, Phases 2-5 of ADR-067). See ARCHITECTURE-SNAPSHOT.md and the linked session summary for that work.

---

## Code Protection Rules

⚠️ These directories require explicit user permission before modification:

- **commands/** — LLM execution prompts; changes break slash command functionality
- **core/default-templates/** — Structured formats with YAML frontmatter for parsing

Allowed modifications without permission:
- Documentation files (*.md)
- Test files (tests/, test-*.js)
- Examples and guides
- Template comments and field glossaries

---

## Version Consistency

**Current versions (all synced):** `0.6.20` across `package.json`, `mcp-server/package.json`, `.claude-plugin/plugin.json`, and README.md's stated version, on the main checkout. The ADR-067 implementation (in progress on the separate `v0.7.0-adr-067-c1` worktree/branch, Phases 0-5 of 11 done per the linked session summary) is the work expected to eventually bump this to `0.7.0`. No version bump has landed on the main checkout as of this handoff.
