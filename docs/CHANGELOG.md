# Changelog

All notable changes to the Knowledge Plugin will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.0.9-alpha] - 2026-02-27

### Added
- **Plugin Infrastructure & Onboarding**
  - Added `CLAUDE.md` to define project architecture, versioning rules, and strict AI constraints
  - Re-introduced `mcpToolSearch: true` in settings to enable lazy-loading and reduce token overhead
  - Step 0 ("Permissions") and Step 0.5 ("Migration Check") added to `INSTALL.md`

### Changed
- **Complete Namespace Migration**
  - Renamed namespace across all code, manifest, and documentation from `/kg-sis:` to `/kmgraph:`
  - `kg-sis` plugin disabled in settings; enabled `kmgraph` as the only active extension identifier
- **Consolidated Automation Hooks**
  - Replaced 3 separate shell scripts with single `hooks-master.sh` invoking 3 isolated sections (config, lessons, memory)
  - Updated `hooks.json` to reduce plugin load overhead

### Fixed
- **Hook Security Audit (ADR-012)**
  - Applied word-splitting protections (quoted subshells) in `memory-diff-check.sh`
  - Validated strict avoidance of `eval`, network requests, and code-altering operations in all hooks
  - Ensured MEMORY.md limits conform exactly to ADR-004 logic (2,000 token limit)

### Documentation
- Created `ADR-012: Hook Security Model` defining rules for plugin script execution
- Added non-Claude platform instructions to `GETTING-STARTED.md` and `COMMAND-GUIDE.md`
- Fixed lingering references to legacy namespace in `NAVIGATION-INDEX.md` and UI test files

## [0.0.8.7-alpha] - 2026-02-22

### Added
- **Manual Documentation Updates & Security Fixes**
  - ROADMAP version history table: Complete chronological record v0.0.1-alpha through v0.0.8.6-alpha
  - ROADMAP footer: Updated to reflect v0.0.8.6-alpha current release

### Fixed
- **Security: npm audit vulnerabilities → 0 vulns**
  - Fixed ajv ReDoS vulnerability (GHSA-2g4f-4pwh-qvx6) in MCP server dependencies
  - Fixed hono timing comparison hardening (GHSA-gq3j-xvxp-8hrf) in MCP server dependencies
  - Rebuilt mcp-server/dist/ with patched packages
  - Updated mcp-server/package-lock.json with fixed versions

### Documentation
- Removed hardcoded version numbers to prevent docs becoming stale:
  - Changed "22 slash commands" → "slash commands" in index.md
  - Changed "7 MCP tools" → "MCP tools" in index.md
- Added clarity to Four Pillars reference: "Learn about the Four Pillars this project was built on"
- Simplified GETTING-STARTED.md heading format (removed "Path A" prefix)
- Updated Getting Started card: Specified "local IDE CLI coding assistant" for clarity on platform scope

**Branch**: `v0.0.8.7-alpha-manual-updates`
**Commits**:
- `ca59e184` - Docs: Remove hardcoded version numbers + clarifications
- `9830f8aa` - Build: Fix npm security vulnerabilities
- `949b04c1` - Docs: ROADMAP version history table
- `0f8c19b7` - Docs: ROADMAP MkDocs customization section
- `4e91d8e7` - Docs: CHANGELOG backfill v0.0.7-alpha through v0.0.8.4-alpha
- `c92e9f7e` - Docs: Getting Started card "local IDE CLI coding assistant"

## [0.0.8.6-alpha] - 2026-02-22

### Added
- **MkDocs Material Theme Customization (Phases 1-3)**
  - Material theme v9.7.0+ with 10+ navigation features enabled
  - Dark mode (slate scheme) as default with light mode fallback
  - Sticky navigation tabs (`navigation.tabs.sticky`)
  - Breadcrumbs above page titles (`navigation.path`)
  - Footer navigation with Next/Previous buttons (`navigation.footer`)
  - Integrated Table of Contents in left sidebar (`toc.integrate` + `toc.follow`)
  - Copy buttons on all code blocks (`content.code.copy`)
  - Search plugin configuration with autocomplete, highlighting, and sharing

