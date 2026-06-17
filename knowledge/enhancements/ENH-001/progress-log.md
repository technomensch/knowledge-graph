---
title: ENH-001 Progress Log
---

# ENH-001 Progress Log: User-Level Global Knowledge Graphs

## Status: 🟢 Proposed (Ready for Phase Implementation)

---

## Initialization (2026-03-27)

**Completed:**
- [x] Issue tracking created: ENH-001
- [x] Specification written (ENH-001-specification.md)
- [x] Solution approach documented (solution-approach.md)
- [x] Test cases defined (test-cases.md)
- [x] Progress log initialized (progress-log.md)

**Files created:**
- `knowledge/enhancements/ENH-001/ENH-001-specification.md`
- `knowledge/enhancements/ENH-001/solution-approach.md`
- `knowledge/enhancements/ENH-001/test-cases.md`
- `knowledge/enhancements/ENH-001/progress-log.md`
- `docs/plans/v0.2.2-ENH-001-global-kg.md` (pending — to be created when Phase 1 begins)

**Next:** Wait for explicit approval to proceed with Phase 1 implementation

---

## Phase 1: Multi-KG Search Enhancements

**Status:** ⏳ Not Started

**Assigned to:** Sonnet (estimated 3-4 hours)

**Tasks:**
- [ ] Update `mcp-server/src/tools/search.ts` for multi-KG queries
- [ ] Add helpers to `mcp-server/src/utils.ts`
- [ ] Create/update `mcp-server/tests/search.test.ts`
- [ ] Test TC-1.1 through TC-1.5
- [ ] Commit with message: `feat(search): Multi-KG search support for global + project KGs`

**Blockers:** None

**Notes:**
- Design decision confirmed: query both FTS5 indexes, merge results with source tags
- Ranking: project-local first (more specific), then global
- No index rebuilding needed (query both existing indexes)

---

## Phase 2: Capture & Recall Workflow Updates

**Status:** ⏳ Not Started

**Assigned to:** Sonnet (estimated 2-3 hours)

**Depends on:** Phase 1 completion

**Tasks:**
- [ ] Update `agents/lesson-capture-agent.md` — add KG picker
- [ ] Update `agents/recall-agent.md` — multi-KG search
- [ ] Update `agents/session-summary-agent.md` — global context check
- [ ] Update `/kmgraph:capture-lesson` command
- [ ] Update `/kmgraph:recall` command
- [ ] Test TC-2.1 through TC-2.5
- [ ] Commit with message: `feat(agents): KG picker for capture workflows + multi-KG recall`

**Blockers:** Awaiting Phase 1 completion

**Notes:**
- Default KG choice: project-local (safer)
- Session preference memory: avoid repetitive prompting
- Source tags in results for clarity

---

## Phase 3: Init & SessionStart Enhancements

**Status:** ⏳ Not Started

**Assigned to:** Sonnet (estimated 2-3 hours)

**Depends on:** Phase 1, 2 completion

**Tasks:**
- [ ] Update `commands/init.md` — add personal KG creation option
- [ ] Create new command: `/kmgraph:init-personal-kg`
- [ ] Enhance `scripts/hooks-master.sh` — SessionStart to surface global lessons
- [ ] Test TC-3.1 through TC-3.5
- [ ] Commit with message: `feat(init): Global KG creation + SessionStart context awareness`

**Blockers:** Awaiting Phase 1, 2 completion

**Notes:**
- Init offers personal KG creation (not silent)
- SessionStart warns if personal KG exists but no lessons found
- Link to `/kmgraph:recall` for exploration

---

## Phase 4: Testing & Documentation

**Status:** ⏳ Not Started

**Assigned to:** Sonnet (estimated 2-3 hours)

**Depends on:** Phase 1, 2, 3 completion

**Tasks:**
- [ ] Execute all test cases (TC-1.1 through TC-4.3, TC-INT-1 through TC-INT-3)
- [ ] Test on Gemini CLI, Claude Code, Cursor
- [ ] Update documentation:
  - [ ] `GETTING-STARTED.md` — personal KG option mention
  - [ ] `COMMAND-GUIDE.md` — new commands
  - [ ] `CONCEPTS.md` — "Global vs Project-Local" section
  - [ ] `CHANGELOG.md` — v0.2.2 entry with TL;DR
