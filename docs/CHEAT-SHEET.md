---
id: CHEAT-SHEET
title: Cheat Sheet
sidebar_label: Cheat Sheet
description: Quick reference for common KMGraph workflows and commands
---

**Version:** 0.5.2 | **Updated:** 2026-04-22

> **Claude Code only:** The `/kmgraph:` prefix requires Claude Code with this plugin installed. Other IDEs access equivalent functionality through MCP tools.

One-page cheat sheet for the Knowledge Management Graph. For detailed documentation, see [Command Guide](reference/command-guide.md).

---

## I Want To...

- **Start a new knowledge graph** → `/kmgraph:init`
- **Create a cross-project personal KG** → `/kmgraph:init-personal-kg`
- **Document what I just learned** → `/kmgraph:capture-lesson [topic]`
- **Find something I documented before** → `/kmgraph:recall [query]`
- **See what's in my knowledge graph** → `/kmgraph:status`
- **Track a complex bug across multiple attempts** → `/kmgraph:meta-issue`
- **Set up team knowledge sharing** → `/kmgraph:config-sanitization`
- **Summarize my current chat session** → `/kmgraph:session-summary`
- **Extract my chat history** → `/kmgraph:extract-chat`
- **Sync lessons to the knowledge graph** → `/kmgraph:update-graph`
- **Check for sensitive data before sharing** → `/kmgraph:check-sensitive`
- **Work with multiple knowledge graphs** → `/kmgraph:list` then `/kmgraph:switch`
- **Link lessons to GitHub issues** → `/kmgraph:link-issue`
- **Update plugin documentation** → `/kmgraph:update-doc --user-facing`
- **Create comprehensive project handoff** → `/kmgraph:handoff`

---

## Commands by Difficulty

### 🟢 Essential (Start Here)

First-time users need these for basic operation:

| Command | Purpose |
|---------|---------|
| `/kmgraph:init` | Initialize a new knowledge graph with wizard-based setup |
| `/kmgraph:init-personal-kg` | Create personal KG at `~/.kmgraph/` for cross-project lessons |
| `/kmgraph:capture-lesson [topic]` | Document lessons learned with git metadata tracking |
| `/kmgraph:status` | View active knowledge graph info and quick reference |
| `/kmgraph:recall [query]` | Search across all memory systems (lessons, decisions, knowledge) |

