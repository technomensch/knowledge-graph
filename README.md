# Knowledge Management Graph for Claude Code

Structured knowledge capture, lesson-learned documentation, and cross-session memory for Claude Code projects.

**Version:** 0.7.3
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

## v0.7.x Feature Highlights

**v0.7.4.1 — 2026-08-23** *(numbering-collision gate for multi-contributor ID sequences)*

- **Two contributors on different branches independently claiming the same next `ADR-NNN`/`ENH-NNN`/`issue-N` ID now gets caught before push** — for ADRs, git merges two differently-slugged files claiming the same number cleanly with no conflict, so nothing surfaced the duplicate before. A new advisory pre-push gate (`scripts/check-numbering-collision.sh`, Gate 7 in `pre-push-gate.sh`) detects it (padding-normalized, with companion docs like `*-implementation-spec.md` correctly exempted), and a separate, explicitly-invoked fix script (`scripts/fix-numbering-collision.sh` — never auto-run) renumbers the later-created entry via a git-history tie-break, rewriting only references provably unique to it and reporting everything else as `AMBIGUOUS` for manual review rather than guessing. Implements ADR-067 § "Mechanism resolved 2026-08-23"; developer tooling for this source repo (`scripts/` is not distributed).

**v0.7.4 — 2026-08-22** *(FTS5 index-collision fix, two new upgrade categories, path/reference drift fixes)*

