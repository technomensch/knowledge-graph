# Knowledge Plugin — Roadmap

## v0.0.8.6-alpha (Released: 2026-02-22)

**Status**: ✅ Complete - Documentation UX Customization
**Branch**: `v0.0.8.6-alpha-customize-mkdocs`

### Completed - All Phases
- ✅ MkDocs Material theme v9.7.0+ configuration (10+ features)
- ✅ Dark mode (slate) as default with glassmorphism header effect
- ✅ Light mode Material theme defaults (preserved original styling)
- ✅ Sticky navigation tabs, breadcrumbs, footer navigation
- ✅ Integrated Table of Contents in left sidebar
- ✅ Grid cards on index.md and GETTING-STARTED.md
- ✅ Tabbed command interface in COMMAND-GUIDE.md
- ✅ Mermaid diagrams with neutral theme (adapts to light/dark)
- ✅ Custom CSS (400+ lines) with professional typography
- ✅ WCAG AA accessibility compliance
- ✅ 4 experience plugins (git-revision-date, glightbox, minify, roamlinks)

### Phase Breakdown

#### Phase 1: Global Configuration ✅
- Material theme v9.7.0+ with 10+ navigation features
- Dark mode as default, light mode fallback
- Plugin configuration (search, emoji, superfences, tabbed)
- Requirements.txt updated with all dependencies

#### Phase 2: Custom CSS ✅
- Typography: Inter and JetBrains Mono fonts
- Dark mode colors: Navy + cyan with WCAG AA contrast
- Light mode colors: Blue + orange
- Glassmorphism header effect (dark mode only)
- Enhanced styling for code, tables, admonitions, search

#### Phase 3: Page Restructuring ✅
- Grid cards for visual navigation
- Tabbed command interface (6 categories)
- Mermaid diagrams with accessibility attributes
- STYLE-GUIDE.md updated with admonition guidance
- FAQ moved under Commands section in navigation

#### Phase 4: Validation & Audit ✅
- WikiLink audit completed (1 in use)
- Accessibility compliance verified
- Syntax verification for YAML, diagrams, cards, tabs, CSS
- Build verification: mkdocs build successful
- Mermaid diagram rendering verified in both modes

### Next Steps
- 🔄 Merge to main and verify on GitHub Pages
- 📦 Plan v0.0.9 (enhanced features)

---

## v0.0.1-alpha (Released: 2026-02-16)

**Status**: ✅ Complete - Alpha Testing
**Branch**: `0.0.1-alpha`

