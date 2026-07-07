# Knowledge Management Graph — Roadmap

## Future / Deferred (captured 2026-04-07 during docs-restructure planning)

These items were identified during the v0.0.6-docs-restructure planning session and explicitly deferred. None are scheduled to a specific release yet — promote to enhancement issues when they reach the queue.

### Architectural (version-bump territory)

- **Pluggable knowledge graph storage backends** — Notion, Obsidian, and NotebookLM as primary stores instead of local markdown. Requires `/kmgraph:kmg-init` wizard updates, MCP server config schema additions, and per-backend adapter modules. Captured because the docs-restructure plan adds integration guides for these tools but cannot change the storage layer in scope.
- **Contributor commands vs user commands — surface area separation** — `update-doc`, `create-doc`, and the `doc-update-router` skill exist to update the KMGraph project's own docs site. Today they ship to every end user, conflating two audiences. Future work: move to a separate plugin (`kmgraph-contrib`?), gate by a `.kmgraph-contributor` marker file, or use a `commands/contributing/` subdirectory with conditional registration.
- **Hierarchical skill invocation pattern** — Future support for `/kmgraph:[category]/[skill-name]` notation to navigate skill hierarchy (currently flat). Requires Claude Code plugin evolution or workaround pattern (ADR-002).
- **`--all-graphs` flag for kg_capture MCP tool** — Enable multi-KG capture operations: write to all registered KGs in single operation. Currently requires separate calls per KG (ADR-006).

### MEMORY Management

- **MEMORY.md auto-sync rules engine** — YAML-based pattern matching to automate sync decisions (e.g., "gotcha" → "Common Failure Patterns", "best practice" → "Best Practices"). Requires real-world MEMORY.md patterns from live usage before implementation (ADR-005).
- **MEMORY.md smart summarization** — LLM-powered entry consolidation to merge similar entries and reduce token bloat. Lower priority until rules engine is operational (ADR-005).
- **`me.md` as canonical identity home** — v0.3.0-beta introduces `knowledge/me.md` (project) and `~/.kmgraph/me.md` (personal) as the authoritative home for user identity, working style, and domain expertise. MEMORY.md retains session-derived memories; `me.md` holds intentional static identity. Init will offer to migrate user-type memory entries into `me.md` during setup. See ADR-028.
- **`rules.md` as canonical rules home** — v0.3.0-beta introduces `knowledge/rules.md` as the single source of truth for behavioral rules, replacing scattered rules in CLAUDE.md, memory files, and platform config files. CLAUDE.md and platform files become thin shims that point to `rules.md`. See ADR-028.
- **MEMORY.md scope narrowing** — Once `me.md` and `rules.md` absorb static identity and rules content, MEMORY.md scope narrows to: session-derived discoveries, temporary working context, and pointers to external resources. Long-term: evaluate whether MEMORY.md becomes redundant for well-maintained KGs.

### Navigation / discoverability

- **Add `docs-updates` feed to site navigation** — The documentation updates feed (`/knowledge-graph/docs-updates/`) is live but unreachable from the navbar or footer. Add a navbar or footer link so users can discover changelog-style docs posts. RSS/Atom feeds also exist at `/docs-updates/rss.xml` and `/docs-updates/atom.xml` but are not advertised anywhere.

### Documentation polish (post-v0.0.6-docs-restructure)

- Slim-down rewrite of [STYLE-GUIDE.md](docs/STYLE-GUIDE.md) (currently 633 lines, contributors-only audience)
- `docusaurus-plugin-remote-content` to pull `CHANGELOG.md` from main branch at build time
- `docusaurus-theme-github-codeblock` for embedding source by line range
- Markprompt / LLM-powered Q&A search (wait until Algolia DocSearch usage data exists)
- Interactive decision tree component for "lesson vs ADR vs session-summary vs meta-issue"
- Setup guide for `scripts/notification-dispatch.sh`
- CONCEPTS.md page reordering — move process/workflow sections earlier for first-time users (currently buried after 400 lines of theory)
- CONCEPTS.md length reduction — trim Four-Layer Architecture (~100 lines) and How Search Works (~30 lines); currently 650 lines
- CONCEPTS.md accessibility improvements — add `accTitle`/`accDescr` to search diagrams; fix second-person pronouns in Personal vs Project section

