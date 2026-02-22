# Knowledge Graph - Master Index

Navigate all knowledge graph entries by category.

**Last Updated:** 2026-02-22
**Total Entries:** 44 (10 patterns, 11 gotchas, 10 concepts, 6 architecture, 7 workflows)

---

## Quick Navigation

- [Patterns](#patterns) — Reusable solution patterns (10)
- [Gotchas](#gotchas) — Pitfalls and anti-patterns (11)
- [Concepts](#concepts) — Architectural concepts and terminology (10)
- [Architecture](#architecture) — System design and components (6)
- [Workflows](#workflows) — Standard operating procedures (7)

---

## Patterns

**10 entries documenting reusable patterns from development history:**

1. [Commands vs Skills Classification](patterns.md#commands-vs-skills-classification) — Dual architecture for task automation and guidance
2. [Two-Location Sync for Testing](patterns.md#two-location-sync-for-testing) — Dev directory + marketplace cache synchronization
3. [Multi-KG Configuration Pattern](patterns.md#multi-kg-configuration-pattern) — Centralized config with active pointer
4. [Delegated Command Architecture](patterns.md#delegated-command-architecture) — Routing for multi-KG environments
5. [Git Rename Detection for Refactoring](patterns.md#git-rename-detection-for-refactoring) — Content-based history preservation
6. [Hybrid Automation Architecture](patterns.md#hybrid-automation-architecture) — Skills + commands + hooks balance
7. [Three-Tier Installation Architecture](patterns.md#three-tier-installation-architecture) — Multi-platform deployment strategy
8. [MCP-First Core Architecture](patterns.md#mcp-first-core-architecture) — Platform-agnostic data operations
9. [Session Parallelization (Zero File Overlap)](patterns.md#session-parallelization-zero-file-overlap) — Parallel development safety
10. [Plan-Driven Development](patterns.md#plan-driven-development) — Validation + implementation + verification

---

## Gotchas

**11 entries documenting pitfalls and prevention strategies:**

1. [.gitignore Inline Comments Silently Fail](gotchas.md#gitignore-inline-comments-silently-fail) — Comment syntax errors prevent file ignoring
2. [Duplicate Hooks Declaration in plugin.json](gotchas.md#duplicate-hooks-declaration-in-pluginjson) — Auto-discovery + explicit = conflict
3. [Marketplace Config Pulls from Main Branch Only](gotchas.md#marketplace-config-pulls-from-main-branch-only) — Feature branches invisible to marketplace
4. [Interactive Prompts Fail in Hook Context](gotchas.md#interactive-prompts-fail-in-hook-context) — No stdin in detached hook environment
5. [Slash Commands Can't Be Called from Bash Scripts](gotchas.md#slash-commands-cant-be-called-from-bash-scripts) — IDE-only features, not shell executables
6. [Multi-KG Architecture Blocks Inline Updates](gotchas.md#multi-kg-architecture-blocks-inline-updates) — Inline pattern incompatible with routing
7. [Line vs Token Metrics Inconsistency](gotchas.md#line-vs-token-metrics-inconsistency) — Switching metrics mid-project breaks estimates
8. [Truncated Plugin Marketplace Slug (28-char limit)](gotchas.md#truncated-plugin-marketplace-slug-28-char-limit) — Silent truncation without error
9. [Orphaned Config Paths After Repo Rename](gotchas.md#orphaned-config-paths-after-repo-rename) — Absolute paths become invalid
10. [MkDocs 2.0 Incompatible with Material Theme](gotchas.md#mkdocs-20-incompatible-with-material-theme) — Theme version conflict
11. [YAML name Field Uses Colon Not Hyphen](gotchas.md#yaml-name-field-uses-colon-not-hyphen) — Syntax for nested command names

---

## Concepts

**10 entries documenting architectural concepts and terminology:**

1. [Three-Tier Installation](concepts.md#three-tier-installation) — Tier 1 (Claude Code), Tier 2 (MCP IDEs), Tier 3 (template-only)
2. [Multi-KG System](concepts.md#multi-kg-system) — Support for project-local, personal, shared KGs
3. [Active KG Pointer](concepts.md#active-kg-pointer) — Single active graph from configured options
4. [Commands vs Skills](concepts.md#commands-vs-skills) — Task execution vs guided workflows
5. [Delegated vs Inline Architecture](concepts.md#delegated-vs-inline-architecture) — Routing vs direct operation
6. [Progressive Disclosure](concepts.md#progressive-disclosure) — Essential info first, details on demand
7. [INSTALL.md Standard](concepts.md#installmd-standard) — LLM-executable installation format
8. [MCP as Universal Data Layer](concepts.md#mcp-as-universal-data-layer) — Platform-independent core operations
9. [Platform-Agnostic Core](concepts.md#platform-agnostic-core) — Core + IDE-specific layers
10. [Token-Based Size Limits](concepts.md#token-based-size-limits) — Accurate capacity planning via tokens

---

## Architecture

**6 entries documenting system design and component relationships:**

1. [Plugin Component Classification](architecture.md#plugin-component-classification) — Commands, skills, MCP server, hooks
2. [Multi-KG Routing Logic](architecture.md#multi-kg-routing-logic) — Active pointer → path resolution → operation
3. [MCP Server Design](architecture.md#mcp-server-design) — 7 tools + 2 resources, standalone capable
4. [Knowledge Graph File Structure](architecture.md#knowledge-graph-file-structure) — 5 files with cross-references
5. [Plugin Distribution Architecture](architecture.md#plugin-distribution-architecture) — Git → npm allowlist → marketplace
6. [Documentation Hierarchy](architecture.md#documentation-hierarchy) — README → user/dev/contributor docs

---

## Workflows

**7 entries documenting standard operating procedures:**

1. [KG Initialization Workflow](workflows.md#kg-initialization-workflow) — Setup new KG via `/kg-sis:init`
2. [Lesson Capture → KG Extraction Workflow](workflows.md#lesson-capture--kg-extraction-workflow) — Document → extract → sync
3. [Local Marketplace Testing Workflow](workflows.md#local-marketplace-testing-workflow) — Dev → rsync → test → iterate
4. [Plan-Driven Development Workflow](workflows.md#plan-driven-development-workflow) — Plan → implement → verify → commit
5. [Version Release Process Workflow](workflows.md#version-release-process-workflow) — Version → CHANGELOG → docs → release
6. [Documentation Standards Enforcement Workflow](workflows.md#documentation-standards-enforcement-workflow) — Validation → compliance → links
7. [Session Parallelization Workflow](workflows.md#session-parallelization-workflow) — Partition → parallel → sequential merge

---

## By Date Added

**February 2026**

**2026-02-22 (Phase 4 Population):**
- All 44 entries created from development history (v0.0.1–v0.0.8.4)
- Sourced from 16 lessons learned and 11 architecture decision records
- Covers patterns, gotchas, concepts, architecture, and workflows

---

## By Evidence Source

### Lessons Learned (16 total)

- [Commands vs Skills Architecture Research](../../lessons-learned/architecture/Lessons_Learned_Commands_vs_Skills_Architecture.md) → **Patterns**: Commands vs Skills; **Concepts**: Commands vs Skills; **ADR-002**
- [Duplicate Hooks Declaration](../../lessons-learned/debugging/Lessons_Learned_Duplicate_Hooks_Declaration.md) → **Gotchas**: Duplicate Hooks; **ADR-002**
- [Both Models Missed Directory Change](../../lessons-learned/patterns/Lessons_Learned_Both_Models_Missed_Directory_Change.md) → **Concepts**: Platform-Agnostic Core
- [Git Rename Detection Preserves History](../../lessons-learned/patterns/Lessons_Learned_Git_Rename_Detection_Preserves_History.md) → **Patterns**: Git Rename Detection
- [Inline KG Updates Violate Multi-KG](../../lessons-learned/architecture/Lessons_Learned_Inline_KG_Updates_Violate_Multi_KG.md) → **Patterns**: Delegated Architecture; **Gotchas**: Multi-KG Blocks Inline
- [Post-Commit Hooks Must Be Opt-In](../../lessons-learned/process/Lessons_Learned_Post_Commit_Hooks_Must_Be_Opt_In.md) → **Patterns**: Hybrid Automation
- [Interactive Prompts Don't Work in Hooks](../../lessons-learned/debugging/Lessons_Learned_Interactive_Prompts_Dont_Work_In_Hooks.md) → **Gotchas**: Interactive Prompts Fail
- [Line vs Token Metrics Confusion](../../lessons-learned/debugging/Lessons_Learned_Line_vs_Token_Metrics_Confusion.md) → **Concepts**: Token-Based Size Limits; **Gotchas**: Metrics Inconsistency
- [Truncated Marketplace Slug](../../lessons-learned/debugging/Lessons_Learned_Truncated_Marketplace_Slug.md) → **Gotchas**: Truncated Slug
- [Validation-to-Implementation Workflow](../../lessons-learned/process/Lessons_Learned_Validation_to_Implementation_Workflow.md) → **Workflows**: Plan-Driven Development; **Patterns**: Plan-Driven Development
- [Config Orphaned References](../../lessons-learned/architecture/Lessons_Learned_Config_Orphaned_References.md) → **Gotchas**: Orphaned Config Paths
- [Session Parallelization](../../lessons-learned/process/Lessons_Learned_Session_Parallelization.md) → **Patterns**: Session Parallelization; **Workflows**: Session Parallelization
- [Plugin Example File Management](../../lessons-learned/architecture/Lessons_Learned_Plugin_Example_File_Management.md) → **Architecture**: Distribution Architecture
- [Update Notifications for Non-Plugin Users](../../lessons-learned/architecture/Lessons_Learned_Update_Notifications_NonPlugin_Users.md) → **Concepts**: Three-Tier Installation
- [Plugin Namespace Visibility](../../lessons-learned/debugging/namespace-visibility-shadow-command-failure.md) → **Patterns**: Commands vs Skills
- [Local Marketplace Testing](../../lessons-learned/process/local-marketplace-testing-workflow.md) → **Patterns**: Two-Location Sync; **Workflows**: Marketplace Testing

### Architecture Decisions (11 total)

- [ADR-001: Centralized Multi-KG Configuration](../../decisions/ADR-001-centralized-multi-kg-configuration.md) → **Patterns**: Multi-KG Configuration; **Concepts**: Multi-KG System, Active KG Pointer; **Architecture**: Multi-KG Routing Logic; **Workflows**: KG Initialization
- [ADR-002: Commands vs Skills Architecture](../../decisions/ADR-002-commands-vs-skills-architecture.md) → **Patterns**: Commands vs Skills Classification; **Concepts**: Commands vs Skills; **Architecture**: Plugin Component Classification
- [ADR-003: Abandon Shadow Commands](../../decisions/ADR-003-abandon-shadow-commands-for-file-prefix.md) → **Workflows**: Plan-Driven Development
- [ADR-004: Token-Based Memory Size Limits](../../decisions/ADR-004-token-based-memory-size-limits.md) → **Concepts**: Token-Based Size Limits
- [ADR-005: Defer Memory Rules Engine](../../decisions/ADR-005-defer-memory-rules-engine.md) → **Workflows**: Plan-Driven Development
- [ADR-006: Delegated vs Inline KG Updates](../../decisions/ADR-006-delegated-vs-inline-kg-updates.md) → **Patterns**: Delegated Command Architecture; **Concepts**: Delegated vs Inline; **Architecture**: Multi-KG Routing Logic
- [ADR-007: Distribution Hygiene Files Allowlist](../../decisions/ADR-007-distribution-hygiene-files-allowlist.md) → **Architecture**: Plugin Distribution; **Gotchas**: Files Allowlist Compliance
- [ADR-008: Third-Person Language Standard](../../decisions/ADR-008-third-person-language-standard.md) → **Workflows**: Documentation Standards Enforcement; **Architecture**: Documentation Hierarchy
- [ADR-009: Three-Tier Installation Architecture](../../decisions/ADR-009-three-tier-installation-architecture.md) → **Patterns**: Three-Tier Installation, MCP-First Core; **Concepts**: Three-Tier Installation, INSTALL.md Standard, MCP as Universal Layer, Platform-Agnostic Core; **Architecture**: MCP Server Design; **Workflows**: KG Initialization
- [ADR-010: Namespace Rename (knowledge → kg-sis)](../../decisions/ADR-010-namespace-rename-knowledge-to-kg-sis.md) → **Patterns**: Commands vs Skills
- [ADR-011: Defer Update Notifications](../../decisions/ADR-011-defer-update-notifications.md) → **Concepts**: Three-Tier Installation

---

## Integration Points

**With Lessons Learned:**
- Every pattern, gotcha, workflow links to originating lesson
- Every concept links to lesson establishing that concept
- Every architecture entry links to ADR + supporting lessons

**With Architecture Decisions:**
- Every ADR referenced by at least one KG entry
- ADRs provide "why" context; KG entries provide "how" guidance
- Bidirectional links enable tracing from KG → lesson → ADR and vice versa

**With MEMORY.md:**
- Critical patterns from KG entries synced to project memory during updates
- Token-based size limits enforced on both MEMORY.md and KG entries
- Multi-KG concept documented in MEMORY.md under "Project Context"

---

## Usage

**To add an entry:**
1. Choose category (patterns/gotchas/concepts/architecture/workflows)
2. Copy template from that file
3. Fill in all sections
4. Link to evidence (lesson learned or ADR)
5. Update this index

**To search:**
Use `/kg-sis:recall "query"` to search across all KG files.