*→ [Full details in Command Guide](reference/command-guide.md#essential-commands)*

### 🟡 Intermediate (Once Comfortable)

Active users use these for regular workflows:

| Command | Purpose |
|---------|---------|
| `/kmgraph:update-graph` | Extract knowledge graph entries from lessons. Uses background file reading for large batches when context-mode is installed |
| `/kmgraph:add-category` | Add a new category to existing knowledge graph |
| `/kmgraph:session-summary` | Create summary of current chat session; `--snapshot` for lightweight mid-session capture |
| `/kmgraph:list` | Display all configured knowledge graphs |
| `/kmgraph:switch` | Change active knowledge graph |
| `/kmgraph:check-sensitive` | Scan knowledge graph for potentially sensitive information |
| `/kmgraph:config-sanitization` | Interactive wizard for pre-commit hook setup |
| `/kmgraph:extract-chat` | Extract chat history from Claude and Gemini logs (`--today`, `--date`, `--after`, `--before`, `--project`); large days auto-split into `YYYY-MM-DD/` subfolder |
| `/kmgraph:update-doc` | Update plugin/project docs (`--user-facing`) or KG content |

*→ [Full details in Command Guide](reference/command-guide.md#intermediate-commands)*

### 🔴 Advanced (Power Features)

Power users leverage these for complex workflows:

| Command | Purpose |
|---------|---------|
| `/kmgraph:meta-issue` | Initialize meta-issue tracking for complex multi-attempt problems |
| `/kmgraph:start-issue-tracking` | Initialize issue tracking with structured docs and Git branch |
| `/kmgraph:update-issue-plan` | Sync knowledge graph → plan → issue → GitHub |
| `/kmgraph:link-issue` | Manually link existing lesson or ADR to GitHub issue |
| `/kmgraph:sync-all` | Automated full sync pipeline (4 steps → 1 command). Uses background file scanning when context-mode is installed. Refreshes search index automatically if built |
| `/kmgraph:handoff` | Create comprehensive handoff documentation for transitions or onboarding |

*→ [Full details in Command Guide](reference/command-guide.md#advanced-commands)*

---

## Auto-Triggered Skills

Skills activate automatically based on conversation context. No invocation needed.

| Skill | Trigger Condition | Suggests |
|-------|------------------|----------|
| `lesson-capture` | Bug solved, breakthrough made, "figured it out" | `/kmgraph:capture-lesson` with pre-filled context |
| `kg-recall` | History question, "have we solved this?", past decision | `/kmgraph:recall` with extracted search terms |
| `session-wrap` | Context approaching limit, major milestone, session end | `/kmgraph:session-summary` before compaction |
| `adr-guide` | Architecture decision discussed, "I'm thinking of using..." | `/kmgraph:create-adr` with decision guidance |
| `doc-update-router` | "update [doc name]", "update the session summary", "update the changelog" | Routes to `/kmgraph:update-doc --user-facing`, `/kmgraph:session-summary`, or `/kmgraph:create-adr` |
| `capture-router` | "capture that" / "remember that" / "save that" | Auto-detects type+location, single confirmation before writing |
| `gov-execute-plan` | "execute plan", implementation start, `docs/plans/*.md` mentioned | Zero-deviation 8-step execution protocol |
| `stuck-work-escalation` | 3+ failed attempts, 30+ min stuck, same bug resisting fixes | Opus diagnosis gate → hypothesis logging → exit-path decision at 5 attempts |
| `docs-impact-scan` | "push to origin", "push and merge", "open PR", "create PR", "finishing up", "ready to push" | Scans changed identifiers, validates affected docs list, dispatches `/kmgraph:update-doc --user-facing` for each |
| `sidebar-update` | Doc file moved or renamed, `git mv docs/...`, "move [doc]", "rename [doc]" | Updates stale `id:` in `sidebars.js`; scans for broken internal links |

---

## Agents Quick Reference

<!-- Updated: 2026-04-22 -->

Heavy-lift task handlers. Usually invoked automatically by skills/commands.

| Agent | When Used | Example |
|-------|-----------|---------|
| lesson-capture-agent | Capturing lessons from sessions | Auto-triggered after bug fix |
| recall-agent | Searching knowledge graph | Via `/kmgraph:recall [query]` command |
| session-summary-agent | Session wrap-up and documentation | Auto-triggered at end of work |
| mcp-setup-agent | MCP server setup and configuration | IDE detection + auto-config |
| knowledge-extractor | Batch KG extraction and parsing | Via `/kmgraph:sync-all` |
| sync-all-agent | Executing KG sync pipeline | Via `/kmgraph:sync-all` command |
| create-adr-agent | ADR creation wizard | Via `/kmgraph:create-adr` command |
| knowledge-reviewer | Quality review for lessons and ADRs | Via `/kmgraph:update-graph` command |

See [Concepts Guide](concepts/why-kmgraph.md) § Four-Layer Architecture for full agent overview and when each operates.

---

## Delegation for Heavy-Lift Tasks

When processing large batches or complex files, delegate to subagents to reduce context usage.

### Extraction & Parsing (knowledge-extractor)
Use for: multi-file analysis, chat history parsing (10+ sessions), large lesson batches (50+ KB)
```bash
# Before delegation (default)
/kmgraph:extract-chat --after=2026-02-01  # Loads all sessions into context

# Suggested delegation
/kmgraph:extract-chat --project=knowledge-graph
# (Assistant suggests: "Consider delegating to knowledge-extractor for multi-project filtering")
```

### Documentation & Git (session-documenter)
Use for: full session parsing across multiple branches, automated session summaries
```bash
# Before delegation (default)
/kmgraph:session-summary  # Parses entire chat history in-context

# Suggested delegation
# (Assistant suggests: "For multi-session history, delegate to session-documenter")
```

### Knowledge Graph Updates (knowledge-extractor)
Use for: bulk lesson extraction (10+ lessons at once), pattern analysis
```bash
# Before delegation (default)
/kmgraph:update-graph  # Processes all new lessons in-context

# Suggested delegation
# (Assistant suggests: "For 50+ KB of lessons, delegate to knowledge-extractor")
```

---

## Key Concepts

- **Knowledge Graph**: Structured collection of lessons learned, decisions, and patterns stored as markdown files with YAML frontmatter
- **YAML Frontmatter**: Metadata at the top of files (title, date, tags, context, etc.) used for organization and search
- **Git Metadata**: Automatic tracking of branch, commit, PR, and issue information when capturing lessons
- **MEMORY.md**: Persistent context file synced bidirectionally to Claude's system prompt for cross-session awareness
- **Sanitization**: Process of detecting and removing sensitive data (API keys, credentials, PII) before sharing code publicly
- **Meta-Issue**: Multi-attempt problem tracking system for complex bugs that span multiple debugging sessions
- **Category**: Organizational unit within a knowledge graph (e.g., "debugging", "architecture", "process")
- **Active KG**: The currently selected knowledge graph when multiple graphs are configured
- **Session Summary**: Markdown summary of a chat session extracted from conversation history
- **Recall**: Unified search across lessons learned, decisions, knowledge graph, and session summaries
- **Search Index** (`kg_fts5_rebuild`): Optional catalog of all knowledge graph content. Build or refresh it for faster, relevance-ranked search results. Updates automatically during sync-all once enabled

---

## Common Workflows

### First Time Setup (5 minutes)

1. `/kmgraph:init`
   → Follow wizard to configure location, categories, and git strategy

2. `/kmgraph:capture-lesson`
   → Document your first learning with guided prompts

3. `/kmgraph:status`
   → Verify everything is working correctly

### Daily Use (10 minutes)

1. Solve a problem or learn something new

2. `/kmgraph:capture-lesson`
   → Document it while fresh in your mind

3. `/kmgraph:update-graph`
   → Sync to knowledge graph for quick reference

### Before Sharing Code (2 minutes)

1. `/kmgraph:check-sensitive`
   → Scan for API keys, credentials, PII

2. Review findings carefully

3. Remove sensitive data before git push

### Working with Complex Bugs (30+ minutes)

1. `/kmgraph:meta-issue`
   → Initialize tracking for multi-attempt problem

2. Attempt fixes, document each try

3. `/kmgraph:update-issue-plan`
   → Sync progress to GitHub issue

### Multi-Graph Workflows

1. `/kmgraph:list`
   → See all configured knowledge graphs

2. `/kmgraph:switch`
   → Change to different project's KG

3. Work with that project's knowledge

---

## Quick Tips

- **Start with Essential commands** — Add Intermediate and Advanced commands as needs arise
- **Use `/kmgraph:status` often** — Shows what's in your active knowledge graph at a glance
- **`/kmgraph:recall` searches everything** — Lessons, decisions, knowledge entries, and session summaries; add `--scope=all` to include personal KG
- **MEMORY.md auto-updates** — Check it before important sessions to see what context is loaded
- **Commands use colon syntax** — It's `/kmgraph:` not `/knowledge-` (colon, not hyphen)
- **Git metadata is automatic** — Branch, commit, PR, and issue info captured when you create lessons
- **Categories are flexible** — Start with defaults, add custom ones with `/kmgraph:add-category`
- **Sanitization is a wizard** — `/kmgraph:config-sanitization` guides you through pre-commit hook setup
- **Multiple KGs are powerful** — Separate knowledge graphs for work, personal, open-source projects; personal KG shares lessons across all of them

---

## Need More Help?

- **Want detailed examples?** → [Command Guide](reference/command-guide.md) — All commands with full documentation
- **New to the system?** → [Quickstart](quickstart.mdx) — Setup and first lesson walkthrough
- **Understanding terminology?** → [Concepts Guide](concepts/why-kmgraph.md) — Definitions of all key terms
- **Using other platforms?** → [Platform Adaptation](reference/PLATFORM-ADAPTATION.md) — Cursor, Windsurf, Continue setup
- **Configuring settings?** → [Configuration Guide](pillars/organizing/graph-configuration.md) — Post-install options and workflows

---

## Related Documentation

**Getting started**:
- [Quickstart](quickstart.mdx) — Installation, setup wizard, first lesson (5 min)
- [Installation](INSTALL.md) — Universal installer for all platforms and LLMs
- [Configuration Guide](pillars/organizing/graph-configuration.md) — Categories, storage paths, and KG structure

**Learning**:
- [Command Reference Guide](reference/command-guide.md) — Complete command documentation with examples and learning path
- [Concepts Guide](concepts/why-kmgraph.md) — Plain-English definitions and explanations of all key terms
- [Examples](examples/) — Real-world lesson, ADR, and KG entry examples

**Advanced topics**:
- [Workflows](pillars/recalling/session-memory.md) — Step-by-step guides for manual workflows
- [Platform Adaptation](reference/PLATFORM-ADAPTATION.md) — Integration for Cursor, Windsurf, Continue, VS Code, Aider
- [Style Guide](STYLE-GUIDE.md) — Documentation authoring standards and best practices

---

**Version**: 0.5.2
**Last Updated**: 2026-04-22