- **`kg_search` could silently return another project's results — or none at all — when two knowledge graphs shared a `name`** — the project-local FTS5 index path was keyed on the graph's name alone and never on where the graph actually lived, so any file sitting at that name-keyed path was queried as if it belonged to the graph being searched, which also suppressed the correct linear-scan fallback for a never-indexed graph. Index files move from `~/.kmgraph/index/projects/<name>.db` to `<name>-<pathHash>.db`, the digest covering the graph's real (`~`-expanded, symlink-resolved) path; the name portion is sanitized so path separators can't escape `projects/`. `kg_fts5_status` no longer reconstructs the path inline (it drifted from `kg_search`/`kg_fts5_rebuild` and varied with the caller's working directory) and now shares one computation with them while staying read-only. Pre-v0.7.4 indexes are no longer read — searches fall back to a correct-but-slower linear scan until rebuilt; the personal KG's path is unchanged. Closes issue-55.
- **New `kg_upgrade` category `stale-fts5-index-format`** — an opt-in, non-destructive rebuild of any project-local index still at the old name-only path. Fires only when an old-format file exists and no new-format one has been built yet, never for the personal graph, and needs no `confirmBackfix` because it touches only the cache under `~/.kmgraph/index/` — the graph's own markdown is re-read, nothing in it is modified, and the old index file is left in place to delete at your convenience. Running `kg_fts5_rebuild` directly works too.
- **`kmg-handoff` wrote to the stale pre-migration `./handoff-packages/` path and never generated a missing session summary** — Step 1's default output directory is corrected to `knowledge/handoffs/YYYY-MM-DD/`, and the command now auto-invokes `session-summary-agent` when no summary exists for the day instead of shipping an incomplete package. A companion `stale-handoff-packages-location` upgrade category migrates leftover `./handoff-packages/<date>/` folders — gitignored, so `git status` never surfaced them — deduplicating files identical to the destination, leaving genuinely differing ones untouched for manual review, and removing a folder only once it's fully empty. Closes issue-30, issue-31, issue-56.
- **Hook-injected instructions referenced `kmgraph:recall`, a skill name that doesn't exist** — replaced with the real `/kmgraph:kmg-recall` command across `scripts/pre-skill-rules-inject.sh` (4 sites) and `scripts/recommendation-gate.sh` (1 site), plus 6 same-class references in dotfiles outside the repo. Closes issue-36.
- New `KG_INDEX_DIR` environment override for the FTS5 index root, mirroring the existing `KG_CONFIG_PATH` precedent — primarily test isolation, so the Jest suite and `tests/test-mcp-tools.sh` stop writing into the real `~/.kmgraph/index/`. `kmg-start-issue-tracking.md`'s dead `docs/issue-tracker.md` reference now points at the real issue/ENH indexes (`knowledge/issues/README.md`, `knowledge/enhancements/README.md`). Closes issue-26.

**v0.7.3 — 2026-08-20** *(prompt hardening — commands/skills/agents)*

- **Four bare rule-word absolutes in shipped `commands/`/`skills/`/`agents/` files rewritten as if-then statements** — each one selected for a demonstrated conflict, dead end, or overbroad scope (not a blanket sweep; destructive-action safety gates are untouched). Bash-output suppression in three init/migration commands now allows showing raw output on request; agent-mechanics/internal-file-name disclosure wording harmonized across five sibling skills; the session-summary Accumulated Narrative append-only rule now has an explicit correction/redaction path. See [ADR-069](knowledge/decisions/ADR-069-prompt-hardening-project-instruction-files.md).

**v0.7.2 — 2026-08-19** *(capture-corruption repair, plan-status backfix, ADR dispatch collapse)*

- **New `kg_upgrade` repair tooling for two previously-silent corruption bugs** — `capture-corruption` retroactively cleans up files with doubled frontmatter or a doubled filename prefix (issue-46); `diff-blank-reconstruction` reconstructs session-summary "files changed" sections left blank by a `main`-hardcoding bug (issue-47), now fixed at the source too. Both — plus a new `plan-status-drift` category that repairs plans whose Safety Header never advanced past "STOPPED" (issue-49) — go through one shared consent gate before touching existing files.
- **`kg_upgrade`'s wizard can now reach every backfix category** — routing inverted from a hardcoded allow-list to a deny-list, closing the gap where `capture-corruption` and `config-location` were visible in the wizard but unreachable except via a raw MCP call. Closes issue-51.
- **`kmg-create-adr` and `create-adr-agent` collapsed into one implementation** — the command's own independent reimplementation had already drifted from the agent's; it now dispatches to the agent with no partial context payload, guarded by a new regression script. Closes issue-48.
- **`git diff main...HEAD` resolves the real default branch instead of hardcoding `main`** — session-summary, docs-impact-scan, and `kmg-update-issue-plan` no longer go silently blank on repos whose default branch isn't `main`, or on pre-branch sessions.
- Dependabot: `nanoid`/`dompurify` bumped and bounded; stale `docs/plans/` references — including two silently-broken hooks (`plan-mirror.sh`, `session-end-prompt.sh`) — corrected to `knowledge/plans/` throughout.

**v0.7.1.4 — 2026-08-13** *(meta-issue Attempts paperwork-drift check)*

- **Meta-issue "Attempts" paperwork drifted from actual attempts silently, confirmed 3x in one real instance** — the README-index/implementation-log/attempts-folder convention was enforced only by prose. `kmg-paperwork-audit` gains a new Step 5: a mechanical folder↔log-header invariant check plus a README `## Attempts` entry size guardrail, both self-contained bash/awk (no dependency on `scripts/pre-push-gate.sh`, which isn't shipped to consumer repos). Closes #222, issue-45.

**v0.7.1.3 — 2026-08-12** *(profile approval gate + extraction scoping hardening)*

- **`kmg-update-profile` now has a mandatory explicit-approval gate before writing any profile file** — old flow could draft, self-review, and write without ever pausing for the user to say yes. New gate shows every file's full drafted content and requires an explicit affirmative reply before writing; silence isn't consent. Closes #219, ENH-060.
- **`kmg-extract-chat` now fails closed on unscoped extraction and attributes Claude sessions by `cwd`, not directory name** — omitting `--project` used to silently merge sessions from every project on the machine; now requires `--project=<name>` or a new `--confirm-unscoped` flag, across all four sources. Separately, `--project` matching both a repo and its git worktrees (each gets its own session-log directory, naming conventions inconsistent) now prints a composition breakdown instead of silently merging them. Closes #221, ENH-061.

**v0.7.1.2 — 2026-08-10** *(handoff gate gitignored-file fix)*

- **`handoff-file-tracing-gate.sh` still hard-blocked worktree sessions when the handoff package's own files were generated in a different checkout** — `handoff-packages/` is gitignored, so `git worktree add` never checks it out; issue-43's anchor is correct, but a package generated elsewhere structurally can't exist under a different worktree's own root. Now falls back to `PKG_ROOT`, derived from the transcript's own `Read` path for the file that was actually opened, gated on `Read` membership rather than mere on-disk existence — a same-date decoy file at the wrong root can't suppress the fallback. Closes #217, issue-44.

**v0.7.1.1 — 2026-08-10** *(handoff gate worktree fix)*

- **`handoff-file-tracing-gate.sh` still hard-blocked sessions run inside a git worktree** — `CLAUDE_PROJECT_DIR` resolves to the *main* checkout in worktree sessions, so v0.7.1's `REPO_ROOT` anchor pointed manifest paths where in-worktree `Read` paths could never match. Now resolves via `git -C <session-cwd> rev-parse --show-toplevel` (worktree-aware), `CLAUDE_PROJECT_DIR` fallback for non-git contexts only. Closes #215, issue-43.

**v0.7.1 — 2026-08-06** *(handoff gate path-mismatch fix)*

- **`handoff-file-tracing-gate.sh` hard-blocked every session that read a handoff package**, even when every manifest file was genuinely opened — its exact-string match compared repo-root-relative manifest paths against always-absolute transcript `Read` paths. Now anchors relative manifest paths at `REPO_ROOT` before comparing. Closes #213, issue-42.

**v0.7.0 — 2026-08-04** *(ADR-067: context-derived KG resolution)*

- **The mutable `.active` KG-config pointer is gone** — a new `resolveGraph()` derives the working KG from your current working directory against the registry on every call instead of trusting a switchable pointer that could drift from what's actually on disk. `kmg-switch`, `kg_config_switch`, and the `KG_MISMATCH` error path are retired along with it; ~50+ call sites across commands, agents, skills, hooks, and the CLI migrated off `.active`/`lastUsed` reads and writes.
- **Registry gains a `status`/`graphId` lifecycle** — every registered KG has a minted `graphId` and marker file; a duplicated KG folder (copy/clone) is caught and resolved via a reattach/worktree/fork/decline prompt instead of silently colliding.
- **Concurrency-safe config writer** — crash-safe atomic writes (temp file + fsync + rename) and conflict-merging updates replace last-write-wins.
- **New interactivity discriminator** — a single `gate()` chokepoint returns a structured `KMG_INPUT_REQUIRED` response for automated/CI callers instead of hanging on a prompt no one can answer.
- **New MCP tools** — `kg_compare_graphs` (recency/recoverability/worktree-fingerprint comparison) and `kg_resolve` (standalone cwd-derived path lookup).
- **`[personal]`/`[project]` marker syntax** for `kg_capture`/`kg_search`, plus a `scope` param added to `kg_capture` and 5 other tools for consistency.
- **Migration path off the legacy config and `.active`** — `kg_upgrade` gains a schema-reconciliation apply category, wired into `kmg-init`. See [Upgrading to v0.7.0](docs/troubleshooting/index.md#upgrading-to-v070-cwd-derived-resolution--config-schema-migration).

*Full per-version detail in [CHANGELOG.md](CHANGELOG.md).*

---

**v0.6.x Feature Highlights** *(2026-06-16 to 2026-07-18)*

- **All skill and command names required a `kmg-` prefix** (v0.6.0, breaking) — `kmgraph:recall` → `kmgraph:kmg-recall`, etc. MCP tool names (`kg_*`) unchanged. Closes ADR-053.
- **`kg_upgrade` matured into a full apply pipeline** — templates, starter relocation, stray `knowledge/knowledge/` merge, and directory scaffolding all implemented with user-content protection (never overwrites a modified file) and a mandatory STOP gate in `kmg-init` so the upgrade menu can't be skipped.
- **Chat-extraction reliability overhaul** — fixed message loss and format drift across Claude/Gemini/Codex extractors, added fail-closed `--project` scoping, content-based `.pb` dating, and a `--rebuild` flag for clean re-extraction.
- **`kg-config.json` write-path split-brain fully closed** (issue-14) — the last 37 files hardcoding the pre-migration `~/.claude/kg-config.json` path now consistently resolve `~/.kmgraph/kg-config.json`, verified by a 13-row operational acceptance matrix.
- **Security: hono HIGH vulnerability patched**; `kg-config.json` protected from test-suite clobbering via `KG_CONFIG_PATH` overrides.
- **ADR-066 resolved: cowork KG mode retired, global-topic KG storage relocated** to `~/.kmgraph/knowledge-graphs/<name>/`, alongside a 106-line stale-path migration sweep.
- **issue-27: a real data-loss bug caught live** — `applyStrayKnowledgeDir` was silently overwriting real KG content instead of checking the destination first; fixed with a destination-content check and regression test, following two independent adversarial review passes (Opus, Fable) that closed additional write-safety gaps before merge.

*Full per-version detail in [CHANGELOG.md](CHANGELOG.md).*

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

**Current Release:** v0.7.3 (2026-08-20)

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
**Current Version:** v0.7.3 (2026-08-20)

📚 **Full documentation:** https://kmgraph.stayinginsync.info
