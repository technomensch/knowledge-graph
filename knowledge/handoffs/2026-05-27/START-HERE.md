# Start Here — Project Handoff

**Created:** 2026-05-27
**Branch:** main
**Commit:** 39798b98
**Current version:** v0.5.8 (shipped) | v0.5.9 (in development)

---

## Current State

### What's In Flight

**v0.5.9 — Decision Governance** is the active development plan.
Plan: `~/.claude/plans/v0.5.9-decision-governance.md` (also at `docs/plans/`)
Status: Not yet started — plan written, ready to execute in Antigravity/Gemini.

**ENH-018 — Rules File H2 Structure Hardening** tracked and deferred.
Spec: `knowledge/enhancements/ENH-018/ENH-018-specification.md`
Plan: `~/.claude/plans/ENH-018-rules-h2-structure-hardening.md`
Target: v0.6.x (next available minor after 0.5.9)

### Uncommitted Work (main branch)

| File | Status | Notes |
|---|---|---|
| `ROADMAP.md` | Staged | ENH-018 v0.6.x entry added |
| `knowledge/decisions/ADR-028-*` | Modified | Amendment added (Decision Governance Protocol) |
| `knowledge/decisions/ADR-043-*` | Modified | Updated pre-session |
| `knowledge/rules.md` | Modified | Path F added to mid-session discovery routing |
| `knowledge/lessons-learned/README.md` | Modified | Pre-session |
| `knowledge/enhancements/ENH-015/` | Untracked | v0.5.9-related |
| `knowledge/enhancements/ENH-016/` | Untracked | Rules Auto-Split Recommendation |
| `knowledge/enhancements/ENH-017/` | Untracked | start-issue-tracking Step 1.2 UX |
| `knowledge/enhancements/ENH-018/` | Untracked | H2 Structure Hardening (this session) |
| `knowledge/handoffs/` | Untracked | This handoff package |
| 4 lessons (architecture/) | Untracked | New lessons not yet committed |

### Profile Files Changed This Session (not in repo)

| File | Change |
|---|---|
| `~/.kmgraph/me.md` | Gemini tier_map added |
| `~/.kmgraph/plan-rules.md` | Quick nav added; tier labels; Rules File Management checklist updated |
| `~/.kmgraph/governance-rules.md` | Quick nav added; gov-execute-plan 8-step protocol added |
| `~/.gemini/GEMINI.md` | Restructured to lightweight pointer (matching CLAUDE.md pattern) |
| `~/.kmgraph/knowledge/templates/parallelism-analysis.md` | Tier labels instead of resolved model IDs |

---

## Immediate Next Steps

1. **Execute v0.5.9 in Antigravity/Gemini** — plan is ready, tier labels are set
2. **Commit the uncommitted work** on main (ENH-015–018 directories, modified ADRs, rules.md, ROADMAP.md)
3. **ENH-018** — implement when v0.6.x planning begins (deferred, no action needed now)

---

## Quick Navigation

- **Active plan:** `docs/plans/v0.5.9-decision-governance.md`
- **ENH-018 spec:** `knowledge/enhancements/ENH-018/ENH-018-specification.md`
- **Commands:** `commands/` (25 slash commands)
- **Skills:** `skills/` (14 auto-triggered providers)
- **Decisions:** `knowledge/decisions/` (48 ADRs)
- **Lessons:** `knowledge/lessons-learned/` (architecture, debugging, patterns, process)
- **Sessions:** `knowledge/sessions/`
- **Profile rules:** `~/.kmgraph/rules.md`, `plan-rules.md`, `governance-rules.md`

---

## Reading Order for New Context

1. This file (5 min)
2. `OPEN-ISSUES.md` — what's blocking or pending (5 min)
3. `docs/plans/v0.5.9-decision-governance.md` — active plan (15 min)
4. `ARCHITECTURE-SNAPSHOT.md` — codebase structure (10 min)
