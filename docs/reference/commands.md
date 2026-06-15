---
title: Commands Reference
category:
  uri: reference
position: 2
slug: reference-commands
---

**Version:** 0.5.10.5 | All commands use the `/kmgraph:` prefix in Claude Code. Other platforms access equivalent functionality through `kg_*` MCP tools — see [INSTALL.md](../INSTALL.md) for details.

<img src="/img/demos/session-summary.gif" alt="KMGraph session-summary demo — snapshot of captured lessons and open plans" width="800" />

---

## Essential

| Command | Description | Key flags |
|---|---|---|
| [`/kmgraph:init`](#init) | Initialize a new knowledge graph with wizard-based setup; discovers locally running Ollama and LM Studio instances and offers to configure them for tier mapping | — |
| [`/kmgraph:status`](#status) | Display active KG health, file counts, and warnings | `--minimal`, `--json` |
| [`/kmgraph:recall`](#recall) | Full-text search across lessons, ADRs, KG entries, sessions, and the authoritative profile files (`~/.kmgraph/rules.md`, `~/.kmgraph/me.md`, `knowledge/rules.md`, `knowledge/me.md`) | `--scope=all\|active\|personal-only`, `--user`, `--project`, `--named=<kg>`, `--format=detailed\|paths` |
| [`/kmgraph:capture-lesson`](#capture-lesson) | Guided interview to document a problem solved, pattern discovered, or bug fixed | `--user`, `--project`, `--named=<kg>` |

**Examples:**
```bash
/kmgraph:init
/kmgraph:status
/kmgraph:recall "database timeout"
/kmgraph:recall "auth patterns" --scope=all
/kmgraph:capture-lesson
```

---

## Capture & Document

| Command | Description | Key flags |
|---|---|---|
| [`/kmgraph:capture-lesson`](#capture-lesson) | Document lessons learned with git metadata, duplicate detection, and optional KG extraction | `--user`, `--project`, `--named=<kg>` |
| [`/kmgraph:create-adr`](#create-adr) | Create Architecture Decision Records with auto-numbering, index update, and automatic capture of implementation commit + subject line | `--user`, `--project`, `--named=<kg>` |
| [`/kmgraph:session-summary`](#session-summary) | Summarize the active session; supports lightweight mid-session snapshot mode | `--auto`, `--snapshot`, `--snapshot --git`, `--user`, `--project`, `--named=<kg>` |
| [`/kmgraph:extract-chat`](#extract-chat) | Export Claude and Gemini chat logs to dated markdown files; extract Codex CLI sessions with `--source codex` (outputs `YYYY-MM-DD-codex.md`; not included in `--source all` yet) | `--today`, `--date=YYYY-MM-DD`, `--after=`, `--before=`, `--project=`, `--source claude\|gemini\|codex\|all`, `--output-dir=` |
| [`/kmgraph:handoff`](#handoff) | Generate a handoff package (thin START-HERE pointer, DOCUMENTATION-MAP, ARCHITECTURE-SNAPSHOT) | `--output-dir=` |
| [`/kmgraph:rules-capture`](#rules-capture) | Detect and route a behavioral correction to `rules.md` or `me.md` (project or personal scope) | — |

**Examples:**
```bash
/kmgraph:create-adr "Use PostgreSQL for primary database"
/kmgraph:session-summary --snapshot
/kmgraph:extract-chat --today
/kmgraph:extract-chat -claude --after=2026-04-01
/kmgraph:handoff --output-dir=./backup/
```

---

## Search & Recall

| Command | Description | Key flags |
|---|---|---|
| [`/kmgraph:recall`](#recall) | Search all project memory systems; automatically includes personal KG when registered | `--scope=all\|active\|personal-only`, `--user`, `--project`, `--named=<kg>`, `--format=detailed\|paths` |
| [`/kmgraph:status`](#status) | High-level KG overview: file counts, last sync, MEMORY.md warnings | `--minimal`, `--json` |
| [`/kmgraph:update-graph`](#update-graph) | Extract structured patterns from lessons and sync to knowledge graph entries | `--lesson=<file>`, `--auto`, `--interactive` |
| [`/kmgraph:sync-all`](#sync-all) | Run the full sync pipeline: extract → update → MEMORY.md → plan → GitHub | `--auto`, `--dry-run`, `--user`, `--project`, `--named=<kg>` |

**Examples:**
```bash
/kmgraph:recall "workflow patterns" --scope=personal-only
/kmgraph:recall "auth patterns" --user
/kmgraph:update-graph --auto
/kmgraph:update-graph --lesson=Pattern_Discovery.md
/kmgraph:sync-all --dry-run
/kmgraph:sync-all --user
```

---

## Session Management

| Command | Description | Key flags |
|---|---|---|
| [`/kmgraph:session-summary`](#session-summary) | Create or append a session summary; snapshot mode skips the review gate | `--auto`, `--snapshot`, `--user`, `--project`, `--named=<kg>` |
| [`/kmgraph:sync-all`](#sync-all) | Orchestrate full knowledge sync in one command | `--auto`, `--dry-run` |

**Examples:**
```bash
/kmgraph:session-summary --auto
```

---

## Configuration

| Command | Description | Key flags |
|---|---|---|
| [`/kmgraph:init`](#init) | Create a new KG with wizard; optionally backfills from existing project context; discovers locally running Ollama and LM Studio instances and offers to configure them for tier mapping | — |
| [`/kmgraph:init-personal-kg`](#init-personal-kg) | Create a personal KG at `~/.kmgraph/` for cross-project lessons | — |
| [`/kmgraph:add-category`](#add-category) | Add a new category directory and KG entry file to an existing knowledge graph | `--prefix <p>`, `--git ignore\|commit` |
| [`/kmgraph:list`](#list) | List all configured knowledge graphs from `~/.claude/kg-config.json` | `--names-only`, `--json` |
| [`/kmgraph:switch`](#switch) | Change the active knowledge graph | `--force` |
| [`/kmgraph:config-sanitization`](#config-sanitization) | Install a pre-commit hook for sensitive-data detection with interactive pattern wizard | — |
| [`/kmgraph:check-sensitive`](#check-sensitive) | Scan active KG files for emails, API keys, and internal URLs before sharing | `--fix-suggestions` |
| [`/kmgraph:update-doc`](#update-doc) | Update plugin or project documentation with standards validation and diff preview | `--user-facing` |
| [`/kmgraph:setup-platform`](#setup-platform) | Detect installed AI tools and configure KMGraph integrations per platform | — |

**Examples:**
```bash
/kmgraph:init-personal-kg
/kmgraph:add-category security
/kmgraph:add-category ml-ops --prefix ml- --git ignore
/kmgraph:switch ai-research
/kmgraph:check-sensitive
/kmgraph:update-doc COMMAND-GUIDE.md --user-facing
```

---

## Advanced

| Command | Description | Key flags |
|---|---|---|
| [`/kmgraph:start-issue-tracking`](#start-issue-tracking) | Structured issue tracking: documentation templates, implementation plan, and Git branch | — |
| [`/kmgraph:meta-issue`](#meta-issue) | Track complex multi-attempt problems with attempt folders and root-cause evolution | `--add-attempt <N> "<desc>"`, `--update-understanding "<text>"`, `--status` |
| [`/kmgraph:update-issue-plan`](#update-issue-plan) | Sync KG extraction with active plans and post a progress comment to GitHub Issues | `--auto`, `--pr=<N>` |
| [`/kmgraph:link-issue`](#link-issue) | Manually link an existing lesson or ADR to a GitHub Issue with bidirectional references | `--issue <N>`, `--pr <N>` |
| [`/kmgraph:handoff`](#handoff) | Generate a handoff package before transitions, context resets, or onboarding | `--output-dir=` |

**Examples:**
```bash
/kmgraph:start-issue-tracking "CLI flag parsing fails on quoted args"
/kmgraph:meta-issue "Authentication Redesign"
/kmgraph:meta-issue --add-attempt 002 "OAuth2 with JWT"
/kmgraph:meta-issue --status
/kmgraph:update-issue-plan --pr=42
/kmgraph:link-issue docs/lessons-learned/process/my-lesson.md --issue 42
```

---

## Advanced Flags

These flags appear across multiple commands and share consistent behavior.

| Flag | Commands | Behavior |
|---|---|---|
| `--auto` | `update-graph`, `session-summary`, `sync-all`, `update-issue-plan` | Skip confirmation prompts; silent/non-interactive mode. Safe for use when called from another command. |
| `--dry-run` | `sync-all` | Preview changes without writing any files. Useful for verifying scope before committing. |
| `--snapshot` | `session-summary` | Lightweight mid-session capture. Appends to today's session file without a review gate. Used automatically by `capture-lesson`, `create-adr`, and `start-issue-tracking` when the user opts in. |
| `--targetKg` | MCP tools (`kg_capture`, `kg_search`) | Target a specific knowledge graph by name instead of the currently active KG. |
| `--delegate` | Advanced usage | Signals that execution should be handed off to the agent layer rather than handled inline. Applies to thin-dispatcher commands that route to `agents/`. |
| `--user` | `session-summary`, `create-adr`, `capture-lesson`, `recall`, `sync-all` | Route capture or search to the personal KG (`~/.kmgraph/`). Bypasses `kg_capture`; writes directly via the Write tool. Natural-language equivalent: "user level" / "for the user". |
| `--project` | `session-summary`, `create-adr`, `capture-lesson`, `recall`, `sync-all` | Route to the current project's KG. Temporarily switches the active KG if it differs, then restores after capture. Natural-language equivalent: "for this project" / "project level". |
| `--named=<kg>` | `session-summary`, `create-adr`, `capture-lesson`, `recall`, `sync-all` | Route to a specific named KG from `kg-config.json`. No KG switch. Natural-language equivalent: naming the KG directly (e.g., "career-ops"). |

---

## Related Guides

- [Getting Started](../GETTING-STARTED.md) — Installation and first lesson (5 min)
- [Cheat Sheet](../CHEAT-SHEET.md) — One-page quick reference
- [Concepts Guide](../concepts/why-kmgraph.md) — Plain-English definitions of every term and pattern
- [Platform Adaptation](PLATFORM-ADAPTATION.md) — Cursor, Windsurf, Continue, VS Code, Aider
