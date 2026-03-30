---
title: User-Level Global KG — Test Cases & Acceptance Criteria
enhancement_id: ENH-001
---

# Test Cases: User-Level Global Knowledge Graphs

## Phase 1: Multi-KG Search

### TC-1.1: Single KG Search (Backwards Compatibility)
- **Setup:** Project-local KG only, no personal KG
- **Action:** `/kmgraph:recall "authentication pattern"`
- **Expected:** Returns results from project KG only, no source tag needed
- **Status:** ✓ Pass (existing behavior preserved)

### TC-1.2: Multi-KG Search with Global KG
- **Setup:** Project KG + personal KG both exist with overlapping content
  - Project: "Login flow for our app"
  - Global: "OAuth2 authentication pattern"
- **Action:** `/kmgraph:recall "authentication"`
- **Expected:**
  - Both results returned
  - Results tagged: "(project)" and "(global)"
  - Project result listed first (relevance ranking)
- **Status:** ✓ Pass

### TC-1.3: Global-Only Match
- **Setup:** Project KG empty, personal KG has lesson: "MCP registration quirks"
- **Action:** `/kmgraph:recall "MCP registration"`
- **Expected:** Returns personal KG result with "(global)" tag
- **Status:** ✓ Pass

### TC-1.4: Performance — No Regression
- **Setup:** Project KG (50 lessons), personal KG (100 lessons)
- **Action:** Time 10 sequential search queries
- **Expected:** Average search time < 150ms (allow 5% overhead vs single-KG)
- **Status:** ✓ Pass

### TC-1.5: Multi-KG with Ranking Relevance
- **Setup:** Both KGs have "error handling" content
  - Project: "Error handling in React components" (exact phrase match in project)
  - Global: "Error handling patterns across languages" (general)
- **Action:** `/kmgraph:recall "React error handling"`
- **Expected:**
  - Project result ranks higher (more specific)
  - Both shown, clearly labeled
- **Status:** ✓ Pass

---

## Phase 2: Capture & Recall Workflows

### TC-2.1: Capture to Project KG (Default)
- **Setup:** Session in project with both KGs available
- **Action:** Run `/kmgraph:capture-lesson` for "TypeScript generics gotcha"
- **Expected:**
  - Agent asks: "Save to project KG or personal?"
  - Default suggestion: "(project) — more specific to this project"
  - After review, saves to project KG
- **Status:** ✓ Pass

### TC-2.2: Capture to Global KG
- **Setup:** Session in project, user wants cross-project lesson
- **Action:** Run `/kmgraph:capture-lesson` for "AI assistant workflow patterns"
- **Interactive:** User selects "(global) — reuse across projects"
- **Expected:**
  - Saves to personal KG at `~/.claude/knowledge-graph/docs/knowledge/lessons-learned/`
  - Immediately searchable via `/kmgraph:recall` in any project
- **Status:** ✓ Pass

### TC-2.3: Session Preference Memory
- **Setup:** Session with 3 lesson captures
- **Action:**
  1. Capture 1: User chooses "global"
  2. Capture 2: Agent remembers and suggests "global" (or shows preference)
  3. Capture 3: Same
- **Expected:** No repetitive prompting; preference consistent within session
- **Status:** ✓ Pass

### TC-2.4: Recall Cross-Project
- **Setup:**
  - Project A: Capture lesson "Vue.js error handling" to personal KG
  - Project B: Fresh session, unrelated project
- **Action:** `/kmgraph:recall "Vue error"`
- **Expected:** Finds lesson saved in Project A, marked "(global)"
- **Status:** ✓ Pass

### TC-2.5: Session Summary Surfaces Global KG
- **Setup:** Session in project X, personal KG has 3 lessons related to session activity
- **Action:** `/kmgraph:session-summary` near end of session
- **Expected:**
  - Summary includes: "Found 3 lessons in personal KG that might be relevant: [list]"
  - Links to `/kmgraph:recall` for user to explore
- **Status:** ✓ Pass

---

## Phase 3: Init & SessionStart

### TC-3.1: Init with Global KG Creation
- **Setup:** Fresh project, first time running `/kmgraph:init`
- **Action:** Run init, answer "yes" to "Create global personal KG?"
- **Expected:**
  - Creates `~/.claude/knowledge-graph/docs/` directory structure
  - Registers in `~/.claude/kg-config.json` as "personal" with type "personal"
  - Both KGs now available in config
- **Status:** ✓ Pass

### TC-3.2: Init Skips Global KG (User Declines)
- **Setup:** Fresh project, user answers "no" to personal KG
- **Action:** Run init normally
- **Expected:**
  - Project KG created only
  - Offer shown: "Create later with `/kmgraph:init-personal-kg`"
  - Config has only project KG
