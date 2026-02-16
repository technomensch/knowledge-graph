# Knowledge Plugin — Roadmap

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
- ✅ 10 documentation files (SETUP, core/docs/*)
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

- Allow `/knowledge:cl` as alias for `/knowledge:capture-lesson`
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
- Document merge behavior in SETUP.md

**Why not v1.0**: Multi-KG system already supports project-local KGs. This is for team collaboration at scale.

---

### Backup Before Destructive Operations
**Priority**: Medium
**Rationale**: Safety net for accidental deletions

- `/knowledge:switch` and `/knowledge:init` should snapshot current state
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
- `/knowledge:archive` skill for managing lifecycle
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
- Document migration path in CHANGELOG.md

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
- [ ] CHANGELOG.md is up to date

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
   - Current implementation in `/knowledge:link-issue` skill
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
| v1.0.0 | Stable release with alpha feedback | Q2 2026 | Planning |
| v1.1.0 | Performance + UX improvements | Q3 2026 | Roadmap |
| v1.2.0 | Cross-platform adapters | Q4 2026 | Roadmap |
| v2.0.0 | Web UI + advanced automation | 2027 | Vision |

---

## Feedback & Feature Requests

- **GitHub Issues**: https://github.com/technomensch/knowledge-graph-plugin/issues
- **Discussions**: https://github.com/technomensch/knowledge-graph-plugin/discussions
- **Priority Voting**: Community can upvote features in Discussions

**Decision Criteria**:
- Does it align with "knowledge capture and cross-session memory" mission?
- Does it benefit majority of users, or just edge cases?
- Can it be implemented without breaking existing workflows?
- Is maintenance burden acceptable?

---

*Last updated: 2026-02-16*
*Plugin Version: 0.0.1-alpha (Alpha Release)*
