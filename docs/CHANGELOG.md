---
hide_table_of_contents: true
displayed_sidebar: null
---

# Changelog

All notable changes to the Knowledge Plugin will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).


## [Released]

## [0.2.3.3-beta] — 2026-04-06

### Documentation
- **Lesson: Plugin Settings Scope Consistency** — Documents root cause analysis and audit checklist for committed `enabledPlugins` blocks in plugin repos (captured from v0.2.3.2-beta session)
- **Lesson: Skill Auto-Triggers Miss Process Vocabulary** — Documents trigger vocabulary pattern: auto-triggers only fire on outcome vocabulary, not process vocabulary
- **GEMINI.md** — Platform config for Gemini CLI added to repo
- **Issue tracking: sessionstart-hook-path-saga** — Issue tracking directory added for SessionStart hook path investigation
- **lessons-learned/README.md** — Index updated to reflect newly captured lessons

### Version Sync Rule
Whenever a new version is added to CHANGELOG.md, all version files and doc footers must be updated in the same commit. Files: `package.json`, `mcp-server/package.json`, `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json` (plugins[0].version only). Doc footers: CHEAT-SHEET.md, COMMAND-GUIDE.md, GETTING-STARTED.md.

## [0.2.3.2-beta] — 2026-04-06

### Fixed
- **Plugin uninstall scope error** — Removed committed `enabledPlugins` block from `.claude/settings.json`. The entry created an orphaned scope reference without a matching install record in the global plugin registry, causing `claude plugin uninstall kmgraph@stayinginsync-knowledge-graph` to fail with "not installed in project scope" for any developer cloning the repo. The `.claude-plugin/plugin.json` auto-detection already loads the plugin in the development environment, making the committed entry redundant and harmful. This fix ensures clean uninstalls for all users going forward.
- **Snapshot Gate language corrected in all capture commands** — All three capture commands (`capture-lesson`, `create-adr`, `start-issue-tracking`) described the gate as a "lightweight mid-session save" (context-only temp) rather than invoking `session-summary-agent --snapshot` as originally designed in ENH-002. Corrected to use "session summary" terminology, added `[?]` explanation naming `/kmgraph:session-summary`, and added a transition message after the agent returns confirming the summary is available as context.
- **`lesson-capture-agent` Phase 2 now checks for today's session summary** — If a session summary exists for today, the agent offers to pre-fill lesson context from it before prompting the user. Closes the model-switch fragility loop: gate writes the summary to disk → agent reads it → context survives any context reset or model switch.
- **`session-summary-agent` Step 7 now makes unsaved state explicit** — Draft review prompt now opens with "⚠️ Not saved yet." and requires an explicit "save" or "looks good" reply before writing to disk. Previously ambiguous phrasing could mislead users into thinking the summary had already been captured.

### Documentation
- **ADR-025: Do not commit `enabledPlugins` blocks in `.claude/settings.json`** — Establishes policy that committed `enabledPlugins` entries create scope mismatches. Plugin loading should rely on `.claude-plugin/plugin.json` auto-detection.
- **Lesson: Plugin Settings Scope Consistency** — Documents root cause analysis, audit checklist for plugin repos, and how to avoid this pattern in the future.
- **ADR-026: Snapshot Gate invokes session-summary-agent** — Documents original design intent, implementation drift, and why session-summary (persistent file, single mechanism, model-switch resilient) is the correct mechanism over a bespoke temp snapshot.
- **ENH-002 progress log updated** — Gate language fix applied to all three capture commands; status changed to Partially Implemented. Full implementation (agent `--snapshot` mode, flag file, hooks) pending ENH-002 branch.

### Version Sync Rule
Whenever a new version is added to CHANGELOG.md, all version files and doc footers must be updated in the same commit. Files: `package.json`, `mcp-server/package.json`, `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json` (plugins[0].version only). Doc footers: CHEAT-SHEET.md, COMMAND-GUIDE.md, GETTING-STARTED.md.

## [0.2.3.1-beta] — 2026-03-31

