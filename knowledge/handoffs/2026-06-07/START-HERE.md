# Start Here — Project Handoff

**Last Updated:** 2026-06-08 (updated in session — all 16 findings addressed; v0.5.10.6 brainstorm complete)
**Created for branch:** v0.5.10-ux-session-handoff
**Continues from:** knowledge/sessions/2026-06/2026-06-07-v0510-full-summary.md

---

## Current State

**Active Branch:** v0.5.10-ux-session-handoff
**Current Commit:** 94c4d347
**Files Modified (vs main):** 28 (approximate — see git-files-changed)

### Recent Work (Last 3 Commits)

```
94c4d347 docs(enhancements): ENH-022 scope broadened to all four core/templates ↔ knowledge/ pairs
8da36377 docs(lessons): capture lesson — handoff spec must cover all artifact shapes
a8dd1739 feat: v0.5.10 — version-impact UX + session/handoff continues_from coupling
```

### Uncommitted Changes (Working Tree)

- `commands/handoff.md` — modified (M)
- `knowledge/enhancements/ENH-002/ENH-002-specification.md` — modified (M)
- `knowledge/enhancements/ENH-022/ENH-022-specification.md` — modified (M)
- `knowledge/enhancements/ENH-023/` — untracked (new directory)
- `.playwright-mcp/` — untracked (test artifact)

### In Progress

**v0.5.10 branch is complete** (latest merged commit: a8dd1739). The branch has been implemented and sessions documented. PR pending user push/merge decision.

**ENH-022 (Template Directory Disambiguation)** — status: proposed. BRAINSTORM REQUIRED before implementation. Governed by ADR-040. Scope was broadened in commit 94c4d347 to cover all four `core/templates/ ↔ knowledge/` pairs.

### Next Steps

1. **v0.5.10.1 plan ready** — `~/.claude/plans/v0.5.10.1-session-summary-ops.md`. Awaiting "Proceed". Scope (updated 2026-06-08 after Opus architecture review):
   - Moves operational docs (START-HERE, SESSION-COMPILATION, OPEN-ISSUES, GENERATION-NOTES) from handoff package into session summary
   - Handoff reduces to DOCUMENTATION-MAP + ARCHITECTURE-SNAPSHOT + thin START-HERE pointer
   - **Root-cause fixes (ENH-002 core gap):** Step 1.5 (one-file-per-day existence check) added to session-summary-agent full-session path; filename derivation unified to `YYYY-MM-DD-{branch-slug}.md` across snapshot + full modes — these two bugs caused duplicate files per day
   - **Zone structure:** operational sections overwrite (last-write-wins); narrative blocks append-only; Operational Snapshot + Accumulated Narrative dividers with `as-of {hash}` framing
   - **Contradiction/reversal tracking** in narrative append blocks
   - `knowledge/sessions/session-template.md` replaced with zone-structured template
   - ENH-002 Out of Scope broadened; per-zone rules added to Requirements; contradiction tracking + one-file-per-day marked implemented
   - Also fixes 14 errors from 2026-06-07 implementation (see GENERATION-NOTES.md for full list)
2. Decide whether to push and PR `v0.5.10-ux-session-handoff` to origin (user decision)
3. ENH-022 requires brainstorming session before implementation — **do not implement without explicit user approval**. Brainstorm gate: 0/6 items done. HIGH priority blocker.
4. **ENH-023: Extend pre-skill-rules-inject.sh to Cover Official Marketplace Skills** — spec at `knowledge/enhancements/ENH-023/ENH-023-specification.md`. Problem: official marketplace skills (e.g., `code-review:code-review`) bypass project governance — `~/.kmgraph/rules.md`, PROTECTED file guards, and ADR-049 Review Audit Protocol are not injected. The PreToolUse hook in `pre-skill-rules-inject.sh` (ADR-043) only handles `superpowers:*`; all other skill namespaces exit 0 (no injection). Fix: add a `code-review` case branch that injects the protected-files guard, ADR-049 gate, and rules.md — same pattern as existing ADR-043 branches. Scope touches `scripts/pre-skill-rules-inject.sh`, `~/.kmgraph/hooks/pre-skill-rules-inject.sh`, and `hooks/hooks.json` (matcher verification). Open question: does the existing `Skill` tool matcher already capture `code-review:code-review`? Related: ADR-043, ADR-049, ENH-015. **Status: proposed, github_issue: 130** — captured as ENH (not an issue); follow ENH workflow. Next step: implementation planning when ready.
5. Next planned release: v0.5.11 (kg-recall rename) and v0.5.10.6 (template disambiguation)

### Active Knowledge Graphs

- **knowledge-graph** (active, project-local)
  - Path: `/Users/mkaplan/GitHub/knowledge-graph/knowledge`
  - Categories: architecture, process, patterns, debugging, governance
  - FTS5: enabled

### Recent Lessons (Last 3)

From `knowledge/lessons-learned/process/`:

1. **Handoff Spec Must Cover All Artifact Shapes** — `Lessons_Learned_Process_Handoff_Spec_Must_Cover_All_Artifact_Shapes.md` — lesson from v0.5.10 session
2. **Process Parallel Opus Review Before Release** — `Lessons_Learned_Process_Parallel_Opus_Review_Before_Release.md`
3. **Upgrade Path Missing FTS5 Stale File Cleanup** — `Lessons_Learned_Upgrade_Path_Missing_FTS5_Stale_File_Cleanup.md`

---

## Quick Navigation

- **Setup & Installation:** docs/reference/ (see commands guide)
- **Commands Reference:** commands/ (all slash commands)
- **Architecture:** knowledge/decisions/ (51 ADRs)
- **Lessons learned:** knowledge/lessons-learned/ (by category: architecture, process, patterns, debugging, governance)
- **Session history:** knowledge/sessions/
- **Active Plans:** docs/plans/v0.5.10-ux-session-handoff.md, docs/plans/v0.5.11-kg-recall-rename.md, docs/plans/v0.5.10.6-template-disambiguation.md
- **Enhancement specs:** knowledge/enhancements/
