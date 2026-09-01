# Open Issues & Pending Work — 2026-05-25

---

## Active Branch Work

### v0.5.8 — Ready to PR (PREREQUISITE for v0.6.0)
- **Status:** Fully implemented, unpushed
- **Action:** `gh pr create --base main --title "v0.5.8 — fix plan rules injection + MEMORY.md cascade"`
- **Blocks:** v0.6.0 cannot branch until v0.5.8 merges to main

---

## v0.6.0 Phase 1 — Decisions In Progress

### Completed this session (recorded in plan)
1.1 npm scope, 1.2 version sync, 1.3a–f (platform list, pointer format, pointer source, pointer refs, vocab versioning, cursor path)

### Remaining Phase 1 decisions
- **1.4** — kg-config migration (`~/.claude/kg-config.json` → `~/.kmgraph/config.json`) ⛔ BLOCKING
- **1.5** — Bootstrap skill (14 skills × 10 platforms) ⛔ BLOCKING
- **1.6** — Deployment model: co-located vs npm-global ⛔ BLOCKING
- **1.7** — Postinstall landmine (bug fix, no decision needed) ⛔ BLOCKING
- **1.8** — Clone-once vs per-platform-copy
- **1.9** — Hooks: accept-and-document vs port (10 platforms — leans accept-and-document)
- **1.10** — AGENTS.md symlink Windows compat
- **1.11** — Copilot CLI scope (enterprise-gated, untestable)
- **1.12** — npm publish mechanics
- **1.13** — INSTALL.md detection (10 Tier 1; Cursor = dual-detection)

### Pending 1.3 sub-decisions (not yet reached)
- **Decision 7** — `kg_*` MCP tool names in templates (MCP-setup fallback impact)
- **Decision 8** — `## Platform Preferences ({Platform})` heading required in templates
- **Decision 9** — Merge strategy for existing hand-edited platform files

---

## Project-Wide Impact Items (from cascade analysis)

### Impact 3 — ENH-013 must precede Task 2.4
`kg-recall` skill must be renamed to `auto-recall` BEFORE Task 2.4 creates 140 tool mapping files (14 skills × 10 platforms). Baking the wrong name into 140 files is expensive to fix.
- **Action:** Decide: pull ENH-013 into v0.6.0 scope, or do it as a separate PR immediately before v0.6.0 branch opens
- **ENH-013 spec:** `knowledge/enhancements/ENH-013/ENH-013-specification.md`

### Impact 4 — ENH-014 / v0.6.0 config migration overlap
ENH-014 behavioral fixes are in v0.5.8 (done). But `commands/init.md` is touched by BOTH v0.5.8 (subagent relay fix) AND v0.6.0 Task 2.3 (kg-config migration + platform template work). Sequence: v0.5.8 merges first, then v0.6.0 branches from updated main.
- **Action:** Confirm v0.5.8 PR merge before opening v0.6.0 branch — no special coordination needed beyond that

### Impact 5 — Hook variable audit
Regression fix (commit e727b226) changed `${CLAUDE_PROJECT_DIR}` → `${CLAUDE_PLUGIN_ROOT}`. Confirm no stale variable references remain in any hook script.
- **Action:** `grep -r "CLAUDE_PROJECT_DIR" scripts/ hooks/` — should return zero hits on main post-v0.5.8 merge

---

## Open GitHub PRs (triage needed)

| PR | Title | Age | Risk |
|----|-------|-----|------|
| #122 | Dependabot: npm_and_yarn bump | Today | Low — security update |
| #112 | MEMORY.md governance migration | 3 wks | Review — predates v0.5.8 ENH-014 fix; may conflict |
| #90 | Chat-history path config | 6 wks | Medium — architecture may have shifted |
| #76 | Docs: no-branch-delete rule | 7 wks | Low — docs only |
| #73 | Draft-and-approve flow | 7 wks | High — predates many command changes |
| #71 | CI Node.js 24 + version sync | 7 wks | Medium — CI config |

**Recommendation:** Triage #112 before v0.6.0 — governance migration may conflict with new platform architecture. PRs #71–90 are likely stale.

---

## Open GitHub Issues (enhancements)

| Issue | Title | Priority |
|-------|-------|----------|
| #47 | ENH-006: Sequential prompts in start-issue-tracking | Low |
| #46 | ENH-005: FTS5 DB relocation to user cache | Medium |
| #41 | ENH-002: Session snapshot on capture | Medium |
| #39 | v0.2.1 backlog (kg_capture, sync-all, skill modernization) | Low |

---

## Unstaged Files Needing Commit

| File | Action |
|------|--------|
| `knowledge/sessions/2026-05/2026-05-25-v0.6.0-phase-1-planning-multi-platform-decisions.md` | Commit with `docs(session): v0.6.0 Phase 1 planning` |
| `handoff-packages/2026-05-25/` | Gitignored (local only) |