### Fixed
- **GETTING-STARTED.md: Plugin update does not take effect** — Corrected plugin update commands. Multiple sections incorrectly referenced `stayinginsync` marketplace instead of `kmgraph` plugin. This fix ensures that all platform instructions now correctly reference the `kmgraph` plugin, allowing updates to take effect as intended.
- **Plugin cache removal command** — Documented that `rm -Rf` (capital R) is required for removing nested cache folders on macOS/Linux (lowercase `-r` fails on populated directories)

## [0.2.3-beta] — 2026-03-30

### Added
- **ENH-005: FTS5 Database Relocation** — Search index moved from `{kgPath}/.fts5.db` to `~/.claude/kg-fts5/{kg-name}.db`. Index now survives git pulls, upgrades, and fresh clones. Content root auto-detection for `docs/`-layout KGs.
- **ENH-006: Issue Tracking UX** — `start-issue-tracking` Steps 1.1–1.4 redesigned as four independent sequential prompts (type, version impact, branch, plan). Steps 6.2 and 6.4 are now mandatory gates. `gov-execute-plan` checks Step 6.4 completion before implementation. Expanded `adr-guide` and `lesson-capture` trigger vocabularies.
- **ENH-007: ECC Compatibility** — All KMGraph skills audited for compatibility with everything-claude-code agent harness. Trigger conditions are natural language only across all platforms.
- **ENH-008: capture-router Skill** — New skill routes "capture that" / "remember that" to correct destination (memory, lesson, ADR) via auto-detection and single confirmation prompt.

### Changed
- `.gitignore` no longer contains `.fts5.db` pattern (DB is now outside project directory)
- `init` verify/upgrade migrates legacy `.fts5.db` to user cache silently on first run

### Version Sync Rule
Whenever a new version is added to CHANGELOG.md, all version files and doc footers must be updated in the same commit. Files: `package.json`, `mcp-server/package.json`, `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json` (plugins[0].version only).

## [0.2.2-beta] - 2026-03-29

### TL;DR

:::info[Personal knowledge graph — cross-project lessons, always available.]

A personal KG at `~/.claude/knowledge-graph/` stores lessons that apply across all your projects. When registered, `/kmgraph:recall` searches both project and personal KGs automatically. Results show `[project]` or `[personal]` source labels. Set up during `/kmgraph:init` or any time with `/kmgraph:init-personal-kg`.

:::
:::info[Session snapshot on capture — preserve the 'why' mid-session.]

Any capture command (`/kmgraph:capture-lesson`, `/kmgraph:create-adr`, `/kmgraph:start-issue-tracking`) now offers a lightweight snapshot gate before the capture dialog. A snapshot records the current context and open items in under 10 seconds, without interrupting your flow.

:::
:::info[Search index now checked during upgrade.]

After a plugin upgrade, the search index (`.fts5.db`) no longer silently disappears. The `/kmgraph:init` verify/upgrade flow now detects a missing index, validates the KG path, and offers to rebuild — preventing the "FTS5 rebuild found 0 files" error reported after upgrade.

:::
### Added
- **ENH-001: Personal KG** — New `type: "personal"` for KGs that are not tied to a project. Live at `~/.claude/knowledge-graph/` by default. Accessible from any project via multi-KG search.
  - `kg_search` extended with `searchScope: "active" | "all" | "personal-only"` parameter
  - `kg_capture` extended with optional `targetKg` parameter — bypasses CWD check when an explicit target KG is named
  - `lesson-capture-agent` shows a KG picker when ≥2 KGs are registered; session memory avoids re-prompting
  - `recall-agent` auto-detects personal KGs and passes `searchScope: "all"` automatically
  - `/kmgraph:init` Step 1.8.5: offers to create personal KG at end of setup
  - New command `/kmgraph:init-personal-kg`: standalone wizard for personal KG creation
  - `hooks-master.sh` Section 3.5: surfaces recent personal KG lessons at SessionStart
- **ENH-002: Session Snapshot on Capture** — Lightweight snapshot gate at every capture entry point.
  - `session-summary-agent` `--snapshot` mode: appends to today's session file, optional git, no review gate, deduplicates content
  - Snapshot gate added to `capture-lesson`, `create-adr`, and `start-issue-tracking`
  - `session-end-prompt.sh` detects `/tmp/.kg-snapshot-{date}` flag; adjusts wrap-up prompt
  - `session-wrap` skill is snapshot-aware: adjusts trigger language when snapshot already taken
