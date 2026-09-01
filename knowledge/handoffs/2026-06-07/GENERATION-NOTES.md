# Generation Notes — Handoff Package 2026-06-07

This file documents gaps, failures, and observations encountered during handoff package generation,
plus additional errors surfaced during the 2026-06-08 session review.

---

## All 16 Findings

### From GENERATION-NOTES.md (original 7 — generation-time gaps)

#### 1. decisions/ path wrong — ADRs are in knowledge/decisions/, not decisions/

**Severity:** Moderate
**Command spec says:** `ls -1 decisions/ADR-*.md`
**Actual location:** `knowledge/decisions/ADR-*.md`

Shell glob `decisions/ADR-*.md` failed (zsh "no matches found"). Correct path recovered manually.
Output is accurate; spec has stale path. ~10 occurrences throughout handoff.md, not just the shell commands.

**Addressed by:** v0.5.10.1 Task 5 (stale-path grep + fix all occurrences)

---

#### 2. Only 3 session files found (spec expects up to 5)

**Severity:** Low
**Command spec says:** "List last 5 session files by date"
**Actual count:** 3 session files (plus README.md and session-template.md)

Expected for a project with limited session history. Spec will change to "last 3" in v0.5.10.1.

**Addressed by:** v0.5.10.1 Task 2 (Session History references last 3, not 5)

---

#### 3. lessons-learned/ count mismatch between README and filesystem

**Severity:** Low
**README.md says:** "Total Lessons: 7" (last updated 2026-04-28)
**Filesystem find:** ~30 .md files (includes README files, index files, templates)

`find` counts all .md files; actual lesson count is 7–12 substantive files.

**Addressed by:** v0.5.10.1 Task 5 (exclude README/template/index from count; fix path to knowledge/lessons-learned/)

---

#### 4. README.md does not show a version header

**Severity:** Low
`head -5 README.md` returned empty/blank. Version marker unconfirmed from first 5 lines.
ARCHITECTURE-SNAPSHOT uses package.json as authoritative — acceptable fallback.

**Status:** Acceptable as-is (package.json is authoritative)

---

#### 5. No TODO/FIXME/XXX/HACK comments found

**Severity:** Informational
Scan of commands/, skills/, agents/ found none. Expected for a well-maintained codebase.

**Status:** No fix needed

---

#### 6. Stale PRs (#71, #73, #76, #90, #112)

**Severity:** Moderate — needs user review
5 of 6 open PRs appear significantly behind main (main is at v0.5.10; these PRs reference v0.2.x–v0.5.6 branches).
They were not automatically closed and may need triage.