### Completed - All Phases
- ✅ Plugin scaffold and manifest (.claude-plugin/plugin.json)
- ✅ Architectural migration: skills/ → commands/ (research-driven decision)
- ✅ 16 commands with `knowledge:` namespace prefix for autocomplete
- ✅ Python chat extraction scripts with OUTPUT_DIR fix
- ✅ 24 template files in core/templates/
- ✅ Hooks system (SessionStart memory validation)
- ✅ Knowledge reviewer subagent
- ✅ ~30 generalized examples (patterns, concepts, gotchas, lessons, ADRs, meta-issue)
- ✅ 10+ documentation files (CONFIGURATION, GETTING-STARTED, core/docs/*)
- ✅ MCP server (7 tools + 2 resources) with compiled dist/
- ✅ Full metadata (repository, license, keywords)
- ✅ Commands vs Skills architecture documentation

### Phase Breakdown

#### Phase 1: Foundation ✅
- Plugin scaffold (plugin.json, config, LICENSE, CHANGELOG)
- Directory structure (16 command dirs + core/)
- 8 initial commands converted with full detail preservation
- Python scripts (5 files with OUTPUT_DIR fix)
- Templates (14 files in core/templates/)
- Hooks & subagent
- ROADMAP.md

#### Phase 2: New Commands ✅
- 8 new commands implemented from scratch (init, list, switch, add-category, configure-sanitization, check-sensitive, link-issue, status)

#### Phase 3: Examples + Docs ✅
- 10 Lesson learned examples with reference tracking
- 3 Knowledge graph sample entries
- 2 Architecture Decision Record (ADR) examples
- 1 Complex Meta-Issue implementation saga example
- 6 Core documentation files (Architecture, Patterns, Workflows, Sanitization, etc.)
- All ~30 generalized examples completed

#### Phase 4: MCP Server ✅
- 7 Core tools implemented (init, list, switch, add-category, scaffold, search, sanitization)
- MCP server scaffolded and built
- 2 Resources implemented (config, templates)
- Built dist/ committed for out-of-box functionality

#### Phase 5: Alpha Release ✅
- Architectural migration documented (commands vs skills)
- Sanitization checklist completed
- Plugin metadata restored
- README updated for v0.0.1-alpha
- CHANGELOG entry created
- Duplicate hooks reference fixed
- Ready for alpha testing and feedback

### Next Steps
- 🔄 Alpha testing and feedback collection
- ⏳ Bug fixes and refinements based on feedback
- ⏳ v1.0.0 planning

---

## v0.0.4-alpha (Released: 2026-02-16)

**Status**: ✅ Complete - MEMORY.md Restore Capability Release
**Branch**: `v0.0.4-alpha`

### Scope: Minimal (Restore Only)

**Decision**: Implement restore command only. Defer rules engine and smart summarization to v0.0.5-alpha.

**Rationale** (see ADR-001):
- Archive without restore is incomplete UX (users need both capabilities)
- Rules engine needs real-world MEMORY.md patterns from v0.0.3 usage
- Smart summarization requires LLM integration (adds complexity)
- Focused scope maintains release velocity (2-3 days vs 1-2 weeks)

### Completed - All Phases

#### Phase 1: Core Restore Command
- ✅ Created `/kmgraph:restore-memory` command (new - 18th command)
  - Restore by entry title with fuzzy search
  - Restore by entry ID/index from archive
  - List all archived entries with `--list` flag
  - Preview entry before restoring
  - Target section selection with `--section` flag
  - Dry-run mode with `--dry-run` flag
  - Token limit checking before restoration
  - Archive log restoration tracking
- ✅ Created `scripts/fuzzy-search-archive.sh` helper
  - Four-tier ranking: exact, starts-with, contains-all, contains-any
  - Case-insensitive search with word-based fuzzy matching
- ✅ Updated `/kmgraph:archive-memory` command
  - Added restoration tracking to archive log format
  - Documents restore workflow and manual restoration process

#### Phase 2: Integration & Polish
- ✅ Updated `skills/knowledge-graph-usage/SKILL.md`
  - Added restore workflow documentation
  - Documented when to restore vs archive
- ✅ Updated README.md
  - Version: 0.0.3-alpha → 0.0.4-alpha
  - Command count: 17 → 18
  - Updated status and feature list
- ✅ Updated ROADMAP.md with v0.0.4-alpha section
- ✅ Updated docs/CHANGELOG.md with v0.0.4-alpha entry

#### Phase 3: ADR Documentation
- ✅ Created `docs/decisions/ADR-001-defer-memory-rules-engine.md`
  - Documents decision to defer rules engine to v0.0.5
  - Options considered: rules+restore, full automation, restore only
  - Rationale: Complete archive feature, gather feedback, maintain velocity

### Key Deliverables
- **Commands**: 18 total (added restore-memory)
- **Scripts**: fuzzy-search-archive.sh (archive search helper)
- **Documentation**: ADR-001 (architectural decision record)
- **Timeline**: 2-3 days (vs 1-2 weeks for full automation)

### Deferred to v0.0.5-alpha
- MEMORY.md auto-sync rules engine (YAML-based pattern matching)
- Smart summarization (LLM-powered entry consolidation)
- Advanced confidence scoring for rule triggers
- Config directory for per-KG memory-sync-rules.yaml

### Next Steps
- 🔄 Alpha testing restore workflow and feedback collection
- ⏳ Gather real-world MEMORY.md patterns from v0.0.3/v0.0.4 usage
- ✅ v0.0.5-alpha released (validation fixes + issue tracking command)

---

## v0.0.6-alpha (Released: 2026-02-17)

**Status**: ✅ Complete - Distribution Hygiene Release
**Branch**: `v0.0.6-alpha`

### Scope: files allowlist for clean marketplace distribution

- ✅ Root `package.json` with `files` allowlist (npm-standard distribution hygiene)
- ✅ `docs/` excluded from distribution without any directory rename
- ✅ Fixed stale `kg-config.json` path (knowledge-graph-plugin → knowledge-graph)
- ✅ Fixed stale GitHub URLs throughout repo
- ✅ Added developer vs. distribution table to README

### Deferred to v0.0.7
- Plugin name consolidation `"knowledge"` → `"knowledge-graph"`
- grep+sed → jq refactor in hook scripts

### Key Deliverables
- **Distribution size**: Reduced by excluding docs/, tests/ from installed package
- **No breaking changes**: docs/ path unchanged; all commands and scripts unaffected

---

## v0.0.5-alpha (Released: 2026-02-17)

**Status**: ✅ Complete - Validation & Issue Tracking Release
**Branch**: `v0.0.5-alpha`

### Scope: Validation Fixes + Issue Tracking Command

#### Changes
- ✅ `/kmgraph:start-issue-tracking` — Full issue initialization workflow (19th command)
  - Ported from optimize-my-resume, sanitized for cross-project portability
  - LLM-platform-agnostic (no Claude-specific API calls)
  - Auto-detects: parent branch, version from git, issue type, next issue number
  - Smart defaults reduce prompts to 1 (issue description)
  - Creates issue directory structure under `{active_kg_path}/issues/`
  - Generates issue.md with metadata, git branch, KG sync
  - Integrates with `/kmgraph:update-issue-plan` and `/kmgraph:link-issue`
- ✅ Fixed `.gitignore` inline comment bug (silently prevented 3 paths from being ignored)
- ✅ Removed orphaned `mcp-server/.claude-plugin/` artifact directory
- ✅ Removed root-level `node_modules/` with no root `package.json`
- ✅ Standardized command frontmatter (removed `name` field from 3 commands)
- ✅ Fixed dangling `/kmgraph:start-issue-tracking` references in `update-issue-plan.md`
- ✅ Fixed first `SessionStart` hook entry missing `comment` field
- ✅ Fixed session-summary template not fenced in code block
- ✅ Confirmed: `SessionStart` hook event name is valid and working

### Deferred to v0.0.6
- grep+sed → jq refactor in hook scripts (higher-risk refactoring)
- Plugin name consolidation `"knowledge"` → `"knowledge-graph"` (requires coordinated settings updates)

### Key Deliverables
- **Commands**: 19 total (added start-issue-tracking)
- **Validation**: 0 critical issues, 4 major fixed, 11 warnings addressed
- **Timeline**: Same-day release alongside v0.0.4-alpha

---

## v0.0.3-alpha (Released: 2026-02-16)

**Status**: ✅ Complete - Automation & Memory Management Release
**Branch**: `v0.0.3-alpha`

### Completed - All Phases

#### Phase 1: Skill Enhancement + Command Hooks
- ✅ Enhanced knowledge-graph-usage skill with autonomous triggering
  - After lesson capture: Suggest `/kmgraph:update-graph` immediately
  - After commits: Detect fix/debug/pattern keywords, suggest capture
  - Before problem-solving: Suggest `/kmgraph:recall` to check existing knowledge
- ✅ Updated capture-lesson Step 4.6 with structured choice UI
- ✅ Enhanced update-graph with `--edit-entry` flag and structured quality feedback
- ✅ Created post-commit hook template (core/examples-hooks/)
- ✅ Added hook installation to `/kmgraph:init` wizard (optional, default: no)

#### Phase 2: Context Enhancement + Duplicate Detection
- ✅ Added recent-lessons.sh SessionStart hook (displays lessons from last 7 days)
- ✅ Enhanced knowledge-graph-usage skill with duplicate detection guidance
- ✅ Added capture-lesson Step 1.1 pre-flight (searches for similar lessons)
- ✅ Merge/link/proceed options for duplicate handling

#### Phase 3: MEMORY.md Bloat Prevention
- ✅ Token-based limits (1,500 soft / 2,000 hard) replace line-based limits
- ✅ Updated sync-all with MEMORY.md size check (Step 2.5)
- ✅ Updated update-graph Step 7 with token-based verification
- ✅ Created `/kmgraph:archive-memory` command (new - 17th command)
- ✅ Added memory-diff-check.sh SessionStart hook (shows changes since last session)

### Key Deliverables
- **Commands**: 17 total (added archive-memory)
- **Hooks**: 3 SessionStart hooks (check-memory, recent-lessons, memory-diff-check)
- **Automation**: Hybrid skill guidance + command hooks architecture
- **Limits**: Token-based MEMORY.md management (word_count × 1.3)
- **UX**: Proactive suggestions, structured choices, quality feedback

### Documentation Updates
- CHANGELOG: v0.0.3-alpha entry added
- ROADMAP: This section added
- Plan: docs/plans/v0.0.3-alpha-plan.md completed
- Verification: All 3 phase checkboxes marked complete

### Deferred to v0.0.4-alpha
- MEMORY.md auto-sync rules engine (YAML rules, confidence scoring)
- Smart summarization (LLM-powered entry consolidation)
- `/kmgraph:restore-memory` command (restore archived entries)
- Per-KG config directories with memory-sync-rules.yaml

---

## v0.0.2-alpha (Released: 2026-02-16)

**Status**: ✅ Complete - Validation & Enhancement Release
**Branch**: `v0.0.2-alpha`

### Completed - All Phases

#### Phase 0: Marketplace & Foundation
- ✅ Marketplace branding updated: "(knowledge)" → "(tm-sis)"
- ✅ Plugin knowledge graph initialized (dogfooding)
- ✅ Selective git strategy configured for KG
- ✅ Namespace visibility lesson captured

#### Phase 1-2: Skill Development
- ✅ Knowledge Graph Usage Skill created
  - 1,900-word lean SKILL.md (progressive disclosure)
  - 5,800-word capture-patterns.md reference
  - 6,200-word command-workflows.md reference
  - Strong trigger phrases for autonomous activation
  - 10 detailed workflow patterns

#### Phase 3-5: Validation & Fixes
- ✅ Lesson captured with git metadata tracking
- ✅ Plugin-validator: PASS with 0 critical issues
- ✅ Fixed filename typo: updat → update
- ✅ Updated README command count: 17 → 16
- ✅ Version bumped: 0.0.1-alpha → 0.0.2-alpha

### Key Deliverables
- **Skill**: knowledge-graph-usage (~13,900 words total guidance)
- **KG**: Plugin documents itself with 2 lessons captured
  - Lesson 1: namespace-visibility-shadow-command-failure.md (debugging)
  - Lesson 2: local-marketplace-testing-workflow.md (process)
- **Branding**: tm-sis marketplace identity established
- **Validation**: Comprehensive plugin validation complete
- **Refactoring**: Command filenames optimized (knowledge-* → base names)

### Documentation Updates
- CHANGELOG: v0.0.2-alpha entry added
- ROADMAP: This section added
- Plan: docs/plans/v0.0.2-validate-plugin.md completed
- Validation: All criteria checkboxes marked complete

### Phase Breakdown

#### Phase 0A: Marketplace Branding ✅
- Changed marketplace name to "tm-sis"
- Updated owner to "technomensch-stayinginsync"
- Added README documentation for branding strategy

#### Phase 0B: Knowledge Graph Initialization ✅
- Initialized plugin KG in docs/
- Created categories: architecture, debugging, patterns
- Set up selective git strategy
- Configured .gitignore rules

#### Phase 1: Document Shadow Command Failure ✅
- Created comprehensive lesson in debugging/ category
- Documented Gemini compatibility issue
- Captured file prefix workaround solution
- Added to lessons-learned master index

#### Phase 2: Create Knowledge-Graph-Usage Skill ✅
- Wrote SKILL.md with third-person description
- Created capture-patterns.md reference (5,800 words)
- Created command-workflows.md reference (6,200 words)
- Implemented progressive disclosure pattern

#### Phase 3: Capture Lesson with Command ✅
- Used /kmgraph:capture-lesson on plugin itself
- Validated git metadata capture
- Updated master index automatically
- Committed with proper message format

#### Phase 4: Run Plugin-Validator ✅
- Launched plugin-validator agent
- Received comprehensive validation report
- Identified 5 warnings (0 critical issues)
- Validated all components (commands, skill, agent, hooks, MCP)

#### Phase 5: Fix Validation Issues ✅
- Fixed filename typo
- Updated version numbers
- Corrected README documentation
- Cleaned up validation findings

#### Phase 6: Testing & Discovery ✅
- Discovered two-location sync requirement for local marketplace testing
- Created comprehensive lesson: local-marketplace-testing-workflow.md (process category)
- Updated namespace visibility lesson with marketplace discovery
- Documented that namespace works correctly in marketplace regardless of filename
- Updated master index with 2 lessons total (debugging + process)

#### Phase 7: Command Refactoring ✅
- Removed `knowledge-` prefix from all 16 command filenames
- Renamed: `knowledge-status.md` → `status.md` (all 16 commands)
- Git history preserved via rename detection (100% similarity)
- Implemented lesson discovery: cleaner filenames sufficient for marketplace
- Updated README namespace documentation
- Updated CHANGELOG with refactoring details

### What Changed from v0.0.1-alpha
- Added autonomous knowledge capture guidance (skill)
- Plugin now uses itself for documentation (2 lessons captured)
- Marketplace branding established
- Comprehensive validation completed
- Documentation accuracy improved
- Command filenames optimized (no redundant prefix)
- Local testing workflow documented
- Cross-LLM compatibility insights captured

### Next Steps
- 🔄 Test skill triggering with real usage
- 🔄 Gather feedback on skill guidance quality
- 🔄 Continue capturing lessons as plugin evolves
- ⏳ v1.0.0 planning continues

---

## v1.0.0 (Planned: Q2 2026)

**Status**: Planning
**Focus**: Stable release with community feedback incorporated

### Planned Features
- Bug fixes from alpha testing
- Performance optimizations
- Enhanced documentation based on user feedback
- Additional examples from real-world usage
- Marketplace submission

---

## Future Considerations

### Skill Aliases / Short Commands
**Priority**: Low
**Rationale**: Typing speed is minor compared to LLM response time

- Allow `/kmgraph:cl` as alias for `/kmgraph:capture-lesson`
- Configurable aliases in kg-config.json
- Example config:
  ```json
  {
    "aliases": {
      "cl": "capture-lesson",
      "ug": "update-graph",
      "sa": "sync-all"
    }
  }
  ```

**Why not v1.0**: Adds configuration complexity for marginal UX gain. Skills are invoked via autocomplete anyway.

---

### Per-Project Config Overrides
**Priority**: Medium
**Use Case**: Team-shared KG settings committed to repo

Allow `.claude/kg-local.json` at project root to override global config:
- Team can commit shared category definitions
- Individual developers keep private categories in global config
- Merge strategy: project-local overrides global defaults

**Implementation Notes**:
- Read hierarchy: project-local → global → defaults
- Config schema stays same, just different precedence
- Document merge behavior in CONFIGURATION.md

**Why not v1.0**: Multi-KG system already supports project-local KGs. This is for team collaboration at scale.

---

### Backup Before Destructive Operations
**Priority**: Medium
**Rationale**: Safety net for accidental deletions

- `/kmgraph:switch` and `/kmgraph:init` should snapshot current state
- Auto-backup before category deletion or KG removal
- Lightweight: just `cp -r` to timestamped directory in `~/.claude/kg-backups/`

**Implementation**:
```bash
# Before destructive operation
timestamp=$(date +%Y%m%d_%H%M%S)
cp -r "$KG_PATH" "$HOME/.claude/kg-backups/$ACTIVE_KG_$timestamp"
```

**Why not v1.0**: Adds storage overhead. Users should use git for versioning. This is insurance against user error, not a primary feature.

---

### Large KG Performance
**Priority**: Low (becomes Medium if adopted at scale)
**Trigger**: When `kg_search` response time exceeds 2 seconds

Current search is full-text file walk — works for <500 files. For larger KGs:
- Index-based search (SQLite FTS5 or similar)
- Pre-compute search index on KG updates
- Incremental index updates (don't rebuild on every capture-lesson)

**Benchmark**: Test with 1000+ lessons, 200+ KG entries to validate need.

**Why not v1.0**: Premature optimization. Real-world usage will reveal if this is needed.

---

### Archival / Superseding Entries
**Priority**: Low
**Use Case**: KG entries become outdated as patterns evolve

- Mark KG entries as "superseded by [newer entry]"
- Archive old lessons without deleting (move to `archive/` subdirectory)
- `/kmgraph:archive` skill for managing lifecycle
- Search includes archived content by default (flag to exclude)

**Example frontmatter**:
```yaml
status: superseded
superseded_by: docs/knowledge/patterns.md#multi-tier-sync-v2
superseded_at: 2026-03-15
reason: "Pattern evolved to support dynamic tier discovery"
```

**Why not v1.0**: Adds complexity. Users can manually move files or delete. This is workflow tooling for mature KGs.

---

### Config Schema Migration
**Priority**: High (as soon as v1.1 introduces breaking changes)
**Rationale**: Graceful upgrades for users

- v1.0 → v1.1 config changes need migration
- Add `"version"` field to kg-config.json (already present in v1.0)
- MCP `kg_config_init` should check version and migrate if needed
- Document migration path in docs/CHANGELOG.md

**Example migration**:
```javascript
// v1.0 config
{ "version": "1.0.0", "graphs": {...} }

// v1.1 adds sanitization rules
{ "version": "1.1.0", "graphs": {...}, "sanitization": {...} }

// Migration: auto-add sanitization defaults if missing
```

**Why not v1.0**: No breaking changes yet. Implement when v1.1 ships.

---

### Cross-Repo Knowledge Graphs
**Priority**: Medium
**Use Case**: Share KG entries across multiple repos via global topic-based KGs

- MEMORY.md can reference cross-repo patterns
- KG entry links use absolute paths for cross-repo references
- Document pattern in PLATFORM-ADAPTATION.md

**Example**:
- Developer has 3 microservices repos
- Shared "microservices-patterns" KG at `~/.claude/knowledge-graphs/microservices-patterns/`
- Each repo's MEMORY.md references: "See microservices-patterns KG: [Circuit Breaker Pattern](~/.claude/knowledge-graphs/microservices-patterns/docs/knowledge/patterns.md#circuit-breaker)"

**Why not v1.0**: Multi-KG system already supports this. Just needs documentation and examples.

---

### Plugin Marketplace Integration
**Priority**: High (post-v1.0 launch)
**Actions**:
- Submit to official Claude Code plugin directory at https://clau.de/plugin-directory-submission
- Auto-update mechanism when new versions are released
- Version compatibility matrix (which Claude Code versions support which plugin versions)

**Requirements**:
- [ ] Plugin passes all sanitization checks
- [ ] Examples are clearly marked and generalized
- [ ] Documentation is comprehensive
- [ ] MCP server tested on macOS and Linux
- [ ] README has installation instructions
- [ ] docs/CHANGELOG.md is up to date

**Why not v1.0**: v1.0 IS the marketplace launch. This is the post-launch checklist.

---

### Additional MCP Tools
**Priority**: Medium
**Extends**: MCP server capabilities for automation

Potential new tools:
1. **`kg_git_metadata`** — Capture branch, commit, author, PR, issue
   - Reduces skill complexity by delegating git operations to MCP
   - Already implemented in skills via bash, but MCP makes it reusable for other platforms

2. **`kg_link_issue`** — Update YAML frontmatter + post GitHub comment
   - Current implementation in `/kmgraph:link-issue` skill
   - MCP makes it available to Cursor/Continue.dev/Cline users

3. **`kg_extract_chat`** — Run Python extraction scripts
   - Wrapper around chat extraction Python scripts
   - Handles environment setup (KG_OUTPUT_DIR)
   - Returns structured results instead of raw files

**Implementation Notes**:
- These are skill → MCP ports (make deterministic operations platform-agnostic)
- All require git CLI or gh CLI availability checks
- Should gracefully degrade if dependencies missing

**Why not v1.0**: Skills already implement these. MCP layer is for cross-platform portability after v1.0 proves value.

---

### Web UI for Knowledge Graph Browsing
**Priority**: Low (nice-to-have)
**Use Case**: Visual exploration of KG without file navigation

- Static site generator that converts KG markdown to browsable HTML
- Interactive graph visualization of cross-references
- Search interface (leverages MCP `kg_search`)
- Hosted locally or deployed to GitHub Pages

**Tech Stack**:
- Markdown → HTML: marked.js or remark
- Graph viz: D3.js or Cytoscape.js
- Search: Lunr.js or MiniSearch
- Static site: 11ty or Astro

**Why not v1.0**: Adds significant scope. KG is optimized for LLM consumption, not human browsing. Markdown is readable enough.

---

### LLM Provider Adapters
**Priority**: Medium (for non-Claude users)
**Use Case**: Make skills work with GPT-4, Gemini, local LLMs

Abstraction layer for provider-specific features:
- GitHub integration (requires API tokens for non-Claude users)
- MCP compatibility (Claude Desktop, Cursor, Continue.dev, Cline)
- Prompt format adapters (some LLMs don't support tool use the same way)

**Implementation**:
- Provider config in kg-config.json: `"provider": "claude|gpt4|gemini|local"`
- Skills check provider and adjust behavior
- Document provider-specific limitations

**Why not v1.0**: Claude Code is the primary target. Core/ already supports platform-agnostic workflows for other LLMs.

---

### Integration Tests & CI
**Priority**: High (post-v1.0)
**Use Case**: Automated testing before publishing updates

Test suite:
- Template validation (all placeholders documented, syntax valid)
- Example sanitization (no project-specific terms)
- MCP server build (TypeScript compiles without errors)
- Skill syntax validation (YAML frontmatter valid)
- Cross-reference integrity (no broken links in examples)

**CI Pipeline** (GitHub Actions):
```yaml
- Lint shell scripts (shellcheck)
- Validate Python scripts (ruff)
- Test MCP server build
- Run sanitization validator
- Check example content
```

**Why not v1.0**: Manual testing sufficient for initial release. CI is for sustainable maintenance.

---

### Template Customization System
**Priority**: Medium
**Current State**: Users can override templates in project-local docs/templates/

Enhancements:
- Template inheritance (extend plugin template, override specific sections)
- Template variables with defaults
- Visual template editor (web UI)
- Template gallery (community-contributed templates)

**Example extended template**:
```markdown
<!-- Extends: ${CLAUDE_PLUGIN_ROOT}/core/templates/lessons-learned/lesson-template.md -->
<!-- Adds: security-impact field -->

---
title: "{{ title }}"
security-impact: high|medium|low|none
---
```

**Why not v1.0**: Users can already copy templates and modify. Inheritance adds complexity for marginal benefit.

---

## Known Limitations (v1.0)

These are understood constraints that won't be addressed in v1.0:

1. **MEMORY.md Discovery**: Uses heuristics (project hash search). May fail for non-standard setups.
   - **Mitigation**: User can manually provide path via config

2. **Multi-User Collaboration**: No conflict resolution for concurrent KG edits
   - **Mitigation**: Use git for versioning, communicate within team

3. **Large Binary Files**: Chat extraction doesn't handle binary log formats (only text-based JSONL, JSON, protobuf)
   - **Mitigation**: Document supported formats, add converters if needed

4. **Cross-Platform Scripts**: Bash scripts tested on macOS and Linux, not Windows
   - **Mitigation**: Document WSL requirement for Windows users

5. **GitHub-Only Integration**: Issue linking requires GitHub (no GitLab, Bitbucket, Azure DevOps)
   - **Mitigation**: Document as GitHub-specific feature, make optional

6. **No Cloud Sync**: KG data is local-only (no automatic sync across machines)
   - **Mitigation**: Users can sync via git, Dropbox, etc.

---

## Community Contributions Welcome

Ideas for community-driven enhancements:
- Additional template categories (security, compliance, legal)
- Platform adapters (JetBrains IDEs, Emacs, Vim)
- MCP tools for other knowledge management systems (Obsidian, Notion, Roam)
- Internationalization (non-English templates and examples)
- Integration with external knowledge bases (Confluence, Wiki.js, Docusaurus)

**Contributing**: See CONTRIBUTING.md (to be added post-v1.0)

---

## Version History & Planning

| Version | Focus | Release Date | Status |
|---------|-------|-------------|--------|
| v0.0.1-alpha | Core plugin + 16 commands + MCP server + architecture migration | 2026-02-16 | ✅ Released |
| v0.0.2-alpha | Validation + knowledge-graph-usage skill + marketplace branding | 2026-02-16 | ✅ Released |
| v0.0.3-alpha | Automation + memory management + duplicate detection | 2026-02-16 | ✅ Released |
| v0.0.4-alpha | MEMORY.md restore capability | 2026-02-16 | ✅ Released |
| v0.0.5-alpha | Validation fixes + issue tracking command | 2026-02-17 | ✅ Released |
| v0.0.6-alpha | Distribution hygiene + files allowlist | 2026-02-17 | ✅ Released |
| v0.0.7-alpha | Documentation consolidation (CHEAT-SHEET, CONCEPTS, COMMAND-GUIDE, etc.) | 2026-02-20 | ✅ Released |
| v0.0.8-alpha | Universal installer + three-tier installation architecture | 2026-02-20 | ✅ Released |
| v0.0.8.1-alpha | Documentation infrastructure (FAQ, DEPLOYMENT-SITEMAP, CONTRIBUTING) | 2026-02-21 | ✅ Released |
| v0.0.8.2-alpha | Update-doc --user-facing command | 2026-02-21 | ✅ Released |
| v0.0.8.3-alpha | Plugin namespace refactor (knowledge → kg-sis) | 2026-02-21 | ✅ Released |
| v0.0.8.4-alpha | Extract-chat date/project filtering | 2026-02-21 | ✅ Released |
| v0.0.8.6-alpha | MkDocs Material theme customization + documentation updates | 2026-02-22 | ✅ Released |
| v1.0.0 | Stable release with alpha feedback | Q2 2026 | Planning |
| v1.1.0 | Performance + UX improvements | Q3 2026 | Roadmap |
| v1.2.0 | Cross-platform adapters | Q4 2026 | Roadmap |
| v2.0.0 | Web UI + advanced automation | 2027 | Vision |

---

## Feedback & Feature Requests

- **GitHub Issues**: https://github.com/technomensch/knowledge-graph/issues
- **Discussions**: https://github.com/technomensch/knowledge-graph/discussions
- **Priority Voting**: Community can upvote features in Discussions

**Decision Criteria**:
- Does it align with "knowledge capture and cross-session memory" mission?
- Does it benefit majority of users, or just edge cases?
- Can it be implemented without breaking existing workflows?
- Is maintenance burden acceptable?

---

*Last updated: 2026-02-22*
*Plugin Version: 0.0.8.6-alpha (MkDocs Customization Release)*
