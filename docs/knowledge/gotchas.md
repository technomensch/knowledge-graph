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

## Duplicate Hook Declaration Causes Plugin Load Failure

**Quick Reference:**
- **Symptom:** Plugin fails to load with obscure error after hooks are defined both via auto-discovery and explicitly in `plugin.json`
- **Root Cause:** Claude Code's plugin loader treats the same hook appearing in both auto-discovery (`commands/hooks/`) and explicit `plugin.json` config as a conflict and fails validation
- **Fix:** Pick one method — use explicit `plugin.json` declaration only; remove or disable auto-discovery for that hook
- **Prevention:** Document the chosen hook declaration approach in CONTRIBUTING.md; add a pre-commit validation check for duplicate declarations

**Evidence:**
[Lesson: Duplicate Hooks Declaration Causes Plugin Load Failure](../lessons-learned/debugging/Lessons_Learned_Duplicate_Hooks_Declaration.md) — plugin loader conflict on load
- Auto-discovery and explicit config are mutually exclusive for the same hook
- Explicit configuration preferred: more control, easier to debug

**See Lesson:** [Duplicate Hooks Declaration Causes Plugin Load Failure](../lessons-learned/debugging/Lessons_Learned_Duplicate_Hooks_Declaration.md)

---

## Interactive Prompts and Slash Commands Don't Work in Hooks

**Quick Reference:**
- **Symptom:** Hook-invoked slash command never executes; hook silently fails with no error logged
- **Root Cause:** Hooks run in a detached subprocess where stdin is not connected and the Claude Code IDE interface is unavailable — slash commands require the IDE context
- **Fix:** Replace command invocations with `echo` suggestions in the hook output; let the user invoke the command manually in their next session
- **Prevention:** Design hooks to write logs and suggestions only — never expect interactive features; test hooks outside the IDE to verify they work without the interface

