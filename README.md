# Knowledge Management Graph for Claude Code

Structured knowledge capture, lesson-learned documentation, and cross-session memory for Claude Code projects.

**Version:** 0.6.20
**Status:** Actively developed and in daily use

Documentation: https://kmgraph.stayinginsync.info

Buy me a coffee if you find this useful - https://buymeacoffee.com/technomensch

---

## What is this?

This is a platform-agnostic knowledge graph that was developed entirely using Gemini and Claude, leveraging very specific context and detailed natural language prompting.

It is designed to take chat sessions with large language models (LLMs) and turn them into a searchable, institutional knowledge library.

The cool thing is, it helps users grab the important stuff (lessons learned, architecture decisions, recurring patterns, etc...) inside the development workflow without having to stop chatting.

Then, users can easily look up that information not only in their current chat, but also in any other chat session, even if they switch to a totally different LLM!

The key lies in the simple approach of embedding the knowledge directly within the project itself. This ensures the knowledge is always immediately available whenever and wherever the project is opened. Should the library become excessively large, users have the option to transfer it to an external third-party via MCP servers.

A Claude Code plugin that provides:
- **Lesson-Learned Capture** with categorized storage and git metadata tracking
- **Knowledge Graph** with quick-reference entries linked to full lessons
- **MEMORY.md Bidirectional Sync** for persistent cross-session context
- **Meta-Issue Tracking** for complex multi-attempt problems
- **Automated Knowledge Sync** pipeline (4 steps → 1 command)
- **Chat History Extraction** from Claude Code and Gemini logs
- **Session Summaries** for work documentation
- **ADR Management** for architecture decisions
- **Multi-KG Support** with flexible configuration

---

## Quick Install

Paste [INSTALL.md](INSTALL.md) into any AI assistant for automated setup on any platform — Claude Code, Codex CLI, Cursor, Windsurf, Continue.dev, JetBrains, VS Code, Aider, or local LLMs.

**Claude Code users:** Run `claude plugin install kmgraph` or load with `claude --plugin-dir /path/to/knowledge-graph`, then run `/kmgraph:kmg-init`.

**Codex CLI users:** Run `codex plugin marketplace add technomensch/knowledge-graph` then `codex plugin add kmgraph@knowledge-management-graph`.

See the [Quickstart](docs/quickstart.mdx) for prerequisites and troubleshooting.

## Upgrading

Pull the latest version and run `/kmgraph:kmg-init` in any project that uses it. The upgrade wizard checks what has changed, previews any updates to existing files, and asks for confirmation before writing, or changing, anything. Existing knowledge graph content is never overwritten.

---

## Commands

**Quick Reference**: See [CHEAT-SHEET.md](docs/CHEAT-SHEET.md) for one-page quick reference guide
**Detailed Guide**: See [Command Guide](docs/reference/command-guide.md) for comprehensive command documentation with learning paths

### 🟢 Essential Commands (Start Here)

- `/kmgraph:kmg-init` — Initialize new knowledge graph with wizard-based setup
- `/kmgraph:kmg-capture-lesson` — Document lessons learned with git metadata tracking
- `/kmgraph:kmg-create-adr` — Create an Architecture Decision Record with automatic implementation commit capture
- `/kmgraph:kmg-status` — View active knowledge graph info and quick reference
- `/kmgraph:kmg-recall` — Search across all memory systems (lessons, decisions, knowledge)

### 🟡 Intermediate Commands (Once Comfortable)

- `/kmgraph:kmg-update-graph` — Extract knowledge graph entries from lessons
- `/kmgraph:kmg-add-category` — Add a new category to existing knowledge graph
- `/kmgraph:kmg-session-summary` — Create summary of current chat session
- `/kmgraph:kmg-list` — Display all configured knowledge graphs
- `/kmgraph:kmg-check-sensitive` — Scan knowledge graph for potentially sensitive information
- `/kmgraph:kmg-config-sanitization` — Interactive wizard for pre-commit hook setup
- `/kmgraph:kmg-extract-chat` — Extract chat history from Claude, Gemini, and Codex CLI logs (`--source codex` for Codex sessions)
- `/kmgraph:kmg-update-doc` — Update plugin/project documentation (`--user-facing`) or KG content
- `/kmgraph:kmg-init-personal-kg` — Initialize a personal knowledge graph at `~/.kmgraph/` shared across all projects

