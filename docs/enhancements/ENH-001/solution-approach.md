---
title: User-Level Global KG — Implementation Approach
enhancement_id: ENH-001
status: Proposed
---

# Solution Approach: User-Level Global Knowledge Graphs

## Design Overview

User-level personal KGs leverage the multi-KG config foundation from v0.2.1-beta. The architecture adds three capabilities:

1. **Multi-KG search** — query both project-local and personal KGs
2. **KG picker workflows** — allow users to choose save destination
3. **SessionStart awareness** — surface personal KG context at session start

## Implementation Strategy

### Phase 1: Multi-KG Search Enhancements

**Goal:** Enable `kg_search` to query multiple KG indexes simultaneously.

**Current state (v0.2.1):**
```typescript
// kg_search queries active KG only
kg_search(query: string, kgPath?: string): SearchResult[]
```

**Proposed (v0.2.2):**
```typescript
// kg_search queries multiple KGs
kg_search(query: string, options?: { kgs?: string[], activeKgOnly?: boolean }): SearchResult[]
```

**Files to modify:**
- `mcp-server/src/tools/search.ts` — add multi-KG logic
- `mcp-server/src/utils.ts` — helper to resolve KG paths from config
- `mcp-server/tests/search.test.ts` — test multi-KG queries

**Design decision:**
- If user has both project-local and personal KGs: search both by default
- Results tagged with source: `{ result, source: "project" | "global" }`
- No need to rebuild search index; query both FTS5 indexes and merge results
- Ranking: project-local results first (more specific), then global (more general)

### Phase 2: Capture & Recall Workflow Updates

**Goal:** Allow users to choose KG destination when capturing lessons.

**Changes to agents:**

1. **`agents/lesson-capture-agent.md`**
   - After Phase 4 (Draft review), ask: "Save to project KG or personal (global) KG?"
   - **Guard:** Only show this picker when ≥2 KGs are registered in `kg-config.json`. If only one KG exists, skip the picker entirely and write to it silently.
   - Remember choice for duration of session (avoid repetitive prompting)
   - Default: project KG (safer default for project-specific lessons)

2. **`agents/recall-agent.md`**
   - Update search to use new multi-KG `kg_search` API
   - Display source in results: "Found in your personal KG", "Found in project KG"
   - Note: minimal change (just pass multi-KG option to existing search)

3. **`agents/session-summary-agent.md`**
   - When gathering context, check personal KG for relevant lessons
   - Surface in summary: "Found X lessons in personal KG that might be relevant"

**Changes to commands:**
- `/kmgraph:capture-lesson` — pass KG choice to `lesson-capture-agent`
- `/kmgraph:recall` — pass multi-KG flag to `recall-agent`

### Phase 3: Init & SessionStart Enhancements

**Goal:** Make personal KG setup seamless during first use.

**Init changes (`commands/init.md`):**
1. After creating project-local KG, ask: "Want to create a global personal KG for cross-project lessons?"
2. If yes: create `~/.claude/knowledge-graph/` with standard directory structure
3. Register in `~/.claude/kg-config.json` as `{ "type": "personal", "path": "~/.claude/knowledge-graph" }`
4. Run FTS5 rebuild for the new personal KG immediately after creation (same as project KG init flow)
5. If no: offer `/kmgraph:init-personal-kg` command for later setup

**Config migration (v0.2.1 users):**
v0.2.1-beta users may have `kg-config.json` entries without a `type` field (only `path` was required before v0.2.2). During init verify/upgrade, check each registered graph for missing `type` and default to `"project-local"` if absent. Warn the user: "Graph 'X' has no type field — defaulting to project-local. Run `/kmgraph:init-personal-kg` if this should be a personal KG."

**New command:** `/kmgraph:init-personal-kg`
- Creates personal KG at user-defined path (default: `~/.claude/knowledge-graph/`)
- Registers in config
- Brief setup guide

**SessionStart hook enhancement (`scripts/hooks-master.sh`):**
1. Check if both project-local and personal KGs exist
2. If personal KG exists: run lightweight search for lessons matching recent activity
3. Surface: "Found 2 lessons in personal KG: [list]"
4. Link to `/kmgraph:recall` for exploration

