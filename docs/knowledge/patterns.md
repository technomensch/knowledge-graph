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

## Commands vs Skills Classification

**Quick Reference:**
- **Problem:** Single plugin needs both flat, task-oriented commands AND hierarchical, contextual guidance
- **Solution:** Separate architecture—commands in `commands/` for direct invocation; skills in `skills/` for progressive guidance
- **When to Use:** Commands when task is clear and immediate; skills when user needs multi-step guidance or automation recommendations

**Evidence:**
[Commands vs Skills Architecture Research](../../lessons-learned/architecture/Lessons_Learned_Commands_vs_Skills_Architecture.md) — Initial research comparing patterns
- Discovered both patterns serve different purposes
- Commands suite optimized for task automation (flat, fast)
- Skills optimized for guidance (hierarchical, contextual)

[ADR-002: Commands vs Skills Architecture](../../decisions/ADR-002-commands-vs-skills-architecture.md) — Design decision

**See Also:** Delegated vs Inline Architecture pattern

---

## Two-Location Sync for Testing

**Quick Reference:**
- **Problem:** Local plugin development doesn't immediately reflect in marketplace cache during testing
- **Solution:** Maintain two locations—dev directory and marketplace cache—with rsync workflow
- **When to Use:** When testing plugin changes through marketplace before deployment

**Evidence:**
[Local Marketplace Testing Workflow](../../lessons-learned/process/local-marketplace-testing-workflow.md) — Testing pattern from v0.0.2
- Development must sync to cache location for marketplace to discover changes
- Skipping sync results in testing the old version

**Implementation:** Rsync from `~/.claude/plugins/dev/` to `~/.claude/plugins/cache/`

---

## Multi-KG Configuration Pattern

**Quick Reference:**
- **Problem:** Single user often manages multiple knowledge graphs (project-local, personal, work)
- **Solution:** Centralized configuration at `~/.claude/kg-config.json` with active pointer
- **When to Use:** When supporting multiple KGs in single environment

**Evidence:**
[Config File Orphaned References](../../lessons-learned/architecture/Lessons_Learned_Config_Orphaned_References.md) — Implementation insights
- Centralized config enables switching without redeployment
- Requires validation layer for path safety

[ADR-001: Centralized Multi-KG Configuration](../../decisions/ADR-001-centralized-multi-kg-configuration.md) — Architecture

**Key Components:** Active graph pointer, per-graph metadata, category override support

---

## Delegated Command Architecture

**Quick Reference:**
- **Problem:** Multi-KG system requires routing updates to correct graph; inline updates hardcode paths
- **Solution:** Delegate all KG modifications to separate `/kg-sis:update-graph` command with routing logic
- **When to Use:** Whenever KG content is modified programmatically

**Evidence:**
[Inline KG Updates Violate Multi-KG Architecture](../../lessons-learned/architecture/Lessons_Learned_Inline_KG_Updates_Violate_Multi_KG.md) — Pattern discovery
- Inline pattern doesn't scale to multi-KG
- Delegation enables clean separation of concerns

[ADR-006: Delegated vs Inline KG Updates](../../decisions/ADR-006-delegated-vs-inline-kg-updates.md) — Rationale

---

## Git Rename Detection for Refactoring

**Quick Reference:**
- **Problem:** Large refactorings with directory moves seem risky—might lose history
- **Solution:** Git uses content-based detection; directory moves with `git mv` automatically preserve history
- **When to Use:** Whenever reorganizing project structure

**Evidence:**
[Git Rename Detection Preserves History Through Moves](../../lessons-learned/patterns/Lessons_Learned_Git_Rename_Detection_Preserves_History.md) — Pattern from v0.0.1-v0.0.2
- Verified through namespace refactor during v0.0.8.3
- Safe to move and reorganize; history fully preserved

**Benefit:** Enables confident refactoring without fear of losing development history

---

## Hybrid Automation Architecture

**Quick Reference:**
- **Problem:** Need balance between user control and automation convenience
- **Solution:** Combine three mechanisms—skills for guidance, commands for automation, hooks for detection
- **When to Use:** When supporting different user preferences (manual vs automated)

**Evidence:**
[Post-Commit Hooks Must Be Opt-In](../../lessons-learned/process/Lessons_Learned_Post_Commit_Hooks_Must_Be_Opt_In.md) — From alpha testing
- Default-on automation too opinionated for early users
- Opt-in approach respects user preferences

**Components:** Interactive guidance (skills) + direct execution (commands) + optional automation (hooks)

---

## Three-Tier Installation Architecture

**Quick Reference:**
- **Problem:** Different users work in different environments (Claude Code, other IDEs, no IDE)
- **Solution:** Three distinct installation tiers with feature matrix
- **When to Use:** When packaging for multiple platforms

**Evidence:**
[ADR-009: Three-Tier Installation Architecture](../../decisions/ADR-009-three-tier-installation-architecture.md)
- Tier 1 (Claude Code): Full features via plugin
- Tier 2 (MCP IDEs): Core features via MCP server
- Tier 3 (Template-only): Minimal setup via templates

**Benefit:** Single codebase supports multiple deployment scenarios

---

## MCP-First Core Architecture

**Quick Reference:**
- **Problem:** Different platforms (Claude Code, Cursor, VS Code IDEs) have different capabilities
- **Solution:** Core data operations as MCP tools; IDE-specific layers on top
- **When to Use:** When designing cross-platform features

**Evidence:**
[ADR-009: Three-Tier Installation Architecture](../../decisions/ADR-009-three-tier-installation-architecture.md) — Tier 2/3 reliance on MCP
- MCP server provides ~60% of plugin functionality
- Enables non-Claude-Code users to access core features

**Components:** 7 MCP tools + 2 MCP resources as foundation; Claude Code plugins as enhancement layer

---

## Session Parallelization (Zero File Overlap)

**Quick Reference:**
- **Problem:** Large documentation projects need multiple sessions
- **Solution:** Partition tasks by file; sessions with zero file overlap can run in parallel
- **When to Use:** When task can be split into independent file changes

**Evidence:**
[Sequential Session Parallelization Opportunity](../../lessons-learned/process/Lessons_Learned_Session_Parallelization.md) — From v0.0.7 documentation phase
- Sessions 1+2 ran in parallel on documentation consolidation
- No conflicts because files didn't overlap
- 50% time reduction compared to sequential

**Safety Guarantee:** Git conflicts only occur if files overlap; zero overlap = zero conflicts

---

## Plan-Driven Development

**Quick Reference:**
- **Problem:** Complex features often fail midway because assumptions break during implementation
- **Solution:** Create detailed plan file with checkboxes; validate and commit incrementally
- **When to Use:** For any feature with uncertain scope or multiple implementation paths

**Evidence:**
[Validation-to-Implementation Workflow Pattern](../../lessons-learned/process/Lessons_Learned_Validation_to_Implementation_Workflow.md) — Three-phase workflow
- Phase 1: Validate via POC
- Phase 2: Implement with validated foundation
- Phase 3: Verify and document

**Benefit:** Fails fast if approach is wrong; speeds up actual implementation with validated design

