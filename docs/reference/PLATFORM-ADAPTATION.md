---
title: Platform Adaptation
---

# Platform Adaptation Guide

**Navigation**: [Home](/) > [Quickstart](../quickstart) > Platform Adaptation

**Using the knowledge graph with different AI coding platforms**

The knowledge graph core is platform-agnostic. This guide covers platform capabilities and usage patterns after installation.

---

## Installation

**For installation on any platform**, paste [INSTALL.md](../INSTALL.md) into the AI assistant for automated setup. The installer handles platform detection, MCP server configuration, and knowledge graph initialization.

This guide focuses on **platform capabilities and usage patterns** after installation is complete.

---

## Quick Reference

| Platform | Automation Level | MCP Support | Commands |
|----------|-----------------|-------------|----------|
| **Claude Code** | Full | ✅ | 22 commands |
| **Codex CLI** | Full | ✅ | 22 commands + skills |
| **Cursor** | Medium | ✅ (via MCP) | None (use MCP tools) |
| **Windsurf** | Medium | ✅ (via MCP) | None (use MCP tools) |
| **Continue.dev** | Medium | ✅ (via MCP) | Custom slash commands |
| **JetBrains AI** | Medium | ✅ (via MCP) | None (use MCP tools) |
| **VS Code (Claude)** | Medium | ✅ (via MCP) | None (use MCP tools) |
| **Claude Desktop** | Medium | ✅ (via MCP) | None (use MCP tools) |
| **Aider** | Low | ❌ | Manual only |
| **Copilot Chat** | Low | ❌ | Manual only |
| **Local LLMs** | Custom | ❌ | Manual + system prompts |

---

## Claude Code (Native — Full Automation)

**Status:** ✅ Fully supported (this plugin)

**Automation:** Full — all 22 commands, hooks, agents, and MCP tools available

**Features:**
- 22 commands: `/kmgraph:kmg-capture-lesson`, `/kmgraph:kmg-recall`, `/kmgraph:kmg-create-adr`, etc.
- SessionStart hooks: check-memory, recent-lessons, memory-diff-check
- Subagents for automated review
- MEMORY.md bidirectional sync with archive/restore
- ADR automation with bidirectional lesson linking
- Git metadata auto-capture on every operation

**For installation:** See [Quickstart](../quickstart) or paste [INSTALL.md](../INSTALL.md).

---

## Codex CLI (Native — Full Automation)

**Status:** ✅ Fully supported (marketplace install)

**Automation:** Full — all 22 commands, skills, and MCP tools available

**Install:**
```bash
codex plugin marketplace add technomensch/knowledge-graph
codex plugin add kmgraph@knowledge-management-graph
```

**Features:**
- 22 commands: `/kmgraph:kmg-capture-lesson`, `/kmgraph:kmg-recall`, `/kmgraph:kmg-create-adr`, etc.
- Skills auto-triggered from `skills/` directory
- MCP server (`kg_*` tools) available in Codex sessions
- Same `kmgraph@knowledge-management-graph` plugin ID as Claude marketplace

**Note:** Skills and MCP tools are shared with Claude Code — no separate configuration needed. Run `/kmgraph:kmg-init` in a Codex session to initialize the knowledge graph.

**Troubleshooting (Stale Cache After Update):**

If you update the plugin source but skills or tools don't reflect the changes, clear the Codex plugin cache:

```bash
rm -rf ~/.codex/plugins/cache/knowledge-management-graph/kmgraph/
codex plugin uninstall kmgraph
codex plugin marketplace add technomensch/knowledge-graph
codex plugin add kmgraph@knowledge-management-graph
```

**For installation:** See [INSTALL.md](../INSTALL.md) or use the commands above.

---

## Cursor

**Platform:** VS Code fork with AI features
**Automation:** Medium (MCP tools + indexed directories)

**With MCP server installed (recommended):**
- Use `kg_config_init`, `kg_config_list`, `kg_search`, `kg_scaffold` tools directly in Cursor chat
- MCP provides the same data layer as Claude Code
- Full search, lesson creation, and ADR scaffolding via MCP tools

**Without MCP:**
- Index `knowledge/concepts/`, `knowledge/lessons-learned/`, `knowledge/decisions/` directories
- Use Cursor rules (`.cursorrules`) to guide lesson creation
- Use `@knowledge/concepts` to reference knowledge in Composer

**Limitations (without MCP):**
- No automated git metadata tracking
- No bidirectional MEMORY.md sync
- Manual category README updates
- No automated pipelines (`/kmgraph:kmg-backfill` equivalent — use the `kg_extract` MCP tool instead)

**Workaround:** Use manual workflows from [session memory](../pillars/recalling/session-memory.md) + Cursor Composer for assistance

---

## Windsurf

