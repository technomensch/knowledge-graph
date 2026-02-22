# Changelog

All notable changes to the Knowledge Plugin will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.0.8.4-alpha] - 2026-02-21

### Added
- **`/kg-sis:extract-chat` enhancements** — Date range filtering and project scoping
  - `--after YYYY-MM-DD` / `--before YYYY-MM-DD` — Extract chat sessions within date range
  - `--project [name]` — Filter chat by project name
  - Supports both Claude Code and Gemini Antigravity extraction

### Fixed
- OUTPUT_DIR handling in extraction script — respects environment variable

**Version**: 0.0.8.3-alpha → 0.0.8.4-alpha

---

## [0.0.8.3-alpha] - 2026-02-21

### Changed
- **Plugin namespace refactor:** `/knowledge:*` → `/kg-sis:*` across all 22+ commands
  - File names remain in `commands/` (namespace now in `plugin.json`)
  - Plugin identifier: `(knowledge)` → `(kg-sis)` in marketplace
  - Resolves truncated slug issue (28-char limit on `knowledge-graph-stays-in-sync`)

### Updated
- All documentation examples (COMMAND-GUIDE.md, CHEAT-SHEET.md, README.md, etc.)
- All command references in tools, skills, and integration points
- Marketplace manifest with new namespace

**Version**: 0.0.8.2-alpha → 0.0.8.3-alpha

---

## [0.0.8.2-alpha] - 2026-02-21

### Added
- **`/kg-sis:update-doc --user-facing` command** — Interactive wizard for plugin documentation
  - Guided workflow to update COMMAND-GUIDE.md, CHEAT-SHEET.md, and other user-facing docs
  - Disambiguates plugin docs (user-facing) vs KG content (personal knowledge)
  - Enforces documentation standards (third-person language, Section 508 compliance)

### Documentation
- Updated plugin.json to reflect new command (22 total commands)
- Added `/kg-sis:help` cross-reference for doc updates

**Version**: 0.0.8.1-alpha → 0.0.8.2-alpha

---

## [0.0.8.1-alpha] - 2026-02-20

### Added
- **FAQ.md** — Comprehensive FAQ covering installation, multi-KG usage, plugin removal, updates
- **DEPLOYMENT-SITEMAP.md** — Architecture and deployment documentation
- **CONTRIBUTING.md** — Contribution guidelines and code standards

### Documentation
- Enhanced INSTALLATION consistency across docs
- Added troubleshooting section to FAQ

**Version**: 0.0.8-alpha → 0.0.8.1-alpha

---

## [0.0.8-alpha] - 2026-02-20

### Added
- **INSTALL.md — Universal installation system** (Mintlify standard)
  - Platform detection wizard (Claude Code, Cursor, Windsurf, Continue.dev, JetBrains, VS Code, others)
  - Three-tier installation architecture:
    - Tier 1 (Claude Code): Full marketplace installation
    - Tier 2 (MCP IDEs): Local clone with MCP server registration
    - Tier 3 (Template-only): Manual file extraction for any IDE
  - Feature matrix showing what each tier includes
  - Clear setup steps for each platform
- **`/kg-sis:setup-platform` command** — Generate platform-specific setup instructions for colleagues

### Changed
- **Installation process unified** — Previously 3 separate paths in GETTING-STARTED.md; now single INSTALL.md with tiered approach
- **GETTING-STARTED.md refactored** — No longer contains installation; links to INSTALL.md

### Architecture
- Three-tier design enables support for any platform while being honest about feature limitations
- Tier 1 (Claude Code) is primary; Tiers 2-3 supported with known constraints (no auto-updates for Tier 2/3)

**Version**: 0.0.7-alpha → 0.0.8-alpha

---

## [0.0.7-alpha] - 2026-02-20

### Added (Documentation Consolidation — 3 phases, 15 sessions)

**New Documentation Files (5):**
- **CHEAT-SHEET.md** — Quick reference for all commands (imperative style: "Use this command...")
- **CONCEPTS.md** — Comprehensive glossary (third-person style: "The system provides...")
- **COMMAND-GUIDE.md** — Complete guide to all commands with difficulty classification
- **GETTING-STARTED.md** — Setup and first-time usage walkthrough
- **NAVIGATION-INDEX.md** — Documentation site navigation and learning paths
- **STYLE-GUIDE.md** — Technical writing standards and conventions

**New Commands (3):**
- **`/kg-sis:create-doc` command** — Scaffold new documentation files with language standards
- **`/kg-sis:create-adr` command** — Create Architecture Decision Records with auto-increment
- **`/kg-sis:help` command** — Single-source help system (access to COMMAND-GUIDE.md)