**Evidence:**
[Lesson: Interactive Prompts and Slash Commands Don't Work in Hooks](../lessons-learned/debugging/Lessons_Learned_Interactive_Prompts_Dont_Work_In_Hooks.md) — post-commit hook silently failed
- Hook can write to stdout/stderr, execute shell commands, read env/files — nothing IDE-interactive
- Separation: hooks for infrastructure automation, commands for user interaction

**See Lesson:** [Interactive Prompts and Slash Commands Don't Work in Hooks](../lessons-learned/debugging/Lessons_Learned_Interactive_Prompts_Dont_Work_In_Hooks.md)

---

## Line vs Token Metrics — Mid-Project Metric Switch Cascades Errors

**Quick Reference:**
- **Symptom:** Plans say "will fit" but implementation says "too large"; misleading size assessments and failed predictions
- **Root Cause:** Switching from line-based limits to token-based limits mid-project without updating all prior references — lines and tokens have no reliable correlation (10 long lines ≈ 200 tokens; 10 short lines ≈ 50 tokens)
- **Fix:** Adopt tokens everywhere immediately; use `words × 1.3` as the conversion formula; update all plans, code, and docs simultaneously
- **Prevention:** Choose tokens from day one; if a metric must change, audit the entire system for references before deploying the switch

**Evidence:**
[Lesson: Line vs Token Metrics Must Be Applied Consistently](../lessons-learned/debugging/Lessons_Learned_Line_vs_Token_Metrics_Confusion.md) — MEMORY.md size limit switch caused cascading plan failures
- Formula validated: `words × 1.3` is industry standard across LLM providers
- Applied across all references in v0.0.3

**See Lesson:** [Line vs Token Metrics Must Be Applied Consistently](../lessons-learned/debugging/Lessons_Learned_Line_vs_Token_Metrics_Confusion.md)
**See ADR:** [ADR-004: Token-Based MEMORY.md Size Limits](../decisions/ADR-004-token-based-memory-size-limits.md)

---

## Namespace Elision Hides Plugin Prefix in Local Dev (Shadow Command Workaround Breaks Gemini)

**Quick Reference:**
- **Symptom:** Plugin namespace prefix (e.g., `/kmgraph:`) disappears in the IDE UI during local development; shadow command workaround to force namespacing causes plugin instability with Gemini
- **Root Cause:** Claude Code's internal registry hides the namespace prefix when a command name is unique in the user's environment (Namespace Elision); the shadow command fix is Claude-only and breaks cross-LLM compatibility
- **Fix:** Use file-name prefixes on command files (`knowledge-status.md` → `/knowledge-status`); this is cross-LLM compatible and self-documenting
- **Prevention:** Default to file-name prefixes for all new plugins; never implement shadow commands; test with multiple LLMs before shipping

**Evidence:**
[Lesson: Plugin Namespace Visibility — Shadow Command Failure](../lessons-learned/debugging/Lessons_Learned_Plugin_Namespace_Visibility_Shadow_Command_Failure.md) — shadow strategy required full revert to v0.0.1
- Failed with Gemini; caused plugin instability requiring full revert
- File-prefix workaround: cross-LLM compatible, no runtime tricks needed

**See Lesson:** [Plugin Namespace Visibility — Shadow Command Failure](../lessons-learned/debugging/Lessons_Learned_Plugin_Namespace_Visibility_Shadow_Command_Failure.md)

---

## Marketplace Slug Silently Truncated at 28 Characters

**Quick Reference:**
- **Symptom:** Plugin not discoverable by full name; commands don't work for new installs; no error message
- **Root Cause:** Claude Code marketplace enforces a 28-character maximum on plugin slugs; slugs over the limit are silently truncated — the system accepts the config but stores the truncated ID, creating a mismatch
- **Fix:** Keep plugin slug ≤ 28 characters; short slugs (e.g., `kg-sis`, 6 chars) are safest
- **Prevention:** Add a pre-commit hook to validate slug length; check actual vs submitted ID in the marketplace after every submission; document the 28-char limit in INSTALL.md

**Evidence:**
[Lesson: Truncated Plugin Marketplace Slug Bug (28-char limit)](../lessons-learned/debugging/Lessons_Learned_Truncated_Marketplace_Slug.md) — `knowledge-graph-stays-in-sync` (34 chars) truncated to `knowledge-graph-stays-in-sy`
- Silent failure is the hardest class of bug to debug — no error surfaced
- Resolution: renamed to `kg-sis` in v0.0.8.3-alpha

**See Lesson:** [Truncated Plugin Marketplace Slug Bug](../lessons-learned/debugging/Lessons_Learned_Truncated_Marketplace_Slug.md)
**See ADR:** [ADR-010: Namespace Rename](../decisions/ADR-010-namespace-rename-knowledge-to-kg-sis.md)

---

## Local Marketplace Testing — Changes Require Two-Location Sync

**Quick Reference:**
- **Symptom:** Plugin changes committed and saved in the project directory but not reflected in the running plugin; old version and behavior persist after restart
- **Root Cause:** Claude Code's local marketplace copies plugin files to a separate cache directory on install; edits in the development directory do NOT auto-sync to the marketplace cache — two independent copies exist
- **Fix:** After each change, sync to the marketplace cache: `rsync -av --delete {dev-dir}/ {marketplace-cache-dir}/` then restart Claude Code
- **Prevention:** Create a `sync-to-marketplace.sh` script and include it in the dev workflow checklist; always verify the version number changed in the marketplace UI before testing

**Evidence:**
[Lesson: Local Marketplace Testing — Two-Location Sync Required](../lessons-learned/process/local-marketplace-testing-workflow.md) — hours of false debugging on already-fixed issues
- Two copies: development dir (edits) vs marketplace cache (what Claude Code loads)
- Automation script eliminates human error in the sync step

**See Lesson:** [Local Marketplace Testing — Two-Location Sync Required](../lessons-learned/process/local-marketplace-testing-workflow.md)

---

## MCP Server Binary Present But Not Registered in IDE — Tools Silently Missing

**Quick Reference:**
- **Symptom:** `kg_*` MCP tools unavailable in an IDE even though the MCP server binary is built and working in another IDE; no error — the tools simply don't exist in the namespace
- **Root Cause:** MCP tools are not auto-discovered from the project directory; each IDE maintains its own MCP server registry that must be populated explicitly; having the binary built for Claude Code does NOT propagate registration to Gemini CLI, Cursor, or any other IDE
- **Fix:** Register the MCP server explicitly in each IDE's config (e.g., `~/.gemini/settings.json` for Gemini CLI) using an absolute path to the built binary; restart the IDE; verify with `kg_config_list`
- **Prevention:** Add IDE registration to the onboarding checklist for every new IDE; build MCP auto-registration into `/kmgraph:init` and `/kmgraph:setup-platform`

**Evidence:**
[Lesson: MCP Server Binary Exists But Each IDE Needs Explicit Registration](../lessons-learned/process/Lessons_Learned_MCP_Server_Binary_Exists_But_Each_IDE_Needs_Explicit_Registration.md) — kg_* tools missing in Gemini CLI during v0.2.0-beta Phase 7b
- Gemini CLI registry: `~/.gemini/settings.json` → `mcpServers` key
- Claude Code registry: `.claude/settings.json` or marketplace install

**See Lesson:** [MCP Server Binary Exists But Each IDE Needs Explicit Registration](../lessons-learned/process/Lessons_Learned_MCP_Server_Binary_Exists_But_Each_IDE_Needs_Explicit_Registration.md)

---

## Plan Subagent Is Read-Only — "Write This File" Prompts Silently Fail

**Quick Reference:**
- **Symptom:** Plan subagent (Opus, plan mode) returns high-quality analysis but produces no written files; prompt to "write this file" either errors silently or returns the content as text only
- **Root Cause:** The Plan agent type has access only to read tools (Glob, Grep, Read); Write, Edit, and Bash are not available in plan agents by design — plan agents are architects, not implementors
- **Fix:** After receiving analysis from a Plan subagent, write the files directly using the Write tool in the main conversation, using the subagent's output as source material
- **Prevention:** When delegating to a Plan subagent, phrase prompts as "design this plan and return the content" not "write this file"; always know which tools each agent type can access before delegating

**Evidence:**
[Lesson: Plan Subagent Is Read-Only](../lessons-learned/process/Lessons_Learned_Plan_Subagent_Is_Read_Only.md) — v0.2.0-beta Phase 7 planning work
- Plan agents are architects; main conversation agent is always responsible for write operations

**See Lesson:** [Plan Subagent Is Read-Only](../lessons-learned/process/Lessons_Learned_Plan_Subagent_Is_Read_Only.md)

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