**Platform:** AI-native IDE by Codeium
**Automation:** Medium (MCP tools + Cascade context)

**With MCP server installed (recommended):**
- MCP tools available directly in Cascade chat
- `kg_search` integrates with Windsurf's context-aware search
- `kg_scaffold` creates lessons from templates automatically

**Without MCP:**
- Use `.windsurfrules` to reference knowledge graph conventions
- Index `docs/` directories for context

**Limitations (without MCP):**
- No automated git metadata tracking
- Manual lesson creation and search
- No ADR automation

**Workaround:** Use manual workflows from [session memory](../pillars/recalling/session-memory.md)

---

## Continue.dev

**Platform:** VS Code / JetBrains extension
**Automation:** Medium (MCP tools + context providers + custom slash commands)

**With MCP server installed (recommended):**
- MCP tools available via Continue's tool-calling interface
- `kg_search` provides full-text knowledge search
- `kg_scaffold` creates lessons from templates

**Without MCP:**
- Configure context providers to index `knowledge/concepts/`, `knowledge/lessons-learned/`, `knowledge/decisions/`
- Create custom `/lesson` and `/recall` slash commands in `~/.continue/config.json`
- Use `@knowledge` to reference docs in context

**Limitations (without MCP):**
- No automated git metadata tracking
- No bidirectional MEMORY.md sync
- Manual category README updates

**Workaround:** Use manual workflows from [session memory](../pillars/recalling/session-memory.md)

---

## JetBrains AI Assistant

**Platform:** IntelliJ, WebStorm, PyCharm, etc.
**Automation:** Medium (MCP tools via AI Assistant plugin)

**With MCP server installed (recommended):**
- Configure MCP server in Settings → Tools → AI Assistant → MCP Servers
- Use `kg_config_init`, `kg_search`, `kg_scaffold` tools in AI chat

**Limitations:**
- No automated git metadata tracking
- No bidirectional MEMORY.md sync
- No ADR wizard (use `kg_scaffold` with ADR template)

---

## VS Code (Claude Extension) and Claude Desktop

**Platform:** VS Code with Anthropic Claude extension, Claude Desktop app
**Automation:** Medium (MCP tools)

**With MCP server installed (recommended):**
- MCP tools available in Claude chat within the IDE
- Full access to `kg_config_init`, `kg_search`, `kg_scaffold`, `kg_check_sensitive`
- Config file location: `.vscode/mcp.json` (VS Code) or `~/Library/Application Support/Claude/claude_desktop_config.json` (Desktop)

**Limitations:**
- No Claude Code commands (22 commands are Claude Code-specific)
- No SessionStart hooks
- No automated pipeline (`/kmgraph:kmg-backfill` equivalent — use the `kg_extract` MCP tool instead)

---

## Aider

**Platform:** Terminal-based AI pair programming
**Automation:** Low (manual workflows with AI assistance)

**Usage pattern:**
- Add `read-only-paths` for knowledge directories in `.aider.conf.yml`
- Ask Aider to create lessons using the template at `core/default-templates/lessons-learned/lesson-template.md`
- Aider assists with content; file operations are manual

**Limitations:**
- Fully manual workflow
- No MCP support
- No git metadata automation

**Workaround:** Use manual workflows from [session memory](../pillars/recalling/session-memory.md); Aider helps write content

---

## GitHub Copilot Chat

**Platform:** VS Code extension
**Automation:** Low (manual prompting)

**Usage pattern:**
- Copilot indexes workspace automatically — ensure knowledge docs are in `knowledge/`
- Reference knowledge via `@workspace` queries: `@workspace What patterns are in knowledge/concepts/patterns.md?`
- Use `#file:knowledge/lessons-learned/` references in prompts

**Limitations:**
- No skills/commands
- No MCP support
- Fully manual searching and creation

**Workaround:** Use entirely manual workflows; Copilot assists with writing

---

## Local LLMs (Ollama, LM Studio, etc.)

**Platform:** Self-hosted models
**Automation:** Custom (system prompts + scripts)

**Usage pattern:**
- Create a `system-prompt.md` describing the knowledge graph structure and conventions
- Include the lesson template as context in each request
- Use the system prompt to guide lesson creation, categorization, and search

**Limitations:**
- No IDE integration
- No MCP support (unless running an MCP-compatible client)
- Manual file operations required

**Workaround:** Use LLM to generate content; manually save files using templates

---

## MCP Tools Reference

For all MCP-capable platforms, these tools are available:

