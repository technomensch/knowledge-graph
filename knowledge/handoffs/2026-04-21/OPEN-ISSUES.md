# Open Issues — 2026-04-21

## Phase 3 Remaining Tasks (ordered)

### Task 1 — S2: project me.md template platforms[] example
- **File:** `core/templates/knowledge/templates/project/me.md`
- **Change:** Add commented `platforms[]` block after `profile_schema: 1` (parity with user/me.md template)
- **Commit msg:** `feat(templates): add commented platforms[] example to project me.md template (S2)`
- **Dependency:** None — do first

### Task 2 (Steps 2.3–2.7) — create-adr-agent implements enforcement
- **File:** `agents/create-adr-agent.md`
- **Changes:**
  - Add question 9 after question 8 in Phase 3 wizard: "Has this decision been implemented? Paste commit hash or Enter to skip."
  - Store as `$implements_ref = "[[<hash>]] — <commit subject>"` or `null`
  - Replace `implements: null` in Phase 5 frontmatter with `implements: {$implements_ref}`
  - Add back-fill reminder in Phase 6 for design-first (null) ADRs
- **Commit msg:** `feat(create-adr): enforce implements field per ADR-042 — prompt in wizard, wire to frontmatter`
- **Dependency:** ADR-042 already committed (Tasks 2.1+2.2 done on branch)

### Task 2b — Backfill implements on ADRs 001–041
- **Files:** All `knowledge/decisions/ADR-*.md` with `implements: null`
- **Strategy:** Dispatch subagent to build patch table (read-only); user approves; apply batch
- **Format:** `implements: "[[<short-hash>]] — <commit subject>"`
- **Non-git ADRs:** `implements: "non-git-tracked — applied [date]"`
- **Proposed ADRs:** may remain null (not yet implemented)
- **Commit msg:** `docs(adrs): backfill implements field on ADRs 001–041 with [[wiki-link]] commit refs (ADR-042 compliance)`
- **Dependency:** Task 2 Steps 2.3–2.7 should be committed first (agent fix)

### Task 3 — Create tier-resolver shared module
- **File:** `commands/init-shared/ai-model-tier-resolver.md` (new file)
- **Spec:** Full content in plan file at `docs/plans/v0.5.2-beta-phase3-tier-resolver.md` Task 3
- **Module steps:** R-1 alias map → R-2 me.md lookup → R-3 tier_map lookup + collapse chain → R-4 validation gate
- **S5 scope rule:** Validation gate fires ONLY in this module — never from file scanning
- **Commit msg:** `feat(tier-resolver): create shared tier resolution module with alias map and validation gate (S4+S5)`
- **Dependency:** None — but must exist before Task 4

### Task 4 — Update 4 dispatchers to reference tier-resolver
- **Files:** `commands/session-summary.md`, `commands/create-adr.md`, `commands/capture-lesson.md`, `commands/sync-all.md`
- **Change:** Replace inline tier-resolution paragraph in each with one-liner referencing `commands/init-shared/ai-model-tier-resolver.md`
- **Verify:** `grep "Read \`me.md\` YAML frontmatter.*tier_map" commands/*.md` should return empty
- **Commit msg:** `refactor(dispatchers): replace inline tier-resolution with ai-model-tier-resolver module reference`
- **Dependency:** Task 3 must be committed first

### Task 5 — Amend ADR-041
- **File:** `knowledge/decisions/ADR-041-tier-abstraction-label-system.md`
- **Change:** Append amendment under Amendments section marking alias map + validation gate as implemented (Phase 3)
- **Commit msg:** `docs(adr): amend ADR-041 — mark alias map and validation gate as implemented (Phase 3)`
- **Dependency:** Task 3 + 4 done

### Task 6 — Push + PR
- **Command:** `git push -u origin v0.5.2-beta-phase3-tier-resolver`
- **PR base:** `main`
- **PR title:** `feat(tiers): Phase 3 — ai-model-tier-resolver module, alias map, project me.md template (v0.5.2-beta)`

---

## Stale PRs (to clean up separately, not part of Phase 3)

| PR | Title | Status |
|---|---|---|
| #95 | dependabot | Stale |
| #90 | v0.3.8 | Stale |
| #76 | docs | Stale |
| #73 | v0.3.2 | Stale |
| #71 | v0.2.4.1 | Stale |

---

## Open GitHub Issues (not blocking Phase 3)

| Issue | Notes |
|---|---|
| #47 | Open |
| #46 | Open |
| #41 | Open |
| #39 | Open |
