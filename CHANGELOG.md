# Changelog

All notable changes to the Knowledge Plugin will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
- **README**: Corrected command count from 17 to 16 (accurate count)
- **README**: Updated namespace documentation to reflect filename-based approach
- **.gitignore**: Added selective KG strategy rules
  - Gitignore: docs/plans/, docs/sessions/, docs/chat-history/, docs/lessons-learned/debugging/
  - Commit: docs/lessons-learned/architecture/, docs/lessons-learned/patterns/

### Fixed
- Filename typo: `knowledge-updat-issue-plan.md` → `knowledge-update-issue-plan.md`

### Documentation
- Captured lesson: Shadow command strategy failed with Gemini (cross-LLM incompatibility)
- Documented file prefix workaround as cross-LLM compatible solution
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
- `/knowledge:init` - Initialize new knowledge graph with wizard
- `/knowledge:list` - Display all configured knowledge graphs
- `/knowledge:switch` - Change active knowledge graph
- `/knowledge:add-category` - Add category to existing KG
- `/knowledge:configure-sanitization` - Set up pre-commit hooks for sensitive data
- `/knowledge:check-sensitive` - Scan KG for potentially sensitive information
- `/knowledge:link-issue` - Link lesson to GitHub issue with bidirectional references
- `/knowledge:status` - Display active KG status and quick reference
- `/knowledge:capture-lesson` - Document lessons with git metadata
- `/knowledge:recall` - Search across all KG systems
- `/knowledge:update-graph` - Extract insights from lessons to KG
- `/knowledge:sync-all` - Automated knowledge sync pipeline
- `/knowledge:update-issue-plan` - Sync KG → plan → issue → GitHub
- `/knowledge:session-summary` - Auto-document work sessions
- `/knowledge:extract-chat` - Extract chat history from Claude/Gemini logs
- `/knowledge:meta-issue` - Initialize meta-issue tracking for complex problems

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

[Unreleased]: https://github.com/technomensch/knowledge-graph-plugin/compare/v0.0.1-alpha...HEAD
[0.0.1-alpha]: https://github.com/technomensch/knowledge-graph-plugin/releases/tag/v0.0.1-alpha
[1.0.0]: https://github.com/technomensch/knowledge-graph-plugin/releases/tag/v1.0.0