- [ ] Verify no performance regression (< 5% overhead)
- [ ] Commit with message: `docs: v0.2.2 personal KG feature + test validation`

**Blockers:** Awaiting Phase 1, 2, 3 completion

---

## Release Preparation

**Status:** ⏳ Not Started

**Tasks:**
- [ ] Review all commits for code quality
- [ ] Verify test coverage (target: > 80%)
- [ ] Create draft PR with all phase commits
- [ ] Run mkdocs build (no errors)
- [ ] Create GitHub issue #40 (or next available) with this ENH-001 documentation
- [ ] Link PR to GitHub issue

**Blockers:** Awaiting all 4 phases

---

## Post-Release (v0.2.2 Backfill)

**Status:** ⏳ Deferred

**After v0.2.2 ships and personal KG is live:**

1. **Lesson 1: Create vs Update Pattern**
   - Run `/kmgraph:capture-lesson`
   - Topic: "Plan language — Create vs Update distinction"
   - Category: patterns
   - Save to: personal KG (reusable across projects)

2. **ADR 1: Plan Language Convention**
   - Run `/kmgraph:create-adr`
   - Title: "Explicit Create/Update terminology in implementation plans"
   - Status: Accepted (established practice, v0.2.1-beta)
   - Save to: personal KG

3. **Lesson 2: Feature Workflow Discovery**
   - Run `/kmgraph:capture-lesson`
   - Topic: "Feature discovery — add-to-plan vs start-issue-tracking"
   - Category: process
   - Save to: personal KG

4. **ADR 2: Feature Workflow Decision**
   - Run `/kmgraph:create-adr`
   - Title: "Feature workflow discovery — amend active plan or create new issue"
   - Status: Accepted
   - Save to: personal KG

**Reference:** `docs/sessions/2026-03/2026-03-27_v0.2.1-beta-plan-language-and-user-kg-discovery.md`

---

## Notes & Decisions

### Design Decisions Made (2026-03-27)

1. **Multi-KG search default behavior:**
   - Query both project-local and personal KGs automatically
   - Return all results with source tags
   - Rationale: Users benefit from seeing all relevant knowledge without extra prompts

2. **KG choice in capture workflows:**
   - Default: project-local (safer for project-specific knowledge)
   - Prompt on each capture (don't auto-switch)
   - Rationale: Forces user to think about knowledge scope, prevents accidental global saves

3. **SessionStart enhancement:**
   - Surface personal KG context (lightweight check for relevant lessons)
   - Don't make it intrusive (1-2 line tip, not modal)
   - Rationale: Discovers knowledge passively without friction

4. **Backwards compatibility:**
   - Existing single-KG workflows unaffected
   - All enhancements are additive (new features, not modifications)
   - Rationale: Zero risk to current users, smooth upgrade path

### Risk Mitigation Strategies

| Risk | Mitigation | Status |
|------|-----------|--------|
| Accidental project-specific lesson in personal KG | Default to project KG, warn on keywords | Documented in solution-approach |
| Search performance regression | Query in parallel, monitor in tests | TC-1.4 covers this |
| Users forget to create personal KG | Explicit offer in init, SessionStart reminder | Documented in test cases |
| Config conflicts (multiple personal KGs) | Validate config schema, clear error messaging | Design detail to finalize in Phase 1 |

---

## Related Issues & Dependencies

- **Parent:** v0.2.2 (future release, deferred from v0.2.1-beta)
- **Blocks:** None yet
- **Blocked by:** v0.2.1-beta completion and merge to main
- **Related sessions:**
  - `docs/sessions/2026-03/2026-03-27_v0.2.1-beta-plan-language-and-user-kg-discovery.md` — discovery session documenting this feature

---

**Next Step:** Await explicit "Proceed with Phase 1" approval before implementation.