### Phase 4: Testing & Documentation

**Testing:**
- Unit tests: multi-KG search with overlapping content
- Integration tests: capture to personal KG, recall in different project
- End-to-end: init with personal KG creation → capture lesson → recall in new project
- Platform tests: Gemini CLI, Cursor, Claude Code

**Documentation updates:**
- `GETTING-STARTED.md` — mention personal KG option during init
- `COMMAND-GUIDE.md` — document new `/kmgraph:init-personal-kg` command
- `CONCEPTS.md` — add section on "Global vs Project-Local Knowledge"
- `CHANGELOG.md` — v0.2.2 entry with personal KG feature

## Risk Mitigation

**Risk:** User accidentally saves project-specific lesson to personal KG

**Mitigation:**
- Default KG choice: project-local (safer)
- Prompt on each capture (don't auto-switch KGs)
- Warn if lesson contains project-specific keywords (e.g., "our codebase", company name)

**Risk:** Search performance degrades with multiple KG indexes

**Mitigation:**
- Query both FTS5 indexes in parallel (async)
- Cache merged results briefly
- Monitor query time in tests; fail if regression > 10%

**Risk:** Users forget to create personal KG and miss benefit

**Mitigation:**
- Explicit offer during init (not silent)
- SessionStart reminds: "Tip: Want to create a personal KG for cross-project lessons?"

## Configuration Evolution

**v0.2.1-beta (current):**
```json
{
  "active": "knowledge-graph",
  "graphs": {
    "knowledge-graph": { "type": "project-local", "path": "/path/to/project/docs" }
  }
}
```

**v0.2.2 (with personal KG):**
```json
{
  "active": "knowledge-graph",
  "graphs": {
    "knowledge-graph": { "type": "project-local", "path": "/path/to/project/docs" },
    "personal": { "type": "personal", "path": "~/.claude/knowledge-graph" }
  }
}
```

**Per-project selection of active KG:**
```bash
# User can switch active KG per project
/kmgraph:switch personal  # use personal KG as active
/kmgraph:switch knowledge-graph  # switch back to project KG
```

## Files to Create / Modify

| File | Change | Phase |
|---|---|---|
| `mcp-server/src/tools/search.ts` | Update to support multi-KG queries | 1 |
| `mcp-server/src/utils.ts` | Add helpers to resolve KG paths | 1 |
| `mcp-server/tests/search.test.ts` | Add multi-KG test cases | 1 |
| `agents/lesson-capture-agent.md` | Add KG picker workflow | 2 |
| `agents/recall-agent.md` | Update to use multi-KG search | 2 |
| `agents/session-summary-agent.md` | Check personal KG for context | 2 |
| `commands/init.md` | Add personal KG creation option | 3 |
| `commands/init-personal-kg.md` | New command for standalone personal KG setup | 3 |
| `scripts/hooks-master.sh` | Enhance SessionStart to surface global lessons | 3 |
| `GETTING-STARTED.md` | Mention personal KG option | 4 |
| `COMMAND-GUIDE.md` | Document new commands | 4 |
| `CONCEPTS.md` | Add "Global vs Project-Local" section | 4 |
| `CHANGELOG.md` | v0.2.2 entry | 4 |

## Rollback Strategy

- Each phase is a separate commit
- If multi-KG search (Phase 1) regresses, revert that commit before merging Phase 2-4
- Single-KG workflows remain unaffected by Phase 2-3 changes (optional features)

## Success Criteria

- [ ] User can create personal KG during init
- [ ] `/kmgraph:recall` searches both KGs, results show source
- [ ] `/kmgraph:capture-lesson` allows choosing target KG
- [ ] SessionStart surfaces personal KG context
- [ ] No performance regression in search (< 5% overhead)
- [ ] Works on Gemini CLI, Claude Code, Cursor
- [ ] Documentation complete
- [ ] All test cases pass (unit, integration, E2E)

---

**Next:** See `test-cases.md` for validation approach.