| Tool | Description |
|------|-------------|
| `kg_config_init` | Create a new knowledge graph with directory structure |
| `kg_config_list` | List all configured knowledge graphs |
| `kg_config_add_category` | Add a new category to a resolved KG |
| `kg_resolve` | Resolve the target KG's name and path from the current directory |
| `kg_search` | Full-text search across a resolved KG |
| `kg_capture` | Write a new entry to a resolved KG |
| `kg_compare_graphs` | Compare two KG folders by content hash + relative path to distinguish a duplicate/forked/worktree registration from genuine divergence |
| `kg_scaffold` | Create a file from a template |
| `kg_check_sensitive` | Scan for potentially sensitive data |
| `kg_extract` | Read-only extraction of lesson/decision/KG-entry candidates from `chat-history/`, `lessons-learned/`, or `decisions/` paths — pair with `kg_capture` for the approval-gated write step. Cross-platform equivalent of `kmg-backfill` for Codex/Gemini users without Claude Code subagent spawning |

### `kg_compare_graphs`

Use this before merging, archiving, or deleting a knowledge graph whose registered path might just be a duplicate, fork, or worktree copy of another registered graph, rather than genuinely divergent content.

**Parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `a` | string | Yes | Absolute path to the first KG content directory |
| `b` | string | Yes | Absolute path to the second KG content directory |
| `confirmPersonalScope` | boolean | No | Confirms this repo may access the personal knowledge graph. Required once per process before comparing against a path that resolves to the registered personal knowledge graph — see [Confirmation gates](#confirmation-gates) below |

**Returns** a plain-text summary: file counts on each side, a recency signal per side (`git log` activity in the last 30 days, or file mtimes as a fallback when either directory isn't a git repo), how many files changed on both sides, how many are unique to each side (broken out by git-tracked vs. untracked, since an untracked-only file isn't recoverable if its side is later archived), up to 5 example filenames per category, and a `worktreeFingerprint` verdict — `true` when tracked content is identical on both sides, meaning this looks like a worktree/linked copy rather than a real divergence.

Comparing against a path that resolves to the registered personal KG (or a subdirectory of it) is gated the same way as any other personal-scope access — see `confirmPersonalScope` above and [Confirmation gates](#confirmation-gates).

---

## `KMG_INPUT_REQUIRED` error contract {#kmg_input_required-error-contract}

Anyone scripting against `kg_*` tools directly (not through a Claude Code slash command) needs to know this shape — it's how a tool call that needs a human decision reports that back, instead of silently guessing or hanging.

Any `kg_*` tool call that needs a decision only a human (or an explicit script-supplied parameter) can make — an ambiguous name match, an archived graph, a first-time repo, a broad or `$HOME`/root registration, a cross-KG search, personal-scope access from an unseen repo — returns an error response whose text content is JSON of this shape instead of a normal result:

```json
{
  "error": "KMG_INPUT_REQUIRED",
  "reason": "fuzzy_match",
  "resolveWith": { "param": "name", "accepts": ["kmgraph-api", "kmgraph-web"] },
  "detail": { "...": "optional, reason-specific context" }
}
```

| Field | Type | Always present | Meaning |
|---|---|---|---|
| `error` | `"KMG_INPUT_REQUIRED"` | Yes | Fixed literal — this is what a caller should check to detect the contract |
| `reason` | string | Yes | Machine-readable cause, e.g. `fuzzy_match`, `ambiguous_path_tie`, `archived_entry`, `home_or_root_cwd`, `first_time_repo`, `broad_ancestor_registration`, `cross_kg_search_confirmation`, `personal_scope_unseen_repo`. A `_timeout` or `_invalid_answer` suffix is appended when the cause is specifically an unanswered or rejected prior gate |
| `resolveWith.param` | string | Yes | The parameter name to pass on the retried call to supply the missing decision |
| `resolveWith.accepts` | string[] | No | The enumerable set of valid values for `resolveWith.param`, when the set is known ahead of time (e.g. candidate KG names). Omitted when the answer is genuinely free-form and can't be enumerated |
| `detail` | unknown | No | Optional reason-specific structured context (e.g. the candidate list, a merge preview) — shape varies by `reason` and is not itself part of the stable contract |

**How to resolve it:** re-issue the same tool call with the parameter named in `resolveWith.param` set to one of `resolveWith.accepts` (if present) or an otherwise valid value for that reason. There is no separate "answer" tool — the answer is a normal parameter on a normal retry of the original call.

**Automated vs. interactive mode:** whether a tool call can even attempt to ask a question first (rather than returning `KMG_INPUT_REQUIRED` immediately) depends on interaction mode, which is detected automatically (CI environment variables, an explicit `interaction` parameter, or a client-capability signal) and can be forced with the `KMG_INTERACTION=interactive|automated` environment variable. Scripted/CI callers should assume **automated** mode: every gated decision comes back as `KMG_INPUT_REQUIRED` immediately, with no attempt to interactively prompt first.

## Confirmation gates {#confirmation-gates}

Two confirmation gates were added in v0.7.0 that did not exist in prior 0.6.x releases. Both use the same `KMG_INPUT_REQUIRED` contract above when running in automated mode, so existing automation should be ready to handle them once it's built against this contract.

### Cross-KG search (`kg_search` with `scope: "all"`)

Searching with `scope: "all"` reads across every registered knowledge graph, including the personal KG if one is registered. The first `scope: "all"` call in a process is gated behind a confirmation naming every candidate KG:

- **Automated mode:** returns `KMG_INPUT_REQUIRED` with `reason: "cross_kg_search_confirmation"` and `resolveWith.param: "confirmCrossKgSearch"` (`accepts: ["true"]`) until the retry passes `confirmCrossKgSearch: true`, optionally narrowed with `excludeKgs: [...]`. Each automated confirmation is per-call — it is not remembered for later calls in the same process.
- **Interactive mode:** prompts for `"all"` (search every candidate) or `"exclude:<name>,..."` (search all but the named KGs), then asks whether that choice should stay for the rest of the session (`sticky`) or apply once. A sticky confirmation is remembered for the rest of the process; a one-shot confirmation only covers the call that triggered it.

This is process-lifetime state only — nothing is written to disk, so a new server process always re-asks.

### Broad-ancestor / `$HOME`/root registration guard

Registering a new knowledge graph (`kg_config_init`, or the `kmg-init` CLI wizard) is checked against two guards before the directory is scaffolded:

- **Hard block, no override:** registering a KG whose path *is* the user's home directory or the filesystem root is refused outright — there is no confirmation parameter that overrides this. A path this broad would resolve as "the KG for" nearly every directory on the machine.
- **Broad-ancestor warning, confirmable:** registering a KG whose path is an ancestor of one or more *already-registered* KGs (but isn't `$HOME`/root itself) is not blocked, but requires confirmation — the new registration would make every command run from inside those existing KGs' directories ambiguous about which KG they resolve to. Automated callers pass `confirmBroadRegistration: "yes"` to proceed (or get `KMG_INPUT_REQUIRED` with `reason: "broad_ancestor_registration"` and a `detail` listing the affected KG names otherwise); interactive callers are asked `yes`/`no` with the same detail.

Neither guard existed in 0.6.x, where a new registration was scaffolded unconditionally regardless of how broad or narrow its path was relative to other registered graphs.

---

## Migration Between Platforms

### From Claude Code to Another Platform

**1. Keep core knowledge** — knowledge stays in `docs/` (platform-agnostic):

```bash
git commit -m "docs: knowledge graph export"
```

**2. Use the MCP server** — run the knowledge graph as an MCP server to access from the new platform.

**3. Recreate automation** — review Claude Code commands and implement equivalent patterns in the new platform, or use manual workflows.

### From Manual to Automated

**1. Organize existing docs** — move to the standard directory structure.

**2. Initialize config** — run `node mcp-server/dist/cli.js init` or paste INSTALL.md to set up `~/.kmgraph/kg-config.json`.

**3. Add git metadata retroactively** if needed:

```markdown
**Branch:** (unknown - created before tracking)
**Commit:** (see git log for related commits)
```

### Between AI Platforms

Knowledge is portable — the same `docs/` directory works with all platforms. Automation requires platform-specific implementation.

---

## Recommended Approach by Team Size

### Solo Developer

**Platform:** Any (even manual)
**Recommendation:** Start with the universal installer, add automation where valuable

### Small Team (2-5)

**Platform:** MCP-capable IDE (Cursor, Windsurf, Continue.dev)
**Recommendation:** MCP tools provide the core data layer; each developer uses their preferred IDE

### Medium Team (6-20)

**Platform:** Mix of platforms sharing one MCP server
**Recommendation:** Centralized knowledge access; team members use different IDEs

### Large Team (20+)

**Platform:** Custom integration + knowledge curator
**Recommendation:** Dedicated tools, formal processes, dedicated MCP server instance

---

## Learn More

**Installation**:
- [Universal Installer](../INSTALL.md) — Automated setup for all platforms
- [Quickstart](../quickstart) — Claude Code setup guide

**Core Concepts & Reference**:
- [Concepts Guide](../concepts/why-kmgraph.md) — Plain-English term explanations
- [Configuration](../pillars/organizing/graph-configuration.md) — Post-install customization
- [Command Guide](command-guide.md) — All commands (Claude Code users)

**Guides**:
- [Architecture Guide](./ARCHITECTURE.md) — System design overview
- [Patterns Guide](../pillars/capturing/capture-patterns.md) — Writing quality lessons and ADRs
- [Manual Workflows](../pillars/recalling/session-memory.md) — Step-by-step processes for all platforms

**Resources**:
- [Templates](../templates/) — Starter scaffolds for all document types
- Examples (`examples/`) — Real-world samples to study
