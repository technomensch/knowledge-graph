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

## AGENTS Template as Minimum Viable KMGraph Integration

**Quick Reference:**
- **Problem:** Uncertainty whether `core/templates/AGENTS-template.md` alone — without slash commands or MCP tools — was sufficient for a capable LLM to perform full KMGraph workflows
- **Solution:** Ship the template as the minimum viable integration; MCP tools (`kg_search`, `kg_capture`) are enhancements that improve precision and write access, not prerequisites
- **When to Use:** Any non-Claude-Code platform (Gemini CLI, Cursor, VS Code, etc.) where slash commands are unavailable; the template alone provides all KMGraph behaviors if the platform has file system read/write access

**Evidence:**
[Lesson: AGENTS Template Platform Portability](../lessons-learned/patterns/Lessons_Learned_AGENTS_Template_Platform_Portability.md) — v0.2.0-beta Phase 7b: all 7 portability tests passed with Gemini Flash using only the template
- No `/kmgraph:` syntax leaked; lesson writing, recall, session wrap-up all worked without MCP tools
- Portability boundary: platforms without file system write access need `kg_capture` MCP for writes

**See Lesson:** [AGENTS Template Platform Portability](../lessons-learned/patterns/Lessons_Learned_AGENTS_Template_Platform_Portability.md)

---

## Single Source of Truth (DRY) for Documentation

**Quick Reference:**
- **Problem:** Same architectural concept explained in two docs; update to one leaves the other stale — users reading the "wrong" doc see outdated information
- **Solution:** Each concept has one authoritative source; other docs reference it rather than duplicating; KMGraph authority map: architecture → CONCEPTS.md, command usage → COMMAND-GUIDE.md, quick syntax → CHEAT-SHEET.md, workflows → GETTING-STARTED.md
- **When to Use:** Any time writing or updating documentation that explains a concept or architectural pattern; when a subagent produces docs, check for duplicated explanations before accepting

**Evidence:**
[Lesson: Single Source of Truth (DRY) for Documentation](../lessons-learned/patterns/Lessons_Learned_Single_Source_Of_Truth_DRY_Documentation.md) — v0.2.1-beta Phase 7c: CONCEPTS.md and COMMAND-GUIDE.md diverged during subagent updates
- Exception: CHEAT-SHEET.md may duplicate syntax snippets (not conceptual explanations)
- Implemented in `/kmgraph:update-doc` command

**See Lesson:** [Single Source of Truth (DRY) for Documentation](../lessons-learned/patterns/Lessons_Learned_Single_Source_Of_Truth_DRY_Documentation.md)
**See ADR:** [ADR-021: Single Source of Truth for Documentation](../decisions/ADR-021-single-source-of-truth-documentation.md)

---

## Two-Layer Documentation Model (Per-Branch + Release Sync)

**Quick Reference:**
- **Problem:** Documentation updates deferred across a multi-branch feature series; planned doc tasks in individual branches silently skipped; users see stale docs after release
- **Solution:** Layer 1 — per-branch updates for directly affected docs immediately after each feature branch; Layer 2 — a separate dedicated final branch (`v{ver}-docs-update-release-sync`) for comprehensive release documentation sync
- **When to Use:** Any release involving 2+ serialized feature branches; the final docs-update branch is not optional cleanup — it is release work

**Evidence:**
[Lesson: Documentation Update Triggers in Multi-Branch Feature Development](../lessons-learned/process/documentation-update-triggers-multibranchfeatures.md) — v0.0.10 series: 4 feature branches completed with doc tasks skipped; required retroactive docs-update branch
- Having a task in the plan doesn't guarantee execution without an explicit trigger
- Layer 2 branch makes comprehensive docs sync visible and unavoidable

**See Lesson:** [Documentation Update Triggers in Multi-Branch Feature Development](../lessons-learned/process/documentation-update-triggers-multibranchfeatures.md)

---

## Documentation Deprecation Lifecycle (Deprecate → Archive → Remove)

**Quick Reference:**
- **Problem:** Old documentation patterns risk silent deletion when replaced, leaving users with no migration guidance; premature removal creates broken workflows for users on older versions
- **Solution:** Three-phase lifecycle: (1) Deprecate — add notice with reason + migration path + timeline; (2) Archive — move to `docs/deprecated/` after 1-2 minor versions with user approval; (3) Remove — permanent deletion only after explicit second approval
- **When to Use:** Any doc update that replaces an existing pattern, API, or command syntax; NOT needed for typo fixes, clarifications, or additive content

**Evidence:**
[Lesson: Documentation Deprecation Lifecycle](../lessons-learned/process/Lessons_Learned_Documentation_Deprecation_Lifecycle.md) — v0.2.1-beta: thick commands replaced by thin dispatchers + agents
- Two approval gates protect against removing content users still rely on
- Implemented in `/kmgraph:update-doc` Step 6b

**See Lesson:** [Documentation Deprecation Lifecycle](../lessons-learned/process/Lessons_Learned_Documentation_Deprecation_Lifecycle.md)

---

## Active Work Guard for Branch-Creating Commands

**Quick Reference:**
- **Problem:** A command that creates a new Git branch runs unconditionally, switching the user off their active implementation branch; all subsequent commits land on the wrong branch; recovery requires reset and cherry-pick
- **Solution:** Any command that calls `git checkout -b` must first check `git branch --show-current`; if not on the default branch, present three options: (1) document-only (stay on current branch), (2) switch now, (3) cancel
- **When to Use:** Apply to every command or script that creates branches — `/kmgraph:start-issue-tracking`, `/kmgraph:init`, and any future branch-creating commands

**Evidence:**
[Lesson: Issue Tracking Branch Guard](../lessons-learned/process/Lessons_Learned_Issue_Tracking_Branch_Guard.md) — v0.2.1-beta: `/kmgraph:start-issue-tracking` silently switched from implementation branch to `issue/ENH-001-global-kg`
- Branch switch produced no warning; recovery required `git reset --hard` and `git show` file recovery
- Implemented in `start-issue-tracking.md` Step 5.0

**See Lesson:** [Issue Tracking Branch Guard](../lessons-learned/process/Lessons_Learned_Issue_Tracking_Branch_Guard.md)
**See ADR:** [ADR-022: Branch Creation Commands Must Guard Against Active Work Context-Switch](../decisions/ADR-022-branch-creation-active-work-guard.md)

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

