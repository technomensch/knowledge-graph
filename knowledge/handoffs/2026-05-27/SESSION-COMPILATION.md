# Session Compilation

**Compiled:** 2026-05-27
**Branch:** main

---

## Session: 2026-05-27 — Tier Labels, Gemini Profile Pointer, Governance Hardening

**Type:** Refactoring / Documentation
**Status:** Completed

**What changed:**
- Tier labels (`fast-tier`/`standard-tier`/`powerful-tier`) now used everywhere instead of resolved model names (Sonnet/Haiku/Opus). Templates are now platform-agnostic.
- `~/.gemini/GEMINI.md` restructured from 50-line inline ruleset to a lightweight pointer file matching `CLAUDE.md` — both platforms now share rules from `~/.kmgraph/` profile files.
- `gov-execute-plan` 8-step strict execution protocol added to `~/.kmgraph/governance-rules.md` so Gemini can enforce it without the Claude Code skill.
- Quick navigation headers added to `plan-rules.md` and `governance-rules.md`.
- Gemini tier_map added to `~/.kmgraph/me.md` (Flash Medium / Pro Low / Pro High).
- ENH-018 (H2 structure hardening) tracked and deferred.

**Key decisions:**
- Tier labels are the right abstraction — templates must never reference concrete model names
- Pointer-file pattern (CLAUDE.md / GEMINI.md as thin loaders) is the correct cross-platform architecture
- H2 hardening in rules split files needs ENH tracking, not inline fix (cascades to init scripts)

**Snapshot:** `knowledge/sessions/2026-05/2026-05-27-snapshot-tier-labels-gemini-profile-governance.md`

---

## Session: 2026-05-25 — v0.5.8 Ship + ADR-028 Amendment

**Type:** Release / Documentation
**Commits:** `39798b98` (docs/adr), `1889d9e0` (v0.5.8 release)

**What changed:**
- v0.5.8 shipped: fixed `pre-skill-rules-inject.sh`, restored v0.5.7 hook contents, fixed MEMORY.md cascade (ENH-013, ENH-014)
- ADR-028 amended with Decision Governance Protocol + Open Questions capture (from v0.5.9 design)
- `rules.md` split into focused files: `plan-rules.md`, `governance-rules.md`

---

## Session context for v0.5.9

The v0.5.9 plan (`decision-governance`) is fully written and validated. It introduces:
- `brainstorm-recall` skill: inline recall + background ADR/ENH dispatch + review-or-save prompt
- Extended `adr-guide`: supersede check, Open Questions section in ADR template
- Extended `gov-execute-plan`: mid-execution discovery protocol (Path F/1/2/3)
- Full hook rewrite: 7 case branches, fallback vars, HARD BLOCK gates
- `kg-recall` SKILL.md full rewrite
- 17-19 test cases

This plan should be executed in Antigravity/Gemini. The tier labels in the wave table are now correct (`fast-tier`/`standard-tier`/`powerful-tier`).

---

## Recent Key Lessons

| Lesson | Location | Key Takeaway |
|---|---|---|
| Plugin skills auto-discovery | `lessons-learned/architecture/` | Skills must be in `skills/*/SKILL.md` — no hooks.json registration needed |
| Recall two-query pattern | `lessons-learned/architecture/` | Always send two queries in recall: specific + broad |
| Subagent tmp isolation | `lessons-learned/architecture/` | Gate tmp file checks at parent, not in subagent |
| FTS5 searchdirs missing chat history | `lessons-learned/architecture/` | Chat history path must be registered in FTS5 config |