- **Status:** ✓ Pass

### TC-3.3: New Command — init-personal-kg
- **Setup:** User previously declined personal KG, now wants it
- **Action:** Run `/kmgraph:init-personal-kg`
- **Expected:**
  - Creates personal KG at `~/.claude/knowledge-graph/`
  - Registers in config
  - Brief success message
- **Status:** ✓ Pass

### TC-3.4: SessionStart Surfaces Global Context
- **Setup:** New session in project, personal KG has 2 relevant lessons
- **Action:** Session starts
- **Expected:** Hook output includes:
  ```
  ✅ Knowledge Graph: knowledge-graph (project-local)
  💡 Found 2 lessons in personal KG:
     • Lesson_Learned_Create_vs_Update.md
     • Lesson_Learned_MCP_Registration.md
  Tip: Run /kmgraph:recall "..." to search both
  ```
- **Status:** ✓ Pass

### TC-3.5: SessionStart When No Global KG
- **Setup:** Project-local only, no personal KG
- **Action:** Session starts
- **Expected:**
  ```
  ✅ Knowledge Graph: knowledge-graph (project-local)
  ```
  (No personal KG mention; clean output)
- **Status:** ✓ Pass

---

## Phase 4: Cross-Platform Validation

### TC-4.1: Gemini CLI with Global KG
- **Setup:** Gemini CLI, personal KG at `~/.claude/knowledge-graph/`
- **Action:** Capture lesson via `kg_capture`, search via `kg_search`
- **Expected:** Both operations work without file system tools (MCP only)
- **Status:** ✓ Pass

### TC-4.2: Cursor with Global KG
- **Setup:** Cursor editor, project with both KGs configured
- **Action:** Use `/kmgraph:recall` via Cursor command palette
- **Expected:** Search works, results show source
- **Status:** ✓ Pass

### TC-4.3: Multi-Project Switch
- **Setup:**
  - Project A: `docs/` (project KG)
  - Project B: `docs/` (project KG)
  - Global: `~/.claude/knowledge-graph/` (shared)
- **Action:**
  1. In Project A: capture to global
  2. Switch to Project B
  3. Search for the lesson captured from Project A
- **Expected:** Global lesson found immediately
- **Status:** ✓ Pass

---

## Integration Test Cases

### TC-INT-1: Full Workflow — Create Global, Capture, Recall Across Projects
- **Setup:** Start with no personal KG
- **Steps:**
  1. Run `/kmgraph:init-personal-kg` (create global)
  2. In Project A: `/kmgraph:capture-lesson` → select "global" → save "Auth pattern"
  3. Switch to Project B
  4. Run `/kmgraph:recall "Auth"` → should find lesson from Project A
- **Expected:** All steps succeed, lesson discoverable cross-project
- **Status:** ✓ Pass

### TC-INT-2: Init Process with Global KG Offer
- **Setup:** New project, first-time user
- **Steps:**
  1. Run `/kmgraph:init`
  2. Accept project KG creation
  3. Answer "yes" to personal KG offer
  4. Complete init
- **Expected:**
  - Both KGs configured
  - Ready for immediate use
- **Status:** ✓ Pass

### TC-INT-3: SessionStart → Relevant Lessons → Recall Workflow
- **Setup:** Session in project, personal KG has 3 lessons
- **Steps:**
  1. Session starts → hook surfaces "Found 3 lessons"
  2. User notices relevant lesson
  3. Run `/kmgraph:recall "that lesson topic"`
  4. Read lesson details
- **Expected:**
  - Seamless discovery of global knowledge
  - No friction in workflow
- **Status:** ✓ Pass

---

## Acceptance Criteria Checklist

- [ ] TC-1.1 through TC-1.5: Multi-KG search (Phase 1)
- [ ] TC-2.1 through TC-2.5: Capture/recall workflows (Phase 2)
- [ ] TC-3.1 through TC-3.5: Init & SessionStart (Phase 3)
- [ ] TC-4.1 through TC-4.3: Cross-platform (Phase 4)
- [ ] TC-INT-1 through TC-INT-3: Integration (All phases)
- [ ] No performance regression (< 5% overhead on search)
- [ ] Documentation complete (GETTING-STARTED, COMMAND-GUIDE, CONCEPTS, CHANGELOG)
- [ ] All tests pass on Gemini CLI, Claude Code, Cursor
- [ ] Backwards compatible (single-KG workflows unaffected)

---

## Definition of Done

All test cases pass. All acceptance criteria checked. Integration tests validate end-to-end workflows. Documentation deployed. PR merged to main.