- **ENH-003: doc-update-router skill** — New `skills/doc-update-router/SKILL.md` intercepts explicit doc-update requests ("update GETTING-STARTED.md", "update the session summary") and routes to the correct command (`/kmgraph:update-doc --user-facing`, `/kmgraph:session-summary`, `/kmgraph:create-adr`). Prevents doc edits from bypassing the update-doc wizard and standards validation. Includes explicit non-trigger list and conflict resolution with `session-wrap`.
- **ENH-004: Richer session summaries with context-mode** — `session-summary-agent` optionally reads context-mode's SQLite event database when present. Surfaces uncommitted files, agent invocations, and low-commit session activity that git history misses. Graceful fallback to existing git-archaeology when context-mode is absent — no degradation, no errors. Sparse summary hint fires when summary is thin and context-mode is not installed.

### Changed
- **Terminology**: KG type renamed from `"global"` → `"personal"` throughout. `searchScope: "global-only"` → `"personal-only"`. Source labels: `[global]` → `[personal]`.
- **`start-issue-tracking`**: Step 1.0 now surfaces a visible `⚠️` notice when the current branch ≠ main, priming the user before versioning decisions. Step 6.2 lesson capture prompt is now context-aware — strongly recommended when Active Work Guard triggered.
- **ROADMAP.md**: Added v0.2.0, v0.2.1, v0.2.2 sections (was stale at v0.1.2).
- **COMMAND-GUIDE.md TOC**: Fixed stale `kgsis` anchor prefix throughout — replaced with correct pymdownx-generated anchors (`-kmgraph<command>`).

### Fixed
- **`/kmgraph:init` verify/upgrade — FTS5 index check (step 1e)**: The search index (`.fts5.db`) is local-only and does not survive reinstalls or upgrades. The verify/upgrade flow now checks for a missing index, respects the `fts5_declined` preference, and offers to rebuild via `kg_fts5_rebuild`
- **`/kmgraph:init` verify/upgrade — KG path validation**: If content directories (`lessons-learned/`, `decisions/`, `sessions/`) are absent at the configured KG root but present at `{kgPath}/docs/`, the wizard detects the misconfiguration and offers to correct the path before rebuilding. A post-rebuild guard surfaces a clear error if `kg_fts5_rebuild` returns 0 indexed files rather than silently succeeding

### Documentation
- Updated `GETTING-STARTED.md` — Faster Search section now explains that `.fts5.db` is local-only and does not survive upgrades; documents both `/kmgraph:init` and `/kmgraph:sync-all` as paths to rebuild a missing index. Step 9 in the plugin update troubleshooting flow updated to mention the search index check
- `CONCEPTS.md`: Added "Personal vs Project Knowledge" section — decision table, behavior summary, when-to-use guide
- `COMMAND-GUIDE.md`: Added `/kmgraph:init-personal-kg` entry; updated `/kmgraph:recall` with `--scope` table and multi-KG result format; updated `/kmgraph:session-summary` with snapshot mode docs
- `CHEAT-SHEET.md`: Added `init-personal-kg`; updated recall and session-summary entries

## [0.2.1.1-beta] - 2026-03-28

### TL;DR

:::info[Behind the scenes only: dependency security fixes.]

