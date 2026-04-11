---
title: User-Level Global Knowledge Graphs
enhancement_id: ENH-001
version: 0.2.2
status: Proposed
created: 2026-03-27
author: mkaplan
---

# ENH-001: User-Level Global Knowledge Graphs

## Problem Statement

Currently, KMGraph knowledge graphs are project-local by default. Users must capture and organize knowledge separately for each project, losing cross-project patterns, architectural decisions, and reusable lessons.

**Example:** A lesson learned about "Create vs Update" plan language patterns (discovered while working on knowledge-graph) cannot easily be recalled or applied in other projects without manual duplication.

## Goals

1. **Persistent cross-project knowledge** — capture a lesson once, access across all projects
2. **Clear separation of concerns** — project-specific knowledge (project KG) vs. personal/cross-project patterns (personal KG)
3. **Seamless recall** — `/kmgraph:recall` searches both local and personal KGs automatically
4. **No friction setup** — init process offers to create personal KG alongside project KGs
5. **Platform agnostic** — works with user-level plugin installation (not just project-scoped)

## Use Cases

1. **Architectural patterns** — "How we handle authentication" (applies across projects)
2. **Workflow lessons** — "Plan language best practices", "Review checklist patterns"
3. **Gotchas & workarounds** — "Node.js version X breaks on macOS", "MCP registration quirks"
4. **Cross-project ADRs** — "Why we prefer TypeScript", "Testing philosophy"
5. **Personal preferences** — "AI assistant workflow patterns", "Code review guidelines"

## Requirements

### Functional

- [ ] Users can create a personal KG at `~/.kmgraph/` during init or via `/kmgraph:init-personal-kg`
- [ ] `/kmgraph:recall "query"` searches both project-local and personal KGs
- [ ] Search results distinguish source: "(project)" vs "(global)"
- [ ] `/kmgraph:capture-lesson` offers to save to project KG or personal KG
- [ ] SessionStart hook checks both KGs for relevant context when session begins
- [ ] Multi-KG `kg_search` MCP tool (or index merging) supports querying both KG indexes
- [ ] FTS5 search works across both KGs with ranking/relevance

### Non-Functional

- [ ] No breaking changes to existing project-local KG workflows
- [ ] Backwards compatible with v0.2.1-beta (which introduced multi-KG config)
- [ ] Works with all platforms: Claude Code, Gemini CLI, Cursor, Windsurf, etc.
- [ ] No performance regression when searching across multiple KGs

### Configuration

- [ ] `~/.claude/kg-config.json` can register personal KG:
  ```json
  {
    "active": "knowledge-graph",
    "graphs": {
      "knowledge-graph": { "type": "project-local", "path": "/path/to/project/docs" },
      "personal": { "type": "personal", "path": "~/.kmgraph" }
    }
  }
  ```
- [ ] `init` process detects if personal KG already exists; offers to reuse or create new

## Architecture Changes

### Multi-KG Search

**Current (v0.2.1):**
- `kg_search` queries single KG index (active KG only)

**Proposed (v0.2.2):**
- `kg_search` accepts optional `kgs: ["local", "global"]` parameter
- Default: search active KG + all registered personal KGs
- Results tagged with source KG for clarity

### SessionStart Enhancement

**Current (v0.2.0-beta):**
- Hook warns if active KG doesn't match project directory
- Suggests `/kmgraph:switch`

**Proposed (v0.2.2):**
- Additionally check for relevant lessons in personal KG at session start
- Surface in hook output: "Found 3 relevant lessons in your personal KG"
- Link to `/kmgraph:recall` for user to explore

### Capture Workflows

**Current (v0.2.1):**
- `kg_capture` writes to active KG (project or global, depending on config)

**Proposed (v0.2.2):**
- When capturing a lesson, prompt user: "Save to project KG or personal (global) KG?"
- Remember user preference per session (or make configurable)
- Validate KG type before write (don't accidentally save project-specific lesson to global)

### Init Process

**Current (v0.2.1):**
- Offers to create project-local KG

**Proposed (v0.2.2):**
- After project KG setup, ask: "Want to create a global personal KG for cross-project lessons?"
- If yes: create at `~/.kmgraph/` and register in config
- If no: can create later with `/kmgraph:init-personal-kg`

## Related Knowledge Artifacts

After v0.2.2 ships, two lessons and ADRs must be captured:

1. **Lesson:** "Plan language — Create vs Update distinction" (discovered 2026-03-27)
   - Problem: ambiguous "Update" language wastes context tokens
   - Solution: explicit "Create" for new files, "Update" for existing
   - To be saved to personal KG for cross-project reference

2. **Lesson:** "Feature workflow discovery — add-to-plan vs start-issue-tracking" (discovered 2026-03-27)
   - Problem: unclear when new features belong in existing plans vs separate issues
   - Solution: two-tier approach based on active-plan context
   - To be saved to personal KG for workflow reference

See: `docs/sessions/2026-03/2026-03-27_v0.2.1-beta-plan-language-and-user-kg-discovery.md`

## Out of Scope (v0.2.3+)

- UI dashboard for personal KG management
- Web interface for remote personal KG sync
- Team-shared personal KGs (currently user-scoped only)
- Encryption for sensitive lessons in personal KG
- Auto-cleanup of stale lessons

## Acceptance Criteria

- [ ] Global KG can be created at `~/.kmgraph/`
- [ ] `kg_search` queries both project-local and personal KGs
- [ ] Search results clearly indicate source (project vs global)
- [ ] `/kmgraph:capture-lesson` allows choosing target KG
- [ ] SessionStart surfaces relevant personal KG lessons
- [ ] No regression in single-KG workflows
- [ ] Init process offers personal KG creation
- [ ] Works on all supported platforms
- [ ] FTS5 indexes both KGs correctly
- [ ] Documentation updated (COMMAND-GUIDE, GETTING-STARTED, CONCEPTS)

## Estimate

- **Phase 1:** Multi-KG search enhancements (3-4 hours)
- **Phase 2:** Capture/recall UI updates (2-3 hours)
- **Phase 3:** SessionStart and init enhancements (2-3 hours)
- **Phase 4:** Testing & documentation (2-3 hours)
- **Total:** ~10-13 hours, ~3-4 phases

---

**Next:** See `solution-approach.md` for implementation strategy.