**Documentation Standards (v0.0.7):**
- Third-person language required for comprehensive docs (reduces cognitive load ~20%)
- Section 508 accessibility compliance (WCAG 2.1 Level AA)
- Best practice citations (Nielsen Norman Group, Google Style Guide, etc.)
- Template markers ([AUTO], [MANUAL]) for automated field updates in ADR/lesson templates

**Knowledge Capture Integration:**
- Step 4.8 in `/kg-sis:capture-lesson` detects decision indicators
- Automatic ADR creation with bidirectional linking if architectural decision detected
- Lesson-to-ADR and ADR-to-lesson cross-references auto-maintained

### Changed
- **Command count:** 17 → 22 (added 3 new commands + 2 previous commands; net +5 net new)
- **Documentation structure:** SETUP.md renamed to CONFIGURATION.md
- **Command difficulty classification:** 4 Essential, 8 Intermediate, 7 Advanced

### Documentation
- Professional standards guardrails (third-person only, 508 compliance, academic citations)
- Parallel implementation: Sessions 2+3, Sessions 4+5 ran concurrently (Session Parallelization pattern)
- Each documentation file includes Section 508 validation and accessibility review

**Version**: 0.0.6-alpha → 0.0.7-alpha

---

## [0.0.6-alpha] - 2026-02-17

