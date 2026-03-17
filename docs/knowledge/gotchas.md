# Knowledge Graph - Gotchas

Quick-reference pitfalls and anti-patterns to avoid.

---

## Gotcha Template

Copy this template for each new gotcha:

```markdown
## Gotcha Name

**Quick Reference:**
- **Symptom:** [What you see when you hit this]
- **Root Cause:** [Why it happens]
- **Fix:** [How to resolve it]
- **Prevention:** [How to avoid it]

**Evidence:**
[Link to lesson learned](../../lessons-learned/category/lesson-file.md) — [Context]
- [What went wrong]
- [How it was discovered]

**See Lesson:** [Link to full lesson with debugging details]
```

---

## Instructions

1. **Symptom-first:** Start with what the user observes
2. **Root cause:** Explain why it happens (not just how to fix)
3. **Prevention:** Include how to avoid hitting this in the future
4. **Link to lessons:** Every gotcha must reference at least one lesson-learned
5. **Concrete examples:** Use real cases, not hypotheticals

---

## Add Your Gotchas Below

<!-- Your gotchas go here -->

---

## TypeScript TS2749: Class Used as Type After `let X: any` Reassignment

**Quick Reference:**
- **Symptom:** `'Database' refers to a value, but is being used as a type here` (TS2749) on function parameter annotations
- **Root Cause:** Switching from `import { Database } from 'pkg'` to `let Database: any` (for try/require graceful fallback) means `Database` is no longer a TypeScript type — it's a runtime value
- **Fix:** Change `db: Database` parameter annotations to `db: any`
- **Prevention:** When using try/require for optional deps, always annotate dependent function params as `any`

**Evidence:**
[Lesson: FTS5 Search and Context-Mode Integration](../lessons-learned/architecture/Lessons_Learned_FTS5_Search_And_Context_Mode_v0.1.1_v0.1.2.md) — fts5.ts TS2749 fix
- Affected `initDb(db: Database)` and `indexFile(db: Database, ...)` at lines 79 and 118

**See Lesson:** [FTS5 Search and Context-Mode Integration](../lessons-learned/architecture/Lessons_Learned_FTS5_Search_And_Context_Mode_v0.1.1_v0.1.2.md)

---

## sql.js Has FTS3 Only — FTS5 Requires node-sqlite3-wasm

**Quick Reference:**
- **Symptom:** `CREATE VIRTUAL TABLE ... USING fts5(...)` fails with "no such module: fts5" when using sql.js
- **Root Cause:** sql.js ships a custom SQLite build that only includes FTS3, not FTS5
- **Fix:** Switch to node-sqlite3-wasm, which bundles a full SQLite with FTS5 and BM25
- **Prevention:** Check SQLite module support before choosing a JS SQLite wrapper

**Evidence:**
[Lesson: FTS5 Search and Context-Mode Integration](../lessons-learned/architecture/Lessons_Learned_FTS5_Search_And_Context_Mode_v0.1.1_v0.1.2.md) — package selection rationale
- Confirmed by running `CREATE VIRTUAL TABLE USING fts5(...)` against sql.js at dev time

**See Lesson:** [FTS5 Search and Context-Mode Integration](../lessons-learned/architecture/Lessons_Learned_FTS5_Search_And_Context_Mode_v0.1.1_v0.1.2.md)
**See ADR:** [ADR-015: Choose node-sqlite3-wasm for FTS5 Full-Text Search](../decisions/ADR-015-node-sqlite3-wasm-for-fts5-search.md)

---

## Claude Code Plugin Cache Does Not Refresh After Update

**Quick Reference:**
- **Symptom:** After `claude plugin update`, installed tab shows old version; new commands/skills not available; MCP server shows `failed`
- **Root Cause:** Claude Code updates `installed_plugins.json` metadata but does NOT re-download or replace the physical cache directory at `~/.claude/plugins/cache/{marketplace}/{plugin}/{version}/`
- **Fix:** `rm -rf ~/.claude/plugins/cache/stayinginsync-knowledge-graph/` then reinstall via `/plugin` UI or CLI
- **Prevention:** Not preventable within the plugin — platform-level bug (CC issues #19197, #15642, #14061, #29074)

**Evidence:**
[Lesson: Claude Code Plugin Cache Stale After Update](../lessons-learned/process/claude-code-plugin-cache-stale-after-update.md) — workaround documented
- Cache-clear + reinstall is the only reliable upgrade path until Anthropic resolves upstream

**See Lesson:** [Claude Code Plugin Cache Stale After Update](../lessons-learned/process/claude-code-plugin-cache-stale-after-update.md)