### Process / governance (ADRs to capture)

- ADR placeholder: "Pluggable storage backends — Notion, Obsidian, NotebookLM"
- ADR placeholder: "Contributor command surface area separation"
- ADR placeholder: "Documentation updates feed via Docusaurus blog plugin" (lands in Phase 0 of the docs-restructure)
- ADR placeholder: "Update notifications and version sync mechanism" — Discovery and auto-detection for MCP/template-only users; version consistency across multiple files (ADR-011)

### UX / Ergonomics

- **Skill aliases / short commands** (Low priority) — Allow `/kmgraph:cl` as alias for `/kmgraph:kmg-capture-lesson` etc., configurable in kg-config.json. Deferred: marginal UX gain vs configuration complexity; autocomplete already handles this.
- **Backup before destructive operations** (Medium priority) — `switch` and `init` should auto-snapshot current state before category deletion or KG removal (`cp -r` to `~/.claude/kg-backups/`). Deferred: users should use git for versioning; this is insurance against user error only.
- **Archival / superseding KG entries** (Low priority) — Mark entries as `status: superseded`, archive to `archive/` subdirectory, search includes archived content. Useful for mature KGs where patterns evolve. Deferred: adds lifecycle complexity before core usage patterns are established.

### Data / Storage

- **Per-project config overrides** (Medium priority) — Allow `.claude/kg-local.json` at project root to commit shared category definitions for teams. Read hierarchy: project-local → global → defaults. Deferred: multi-KG already supports project-local KGs; this targets team collaboration at scale.
- **Cross-repo knowledge graphs** (Medium priority) — Share KG entries across multiple repos via global topic-based KGs at `~/.claude/knowledge-graphs/<topic>/`. Deferred: pattern already documentable; needs usage examples in PLATFORM-ADAPTATION.md.
- **Config schema migration** (High — activate when v1.1 introduces breaking changes) — Add `"version"` field to kg-config.json, auto-migrate on `kg_config_init`. No breaking changes yet; implement when v1.1 ships.

### MCP / Platform Extensibility

- **Additional MCP tools** (Medium priority) — Port skill operations to MCP for cross-platform portability:
  - `kg_git_metadata` — capture branch, commit, author, PR, issue (currently bash in skills)
  - `kg_link_issue` — update YAML frontmatter + post GitHub comment (currently `/kmgraph:kmg-link-issue`)
  - `kg_extract_chat` — wrap Python extraction scripts with structured results
  - Deferred: skills already implement these; MCP layer adds value after v1.0 proves adoption.

### Visualization

- **Web UI for knowledge graph browsing** (Low priority) — Static site converting KG markdown to browsable HTML with interactive graph visualization (D3.js/Cytoscape.js) and search (Lunr.js). Deferred: KG is optimized for LLM consumption; markdown is readable enough for current scale.

### Marketplace

- **Plugin marketplace integration** (High — post-v1.0 launch) — Submit to official Claude Code plugin directory; auto-update mechanism; version compatibility matrix.
  - Requirements: sanitization checks pass, examples generalized, docs comprehensive, MCP tested on macOS + Linux, README has install instructions, CHANGELOG current.

---

## v0.5.11 (Released: 2026-06-14)

**Status**: ✅ Complete — Security Fix
**PR**: #145

### Completed
- ✅ **Security Fix**: esbuild HIGH CVE (v0.21.x → v0.23.x)

---

## v0.5.10 (Released: 2026-06-14)

