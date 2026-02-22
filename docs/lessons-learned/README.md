# Lessons Learned - Master Index

Comprehensive catalog of all lessons learned during knowledge graph plugin development.

**Total Lessons:** 16 (4 existing + 12 backfilled)
**Last Updated:** 2026-02-22

---

## By Category

### Architecture Lessons (5 total)

1. [2026-02-16 - Commands vs Skills Architecture Research](architecture/Lessons_Learned_Commands_vs_Skills_Architecture.md) - Research on dual command/skill pattern; separation of concerns; why each pattern suited for different purposes
2. [2026-02-16 - Inline KG Updates Violate Multi-KG Architecture](architecture/Lessons_Learned_Inline_KG_Updates_Violate_Multi_KG.md) - Inline updates don't scale to multi-KG; need delegated routing pattern
3. [2026-02-17 - Config File Orphaned References After Repo Rename](architecture/Lessons_Learned_Config_Orphaned_References.md) - Absolute paths become stale when repo structure changes; validation layer needed
4. [2026-02-21 - Plugin Example File Management — Why You Can't Gate the Download](architecture/Lessons_Learned_Plugin_Example_File_Management.md) - Plugin installs atomic; git pull restores deleted tracked files; three options evaluated; decision deferred
5. [2026-02-21 - Update Notifications for Non-Plugin Users — Version Sync and MCP Discovery Gap](architecture/Lessons_Learned_Update_Notifications_NonPlugin_Users.md) - MCP server version out of sync; four-part solution designed; deferred to v0.0.9

**Tags:** #architecture #plugin-design #multi-kg #configuration #plugin-distribution #versioning

---

### Debugging Lessons (5 total)

1. [2026-02-16 - Duplicate Hooks Declaration Causes Plugin Load Failure](debugging/Lessons_Learned_Duplicate_Hooks_Declaration.md) - Hooks declared twice (auto-discovery + explicit) cause loader error; must use one method only
2. [2026-02-16 - Interactive Prompts and Slash Commands Don't Work in Hooks](debugging/Lessons_Learned_Interactive_Prompts_Dont_Work_In_Hooks.md) - Hooks execute in detached context (no stdin/IDE); can't invoke slash commands; use logging instead
3. [2026-02-16 - Line vs Token Metrics Must Be Applied Consistently](debugging/Lessons_Learned_Line_vs_Token_Metrics_Confusion.md) - Switching metrics mid-project causes planning failures; token-based is accurate; lines are misleading
4. [2026-02-17 - Truncated Plugin Marketplace Slug Bug (28-char limit)](debugging/Lessons_Learned_Truncated_Marketplace_Slug.md) - Marketplace truncates IDs >28 chars silently; no error; requires discovery via testing
5. [2026-02-16 - Plugin Namespace Visibility - Shadow Command Failure](debugging/namespace-visibility-shadow-command-failure.md) - Shadow command strategy failed; file prefix workaround is cross-LLM solution

**Tags:** #debugging #hooks #metrics #marketplace #namespace #silent-failures

---

### Process Lessons (4 total)

1. [2026-02-16 - Post-Commit Hooks Must Be Opt-In for Alpha Releases](process/Lessons_Learned_Post_Commit_Hooks_Must_Be_Opt_In.md) - Implicit automation too opinionated for alpha; must be explicitly opt-in during setup
2. [2026-02-17 - Validation-to-Implementation Workflow Pattern](process/Lessons_Learned_Validation_to_Implementation_Workflow.md) - Three-phase pattern: validate (POC) → implement → verify; fails fast if approach wrong
3. [2026-02-20 - Sequential Session Parallelization Opportunity](process/Lessons_Learned_Session_Parallelization.md) - Zero-file-overlap = safe parallelization; plan file dependencies upfront; merge sequentially
4. [2026-02-16 - Local Marketplace Testing - Two-Location Sync Required](process/local-marketplace-testing-workflow.md) - When testing locally through marketplace, changes must sync from dev directory to cache location

**Tags:** #process #hooks #workflow #parallelization #testing #validation

---

### Patterns Lessons (2 total)

1. [2026-02-16 - Both LLM Models Missed Directory Structure Change](patterns/Lessons_Learned_Both_Models_Missed_Directory_Change.md) - LLMs pattern-match from training; context-provided structure isn't guaranteed used; validate output always
2. [2026-02-16 - Git Rename Detection Preserves History Through Moves](patterns/Lessons_Learned_Git_Rename_Detection_Preserves_History.md) - Git's content-based rename detection automatic; directory moves preserve full history; safe to refactor

**Tags:** #patterns #llm-assistance #git #refactoring

---

## Chronological Index

**2026**

### February

**2026-02-21:**
- [Plugin Example File Management — Why You Can't Gate the Download](architecture/Lessons_Learned_Plugin_Example_File_Management.md)
- [Update Notifications for Non-Plugin Users — Version Sync and MCP Discovery Gap](architecture/Lessons_Learned_Update_Notifications_NonPlugin_Users.md)

**2026-02-20:**
- [Sequential Session Parallelization Opportunity](process/Lessons_Learned_Session_Parallelization.md)

**2026-02-17:**
- [Config File Orphaned References After Repo Rename](architecture/Lessons_Learned_Config_Orphaned_References.md)
- [Truncated Plugin Marketplace Slug Bug (28-char limit)](debugging/Lessons_Learned_Truncated_Marketplace_Slug.md)
- [Validation-to-Implementation Workflow Pattern](process/Lessons_Learned_Validation_to_Implementation_Workflow.md)

**2026-02-16:**
- [Commands vs Skills Architecture Research](architecture/Lessons_Learned_Commands_vs_Skills_Architecture.md)
- [Duplicate Hooks Declaration Causes Plugin Load Failure](debugging/Lessons_Learned_Duplicate_Hooks_Declaration.md)
- [Both LLM Models Missed Directory Structure Change](patterns/Lessons_Learned_Both_Models_Missed_Directory_Change.md)
- [Git Rename Detection Preserves History Through Moves](patterns/Lessons_Learned_Git_Rename_Detection_Preserves_History.md)
- [Inline KG Updates Violate Multi-KG Architecture](architecture/Lessons_Learned_Inline_KG_Updates_Violate_Multi_KG.md)
- [Post-Commit Hooks Must Be Opt-In for Alpha Releases](process/Lessons_Learned_Post_Commit_Hooks_Must_Be_Opt_In.md)
- [Interactive Prompts and Slash Commands Don't Work in Hooks](debugging/Lessons_Learned_Interactive_Prompts_Dont_Work_In_Hooks.md)
- [Line vs Token Metrics Must Be Applied Consistently](debugging/Lessons_Learned_Line_vs_Token_Metrics_Confusion.md)
- [Local Marketplace Testing - Two-Location Sync Required](process/local-marketplace-testing-workflow.md)
- [Plugin Namespace Visibility - Shadow Command Failure](debugging/namespace-visibility-shadow-command-failure.md)

---

## Tag Index

### By Topic

**#architecture** (5)
- Commands vs Skills Architecture Research
- Inline KG Updates Violate Multi-KG Architecture
- Config File Orphaned References After Repo Rename
- Plugin Example File Management
- Update Notifications for Non-Plugin Users

**#debugging** (5)
- Duplicate Hooks Declaration
- Interactive Prompts Don't Work In Hooks
- Line vs Token Metrics Confusion
- Truncated Marketplace Slug Bug
- Plugin Namespace Visibility

**#process** (4)
- Post-Commit Hooks Must Be Opt-In
- Validation-to-Implementation Workflow
- Session Parallelization
- Local Marketplace Testing

**#patterns** (2)
- Both LLM Models Missed Directory Change
- Git Rename Detection Preserves History

### By Technology

**#git** (2): Git Rename Detection, Config Orphaned References
**#hooks** (3): Duplicate Hooks, Interactive Prompts, Post-Commit Opt-In
**#metrics** (1): Line vs Token Confusion
**#marketplace** (2): Truncated Slug, Local Testing
**#multi-kg** (2): Inline Updates, Commands vs Skills
**#llm-assistance** (1): Both Models Missed Change
**#workflow** (2): Validation Pattern, Session Parallelization

---

## Creating New Lessons

Each lesson follows this structure:
1. **YAML frontmatter:** metadata, git context, tags, category
2. **Problem:** Context and situation
3. **Root Cause:** Why it happened
4. **Solution:** How it was resolved
5. **Evidence:** Data/references supporting lesson
6. **Replication Pattern:** How others can apply this
7. **Lessons & Takeaways:** Key insights
8. **Related ADRs:** Link to architectural decisions

**File naming:** `Lessons_Learned_[Topic].md`
**Categories:** architecture, debugging, process, patterns
**Placement:** `lessons-learned/[category]/` directory

---

## Integration Points

- **CHANGELOG.md:** Links to lessons for major changes
- **ADRs:** Each architecture decision references originating lesson(s)
- **ROADMAP.md:** Future decisions reference lessons that informed them
- **Skills:** `/kg-sis:capture-lesson` creates lessons with ADR linking

---

*Master index automatically updated when new lessons are added. See `lesson-template.md` for creating new lessons.*