- **Custom CSS Styling (400+ lines)**
  - Typography: Inter and JetBrains Mono from Google Fonts
  - Dark mode colors: Navy primary (#1a1a2e), cyan accent (#00d2ff)
  - Light mode colors: Blue primary (#003d82), orange accent (#ff6b35)
  - Glassmorphism header effect with backdrop blur (dark mode only)
  - WCAG AA contrast compliance for all color combinations
  - Enhanced code blocks, tables, admonitions, and search box styling
  - Print media support (hides navigation for exports)

- **Page Restructuring & Visual Enhancements**
  - Grid cards on index.md and GETTING-STARTED.md for visual navigation
  - Tabbed interface in COMMAND-GUIDE.md (6 command categories)
  - Mermaid diagrams: "Knowledge Capture Pipeline" (GETTING-STARTED.md)
  - Mermaid diagrams: "Four Pillars Relationships" (CONCEPTS.md)
  - All diagrams include accessibility attributes (accTitle, accDescr)
  - Neutral mermaid theme for proper rendering in both color schemes

- **Additional Experience Plugins**
  - `mkdocs-git-revision-date-localized-plugin` — "Last updated" timestamps on all pages
  - `mkdocs-glightbox` — Lightbox image/diagram viewing
  - `mkdocs-minify-plugin` — Asset compression for snappy performance
  - `mkdocs-roamlinks-plugin` — WikiLink support for knowledge entries

- **Social Links & Copyright**
  - GitHub: https://github.com/technomensch
  - LinkedIn: https://www.linkedin.com/in/marckaplan/
  - Copyright: "Staying in Sync"

### Fixed
- Mermaid diagram rendering in dark mode (removed hardcoded colors, adopted neutral theme)
- Light mode header styling (restored Material theme defaults)
- Grid card links accessibility (ensured descriptive text, no "click here")

### Documentation
- Updated STYLE-GUIDE.md with blockquote vs. admonition format guidance
- Moved FAQ under Commands section in mkdocs.yml navigation
- Added comprehensive Section 508 compliance documentation in STYLE-GUIDE.md

### Technical
- Updated `requirements.txt` with mkdocs-material>=9.7.0 and 4 plugins
- mkdocs.yml: 15+ navigation features, plugin configuration, theme palette setup
- Custom stylesheet: docs/stylesheets/extra.css (400+ lines)
- No core document rewrites or file splitting (MkDocs rendering enhancements only)

**Version**: 0.0.8.4-alpha → 0.0.8.6-alpha

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
- `/kmgraph:start-issue-tracking` command (19th command) — Full issue initialization
  workflow, fully ported from prior project and sanitized for cross-project portability
  and LLM-platform-agnostic use. Features:
  - Auto-detects parent branch, version from git tag, issue type, and next issue number
    from existing `issues/` directory
  - Smart defaults reduce interactive prompts to 1 (issue description only)
  - Creates structured directory under `{active_kg_path}/issues/{number}-{slug}/`
  - Generates `issue.md` with full metadata (title, type, branch, version, date, scope)
  - Git branch creation: `git checkout -b issue/{number}-{slug}`
  - Knowledge graph synchronization via `/kmgraph:update-issue-plan`
  - Integrates with `/kmgraph:link-issue` and `/kmgraph:meta-issue`
  - No project-specific dependencies; uses KG config for all path resolution

### Fixed
- `.gitignore` inline comments on pattern lines (3 paths were silently not being ignored
  because git does not support inline comments on pattern lines)
- Truncated marketplace slug `stayinginsync-knowledge-grap` (missing trailing `h`) in
  `.claude/settings.json` and plugin cache `settings.json` — caused plugin-not-found
  errors on every session start
- Dangling `/kmgraph:start-issue-tracking` references in `commands/update-issue-plan.md`
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
- **`/kmgraph:restore-memory` Command** - Restore archived MEMORY.md entries
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
- **`/kmgraph:archive-memory` Command** - Enhanced with restoration tracking
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
- **`/kmgraph:archive-memory` Command** - Archive stale MEMORY.md entries to prevent bloat
  - Token-based staleness detection (90-day threshold, customizable)
  - Moves stale entries to MEMORY-archive.md with archive log
  - Shows tokens freed and current size after archival
  - Dry-run mode for previewing without writing
- **Autonomous Triggering in Knowledge-Graph-Usage Skill**
  - After lesson capture: Suggests `/kmgraph:update-graph` immediately
  - After significant commits: Detects fix/debug/pattern keywords, suggests capture within 30 minutes
  - Before problem-solving: Suggests `/kmgraph:recall` to check existing knowledge
- **Post-Commit Hook Template** - Detects lesson-worthy commits
  - Located in `core/examples-hooks/post-commit-lesson-suggestion`
  - Triggers on keywords: fix, solved, debug, implement, refactor, pattern, architecture
  - Optional installation via `/kmgraph:init` wizard (default: no)
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
- `/kmgraph:restore-memory` command (restore archived entries by ID)
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
- `/kmgraph:init` - Initialize new knowledge graph with wizard
- `/kmgraph:list` - Display all configured knowledge graphs
- `/kmgraph:switch` - Change active knowledge graph
- `/kmgraph:add-category` - Add category to existing KG
- `/kmgraph:configure-sanitization` - Set up pre-commit hooks for sensitive data
- `/kmgraph:check-sensitive` - Scan KG for potentially sensitive information
- `/kmgraph:link-issue` - Link lesson to GitHub issue with bidirectional references
- `/kmgraph:status` - Display active KG status and quick reference
- `/kmgraph:capture-lesson` - Document lessons with git metadata
- `/kmgraph:recall` - Search across all KG systems
- `/kmgraph:update-graph` - Extract insights from lessons to KG
- `/kmgraph:sync-all` - Automated knowledge sync pipeline
- `/kmgraph:update-issue-plan` - Sync KG → plan → issue → GitHub
- `/kmgraph:session-summary` - Auto-document work sessions
- `/kmgraph:extract-chat` - Extract chat history from Claude/Gemini logs
- `/kmgraph:meta-issue` - Initialize meta-issue tracking for complex problems

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