### 🔴 Advanced Commands (Power Features)

- `/kmgraph:kmg-meta-issue` — Initialize meta-issue tracking for complex multi-attempt problems
- `/kmgraph:kmg-start-issue-tracking` — Initialize issue tracking with structured docs and Git branch
- `/kmgraph:kmg-update-issue-plan` — Sync knowledge graph → plan → issue → GitHub
- `/kmgraph:kmg-link-issue` — Manually link existing lesson or ADR to GitHub issue
- `/kmgraph:kmg-sync-all` — Automated full sync pipeline (4 steps → 1 command)
- `/kmgraph:kmg-handoff` — Create comprehensive handoff documentation for transitions, context limits, or onboarding

---

## v0.6.x Feature Highlights

**v0.6.20 — 2026-07-18**

- **ADR-066 resolved: cowork KG mode retired, global-topic KG storage relocated** — cowork mode is no longer offered for new setups (never actually reachable through real Claude Cowork's plugin surface); global-topic KGs relocate to `~/.kmgraph/knowledge-graphs/<name>/`. Upgrade inspector detects and offers to archive existing cowork content — never silently dropped.
- **106-line folder-structure migration sweep** — stale `docs/` KG-root references corrected to `knowledge/` across core docs, examples, skills, and commands (independent Fable audit finding).
- **issue-27 fixed: a real data-loss bug, caught live** — `applyStrayKnowledgeDir` was silently overwriting real KG content instead of checking the destination first; this repo's own KG lost content from it mid-session and was recovered via `git restore`. Destination-content check added; regression test included.
- Two independent adversarial review passes (Opus, Fable) on this branch's own diff found and fixed additional write-safety gaps (unguarded `jq`-failure paths, truncated-write detection) before merge — see [CHANGELOG.md](CHANGELOG.md) for the full list.

**v0.6.19 — 2026-07-16**

- **`kg-config.json` write-path split-brain fully closed** (issue-14, GH #171) — the last 37 files still hardcoding the pre-migration `~/.claude/kg-config.json` path (across commands, agents, hook scripts, docs, and the CLI) now resolve `~/.kmgraph/kg-config.json` consistently, verified end-to-end by a 13-row operational acceptance-test matrix across both the MCP-tool and command/prompt surfaces.
- **Personal-KG search index routing fixed** (issue-15, GH #172) — captures into a personal KG now build the search index in the correct bucket instead of silently falling back to linear scan.
- **28 broken docs-site links repaired** — dead redirects left over from the ADR-027 restructure, misc broken relative paths, and template placeholder links; issue-13 (GH #170) tracks the separate gap that let this class of regression go undetected for months.

**v0.6.18 — 2026-07-11**

- **Chat-extraction `--rebuild` write path made crash-safe** — atomic writes (temp-file + rename) and rename-aside backups (never delete) replace a pre-write `shutil.rmtree` and a single clobberable `.backup` slot; two consecutive `--rebuild` runs now each get their own distinct backup instead of destroying the last good copy.
- **Gemini's fail-closed `--project` scoping (ADR-062) fixed to actually fail closed** — hash-named directory detection now runs before substring matching, closing a leak where a hex-valued `--project` filter could match and include an unattributable directory.
- **`.pb` content-dating no longer silently degrades to file mtime** — every fallback path (dependency absent, decode failure, empty content) now surfaces a visible warning; outlier timestamps are bounded to a realistic session window instead of an unbounded 10-year search.
- **`kg-config.json` no longer at risk from the test suite** — hook scripts honor a `KG_CONFIG_PATH` override, so sandboxed tests no longer clobber the real global config file in place. Closes #163.
- New [ADR-063](knowledge/decisions/ADR-063-never-destroy-known-good-state-before-confirmed-write.md) records the shared "never destroy known-good state before the replacement is confirmed written" principle behind both fixes above.

**v0.6.17 — 2026-07-10**

- **Claude extractor multi-day session misfiling fixed (ENH-047)** — each message now derives its own date bucket from its own timestamp instead of the whole session inheriting its first message's date, so `/clear`/context-compaction sessions spanning multiple days file correctly under `--today`/`--date=`.
- **Gemini extractor gains fail-closed project scoping (ENH-044)** — `--project` now excludes `.pb` files and hash-named `~/.gemini/tmp/` directories that can't be positively attributed to the requested project, with a visible skip notice, instead of silently leaking other projects' conversations into the KG.
- **Codex extractor's incremental mtime-skip bug removed (ENH-045)** — matches the same fix already shipped for Claude in v0.6.16; running `--incremental` twice within an hour no longer silently no-ops.
- **Gemini `.pb` sessions dated from content, not file mtime (ENH-046)** — survives copy/move/restore-from-backup without misdating.
- **`--rebuild` flag added for forced clean re-extraction (ENH-043)** — repairs chat-history files written before the v0.6.16 uuid-dedup fix; one-time repair pass recovered 9 of 68 flagged dates (42 pre-2026-05-30 dates permanently unrecoverable, no source data exists).

**v0.6.16 — 2026-07-06**

- **Extractor message loss and format-drift fixed** — Claude incremental extraction no longer drops subagent messages; per-message `uuid` dedup (split-file-aware) replaces a buggy single cross-file timestamp cutoff. Gemini gains a new streaming `.jsonl` parser for its post-2026-05-13 session format alongside the existing `.json` path.
- **`chat_extractor_base.py` fails loudly instead of silently writing into the plugin's own directory** when `KG_OUTPUT_DIR` is unset.
- **Enhancements/Issues README indexes** — `knowledge/enhancements/README.md` and `knowledge/issues/README.md` now exist and cross-reference `knowledge/decisions/README.md`; matching starter templates ship in `core/default-templates/`.
- **Shared scripts discover personal rules-file splits by content marker**, not a hardcoded filename — any future personal `~/.kmgraph/rules.md` split (any name, any boundary) needs no script change.

**v0.6.15 — 2026-07-02**

- **Init completeness fixes** — Fresh init now creates `concepts/` and `templates/` (not legacy `knowledge/`), scaffolds `triggers.md`, and deploys `kg-category-index.md` to `concepts/`. All template copy targets corrected.
- **Step 1.10 source detection** — Backfill offer fires correctly when `chat-history/`, `plans/`, `research/`, or `specs/` exist, even without a `CLAUDE.md`. Source paths detected via if/elif precedence and passed to the extractor.
- **CLAUDE.md creation offer** — When no `CLAUDE.md` exists at project root, init now offers to create one with KMGraph platform preferences (standalone guard, real user input, existing files never touched).
- **Extractor approval gate scoped to update-graph mode** — `knowledge-extractor` in init-backfill mode returns candidates only; coordinator handles approval and writes. Full write pipeline preserved for update-graph mode.
- **Concepts removed from top navbar** — Concepts is now sidebar-only; top navbar shows Getting Started, Commands, Configuration only.
- **Backfill troubleshooting docs** — New `## Troubleshooting` section in the backfill guide covers manual recovery for all platforms.

**v0.6.10 — 2026-06-22**

- **Codex skills fixed** — All 15 `SKILL.md` files now include required YAML frontmatter. Skills were completely non-functional in Codex due to missing `---` delimiters.
- **Stop hook POSIX fix** — `session-end-prompt.sh` bash-isms (`[[`, `&>`) replaced with POSIX equivalents. Hook now runs correctly when invoked via `sh`.

**v0.6.9 — 2026-06-21**

- **Inspector starter-relocation path fix** — `kmg-upgrade-inspector` now writes relocated starters to `{KG_PATH}/templates/` (was `{KG_PATH}/knowledge/templates/`, causing double-nesting on `knowledge/`-rooted KGs). `rules-size-check.sh` executable bit corrected.

**v0.6.8 — 2026-06-21**

- **Security: hono HIGH vulnerability resolved** — `npm audit fix` in mcp-server patches hono path traversal, CORS, cookie-merging, and header-handling CVEs. No functional changes.

**v0.6.7 — 2026-06-21**

- **`kg_upgrade apply templates` no longer overwrites user content** — `applyTemplates()` now checks each dest file before writing. Existing files with different content are skipped and reported as "Skipped (user content): … (manual review required)". Previously, user-modified READMEs (e.g., a 50-ADR `decisions/README.md`) were silently overwritten. Closes ENH-029 Bug 1.
- **Apply order enforced automatically** — When `apply` includes both `starter-relocation` and `templates`, `starter-relocation` now always runs first regardless of call order. Prevents a race where templates would deploy starters before relocation could move them. Closes ENH-029 Bug 3.

**v0.6.6 — 2026-06-21**

- **Mandatory STOP gate in `kmg-init` existing-KG branch** — LLMs could previously skip the upgrade menu and proceed directly to FTS5/wiki steps when forward momentum was high. A hard STOP block now forces the numbered menu to appear before any upgrade path continues. Closes ENH-028.

**v0.6.5 — 2026-06-21**

- **`kmg-init` now wires directly into `kg_upgrade` inspect** — The upgrade wizard calls the `kg_upgrade` MCP tool at the existing-KG detection step instead of running its own parallel checks. Eliminates the drift where init and `kg_upgrade` could disagree on what needed upgrading. Closes ENH-022 wiring scope.

**v0.6.4 — 2026-06-20**

- **`kg_upgrade` apply categories fully implemented** — `applyTemplates()` now deploys all template files to correct destinations (`templates/`, `concepts/`). `applyStarterRelocation()` moves starters from live dirs to `templates/`. `applyStrayKnowledgeDir()` merges the legacy `knowledge/knowledge/` subdir. `checkDirectories()` detects and `applyDirectories()` creates all required subdirs.

**v0.6.2 — 2026-06-17**

- **`kg_upgrade` template mapping corrected** — `checkTemplates()` was mapping template files to `knowledge/` instead of `concepts/`. Fixed to use the correct post-ENH-022 path.

**v0.6.1 — 2026-06-17**

- **Recommendation-gate hook: platform-aware output schema** — `recommendation-gate.sh` updated to use `hookSpecificOutput` schema for platform-aware Stop hook output. Fixes formatting on non-Claude platforms.

**v0.6.0 — 2026-06-16** *(Breaking: skill/command rename)*

- **All skill and command names now require `kmg-` prefix** — `kmgraph:recall` → `kmgraph:kmg-recall`, `kmgraph:capture-lesson` → `kmgraph:kmg-capture-lesson`, etc. MCP tool names (`kg_*`) unchanged. Full rename table in [CHANGELOG.md](CHANGELOG.md). Closes ADR-053.

---

**v0.5.x Feature Highlights** *(2026-04-21 to 2026-06-14)*

- **Codex CLI support** — Plugin now installable via Codex marketplace; full hook suite (`SessionStart`, `PreToolUse`, `PostToolUse`, `Stop`), MCP tools, and `extract-chat` all work on Codex CLI alongside Claude Code.
- **`kg_upgrade` MCP tool** — Non-Claude platforms can run `kg_upgrade inspect` and `apply` via the Startup Protocol in `AGENTS.md` / `GEMINI.md`, eliminating the need for the Claude Code wizard on Codex and Gemini CLI.
- **Decision governance at hook level** — `pre-skill-rules-inject.sh` blocks brainstorming and planning without a prior knowledge-graph recall. Two recall queries required before any plan is written; misses logged to `/tmp/kmgraph-recall-miss-*.log`.
- **Session summary overhaul (ENH-002)** — Five structured sections, one file per day, append-only narrative blocks, operational sections overwrite each run. `session-documenter` relay contract: draft shown verbatim before save.
- **Profile files auto-load at SessionStart** — `me.md` and `triggers.md` (personal + project scopes) injected automatically; `rules.md` loads on demand to avoid context tax.
- **Behavioral rules route to profile files** — `rules-capture` writes to `~/.kmgraph/rules.md`, `knowledge/rules.md`, or `me.md` by scope. MEMORY.md no longer used for governance signals.
- **MCP server pre-bundled** — `mcp-server/dist/` committed; `git clone` installs skip the build step.
- **Security** — 16 Dependabot alerts resolved (v0.5.7.1); esbuild HIGH vuln resolved (v0.5.11); `shell-quote` CVE patched (v0.5.10.2).

*Full per-version detail in [CHANGELOG.md](CHANGELOG.md).*

**v0.4.x Feature Highlights** *(2026-04-16 to 2026-04-18)*

- **Stuck on a bug? The plugin now helps get unstuck** — After 3 attempts or 30 minutes on the same problem, the `stuck-work-escalation` skill kicks in, reviews what has been tried, and proposes a fresh approach. At 5 attempts it requires a decision before continuing — useful for avoiding rabbit holes.
- **Docs are now checked automatically before a PR** — The `docs-impact-scan` skill runs before pushing and identifies which documentation files need updating based on what changed in the code. It then dispatches the update wizard for each confirmed file.
- **Meta-issue tracking improved** — Each attempt on a complex problem now requires a distinct hypothesis before starting, making it easier to track what was tried and why.
- **Security: stops pushes when known vulnerabilities are unacknowledged** — A pre-PR check now surfaces any open Dependabot alerts before a push goes through. Users see a findings table and must explicitly approve before proceeding.
- **Dependency security patches** — Two transitive dependency vulnerabilities patched in the MCP server and docs toolchain. No user action required.
- **Bug fix: `triggers.md` was missing after a fresh init** — Two bugs caused `triggers.md` to never be created during new project and personal KG setup. Both are fixed. If `triggers.md` is missing from an existing KG, re-running `/kmgraph:kmg-init` will create it.

**v0.3.x — Major Architectural Change** *(2026-04-10)*

> **Existing setups:** Migration to `knowledge/` is optional. Your `docs/`-based setup continues to work as-is. A guided wizard is available if you want to migrate.

- **Knowledge graph now lives at `knowledge/` by default** — New projects initialize at `./knowledge/` instead of `./docs/` to avoid conflicts with documentation site roots. Existing `docs/`-based setups can migrate with a guided wizard that handles symlinks, rollbacks, and cross-reference rewrites.
- **`me.md` and `rules.md` are now scaffolded automatically** — These identity and convention files are created during init. Rules support optional `Why:` and `Source:` annotations so the reasoning behind each rule stays with the rule.
- **Lesson capture and ADR creation no longer require a full wizard** — Both commands now draft the content silently from conversation context and present an Approve / Edit / Discard flow instead. Faster and less interruption.
- **Behavioral rules now get captured mid-session** — When a correction is made ("always X", "never do Y again"), the `rules-capture` skill detects it and offers to write it to the right place — project rules, personal rules, or identity files. No more losing good workflow corrections at the end of a session.
- **Obsidian users: cross-references now work as wiki links** — ADRs, lessons, and issues referenced in the knowledge graph are automatically converted to `[[wiki link]]` format so Obsidian graph navigation and backlinks work out of the box.

---

## Architecture

### Core Design
- **Platform-Agnostic Core** (`core/`) — Works with ANY LLM or IDE
- **Claude Code Automation** (commands, hooks) — Full automation layer
- **MCP Server** (`mcp-server/`) — Cross-platform data access

### Directory Structure
```
knowledge-graph/
├── .claude-plugin/           # Plugin manifest
├── commands/                 # Commands (manual invocation)
├── agents/                   # Subagents
├── skills/                   # Auto-triggered context providers
├── hooks/                    # SessionStart hooks
├── scripts/                  # Helper scripts
├── config/                   # Config templates
├── core/                     # Platform-agnostic core
│   ├── templates/            # KG, lessons, ADRs, meta-issues
│   ├── examples/             # ~30 generalized examples
│   ├── scripts/              # Python extraction scripts
│   ├── examples-hooks/       # Pre-commit sanitization
│   └── docs/                 # Documentation
├── mcp-server/               # MCP data layer
├── README.md                 # This file
├── LICENSE                   # MIT
└── CHANGELOG.md              # Version history
```

### Developer vs. Distribution Structure

| Directory    | In git | Distributed | Purpose                          |
|--------------|--------|-------------|----------------------------------|
| `commands/`  | ✅     | ✅          | Claude Code plugin commands — not applicable to other platforms |
| `skills/`    | ✅     | ✅          | Claude Code plugin skills — not applicable to other platforms  |
| `agents/`    | ✅     | ✅          | Claude Code subagents — not applicable to other platforms      |
| `hooks/`     | ✅     | ✅          | Claude Code session hooks — not applicable to other platforms  |
| `core/`      | ✅     | ✅          | Platform-agnostic templates      |
| `scripts/`   | ✅     | ✅          | Hook scripts                     |
| `docs/`      | ✅     | ❌          | Plugin developer knowledge graph |
| `tests/`     | ✅     | ❌          | Internal test suite              |

> **Note:** The `commands/`, `skills/`, `agents/`, and `hooks/` directories are loaded exclusively
> by the Claude Code plugin system. All cross-platform functionality is provided by the MCP server
> (`mcp-server/`) as `kg_*` tools.

---

## Development Status

**Current Release:** v0.6.20 (2026-07-18)

Actively developed and in daily use. Behavior may evolve between minor versions.

See [ROADMAP.md](ROADMAP.md) for detailed version history and development progress.

---

## Design Principles

### Framework vs. Content
- **Plugin provides:** Structure, templates, automation, best practices
- **Users provide:** Their own lessons, patterns, insights
- **Examples:** Illustrative only, not prescriptive

### Privacy by Default
- No personal information in examples
- No sensitive data in templates
- Sanitization tools for user content
- Clear privacy guidelines

### Abstraction & Generalization
- Patterns, not specifics
- Generic terminology
- Reusable insights
- Collaboration-friendly

---

## Portability Strategy

**Core + Automation Architecture:**
- **Core** (`core/`) — Pure markdown, works with ANY LLM
- **Automation** (commands, hooks) — Claude Code specific
- **MCP Server** (`mcp-server/`) — Cross-platform data access for any MCP-capable IDE

**For non-Claude users:** Paste [INSTALL.md](INSTALL.md) into any AI assistant for automated setup. The installer detects the platform and configures the appropriate components.

---

## Troubleshooting

### MCP Server Issues

If commands aren't working or MCP tools are unavailable:

1. **Verify MCP server is running:**
   ```bash
   ./tests/test-mcp-direct.sh
   ```
   Should show 12 tools listed.

2. **Check for errors:**
   - Restart Claude Code
   - Verify Node.js is installed: `node --version`
   - Check MCP server build exists: `ls mcp-server/dist/index.js`

3. **Interactive debugging:**
   ```bash
   ./tests/test-mcp.sh
   ```
   Opens web UI to test each tool individually.

See [tests/README.md](tests/README.md) for detailed troubleshooting.

### Command Not Found

If `/kmgraph:command` doesn't autocomplete:
- Verify plugin is loaded (check Claude Code plugin list)
- Commands use `kmgraph:` prefix with colon
- Try restarting Claude Code

### Common Issues

**Templates not found** — Ensure `core/default-templates/` exists and plugin loaded from correct directory

**Git metadata missing** — Commands must run from a git repository

**Codex CLI: Commands appear stale after update** — Clear the plugin cache:
```bash
rm -rf ~/.codex/plugins/cache/knowledge-management-graph/kmgraph/
codex plugin uninstall kmgraph
codex plugin marketplace add technomensch/knowledge-graph
codex plugin add kmgraph@knowledge-management-graph
```
Then restart Codex. (Same underlying issue as ADR-006 in Claude Code.)

---

## Contributing

This plugin is under active development. Contributions welcome — open an issue to discuss before submitting a PR.

---

## License

MIT License - See [LICENSE](LICENSE)

---

**Created:** 2026-02-12
**Current Version:** v0.6.20 (2026-07-18)

📚 **Full documentation:** https://kmgraph.stayinginsync.info
