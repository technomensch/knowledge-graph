# Knowledge Graph - Patterns

Quick-reference patterns discovered from lessons learned.

---

## Pattern Template

Copy this template for each new pattern:

```markdown
## Pattern Name

**Quick Reference:**
- **Problem:** [What problem this solves]
- **Solution:** [How to solve it]
- **When to Use:** [Trigger conditions]

**Evidence:**
[Link to lesson learned](../../lessons-learned/category/lesson-file.md) — [Context]
- [Key finding from lesson]
- [Measurement or result]

**See Lesson:** [Link to full lesson with details]
```

---

## Instructions

1. **Keep it scannable:** Quick reference should be readable in 5-10 seconds
2. **Link to lessons:** Every pattern must reference at least one lesson-learned
3. **Bidirectional:** Update lesson files to cross-reference KG entries
4. **When to use:** Include trigger conditions (when to apply this pattern)
5. **Evidence-based:** All patterns must have concrete evidence from actual work

---

## Add Your Patterns Below

<!-- Your patterns go here -->

---

## Zero-Config Dependency Upgrade via Hash Check

**Quick Reference:**
- **Problem:** npm dependencies added to package.json don't auto-install when users already have the plugin
- **Solution:** Store an md5 hash of package.json in `node_modules/.pkg-installed-hash`; on each session start, compare current hash — if different, run `npm install` automatically
- **When to Use:** Any MCP server or plugin that adds optional npm dependencies across versions

**Evidence:**
[Lesson: FTS5 Search and Context-Mode Integration](../lessons-learned/architecture/Lessons_Learned_FTS5_Search_And_Context_Mode_v0.1.1_v0.1.2.md) — v0.1.1 zero-config upgrade implementation
- Eliminates manual upgrade step for all future package.json changes, not just node-sqlite3-wasm
- Hash stored at `node_modules/.pkg-installed-hash`; `md5 -q` on macOS, `md5sum` on Linux

**See Lesson:** [FTS5 Search and Context-Mode Integration](../lessons-learned/architecture/Lessons_Learned_FTS5_Search_And_Context_Mode_v0.1.1_v0.1.2.md)

---

## Graceful Fallback for Optional MCP Dependencies

**Quick Reference:**
- **Problem:** Hard `require()` on an optional npm package causes MCP server startup failure if package isn't installed
- **Solution:** `try { Database = require('pkg') } catch { }` + boolean guard (`fts5Available`) on all code paths that need the package
- **When to Use:** Any feature that depends on an npm package that may not be installed at server start

**Evidence:**
[Lesson: FTS5 Search and Context-Mode Integration](../lessons-learned/architecture/Lessons_Learned_FTS5_Search_And_Context_Mode_v0.1.1_v0.1.2.md) — node-sqlite3-wasm graceful fallback
- Server starts cleanly even before `npm install` runs
- Paired with zero-config hash check to make the missing package a transient state

**See Lesson:** [FTS5 Search and Context-Mode Integration](../lessons-learned/architecture/Lessons_Learned_FTS5_Search_And_Context_Mode_v0.1.1_v0.1.2.md)
**See ADR:** [ADR-016: Graceful Fallback Pattern for Optional MCP Server Dependencies](../decisions/ADR-016-graceful-fallback-optional-mcp-dependencies.md)

---

## Detection-Based Feature Integration (No Hard Dependency)

**Quick Reference:**
- **Problem:** Feature A wants to use Feature B (e.g., context-mode), but Feature B is optional and users may not have it
- **Solution:** Detect availability at runtime using try/catch or tool availability check; call Feature B's API only when detected; never import or require it at module level
- **When to Use:** Cross-plugin or cross-feature integration where one feature is optional

**Evidence:**
[Lesson: FTS5 Search and Context-Mode Integration](../lessons-learned/architecture/Lessons_Learned_FTS5_Search_And_Context_Mode_v0.1.1_v0.1.2.md) — context-mode detection in sync-all/update-graph
- Zero hard dependency means core features work for all users regardless of whether optional integrations are installed

**See Lesson:** [FTS5 Search and Context-Mode Integration](../lessons-learned/architecture/Lessons_Learned_FTS5_Search_And_Context_Mode_v0.1.1_v0.1.2.md)