### Added
- Root `package.json` with `files` allowlist — implements npm-standard distribution
  hygiene so marketplace-installed plugin excludes developer-only content:
  - `docs/` (plugin developer's knowledge graph: decisions, lessons, KG entries)
  - `tests/` (internal test suite)
  - Root development files (ROADMAP.md, etc.)
  `docs/` directory remains in git unchanged; no path changes to commands or scripts.

### Fixed
- Stale `kg-config.json` path: `knowledge-graph-plugin/docs` → `knowledge-graph/docs`
  (repo was renamed in v0.0.3 but local config was never updated)
- Stale GitHub URLs: updated `knowledge-graph-plugin` → `knowledge-graph` in CHANGELOG
  footer, ROADMAP feedback links, README install example, tests/README, and scripts

### Documentation
- Added developer vs. distribution table to README.md
- Updated ROADMAP.md with v0.0.6-alpha section

**Version**: 0.0.5-alpha → 0.0.6-alpha

## [0.0.5-alpha] - 2026-02-17

### Added
- `/kg-sis:start-issue-tracking` command (19th command) — Full issue initialization
  workflow, fully ported from prior project and sanitized for cross-project portability
  and LLM-platform-agnostic use. Features:
  - Auto-detects parent branch, version from git tag, issue type, and next issue number
    from existing `issues/` directory
  - Smart defaults reduce interactive prompts to 1 (issue description only)
  - Creates structured directory under `{active_kg_path}/issues/{number}-{slug}/`
  - Generates `issue.md` with full metadata (title, type, branch, version, date, scope)
  - Git branch creation: `git checkout -b issue/{number}-{slug}`
  - Knowledge graph synchronization via `/kg-sis:update-issue-plan`
  - Integrates with `/kg-sis:link-issue` and `/kg-sis:meta-issue`
  - No project-specific dependencies; uses KG config for all path resolution

### Fixed
- `.gitignore` inline comments on pattern lines (3 paths were silently not being ignored
  because git does not support inline comments on pattern lines)
- Truncated marketplace slug `stayinginsync-knowledge-grap` (missing trailing `h`) in
  `.claude/settings.json` and plugin cache `settings.json` — caused plugin-not-found
  errors on every session start
- Dangling `/kg-sis:start-issue-tracking` references in `commands/update-issue-plan.md`
  (lines ~61 and ~203) now resolve to the newly created command
- First `SessionStart` hook entry (check-memory.sh) missing `comment` field
- Session-summary command markdown template embedded as raw prose instead of fenced
  code block, causing visual ambiguity between instruction and template content
- Standardized command frontmatter: removed `name` field from `recall.md`, `list.md`,
  and `session-summary.md` for consistency with all other 16 commands

### Removed
- Empty `mcp-server/.claude-plugin/` artifact directory (leftover from refactoring,
  risked being parsed as a nested plugin by plugin discovery tools)
- Orphaned root-level `node_modules/` directory (no root `package.json` exists;
  packages were installed by mistake at an earlier point)

### Documentation
- Added `docs/lessons-learned/architecture/.gitkeep` and
  `docs/lessons-learned/patterns/.gitkeep` to preserve empty tracked directories
- Updated ROADMAP.md with v0.0.5-alpha section
- Updated README.md version, status line, and command count (18 → 19)
- Added implementation plan: `docs/plans/v0.0.5-alpha-plan.md`

**Version**: 0.0.4-alpha → 0.0.5-alpha

## [0.0.4-alpha] - 2026-02-16

### Added
- **`/kg-sis:restore-memory` Command** - Restore archived MEMORY.md entries
  - Fuzzy search by entry title using `fuzzy-search-archive.sh` helper script
  - Restore by entry ID/index with `--id` flag
  - List all archived entries with `--list` flag
  - Preview entry content before restoring
  - Target section selection with `--section` flag (auto-detect or user-specified)
  - Dry-run mode with `--dry-run` flag for previewing without writing
  - Token limit checking (blocks if would exceed 2,000 tokens, warns if > 1,500)
  - Archive log restoration tracking (marks entries as "Restored: YYYY-MM-DD")
  - Commits both MEMORY.md and MEMORY-archive.md with descriptive message
- **Fuzzy Search Script** - `scripts/fuzzy-search-archive.sh`
  - Four-tier ranking strategy: exact match, starts-with, contains-all words, contains-any word
  - Case-insensitive search with word-based fuzzy matching
  - Returns ranked list of matching entry IDs and titles
- **Architecture Decision Record** - `docs/decisions/ADR-005-defer-memory-rules-engine.md`
  - Documents decision to defer rules engine and smart summarization to v0.0.5-alpha
  - Analyzes three options: rules+restore (medium scope), full automation (all features), restore only (minimal scope)
  - Rationale: Archive without restore is incomplete UX, rules need real-world patterns, maintain velocity

### Changed
- **Version**: 0.0.3-alpha → 0.0.4-alpha
- **Command Count**: 17 → 18 (added restore-memory)
- **`/kg-sis:archive-memory` Command** - Enhanced with restoration tracking
  - Archive log now shows restoration timestamps: "[Restored: YYYY-MM-DD]"
  - Restored entries remain in archive for historical record
  - Documents restore workflow and manual restoration process
- **knowledge-graph-usage skill** - Added restore workflow documentation
  - When to restore archived entries (context needed for current work)
  - Restore vs archive decision criteria
  - Integration with archive-memory command

### Documentation
- Added implementation plan: `docs/plans/v0.0.4-alpha-plan.md`
  - Complete 3-phase implementation breakdown
  - 27 verification checkboxes across 4 categories
  - Timeline estimation (2-3 days)
- Updated ROADMAP.md with v0.0.4-alpha section
- Updated README.md command count and status

### Deferred
- **MEMORY.md auto-sync rules engine** (deferred to v0.0.5-alpha)
  - YAML-based pattern matching for automated sync decisions
  - Global defaults + per-KG overrides
  - Confidence scoring system
- **Smart summarization** (deferred to v0.0.5-alpha)
  - LLM-powered entry consolidation
  - Batch processing or on-demand
  - Merge similar entries strategy

## [0.0.3-alpha] - 2026-02-16

### Added
- **`/kg-sis:archive-memory` Command** - Archive stale MEMORY.md entries to prevent bloat
  - Token-based staleness detection (90-day threshold, customizable)
  - Moves stale entries to MEMORY-archive.md with archive log
  - Shows tokens freed and current size after archival
  - Dry-run mode for previewing without writing
- **Autonomous Triggering in Knowledge-Graph-Usage Skill**
  - After lesson capture: Suggests `/kg-sis:update-graph` immediately
  - After significant commits: Detects fix/debug/pattern keywords, suggests capture within 30 minutes
  - Before problem-solving: Suggests `/kg-sis:recall` to check existing knowledge
- **Post-Commit Hook Template** - Detects lesson-worthy commits
  - Located in `core/examples-hooks/post-commit-lesson-suggestion`
  - Triggers on keywords: fix, solved, debug, implement, refactor, pattern, architecture
  - Optional installation via `/kg-sis:init` wizard (default: no)
- **SessionStart Hooks** - Three hooks for enhanced context
  - `recent-lessons.sh` - Displays lessons modified in last 7 days
  - `memory-diff-check.sh` - Notifies of MEMORY.md changes since last session
  - Both scoped to active KG, silent when no changes
- **Duplicate Detection Pre-Flight** - Step 1.1 in capture-lesson
  - Searches for similar lessons before content gathering
  - Offers merge (update existing), link (create with reference), or proceed (new)
  - Prevents knowledge fragmentation

### Changed
- **Version**: 0.0.2-alpha → 0.0.3-alpha
- **Command Count**: 16 → 17 (added archive-memory)
- **MEMORY.md Limits**: Line-based (250/300) → Token-based (1,500/2,000)
  - Token estimation: word_count × 1.3
  - Soft limit: 1,500 tokens (warning, sync continues)
  - Hard limit: 2,000 tokens (blocks MEMORY.md updates, suggests archive)
  - Replaced all line-based references in update-graph.md Step 7 and sync-all.md
- **capture-lesson.md Step 4.6** - Structured choice UI
  - "Extract now (recommended)" - Inline update-graph execution
  - "Manual later" - Deferred extraction
  - "Skip" - Batch via sync-all
- **update-graph.md** - Enhanced `--auto` flag behavior
  - Returns structured quality feedback when called from capture-lesson
  - Added `--edit-entry` flag for user review before saving
- **knowledge-graph-usage skill** - Added duplicate detection guidance (~150 words)
  - Search strategy before capturing
  - Merge vs create new decision criteria

### Fixed
- Token-based size limits more accurate than line-based (short vs long lines)
- MEMORY.md bloat prevention via archival system
- Knowledge fragmentation via duplicate detection

### Documentation
- Plan: `docs/plans/v0.0.3-alpha-plan.md` (257 lines, consolidated from 1,174)
- ROADMAP: v0.0.3-alpha section added with 3-phase breakdown
- Verification: All Phase 1, 2, 3 checkboxes marked complete

### Deferred to v0.0.4-alpha
- MEMORY.md auto-sync rules engine (YAML rules, confidence scoring)
- Smart summarization (LLM-powered entry consolidation)
- `/kg-sis:restore-memory` command (restore archived entries by ID)
- Per-KG config directories with `memory-sync-rules.yaml`

## [0.0.2-alpha] - 2026-02-16

### Added
- **Knowledge Graph Usage Skill** - Autonomous guidance for knowledge capture
  - 1,900-word lean SKILL.md with progressive disclosure
  - 5,800-word capture-patterns.md reference (problem-solution, architectural, meta-issue patterns)
  - 6,200-word command-workflows.md reference (10 detailed workflow patterns)
  - Triggers on phrases: "documenting lessons", "institutional memory", "we solved this before"
  - Proactive recognition of recurring problems and valuable insights
- **Plugin Knowledge Graph** - Plugin now documents itself (dogfooding)
  - Initialized KG in `docs/` with categories: architecture, debugging, patterns
  - Selective git strategy (commit shareable, gitignore personal notes)
  - First lesson captured: namespace-visibility-shadow-command-failure.md
  - Master index with chronological and tag-based navigation
- **Marketplace Branding** - Changed identifier from "(knowledge)" to "(tm-sis)"
  - Represents "technomensch-stayinginsync" publisher identity
  - Updated marketplace.json with new branding
  - README documentation of marketplace strategy

### Changed
- **Version**: 0.0.1-alpha → 0.0.2-alpha
- **Command Filenames**: Removed `knowledge-` prefix from all 16 command files
  - `knowledge-status.md` → `status.md` (all commands renamed)
  - Marketplace installation shows namespace correctly regardless of filename
  - Cleaner, more maintainable filenames
  - Git history preserved via rename detection
- **README**: Corrected command count from 17 to 16 (accurate count)
- **README**: Updated namespace documentation to reflect marketplace behavior
  - Documents two-location sync requirement for local testing
  - Explains Distribution Mode namespace handling
  - References captured lessons for detailed workflow
- **.gitignore**: Added selective KG strategy rules
  - Gitignore: docs/plans/, docs/sessions/, docs/chat-history/, docs/lessons-learned/debugging/
  - Commit: docs/lessons-learned/architecture/, docs/lessons-learned/patterns/, docs/lessons-learned/process/

### Fixed
- Filename typo: `knowledge-updat-issue-plan.md` → `knowledge-update-issue-plan.md`

### Documentation
- **Lesson 1**: Shadow command strategy failed with Gemini (cross-LLM incompatibility)
  - File: `docs/lessons-learned/debugging/namespace-visibility-shadow-command-failure.md`
  - Documented file prefix workaround as cross-LLM compatible solution
  - Updated with marketplace discovery (namespace works correctly regardless of prefix)
  - Cross-references local marketplace testing workflow lesson
- **Lesson 2**: Local marketplace testing requires two-location sync
  - File: `docs/lessons-learned/process/local-marketplace-testing-workflow.md`
  - Documents development directory vs marketplace cache locations
  - Provides rsync automation script for sync workflow
  - Explains Distribution Mode namespace behavior
- **Master Index**: Updated with 2 lessons total (debugging + process categories)
  - Chronological index with date-based navigation
  - Tag index with 9 unique tags (#testing, #marketplace, #plugin-development, etc.)
- Updated plugin validation criteria checklist in v0.0.2-validate-plugin.md plan

### Validation
- Plugin-validator: PASS with 0 critical issues
- All 16 commands validated
- Skill validated with proper progressive disclosure
- MCP server validated (7 tools, 2 resources)

## [0.0.1-alpha] - 2026-02-16

### Added
- Initial alpha release of Knowledge Plugin for Claude Code
- 16 commands for knowledge capture, recall, sync, and management
- Multi-KG support with per-category git strategies
- Git metadata tracking in lesson/ADR YAML frontmatter
- MCP server (7 tools + 2 resources) for cross-platform use
- Platform-agnostic core for non-Claude users (Cursor, Continue.dev, Aider, local LLMs)
- ~30 generalized examples + 10 documentation files
- SessionStart hook for MEMORY.md staleness detection
- Python chat extraction scripts (Claude + Gemini)
- Meta-issue tracking system for complex multi-attempt problems
- Bidirectional KG ↔ MEMORY.md synchronization
- Privacy-focused sanitization tools and documentation

### Changed
- **ARCHITECTURAL DECISION**: Migrated from `skills/` to `commands/` directory
  - Commands provide manual invocation (not autonomous)
  - Full workflow loading (not lazy-loaded)
  - Better suited for deterministic knowledge operations
- Updated plugin metadata (version 0.0.1-alpha, email, repository, license, keywords)
- Updated README with commands vs skills architecture documentation
- All command `name:` fields now include `knowledge:` namespace prefix for autocomplete

### Commands
- `/kg-sis:init` - Initialize new knowledge graph with wizard
- `/kg-sis:list` - Display all configured knowledge graphs
- `/kg-sis:switch` - Change active knowledge graph
- `/kg-sis:add-category` - Add category to existing KG
- `/kg-sis:configure-sanitization` - Set up pre-commit hooks for sensitive data
- `/kg-sis:check-sensitive` - Scan KG for potentially sensitive information
- `/kg-sis:link-issue` - Link lesson to GitHub issue with bidirectional references
- `/kg-sis:status` - Display active KG status and quick reference
- `/kg-sis:capture-lesson` - Document lessons with git metadata
- `/kg-sis:recall` - Search across all KG systems
- `/kg-sis:update-graph` - Extract insights from lessons to KG
- `/kg-sis:sync-all` - Automated knowledge sync pipeline
- `/kg-sis:update-issue-plan` - Sync KG → plan → issue → GitHub
- `/kg-sis:session-summary` - Auto-document work sessions
- `/kg-sis:extract-chat` - Extract chat history from Claude/Gemini logs
- `/kg-sis:meta-issue` - Initialize meta-issue tracking for complex problems

### MCP Tools
- `kg_config_init` - Create KG directory structure + config entry
- `kg_config_list` - Read and return all KGs from config
- `kg_config_switch` - Update active KG in config
- `kg_config_add_category` - Add category directory + update config
- `kg_search` - Full-text search across KG files
- `kg_scaffold` - Create file from template with variable substitution
- `kg_check_sensitive` - Scan files against regex patterns

### MCP Resources
- `kg://config` - Current kg-config.json contents (read-only)
- `kg://templates/{name}` - Template files from core/templates/

## [1.0.0] - TBD (Future Release)

### Added
- Initial release of Knowledge Plugin for Claude Code
- 16 skills for knowledge capture, recall, sync, and management
- Multi-KG support with per-category git strategies
- Git metadata tracking in lesson/ADR YAML frontmatter
- MCP server (7 tools + 2 resources) for cross-platform use
- Platform-agnostic core for non-Claude users (Cursor, Continue.dev, Aider, local LLMs)
- ~30 generalized examples + 10 documentation files
- SessionStart hook for MEMORY.md staleness detection
- Python chat extraction scripts (Claude + Gemini)
- Meta-issue tracking system for complex multi-attempt problems
- Bidirectional KG ↔ MEMORY.md synchronization
- Privacy-focused sanitization tools and documentation

### Planned Features (v1.0.0)
- TBD

[Unreleased]: https://github.com/technomensch/knowledge-graph/compare/v0.0.1-alpha...HEAD
[0.0.1-alpha]: https://github.com/technomensch/knowledge-graph/releases/tag/v0.0.1-alpha
[1.0.0]: https://github.com/technomensch/knowledge-graph/releases/tag/v1.0.0
