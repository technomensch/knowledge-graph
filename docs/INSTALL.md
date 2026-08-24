---
title: Installation
---

Users can install the Knowledge Management Graph using a **universal installer** — a single markdown file that any AI assistant can execute for automated setup.

---

## How It Works

The universal installer detects the platform (Claude Code, Codex CLI, Cursor, Windsurf, Continue.dev, JetBrains, VS Code, Aider, or other AI assistants), configures the appropriate components, and initializes a knowledge graph automatically.

**Installation takes approximately 5 minutes.**

---

## Get the Installer

> 🚧 **Important: Use the Raw File**
>
> This page shows a preview of the installer. To actually install, **copy and paste the raw markdown file** into an AI assistant.
> **[→ Get the raw installer file](https://raw.githubusercontent.com/technomensch/knowledge-graph/main/INSTALL.md)**
> - Click the link above
> - Select all text (Ctrl+A / Cmd+A)
> - Copy to clipboard (Ctrl+C / Cmd+C)
> - Paste into Claude, ChatGPT, Cursor, or any AI assistant
> - Follow the assistant's instructions
---

## For Claude Code Users

> 👍 **Claude Code Quick Start**
>
> Claude Code users can follow a manual setup walkthrough instead:
> → [Quickstart](quickstart)
> Or paste the universal installer above for the same automated experience.

## For Codex CLI Users

> 👍 **Codex Marketplace Install**
>
> ```bash
> codex plugin marketplace add technomensch/knowledge-graph
> codex plugin add kmgraph@knowledge-management-graph
> ```
>
> Skills and MCP tools activate immediately after install — no further configuration needed.

> 📘 **Troubleshooting: Stale Cache After Update**
>
> If you update the plugin source but skills or tools don't reflect the changes, Codex may be using a cached version. Clear the plugin cache:
>
> ```bash
> rm -rf ~/.codex/plugins/cache/knowledge-management-graph/kmgraph/
> codex plugin uninstall kmgraph
> codex plugin marketplace add technomensch/knowledge-graph
> codex plugin add kmgraph@knowledge-management-graph
> ```
>
> This resolves issues where tools are out of date or skills don't appear after an update.

> 📘 **Node/PATH requirement**
>
> kmgraph hook scripts require `node` to be on the PATH visible to the Codex process. If hooks silently fail after install, confirm `node` is accessible from the shell that launches Codex — not just your login shell.
>
> - **nvm users:** source `nvm` before launching Codex, or add it to your shell's `rc` file so it loads for non-login shells
> - **fnm / volta users:** these work reliably when their shims are on the system PATH (default install)
> - **Homebrew / system Node:** typically works without changes

> 📘 **Hook trust required**
>
> Codex skips plugin-bundled hooks until you explicitly trust them. After install, run `/hooks` inside a Codex session to review and trust the kmgraph hook definitions. New or modified hooks must be re-trusted whenever the hook file changes.
---

> 📘 **Not using Claude Code?**
>
> The `commands/`, `skills/`, `agents/`, and `hooks/` directories in this repo are loaded exclusively
> by the Claude Code plugin system. Do not copy these directories if using Cursor, Windsurf,
> Continue.dev, JetBrains, VS Code, or any other tool — they will not work outside the plugin system.
> All cross-platform functionality is provided through the MCP server as `kg_*` tools.

## Platform Capabilities

Users can install on multiple platforms with varying automation levels:

| Platform | Automation | How to Install |
|----------|-----------|-----------------|
| **Claude Code** | Full automation | Paste installer (recommended) or follow [Quickstart](quickstart) |
| **Codex CLI** | Full automation | `codex plugin marketplace add technomensch/knowledge-graph` then `codex plugin add kmgraph@knowledge-management-graph` |
| **Cursor** | Medium (MCP tools) | Paste installer; MCP server handles data layer |
| **Windsurf** | Medium (MCP tools) | Paste installer; MCP server handles data layer |
| **Continue.dev** | Medium (MCP tools) | Paste installer; MCP server handles data layer |
| **JetBrains IDE** | Medium (MCP tools) | Paste installer; configure in Settings → Tools → AI Assistant |
| **VS Code** | Medium (MCP tools) | Paste installer; MCP server handles data layer |
| **Claude Desktop** | Medium (MCP tools) | Paste installer; configure in Desktop settings |
| **Aider** | Low (manual workflows) | Paste installer; follow templates manually |
| **GitHub Copilot** | Low (manual workflows) | Paste installer; follow templates manually |

---

## What Gets Installed

The installer sets up:

- **Configuration file** — `~/.kmgraph/kg-config.json` (default location; stores knowledge graph locations and metadata; set `KG_CONFIG_PATH` env var to override)
- **Directory structure** — `knowledge/`, `lessons-learned/`, `decisions/`, `sessions/`, `chat-history/`
- **Identity files** — `knowledge/me.md` (contributor identity, gitignored), `knowledge/rules.md` (project conventions, committed), and `knowledge/triggers.md` (rule timing, when each rule applies). See [Your AI Profile](pillars/portability/your-ai-profile).
- **Wiki links** — Cross-references throughout the KG are converted to Obsidian `[[wiki link]]` format, enabling graph view navigation in Obsidian and compatible editors
- **MCP server** — Provides knowledge graph tools for non-Claude-Code platforms
- **Templates** — Starter scaffolds for capturing lessons and decisions

---

## Upgrade Checks

When running `/kmgraph:kmg-init` on an existing installation, the wizard inspects your setup and reports what it finds:

| Check | What it looks for |
|-------|-------------------|
| **a. Directories** | Missing subdirectories (`knowledge/`, `decisions/`, `sessions/`, etc.) |
| **b. Config fields** | Missing fields in `~/.kmgraph/kg-config.json` introduced in newer versions; existing installs migrate via `kg_upgrade apply ["config-location"]` |
| **c. Templates** | Template files that have been updated or added since your install |
| **d. Platform split** | Claude-specific tool directives in `knowledge/rules.md` that belong in `CLAUDE.md` |
| **e. Wiki pass** | Bare `ADR-NNN`, `ENH-NNN`, `#NNN`, and lesson filename references not yet converted to `[[wiki links]]` — runs once per KG, skipped on re-run if already complete |
| **f. Docs migration** | `docs/enhancements/` or `docs/issues/` subdirectories that should be moved into the knowledge graph structure |
| **g. FTS5 cleanup** | Stale in-project FTS5 index files (`knowledge/fts5/`) left behind by older versions |
| **h. Identity scaffold** | Missing `me.md`, `rules.md`, or `triggers.md` — presents a dry-run preview, scans existing platform files (CLAUDE.md, GEMINI.md, .cursorrules, etc.), README, ADRs, and sessions to pre-populate recommendations, then archives any originals before writing |

> 📘 **Re-running the wizard**
>
> `/kmgraph:kmg-init` is safe to re-run at any time. It skips steps already complete and only offers items still pending for your install.

### First Install Onto an Existing Knowledge Graph

Landed in a repo where `knowledge/` is already populated — decisions, lessons
learned, sessions checked in by someone else's KMGraph use — and you've never
installed KMGraph yourself? That's what the `README.md` at the root of that
folder is for: KMGraph writes it there automatically, explaining that the
folder is a KMGraph knowledge graph and naming the plugin and the
`/kmgraph:kmg-init` command — that's what leads a reader to this installer.
(Graphs created before that README existed get one via the opt-in
`missing-root-readme` `kg_upgrade` category — run `kg_upgrade apply` with that
category, or `/kmgraph:kmg-init`, option — Verify/upgrade. It is not applied
automatically.)

> 📘 **Won't the installer overwrite what's already there?**
>
> No. Nothing blindly re-scaffolds over existing content. `/kmgraph:kmg-init`'s
> existing-graph detection (the same mechanism used for version upgrades, above)
> also fires on disk content alone — finding `decisions/` or `lessons-learned/`
> at the target path routes the wizard into the same Verify/Upgrade flow instead
> of scaffolding fresh, even on your first run against that folder. That
> refusal-to-overwrite is real, but Verify/Upgrade's own parameters are
> documented as coming from an existing `kg-config.json` registry entry, which a
> first-time, genuinely unregistered folder does not have — so the wizard does
> not currently complete an automated connect for this exact case either. MCP
> IDE users (no wizard) get the same *refusal-to-overwrite* protection from the
> `kg_config_init` tool directly: it refuses to scaffold over unregistered
> `decisions/` or `lessons-learned/` content. Its error message names
> `kg_upgrade` as the next step — as of v0.7.4.2 that's a real, working path,
> not a dead end: run `kg_upgrade` with `apply: ["connect-unregistered-graph"]`
> to register the folder in place, with no re-scaffold and no template writes.
> It isn't automatic — you have to name the category explicitly — but it's a
> self-service fix now. The wizard side remains a real gap, though: its
> Verify/Upgrade flow still expects registry parameters a genuinely
> unregistered folder doesn't have, so treat its refusal as protection against
> scaffolding over someone else's content, not as a pointer to a working
> automated connect flow on that platform.

### Upgrading on Codex or Gemini CLI

On platforms without the Claude Code wizard, upgrades are handled via the `kg_upgrade` MCP tool:

1. Update the plugin (e.g., `codex plugin marketplace add technomensch/knowledge-graph` to pull the latest)
2. Start a new session — the **Startup Protocol** in `AGENTS.md` / `GEMINI.md` automatically calls `kg_upgrade` inspect
3. Review the reported items and confirm before applying

If no upgrade items are reported, your installation is up to date. If `kg_upgrade` returns an error (no KG configured), the Startup Protocol suppresses it — no action needed.

---

## Next Steps

After installation, users can:

1. **Capture a lesson** — Document a problem solved, pattern learned, or decision made
2. **Create architecture decisions** — Record important design choices
3. **Search knowledge** — Find lessons and patterns across sessions
4. **Sync knowledge** — Automatically extract and organize captured content

See [Quickstart](quickstart) for detailed walkthroughs.

---

## Breaking Changes

### v0.6.0 — `kmg-` prefix required for all skill and command names

**Affected:** All users with personal rules, triggers, hooks, or config files that reference kmgraph skill or command names.

**Change:** All skills and commands now require the `kmg-` prefix (e.g., `kmgraph:recall` → `kmgraph:kmg-recall`, `kmgraph:capture-lesson` → `kmgraph:kmg-capture-lesson`). MCP tool names (`kg_*`) are unchanged.

**Action required:** Search your `~/.kmgraph/` files, project `CLAUDE.md`, and any custom hooks for old skill/command names and update them. Full rename table in [CHANGELOG.md](https://github.com/technomensch/knowledge-graph/blob/main/CHANGELOG.md).

Plugin/marketplace users: the new names are already used in all shipped files. Only custom personal rules and local configs need updating.

---

### v0.5.10.7 — `core/templates/` renamed (Tier 3 manual installers only)

**Affected:** Tier 3 manual installers (ADR-009) who reference `core/templates/` directly in copy instructions or custom scripts.

**Change:** `core/templates/` renamed to `core/default-templates/`.

**Action required:** Update any copy instructions: `core/templates/<dir>/` → `core/default-templates/<dir>/`.

Plugin/marketplace users (Tier 1/2): no action required — this path is internal to the plugin distribution; your `knowledge/` directory is untouched.

---

## Having Issues?

- **Installation failed?** Paste the full error message into the installer file's troubleshooting section
- **MCP tools not visible?** Restart the IDE after configuring the MCP server
- **Config file not found?** Run the installer again to create it

See [FAQ](FAQ.md) for additional help.