**Status**: ✅ Complete — Codex CLI Expansion + ENH-021
**Branches**: `v0.5.10` through `v0.5.10.8`

### Completed
- ✅ **ENH-021**: `continues_from` field in handoffs for multi-session continuity (ADR-051)
- ✅ **Codex CLI Support (v0.5.10.1–v0.5.10.7)**: Marketplace plugin installation, esbuild bundling, installation fixes, chat extraction, lifecycle hooks integration
- ✅ **v0.5.10.7 (2026-06-13)**: Template disambiguation (breaking change) — clarified template layer semantics
- ✅ **v0.5.10.8 (2026-06-14)**: `kg-write-guard` extract-chat fixes — chat parsing robustness

---

## v0.5.9 (Released: 2026-05-27)

**Status**: ✅ Complete — Decision Governance Protocol (ENH-015)
**Branch**: `v0.5.9-decision-governance`

### Completed
- ✅ **ENH-015**: Decision Governance Protocol. Introduced `brainstorm-recall` skill, extended `adr-guide` with cascade check and Open Questions, introduced in-plan cascade gate in `gov-execute-plan`, rewrote `pre-skill-rules-inject.sh` with platform split and fallback variables, and integrated Open Items extraction in `session-wrap`.

---

## v0.6.16 (✅ Released: 2026-07-06)

### Fixes

- ✅ **ENH-038**: `kmg-extract-chat` message loss and format-drift across Claude/Gemini/Codex — Claude incremental cross-file uuid dedup (split-file-aware, see ADR-044), chronological flatten-and-sort across main-thread/subagent files, Gemini streaming `.jsonl` parser path, Codex audit. Spec: `knowledge/enhancements/ENH-038/ENH-038-specification.md`. Plan: `knowledge/plans/v0.6.16-fix-extract-chat-subagents.md`.
- ✅ **ENH-037**: README indexes for `knowledge/enhancements/` and `knowledge/issues/`, plus matching `core/default-templates/` scaffolds. Spec: `knowledge/enhancements/ENH-037/ENH-037-specification.md`.
- ✅ **ENH-039**: Rule-injection scripts (`hooks-master.sh`, `post-plan-validate-checklist.sh`, `pre-skill-rules-inject.sh`, `rules-size-check.sh`) hardcode personal rules-file split names instead of discovering them. Spec: `knowledge/enhancements/ENH-039/ENH-039-specification.md`.

---

## v0.6.17 (🚧 In Progress: 2026-07-07)

### Fixes

- 🔲 **ENH-043**: `kmg-extract-chat`'s v0.6.16 uuid-dedup fix can't retroactively repair chat-history files the pre-fix code already wrote (486 of 2,801 extractable subagent messages missing across full project history, 96% task-dispatch prompts). Adds `--rebuild` to force a clean overwrite/flatten pass, then a one-time repair run against every affected date. Spec: `knowledge/enhancements/ENH-043/ENH-043-specification.md`. Plan: `knowledge/plans/v0.6.17-fix-extract-chat-rebuild.md`.
- 🔲 **ENH-044**: Gemini extractor has no project-scoping — `--project` silently ignored, merging unrelated projects' sessions into the active project's output. Adds `project_filter` support mirroring the Claude extractor's existing pattern. Spec: `knowledge/enhancements/ENH-044/ENH-044-specification.md`.

---

## v0.6.0 (🔲 In Planning)

### Planned
- 🔲 **`update` command**: Platform-agnostic upgrade triggering for MCP server and plugin updates
- 🔲 **ENH-018**: Rules file H2 structure hardening — promote H3s to H2s in rules split files, update init wizard to scaffold H2 structure, add upgrade-inspector detection + migration offer
- 🔲 **Platform-agnostic init feedback**: Enhanced init wizard with better cross-platform output formatting

---

## v0.6.x (Deferred)

### Hardening