14 Dependabot alerts (1 critical, 7 high, 6 moderate) were resolved. MkDocs Material was upgraded to address reported vulnerabilities. No user-facing behavior changed. See the [GitHub security advisories](https://github.com/technomensch/knowledge-graph/security/dependabot) for details.

:::
### Fixed
- Resolved 14 Dependabot dependency alerts (1 critical, 7 high, 6 moderate) via `npm audit fix` and targeted package upgrades
- Upgraded `mkdocs-material` to the latest stable release to address reported CVEs
- No API, command, or behavioral changes; this is a dependency hygiene patch only

## [0.2.1-beta] - 2026-03-28

### TL;DR

:::info[Zero-friction MCP setup.]

If the KMGraph MCP server isn't connected, the assistant will now offer to automatically configure it for Gemini CLI, Cursor, Windsurf, Continue.dev, or VS Code. No manual JSON editing required.

:::
:::info[Admonitions are the new standard for Changelog TL;DRs.]

The Style Guide now enforces `!!! info` blocks for release notes instead of plain bullet points.

:::
:::info[Behind the scenes only:]

Backend commands were modernized and documentation style rules updated. These are internal upgrades; functionality remains unchanged for end users.

:::
### Added
- **`kg_capture` MCP Write Tool** — Enables full lesson, session, and ADR capture capabilities for platforms that lack raw file system tools. Includes automatic FTS5 index rebuilding.
- **MCP Auto-Registration Agent** — Intercepts failed MCP tool calls and interactively offers to write the correct `mcp.json` or `settings.json` configuration for the active IDE (Gemini CLI, Cursor, Windsurf, Continue.dev, VS Code).
- **Active Work Guard Enforcement** — The `kg_capture` tool enforces an active-KG-to-CWD validation check at the data layer, returning structured errors (`KG_MISMATCH`) if they drift.
- Changelog format validation (Keep a Changelog + Semantic Versioning) to the `/kmgraph:update-doc` wizard

### Changed
- **Command Refactors** — Modernized `commands/sync-all.md` and `commands/update-graph.md` to the thin dispatcher pattern (<150 lines), delegating logic to specialized agents `sync-all-agent` and `knowledge-extractor`.
- **Skill Modernization** — Refactored `skills/adr-guide/SKILL.md` to dispatch directly to an agent rather than suggesting a manual command invocation.
- **Agent Dependency Updates** — `lesson-capture-agent` and `session-summary-agent` now strictly depend on `kg_capture` instead of legacy Write/Edit tools.
- Replaced the ASCII "Four-Layer Architecture" diagram in `docs/CONCEPTS.md` with a Mermaid flowchart
- Updated `STYLE-GUIDE.md` Section 4f to require MkDocs Admonition syntax for the Changelog `### TL;DR` section
- Re-established `CHANGELOG.md` as the single source of truth for release notes via symlink (resolving the dual-maintenance issue)

### Fixed
- Added missing Notification Webhooks instructions to `docs/CONFIGURATION.md` (resolving dead link in v0.2.0-beta changelog)
- Recovered missing Changelog style guide formatting rules (Section 4f) from commit history
- Restored original v0.2.0-beta TL;DR release notes that were accidentally overwritten

## [0.2.0-beta] - 2026-03-27

### TL;DR

:::info[Session summaries happen on their own.]

When the LLM is prompted with "done", "wrapping up", or similar, KMGraph will offer to write a session summary — no need to invoke the command manually.

:::
:::info[Before committing, KMGraph will check in.]

If there are changes that look lesson-worthy but haven't been documented, users will be prompted before the commit goes through.

:::
:::info[Platform file changes trigger a sync reminder.]

If a config file like CLAUDE.md or GEMINI.md, KMGraph will ask if whether or not to sync it to other AI tool configs.

:::
:::info[Plans written to `~/.claude/plans/` are automatically mirrored to `docs/plans/`.]

No manual copy needed.

:::
:::info[Cross-project write protection is now active.]

If users are working in one project but the active knowledge graph is pointed at another, KMGraph will display a warning before writing anything — preventing accidental cross-project entries.

:::
:::info[The three main commands (`/kmgraph:capture-lesson`, `/kmgraph:recall`, `/kmgraph:session-summary`) load noticeably faster.]

They work exactly the same, just with less startup overhead.

:::
:::info[Additional feature support for Gemini CLI, Cursor, Windsurf, or any other AI coding tools]

Users can now load `core/templates/AGENTS-template.md` as a system prompt and get the same KMGraph behaviors without needing `/kmgraph:` commands.

:::
:::info[The `init` command now detects which AI tools are installed]

The `init` command now offers to configure KMGraph for all of them at once — no separate setup per tool.

:::
:::info[Notification webhooks are available (opt-in only).]

If a Slack or webhook URL is configured, users will get notified when lessons or ADRs are saved. Off by default, no action needed. See [Notification Webhooks](CONFIGURATION.md#notification-webhooks-optional) for setup instructions.

:::
:::info[Behind the scenes only:]

The internal architecture was reorganized into four layers. This is a structural improvement that makes the tool easier to maintain and extend.

:::
### Added

- **Four-Layer Architecture** — Restructured into Context, Logic, Lifecycle, and Data layers for reduced friction, platform portability, and maintainability
- **`core/templates/AGENTS-template.md`** — Platform-agnostic behavior spec; loads into any LLM (Gemini CLI, Cursor, Windsurf, etc.) to give it KMGraph-aware behaviors without `/kmgraph:` commands. Validated on Gemini Flash via Antigravity (Phase 7b)
- **Three new agents** (Logic Layer):
    - `agents/lesson-capture-agent.md` — Real-time lesson capture with duplicate detection, git metadata extraction, write guard (active KG ↔ CWD), and post-write FTS5 rebuild
    - `agents/recall-agent.md` — Conversational knowledge graph search using `kg_search`; surfaces related lessons
    - `agents/session-summary-agent.md` — Session wrap-up: plan status with unchecked steps, draft ADR surface, uncaptured commit detection, FTS5 rebuild after write
    - `agents/platform-sync-agent.md` — Platform file sync; selects and adapts relevant content per target platform (Gemini, Cursor, Windsurf, VS Code, etc.)
- **Lifecycle hook suite** (6 new scripts + hooks.json entries):
    - `scripts/post-tool-lesson-check.sh` — PostToolUse: detects lesson-worthy signals after file writes
    - `scripts/session-end-prompt.sh` — Stop: session wrap-up prompt with open plan / draft ADR / uncaptured commit checks; PPID-scoped flag prevents double-fire
    - `scripts/pre-commit-knowledge-gate.sh` — PreToolUse: intercepts `git commit`; prompts when undocumented lesson-worthy changes exist
    - `scripts/notification-dispatch.sh` — Notification: configurable webhook/Slack dispatch (off by default)
    - `scripts/platform-file-change-check.sh` — PostToolUse: triggers sync suggestion when CLAUDE.md, GEMINI.md, etc. are modified
    - `scripts/plan-mirror.sh` — PostToolUse: mirrors `~/.claude/plans/` writes to `docs/plans/` automatically
- **Write guard in agents** — `lesson-capture-agent` and `session-summary-agent` verify active KG matches current working directory before any write; blocks with clear message if mismatch
- **Auto-switch option** — Per-graph `autoSwitch: true` flag in `kg-config.json`; `hooks-master.sh` silently switches active KG to match CWD instead of warning
- **Multi-platform installer** — `/kmgraph:init` and `/kmgraph:setup-platform` detect installed AI coding tools (Gemini CLI, Cursor, Windsurf, Continue.dev, VS Code Copilot, Aider) and auto-write appropriate config files with diff-and-confirm overwrite protection
- **v0.2.1 backlog issue** — `docs/issues/issue-1/` tracking Items A (`kg_capture` MCP write tool), B (`sync-all`/`update-graph` layered-pattern adoption), C (skill modernization), D (MCP auto-registration on first use)

### Changed

- **`commands/capture-lesson.md`** — Refactored from ~710 lines to ~120 lines; thin dispatcher to `lesson-capture-agent`
- **`commands/recall.md`** — Refactored from ~437 lines to ~80 lines; thin dispatcher to `recall-agent`
- **`commands/session-summary.md`** — Refactored from ~595 lines to ~80 lines; thin dispatcher to `session-summary-agent`
- **Skills refactored** (Context Layer):
    - `lesson-capture/SKILL.md` — Richer context pre-structuring; user-friendly language (no internal mechanics)
    - `kg-recall/SKILL.md` — Dispatches to `recall-agent`; improved result surfacing
    - `session-wrap/SKILL.md` — Three additional trigger signals: open plan steps, draft ADRs, lesson-worthy commits
    - `knowledge-graph-usage/SKILL.md` — Updated to reflect new architecture
- **`scripts/hooks-master.sh`** — Added `autoSwitch` per-graph config support
- Documentation: COMMAND-GUIDE.md, CHEAT-SHEET.md, GETTING-STARTED.md, CONCEPTS.md updated for four-layer architecture

### Removed

- `scripts/check-memory.sh` — Consolidated into `hooks-master.sh`
- `scripts/recent-lessons.sh` — Consolidated into `hooks-master.sh`
- `scripts/memory-diff-check.sh` — Consolidated into `hooks-master.sh`

## [0.1.2-beta] - 2026-03-16

### Added
- `kg_fts5_rebuild` MCP tool: builds/refreshes a native SQLite FTS5 full-text search index for the active knowledge graph with incremental rebuild (only re-indexes changed files), BM25 relevance ranking, porter stemming, and deletion cleanup
- `kg_search` now uses FTS5 index when `.fts5.db` exists in the active KG root; falls back to existing linear scan transparently
- FTS5 results show `(FTS5)` label in search output so users know indexed search is active
- `sync-all` Step 8: auto-refreshes FTS5 index if present; offers one-time opt-in to build index when absent; respects declined preference (`fts5_declined` flag in kg-config.json)
- `node-sqlite3-wasm` dependency — WASM-based SQLite with FTS5 compiled in, zero native compilation required

### Changed
- `kg_search`: uses BM25 ranking when FTS5 path is active; existing heuristic sort (title/heading/body) retained for linear scan fallback
- `.gitignore`: added `**/.fts5.db` pattern (local index, rebuilt on demand, not committed)

## [0.1.1-beta] - 2026-03-16

### Added
- `sync-all`: Optional Step 0 detects context-mode availability; Steps 1 and 2.5 (shell commands) can use `ctx_batch_execute` for context savings when context-mode is installed
- `update-graph`: Step 1.5 reading method selection — uses `ctx_execute_file` for large batches (10+ lessons) when context-mode available; falls back to knowledge-extractor subagent otherwise
- Graceful degradation: both commands execute identically when context-mode is absent

### Changed
- `update-graph`: "Delegation Option" section replaced with "Context Efficiency Options" covering context-mode path, subagent fallback, and single-lesson direct path

## [0.1.0-beta] - 2026-03-03

### Added
- First beta release milestone — infrastructure and features stable for external testing
- All features from alpha cycle (v0.0.9 through v0.0.11-alpha) integrated and verified
- Comprehensive pre-beta test suite (113 tests, 9 suites) validating all systems

### Changed
- Version number bumped from v0.0.11-alpha to v0.1.0-beta to reflect stability
- Updated command count (25), skills count (6), subagents count (3) across documentation

### Fixed
- Pre-commit sanitization hook now bash 3.2 compatible (macOS default) — no longer fails silently
- marketplace.json version two releases behind (0.0.9-alpha → 0.1.0-beta)
- mcp-server/src/index.ts hardcoded version "1.0.0" never updated from scaffold
- marketplace.json typo: `knowedge-graph` → `knowledge-graph`
- README.md typo: `avaliable` → `available`

### Documentation
- Added v0.1.0-beta section to ROADMAP.md
- Synced CHANGELOG, ROADMAP, README to v0.1.0-beta

### Important Note
This is a beta release. API and behavior may change before a stable release.

---

## [0.0.10.4-alpha] - 2026-03-01

### Fixed
- **MCP Server Auto-Install on Plugin Cache Miss**
    - `hooks-master.sh` Section 1 previously skipped `npm install` when `dist/index.js`
      existed, even if `node_modules/` was absent (common after marketplace plugin install)
    - Split check into `NEEDS_INSTALL` (`node_modules/@modelcontextprotocol` missing) and
      `NEEDS_BUILD` (`dist/index.js` missing); each triggers independently
    - Plugin installs with pre-built `dist/` now auto-install deps on first session start
    - When both exist: Section 1 is a no-op (no performance regression)

**Branch**: `v0.0.10.4-fix-mcp-missing-node-modules`

---

## [0.0.10-alpha] - 2026-02-27

### Added
- **Skills System (v0.0.10.1)**
    - 5 auto-triggered context providers: `lesson-capture` (bug solved), `kg-recall` (past decisions), `session-wrap` (context limits), `adr-guide` (architecture decisions), `gov-execute-plan` (plan execution)
    - Skill auto-surfaces suggestions when trigger conditions detected in conversation
    - Reduces context overhead by ~46.9% via lazy-loading

- **Subagents for Heavy-Lift Tasks (v0.0.10.1)**

    - `knowledge-extractor` — Read-only parsing of large files; presents findings for user approval before writing
    - `session-documenter` — Git archaeology for session summaries with conventional commit format
    - Both operate in approval-gated mode; never auto-writes without user confirmation

- **Optional KG Backfill During Init (v0.0.10.2)**

    - New Step 1.10 in `/kmgraph:init`: "Would you like to backfill the knowledge graph from existing project context? [y/N]"
    - If yes: invokes `knowledge-extractor` to scan README, CHANGELOG, lessons-learned/, decisions/, and chat-history/
    - Extracts candidates and presents for user review before creating entries
    - Enables new users to inherit institutional knowledge immediately

- **Handoff Command (v0.0.10.3)**

    - New `/kmgraph:handoff` — Generate comprehensive project transition documentation
    - Creates 5 documents: START-HERE (current state), DOCUMENTATION-MAP (file inventory), SESSION-COMPILATION (recent work), OPEN-ISSUES (blockers), ARCHITECTURE-SNAPSHOT (codebase structure)
    - Purpose: Enable seamless knowledge transfer before context limits or developer transitions

- **Delegation Options for Heavy Reads (v0.0.10.3)**

    - Updated `/kmgraph:extract-chat`, `/kmgraph:session-summary`, `/kmgraph:update-graph` with guidance
    - When processing 10+ sessions or 50+ KB, suggests delegating to appropriate subagent
    - Reduces peak context usage for large operations

- **Documentation Configuration (v0.0.10.3)**

    - Moved CHANGELOG.md to top-level mkdocs navigation (was nested under Contributing)
    - Added LinkedIn icon to header (between GitHub and search) via custom theme override
    - Updated COMMAND-GUIDE.md with handoff section and new delegation patterns
    - Updated GETTING-STARTED.md with skills and subagents explanation and trigger table

### Changed
- **Commands Reference**

    - Added `/kmgraph:handoff` (new command)
    - Command count updated: 22 → 23 total commands
    - Install instructions now reference `kmgraph` namespace consistently

### Documentation
- Added "Skills and Subagents" section to GETTING-STARTED.md with trigger tables
- Added "Project Transitions & Onboarding" section to COMMAND-GUIDE.md
- Enhanced CHEAT-SHEET.md with delegation syntax examples
- Updated CLAUDE.md with Skills, Subagents, and Commit Format sections

**Commits across v0.0.10.0 through v0.0.10.3:**

- v0.0.10.0: Cleanup and workflow consolidation
- v0.0.10.1: Skills (5), Subagents (2), and KG backfill scaffolding
- v0.0.10.2: Integrated init backfill option (knowledge-extractor powered)
- v0.0.10.3: Handoff command, delegation blocks, documentation updates, theme customization

---

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
        - Uninstaller included
        - Might require clearing of local cache
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

### Commands (renamed to "kmgraph" in v.0.0.10-alpha)

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

## [Features under consideration for Future Release]

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

[Unreleased]: https://github.com/technomensch/knowledge-graph/compare/v0.2.1-beta...HEAD
[0.2.1-beta]: https://github.com/technomensch/knowledge-graph/compare/v0.2.0-beta...v0.2.1-beta
[0.2.0-beta]: https://github.com/technomensch/knowledge-graph/compare/v0.1.2-beta...v0.2.0-beta
[0.1.2-beta]: https://github.com/technomensch/knowledge-graph/compare/v0.1.1-beta...v0.1.2-beta
[0.1.1-beta]: https://github.com/technomensch/knowledge-graph/compare/v0.1.0-beta...v0.1.1-beta
[0.1.0-beta]: https://github.com/technomensch/knowledge-graph/compare/v0.0.11-alpha...v0.1.0-beta
[0.0.1-alpha]: https://github.com/technomensch/knowledge-graph/releases/tag/v0.0.1-alpha