**Status:** ✅ Resolved 2026-06-08 — all 5 closed (#71, #73, #76, #90, #112). Content assumed applied in subsequent branches. Only open PR remaining: #129 (dependabot hono bump in mcp-server).

---

#### 7. Uncommitted changes on working tree not in any plan

**Severity:** Low
`commands/handoff.md` has uncommitted modifications. Likely caused by this handoff test run.
Not committed as part of v0.5.10.

**Addressed by:** v0.5.10.1 (will produce a clean commit for handoff.md)

---

### From 2026-06-07-v0510-full-summary.md (5 session-level findings)

#### 8. Branch confusion — implementation on wrong branch

**Severity:** High
Implementation began on v0.5.11 instead of v0.5.10-ux-session-handoff. All 16 files written before detection.
Recovery: identified all 16 affected files and re-applied in parallel sweep on the correct branch.

**Status:** Resolved during session. Lesson captured: parallel re-apply faster than cherry-pick for chained-branch divergence.

---

#### 9. ENH-021 spec incomplete — missed second artifact shape

**Severity:** Moderate
Spec assumed a single handoff artifact (one .md file). Reality has two shapes:
1. Session-style — single .md in knowledge/sessions/YYYY-MM/ with YAML frontmatter
2. Package handoff — multi-file output under ./handoff-packages/YYYY-MM-DD/

`continues_from` had to be added to both shapes.

**Status:** Resolved in v0.5.10. Lesson captured. ADR-051 documents the asymmetric coupling.

---

#### 10. Protocol violation — premature Haiku dispatch

**Severity:** Moderate
Second Haiku agent dispatched when user said "recall-gate is approved" — agent interpreted as "Start"
but user intended "update plan only."

**Status:** Process issue, not a spec bug. No code fix needed.

---

#### 11. ENH-022 scope discovery gap

**Severity:** Moderate
Original scope covered only knowledge/concepts/ vs core/templates/. Session revealed problem is whole-graph:
all four directory pairs need fixing (decisions/, lessons-learned/, sessions/, knowledge/ ↔ concepts/).
Spec updated post-discovery (commit 94c4d347).

**Status:** ✅ Resolved 2026-06-08 — spec updated and brainstorm complete. v0.5.10.6 plan ready for implementation tasks.

---

#### 12. ENH-022 brainstorm gate not satisfied — HIGH BLOCKER

**Severity:** High
Brainstorm gate required before ENH-022 implementation. 0/6 items done:
- Grep audit (all references)
- Atomicity plan
- Two init.md design specs
- Tier 3 breaking-change wording
- PROTECTED-code permission

**Status:** ✅ Resolved 2026-06-08 — all 6 brainstorm items confirmed. PROTECTED-code permission granted. v0.5.10.6 plan status: BRAINSTORM COMPLETE.

---

### From 2026-06-08 Opus architecture review (2 additional findings)

#### 15. Duplicate session files — root cause identified

**Severity:** High (ENH-002 core gap)
`knowledge/sessions/` shows the multi-file-per-day failure ENH-002 exists to prevent:
- 2026-04-11: two files (`2026-04-11-...-review-fixes.md` + `2026-04-11-consolidated.md`)
- 2026-04-12: two files (`2026-04-12.md` + `2026-04-12-snapshot.md`)
- 2026-06-07: two files (`2026-06-07-v0510-ux-session-handoff.md` + `2026-06-07-v0510-full-summary.md`)

Root cause: snapshot mode has a one-file-per-day existence check (`session-summary-agent.md` S1 `:104-112`); full-session mode (Steps 1–9) does not. They also derive filenames differently, so even if one mode found the existing file, the other would write a different name.

**Addressed by:** v0.5.10.1 Task 2 — Step 1.5 (lift existence check to full-session path) + unified filename `YYYY-MM-DD-{branch-slug}.md` across both modes.

---

#### 16. session-template.md — wrong structure (no zone model)

**Severity:** Moderate
`knowledge/sessions/session-template.md` uses flat structure (What We Built → Decisions → Problems → Next Steps). No operational zone, no divider, no `as_of_commit` frontmatter field. New sessions created from template would not have zone structure and would be missing the gate section.

**Addressed by:** v0.5.10.1 Task 2 — replace template with zone-structured layout (Gate → Operational Snapshot divider → 4 operational sections → Accumulated Narrative divider).

---

### From OPEN-ISSUES.md (2 additional findings)

#### 13. Multiple uncommitted file modifications + untracked directory

**Severity:** Moderate
Four files with uncommitted changes plus new untracked directory and test artifact:
- `commands/handoff.md` (M) — handoff test run edits
- `knowledge/enhancements/ENH-002/ENH-002-specification.md` (M) — spec updates
- `knowledge/enhancements/ENH-022/ENH-022-specification.md` (M) — scope broadening commit 94c4d347
- `knowledge/enhancements/ENH-023/` (untracked new directory)
- `.playwright-mcp/` (untracked test artifact)

**Addressed by:** v0.5.10.1 — commits handoff.md, ENH-002 spec, ENH-023 spec; adds `.playwright-mcp/` to `.gitignore`.

---

#### 14. ADR-040 precedent misread in prior spec

**Severity:** Low
ENH-022 prior spec had backward understanding of ADR-040 precedent. Corrected during session:
precedent is "fix-the-source, leave-deployed-names-natural" not the inverse.

**Status:** Resolved in ENH-022 spec update (commit 94c4d347).

---

## Summary Table

| # | Category | Finding | Severity | v0.5.10.1 Action |
|---|----------|---------|----------|-----------------|
| 1 | Path bug | decisions/ spec path wrong (~10 locations) | Moderate | Task 5 — fix all occurrences |
| 2 | Data availability | Only 3 sessions (spec says 5) | Low | Task 2 — change to last 3 |
| 3 | Data reconciliation | lessons-learned/ count includes non-lessons | Low | Task 5 — fix count + path |
| 4 | Documentation | README.md missing version header | Low | Acceptable (package.json authoritative) |
| 5 | Code scan | No TODOs found | Informational | No fix needed |
| 6 | PR triage | 5 stale PRs significantly behind main | Moderate | ✅ Resolved 2026-06-08 — closed #71, #73, #76, #90, #112 |
| 7 | Uncommitted | commands/handoff.md modified | Low | Resolved by v0.5.10.1 commit |
| 8 | Branch error | Implementation on wrong branch (v0.5.11) | High | Resolved during session |
| 9 | Spec gap | ENH-021 missed second artifact shape | Moderate | Resolved in v0.5.10 + lesson |
| 10 | Protocol | Premature agent dispatch | Moderate | Process issue — no code fix |
| 11 | Scope gap | ENH-022 scope incomplete at plan time | Moderate | ✅ Resolved 2026-06-08 — spec updated; brainstorm complete |
| 12 | ~~BLOCKER~~ | ~~ENH-022 brainstorm gate 0/6 done~~ | ~~High~~ | ✅ Resolved 2026-06-08 — all 6/6 items done; PROTECTED permission granted |
| 13 | Uncommitted | 4 files + new directory untracked | Moderate | Fully resolved by v0.5.10.1 — ENH-023 committed, .playwright-mcp/ gitignored |
| 14 | Spec error | ADR-040 precedent misread | Low | Resolved in ENH-022 spec |
| 15 | **Root cause** | **Duplicate session files per day — Step 1.5 missing + filename divergence** | **High** | **Task 2 — Step 1.5 + filename unification** |
| 16 | Template | session-template.md flat structure (no zone model) | Moderate | Task 2 — replace with zone-structured template |

---

## Data Sources

| Section | Source |
|---|---|
| Branch / commit | `git rev-parse`, `git log --oneline` |
| File counts | `find`, `ls`, `wc -l` |
| ADR list | `ls knowledge/decisions/` (corrected from spec's `decisions/`) |
| Session content | Direct file read of 3 session .md files |
| Open issues/PRs | `gh issue list`, `gh pr list` |
| Versions | `package.json`, `.claude-plugin/plugin.json`, `mcp-server/package.json` |
| Active KG | `~/.claude/kg-config.json` |
| Lessons | `find knowledge/lessons-learned -name '*.md'` |
| Plans | `ls docs/plans/*.md` |
| Hook details | `hooks/hooks.json` |
| Commands descriptions | `head -10 commands/*.md \| grep description:` |

---

**Originally generated:** 2026-06-07
**Updated:** 2026-06-08 (pass 1) — full 14-error inventory compiled from session review
**Updated:** 2026-06-08 (pass 2) — findings 15–16 added from Opus architecture review; v0.5.10.1 plan expanded
**Generator:** Claude Sonnet 4.6 (claude-sonnet-4-6) via /kmgraph:handoff test run