- 🔲 **ENH-018**: Rules file H2 structure hardening — promote H3s to H2s in rules split files (`plan-rules.md`, `governance-rules.md`), update quick navigation headers, update init wizard to scaffold H2 structure, add upgrade-inspector detection + migration offer for existing users. Spec: `knowledge/enhancements/ENH-018/ENH-018-specification.md`. Plan: `~/.claude/plans/ENH-018-rules-h2-structure-hardening.md`.

---

## v0.3.0-beta (Planned)

**Status**: 📋 Planned — KG Default Path Migration + Plan Metadata Standards
**Branch**: `v0.3.0-beta`

### Planned

- 🔲 Change default KG location from `docs/` to `knowledge/` + opt-in migration for existing `docs/`-based installs (Phase 1 + 2)
- 🔲 Scaffold `knowledge/me.md`, `knowledge/rules.md`, `knowledge/index.md` on new installs (Phase 3A)
- 🔲 Content migration offer (Step 1.6.5) — init prompts to populate `me.md`/`rules.md` from existing `CLAUDE.md` and memory files (Phase 3B)
- 🔲 `knowledge/index.md` as graph entry point — directory map, wiki-linked pillars, AI agent guidance (Phase 3C)
- 🔲 Plan file metadata standards — standard plan template at `core/templates/plans/plan-template.md`:
  - **Implemented in version** field (filled post-implementation)
  - **Plan lineage** — parent plan ref for bugfix/hotfix plans; related fix plans list for feature plans
  - **Implementation Record** section — deviations, merged PR, fix plans spawned
- 🔲 **ENH-011**: Duplicate check in `capture-lesson` before creating new entry — search graph for similar lessons first; first practical test of `rules.md` surfacing

**See:** [docs/plans/v0.3.0-beta.md](v0.3.0-beta.md) and ADR-028

---

## v0.3.1-beta (Planned)

**Status**: 📋 Planned — Obsidian Wiki Link Formatting
**Branch**: `v0.3.1-beta` (branches from `v0.3.0-beta` after merge)

### Planned

- 🔲 Obsidian wiki link pass (Step 1f.2) — post-migration conversion of bare ENH/ADR/issue refs to `[[wiki]]` links (Phase 4A)
- 🔲 All core templates and content-generating commands/agents emit `[[wiki]]` links for internal cross-references (Phase 4B + 4C)

**See:** [docs/plans/v0.3.1-beta-obsidian-wiki-links.md](docs/plans/v0.3.1-beta-obsidian-wiki-links.md)

---

## v0.2.2-beta (In Progress: 2026-03-29)

**Status**: 🔄 In Progress — Personal KG + Session Snapshot on Capture
**Branch**: `v0.2.2-beta`

### Completed
- ✅ Bug Fix: FTS5 index not rebuilt after upgrade — `init` verify/upgrade now checks and offers rebuild
- ✅ Bug Fix: KG path validation (root vs docs/) in `init` verify/upgrade
- ✅ Bug Fix: Empty `knowledge/` detected in verify/upgrade; offers `update-graph` run
- ✅ ENH-001 Phase 1.1: Multi-KG search — `kg_search` extended with `searchScope: active|all|personal-only`
- ✅ ENH-001 Phase 1.2: Capture picker — `lesson-capture-agent` shows KG picker when ≥2 KGs registered; `kg_capture` extended with `targetKg` parameter
- ✅ ENH-001 Phase 1.3: Init extended with personal KG offer (Step 1.8.5); `hooks-master.sh` surfaces personal KG lessons; new `init-personal-kg` command
- ✅ ENH-001 Phase 1.4: Documentation — COMMAND-GUIDE, CONCEPTS, CHEAT-SHEET updated for multi-KG patterns
- ✅ Terminology: renamed `global` → `personal` throughout (VS Code "User vs Workspace" model)

