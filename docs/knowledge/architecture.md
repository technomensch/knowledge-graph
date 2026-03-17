# Knowledge Graph - Architecture

Quick-reference architectural decisions and system design patterns.

---

## Architecture Entry Template

Copy this template for each new architecture entry:

```markdown
## Architecture Component

**Quick Reference:**
- **Purpose:** [What this component does]
- **Design:** [How it's structured]
- **Trade-offs:** [Key decisions and alternatives considered]

**Integration:**
- **Depends on:** [Components this relies on]
- **Used by:** [Components that use this]

**Evidence:**
[Link to ADR](../../decisions/ADR-XXX.md) — [Decision rationale]
[Link to lesson learned](../../lessons-learned/architecture/lesson-file.md) — [Implementation insights]

**See Also:** [Related architecture entries, patterns, concepts]
```

---

## Instructions

1. **System perspective:** Focus on how components fit together
2. **Design rationale:** Explain why this architecture was chosen
3. **Trade-offs:** Document what was gained/lost with this approach
4. **Link to ADRs:** Reference architecture decision records
5. **Evolution:** Note if architecture has changed over time

---

## Add Your Architecture Entries Below

<!-- Your architecture entries go here -->

---

## FTS5 Full-Text Search Layer (v0.1.1+)

**Quick Reference:**
- **Purpose:** BM25-ranked full-text search across knowledge graph entries, lessons, and sessions
- **Design:** node-sqlite3-wasm (WASM SQLite) + FTS5 virtual table + porter stemmer; SQLite DB stored locally; indexed via `kg_fts5_rebuild` MCP tool; searched via `kg_search`
- **Trade-offs:** WASM adds ~3MB footprint; synchronous API eliminates async complexity; no native compilation required (unlike better-sqlite3)

**Integration:**
- **Depends on:** node-sqlite3-wasm (optional npm dep, graceful fallback if absent); hooks-master.sh hash check for zero-config install
- **Used by:** `kg_search` MCP tool; `ctx_search` when context-mode is available

**Evidence:**
[ADR-015: Choose node-sqlite3-wasm for FTS5 Full-Text Search](../decisions/ADR-015-node-sqlite3-wasm-for-fts5-search.md) — package selection rationale
[Lesson: FTS5 Search and Context-Mode Integration](../lessons-learned/architecture/Lessons_Learned_FTS5_Search_And_Context_Mode_v0.1.1_v0.1.2.md) — implementation details

**See Also:** Graceful Fallback pattern (patterns.md), Zero-Config Upgrade pattern (patterns.md)

---

## Context-Mode Integration (v0.1.2+)

**Quick Reference:**
- **Purpose:** Route large MCP outputs through context-mode sandbox to reduce main context window consumption
- **Design:** Detection-based (no hard dependency); `sync-all` and `update-graph` detect context-mode availability at runtime and use `ctx_batch_execute`/`ctx_execute_file` when present; fall back to direct output when absent
- **Trade-offs:** Users without context-mode get unchanged behavior; users with context-mode get reduced context pressure; zero added complexity for core feature users

**Integration:**
- **Depends on:** context-mode plugin (optional, detection-based)
- **Used by:** `sync-all`, `update-graph` skills

**Evidence:**
[Lesson: FTS5 Search and Context-Mode Integration](../lessons-learned/architecture/Lessons_Learned_FTS5_Search_And_Context_Mode_v0.1.1_v0.1.2.md) — context-mode detection implementation

**See Also:** Detection-Based Feature Integration pattern (patterns.md)

