# Documentation Map

**Last Updated:** 2026-08-01

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

16 skills under `skills/`, `kmg-`-prefixed, auto-invoked by trigger keywords/context (see each `SKILL.md`'s frontmatter description). Notable: `kmg-auto-recall`, `kmg-lesson-capture`, `kmg-adr-guide`, `kmg-session-wrap`, `kmg-stuck-work-escalation`.

### agents/ — Subagents

11 agents under `agents/` — heavy-lift task handlers (e.g. `knowledge-extractor`, `session-documenter`, `session-summary-agent`, `recall-agent`).

### knowledge/decisions/ — Architecture Decision Records
70 ADRs. Most recent this session: **ADR-068** (`ADR-068-lightweight-vs-full-workflow-rule-and-piloted-command-completion-check.md`, Accepted, implemented). In-progress, owned by a concurrent session: **ADR-067** (`ADR-067-mutable-active-switch-vs-context-derived-kg-resolution.md`, status Proposed — implementation plan fully reviewed/hardened/split into 10 phase files as of the concurrent session's own work, still **0 lines of `mcp-server/src` code written**; execution not yet started).

### knowledge/plans/ — Commit-Group Plans (gitignored, local reference only)
- `v0.7.0-overview.md` — tracking doc for the whole branch: C1-C4 status, real file collisions, recommended execution order.
- `v0.7.0-c2-issue-34-35-patch.md` (C2) — **already landed elsewhere** (commits `50d839f8`, `d3db547e` on `v0.7.0`; issue-34/issue-35 now `status: fixed`).
- `v0.7.0-adr-067-kg-resolution.md` (C1) — **superseded, kept as historical reference only**. Owned by a concurrent session: the plan went through a full 25-finding review (`knowledge/analysis/adr-067-plan-review-findings.md`), a corruption incident (concurrent-session race on this same gitignored plan-mirror — lesson captured to `~/.kmgraph/lessons-learned/process/`), and a ground-up rewrite. **Current authoritative form is the split set**: `v0.7.0-adr-067-orchestration.md` + `v0.7.0-adr-067-p0.md`...`p9.md` (10 phases, ready to execute starting at Phase 0). Neither the original nor the split set has been executed — this is plan-authoring work only.
- `v0.7.0-c4-enh-058-attempt-loop-comparison.md` (C4) — written, self-reviewed, plan-reviewed by Opus+Fable (2 blockers found and fixed), awaiting user "Proceed"/"Start".

### knowledge/issues/ and knowledge/enhancements/
Not covered by `kg_search`'s FTS5 index until recently (issue-34's fix, C2, adds this — already landed). Two issues filed this session, tracking-only, no branch:
- **issue-38** (GitHub #201) — stale `kmg-`prefix test-path references across 7 `tests/` suites.
- **issue-39** (GitHub #202) — `kg_capture`'s `existingFile` update path duplicates frontmatter instead of replacing it; root cause confirmed in `mcp-server/src/tools/capture.ts:267-293`.

## Key Files

| File | Purpose | Status |
|---|---|---|
| README.md | Project overview | unchanged this session |
| CLAUDE.md | Project conventions and rules | unchanged this session |
| knowledge/rules.md | Project-level behavioral rules | modified this session (issue-25's lightweight-vs-full rule added) |
| package.json / mcp-server/package.json / .claude-plugin/plugin.json | Version | all synced at `0.6.20` — C1 (ADR-067) will bump to `0.7.0` when it lands |
| hooks/hooks.json | SessionStart/Stop/PreToolUse automation | modified this session — new `handoff-file-tracing-gate.sh` registered as a second `Stop` hook |
| scripts/handoff-file-tracing-gate.sh | New this session (ADR-068) — hard-stop `Stop` hook, first of its kind in this repo (every other hook only ever exits 0) | shipped |

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

**Current versions (all synced):** `0.6.20` across `package.json`, `mcp-server/package.json`, `.claude-plugin/plugin.json`. C1 (ADR-067) is the plan that will bump this to `0.7.0` (minor — schema change + surface retirement + migration) once executed. No version bump has happened yet on this branch.