### In Progress
- 🔄 Phase Group 2: `start-issue-tracking` gap fixes + ROADMAP update
  - ✅ Hardening: Git steps conditional on repo presence (issue-2, #56)
  - ✅ Hardening: `update-issue-plan` version sync gate after CHANGELOG entry (issue-3, #57)
  - 🔴 ENH-009: `start-issue-tracking` mode gate + pre-flight working-tree check (#58)
- ⏳ Phase Group 3: ENH-002 Session Snapshot on Capture

---

## v0.2.1-beta (Released: 2026-03-27)

**Status**: ✅ Complete — MCP Write Tools + Agent Portability
**Branch**: `v0.2.1-beta`
**PR**: #40

### Completed
- ✅ `kg_capture` MCP tool: write lessons, ADRs, and KG entries from any platform
- ✅ `kg_fts5_rebuild` MCP tool: rebuild FTS5 index from any platform
- ✅ `lesson-capture-agent`, `recall-agent`, `session-summary-agent` refactored to use MCP tools
- ✅ `AGENTS-template.md` for non-Claude platforms (Gemini, Cursor, Windsurf, etc.)
- ✅ Agent portability: agents work identically with MCP tools regardless of IDE

---

## v0.2.0-beta (Released: 2026-03-16)

**Status**: ✅ Complete — Layered Architecture Restructuring
**Branch**: `v0.2.0-beta`
**PR**: #38

### Completed
- ✅ Four-layer architecture: Context (skills) → Logic (commands) → Lifecycle (agents) → Data (KG)
- ✅ Commands restructured: thick commands split into thin dispatchers + agents
- ✅ Hooks system consolidated: `hooks-master.sh` replaces individual hook scripts
- ✅ `core/` directory: platform-agnostic templates and examples
- ✅ SessionStart hook: automatic context loading at session start

---

## v0.1.2-beta (Released: 2026-03-16)

**Status**: ✅ Complete - Native FTS5 Search
**Branch**: `v0.1.2-beta-native-fts5-search`

### Completed
- ✅ `kg_fts5_rebuild` MCP tool: incremental rebuild, BM25 ranking, porter stemming, deletion cleanup
- ✅ `kg_search`: FTS5 path when `.fts5.db` exists; linear scan fallback; `(FTS5)` label
- ✅ `sync-all` Step 8: auto-refresh or one-time offer; `fts5_declined` preference persistence
- ✅ `node-sqlite3-wasm` dependency (WASM, FTS5+BM25, zero native compilation)
- ✅ `.fts5.db` added to `.gitignore`
- ✅ User-facing docs (COMMAND-GUIDE, CHEAT-SHEET, GETTING-STARTED) updated — completed in v0.0.10-alpha

---

## v0.1.1-beta (Released: 2026-03-16)

**Status**: ✅ Complete - Context-Mode Token Savings Integration
**Branch**: `v0.1.1-beta-context-mode-integration`

### Completed
- ✅ `sync-all` optionally uses `ctx_batch_execute` for shell steps when context-mode installed
- ✅ `update-graph` optionally uses `ctx_execute_file` for reading large lesson batches
- ✅ Both commands fully backwards-compatible — identical behavior without context-mode
- ✅ User-facing docs (COMMAND-GUIDE, CHEAT-SHEET, GETTING-STARTED) updated — completed in v0.0.10-alpha

---

## v0.1.0-beta (Released: 2026-03-03)

**Status**: ✅ Complete - First Beta Release — Ready for External Testing
**Branch**: `v0.1.0-beta`

### Completed
- ✅ All alpha features stable (v0.0.9 through v0.0.11-alpha integrated)
- ✅ Comprehensive pre-beta test suite (113 tests, 9 suites) validating all systems
- ✅ Production fixes (pre-commit sanitization hook bash 3.2 compatible)
- ✅ Skills system fully functional (6 context providers)
- ✅ Subagents operational with governance workflows (3 agents)
- ✅ KG initialization with optional backfill
- ✅ Complete `/kmgraph:` namespace (no legacy `/knowledge:` references)
- ✅ MCP server auto-installs and upgrades cleanly
- ✅ Comprehensive documentation (CLAUDE.md, GETTING-STARTED, COMMAND-GUIDE, CHEAT-SHEET)
- ⚠️ Beta status: API subject to breaking changes before v1.0.0 stable

---

## v0.0.10.4-alpha (Released: 2026-03-01)

**Status**: ✅ Complete - MCP Server Dependency Fix
**Branch**: `v0.0.10.4-fix-mcp-missing-node-modules`

### Completed
- ✅ Fixed MCP startup failure when `node_modules/` absent after marketplace plugin install
- ✅ Split `hooks-master.sh` build guard into separate `NEEDS_INSTALL` and `NEEDS_BUILD` checks
- ✅ `dist/` present + `node_modules/` missing → runs `npm install --omit=dev` only (no rebuild)
- ✅ Both absent → full install + build (existing behavior preserved)
- ✅ Both present → no-op (no performance regression)

---

## v0.0.10-alpha (Released: 2026-02-27)

**Status**: ✅ Complete - Skills, Subagents, Backfill & Token Optimization
**Branches**: `v0.0.10.0` through `v0.0.10.3`

### Completed
- ✅ **Skills System (5 providers)**: `lesson-capture`, `kg-recall`, `session-wrap`, `adr-guide`, `gov-execute-plan`
- ✅ **Subagents (2)**: `knowledge-extractor` (read-only, approval-gated), `session-documenter` (conventional commits)
- ✅ **KG Backfill in Init**: Optional Step 1.10 — scan existing context before first use
- ✅ **Handoff Command**: `/kmgraph:kmg-handoff` generates 5-document transition package
- ✅ **Delegation Patterns**: `extract-chat`, `session-summary`, `update-graph` updated with subagent guidance
- ✅ **Documentation**: CLAUDE.md updated; GETTING-STARTED, COMMAND-GUIDE, CHEAT-SHEET expanded
- ✅ **Navigation**: CHANGELOG moved to top nav; LinkedIn icon added to header

---

## v0.0.9-alpha (Released: 2026-02-27)

**Status**: ✅ Complete - Infrastructure Alignment & Namespace Migration
**Branches**: `v0.0.9-alpha-namespace-replacement`, `v0.0.9.1` through `v0.0.9.4`

### Completed
- ✅ **Namespace Migration**: `/kg-sis:` → `/kmgraph:` across all code, manifest, and docs
- ✅ **CLAUDE.md**: Created project-level CLAUDE.md with architecture, version rules, AI constraints
- ✅ **Hook Consolidation**: 3 scripts replaced with `hooks-master.sh` (3 isolated sections)
- ✅ **Security Audit (ADR-012)**: Word-splitting protections; no eval/network in any hook
- ✅ **MCP Lazy Loading**: `mcpToolSearch: true` re-enabled; reduces context overhead ~46.9%
- ✅ **INSTALL.md**: Step 0 permissions gateway + Step 0.5 migration check for alpha upgraders
- ✅ **Documentation**: Non-Claude platform instructions added to GETTING-STARTED and COMMAND-GUIDE

---

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

### Superseded by
- ✅ v0.0.9-alpha (2026-02-27): Infrastructure alignment, namespace migration
- ✅ v0.0.10-alpha (2026-02-27): Skills, subagents, backfill, handoff
- ✅ v0.0.10.4-alpha (2026-03-01): MCP node_modules fix

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
- ✅ Alpha testing and feedback collection
- ✅ Bug fixes and refinements based on feedback
- ✅ v1.0.0 planning

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
- ✅ `/kmgraph:kmg-start-issue-tracking` — Full issue initialization workflow (19th command)
  - Ported from optimize-my-resume, sanitized for cross-project portability
  - LLM-platform-agnostic (no Claude-specific API calls)
  - Auto-detects: parent branch, version from git, issue type, next issue number
  - Smart defaults reduce prompts to 1 (issue description)
  - Creates issue directory structure under `{active_kg_path}/issues/`
  - Generates issue.md with metadata, git branch, KG sync
  - Integrates with `/kmgraph:kmg-update-issue-plan` and `/kmgraph:kmg-link-issue`
- ✅ Fixed `.gitignore` inline comment bug (silently prevented 3 paths from being ignored)
- ✅ Removed orphaned `mcp-server/.claude-plugin/` artifact directory
- ✅ Removed root-level `node_modules/` with no root `package.json`
- ✅ Standardized command frontmatter (removed `name` field from 3 commands)
- ✅ Fixed dangling `/kmgraph:kmg-start-issue-tracking` references in `update-issue-plan.md`
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
  - After lesson capture: Suggest `/kmgraph:kmg-update-graph` immediately
  - After commits: Detect fix/debug/pattern keywords, suggest capture
  - Before problem-solving: Suggest `/kmgraph:kmg-recall` to check existing knowledge
- ✅ Updated capture-lesson Step 4.6 with structured choice UI
- ✅ Enhanced update-graph with `--edit-entry` flag and structured quality feedback
- ✅ Created post-commit hook template (core/examples-hooks/)
- ✅ Added hook installation to `/kmgraph:kmg-init` wizard (optional, default: no)

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
- Used /kmgraph:kmg-capture-lesson on plugin itself
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
- ✅ Test skill triggering with real usage
- ✅ Gather feedback on skill guidance quality
- ✅ Continue capturing lessons as plugin evolves
- ✅ v1.0.0 planning continues

---

## v1.0.0 (Planned: Q2 2026)

**Status**: Planning
**Focus**: Stable release — community feedback incorporated, marketplace launch

### Planned
- 🔲 Bug fixes from beta testing
- 🔲 Performance optimizations (large KG search benchmarking — target: <2s for 500+ files)
- 🔲 Enhanced documentation based on user feedback
- 🔲 Additional real-world usage examples
- 🔲 Marketplace submission (plugin passes sanitization, docs comprehensive, MCP tested macOS + Linux)

_See [Future / Deferred](#future--deferred-captured-2026-04-07-during-docs-restructure-planning) for post-v1.0 feature backlog._

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
| v0.0.8.7-alpha | Manual documentation updates + npm security fixes | 2026-02-22 | ✅ Released |
| v0.0.9-alpha | Infrastructure alignment, kmgraph namespace, hook consolidation | 2026-02-27 | ✅ Released |
| v0.0.10-alpha | Skills (5), subagents (2), KG backfill, handoff command | 2026-02-27 | ✅ Released |
| v0.0.10.4-alpha | MCP node_modules auto-install fix | 2026-03-01 | ✅ Released |
| v0.2.0-beta | Layered architecture restructuring | 2026-03-16 | ✅ Released |
| v0.2.1-beta | MCP write tools, agent portability, AGENTS-template | 2026-03-27 | ✅ Released |
| v0.2.2-beta | Personal KG, session snapshot on capture, FTS5 upgrade fix | 2026-03-29 | ✅ Released |
| v0.5.8 | Rules-inject project-rules extraction, MEMORY.md cascade fixes | 2026-05-25 | ✅ Released |
| v0.5.9 | Decision Governance Protocol (ENH-015) | 2026-05-27 | ✅ Released |
| v0.5.10 | Codex CLI expansion, ENH-021 continues_from, template disambiguation | 2026-06-14 | ✅ Released |
| v0.5.11 | Security fix (esbuild HIGH CVE) | 2026-06-14 | ✅ Released |
| v0.6.0 | Platform-agnostic upgrade `update` command, rules H2 hardening, init feedback | Planned | 🔲 In Planning |
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

*Last updated: 2026-06-16*
*Plugin Version: 0.5.11*
