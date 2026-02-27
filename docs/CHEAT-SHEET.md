# Knowledge Graph Quick Reference

> **Claude Code only:** The `/kmgraph:` prefix requires Claude Code with this plugin installed. Other IDEs access equivalent functionality through MCP tools.

One-page cheat sheet for the Knowledge Graph plugin. For detailed documentation, see [Command Guide](COMMAND-GUIDE.md).

---

## I Want To...

- **Start a new knowledge graph** → `/kmgraph:init`
- **Document what I just learned** → `/kmgraph:capture-lesson`
- **Find something I documented before** → `/kmgraph:recall "search query"`
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

---

## Commands by Difficulty

### 🟢 Essential (Start Here)

First-time users need these for basic operation:

| Command | Purpose |
|---------|---------|
| `/kmgraph:init` | Initialize a new knowledge graph with wizard-based setup |
| `/kmgraph:capture-lesson` | Document lessons learned with git metadata tracking |
| `/kmgraph:status` | View active knowledge graph info and quick reference |
| `/kmgraph:recall` | Search across all memory systems (lessons, decisions, knowledge) |

### 🟡 Intermediate (Once Comfortable)

Active users use these for regular workflows:

| Command | Purpose |
|---------|---------|
| `/kmgraph:update-graph` | Extract knowledge graph entries from lessons |
| `/kmgraph:add-category` | Add a new category to existing knowledge graph |
| `/kmgraph:session-summary` | Create summary of current chat session |
| `/kmgraph:list` | Display all configured knowledge graphs |
| `/kmgraph:switch` | Change active knowledge graph |
| `/kmgraph:check-sensitive` | Scan knowledge graph for potentially sensitive information |
| `/kmgraph:config-sanitization` | Interactive wizard for pre-commit hook setup |
| `/kmgraph:extract-chat` | Extract chat history from Claude and Gemini logs (`--today`, `--date`, `--after`, `--before`, `--project`) |
| `/kmgraph:update-doc` | Update plugin/project docs (`--user-facing`) or KG content |

### 🔴 Advanced (Power Features)

Power users leverage these for complex workflows:

| Command | Purpose |
|---------|---------|
| `/kmgraph:meta-issue` | Initialize meta-issue tracking for complex multi-attempt problems |
| `/kmgraph:start-issue-tracking` | Initialize issue tracking with structured docs and Git branch |
| `/kmgraph:update-issue-plan` | Sync knowledge graph → plan → issue → GitHub |
| `/kmgraph:link-issue` | Manually link existing lesson or ADR to GitHub issue |
| `/kmgraph:archive-memory` | Archive stale MEMORY.md entries to prevent bloat |
| `/kmgraph:restore-memory` | Restore archived MEMORY.md entries |
| `/kmgraph:sync-all` | Automated full sync pipeline (4 steps → 1 command) |

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
- **`/kmgraph:recall` searches everything** — Lessons, decisions, knowledge entries, and session summaries
- **MEMORY.md auto-updates** — Check it before important sessions to see what context is loaded
- **Commands use colon syntax** — It's `/kmgraph:` not `/knowledge-` (colon, not hyphen)
- **Git metadata is automatic** — Branch, commit, PR, and issue info captured when you create lessons
- **Categories are flexible** — Start with defaults, add custom ones with `/kmgraph:add-category`
- **Sanitization is a wizard** — `/kmgraph:config-sanitization` guides you through pre-commit hook setup
- **Multiple KGs are powerful** — Separate knowledge graphs for work, personal, open-source projects

---

## Related Documentation

**Getting started**:
- [Getting Started](GETTING-STARTED.md) - Installation and first steps
- [Configuration](CONFIGURATION.md) - Post-install setup

**Concepts & Guides**:
- [Concepts Guide](CONCEPTS.md) - Plain-English term explanations
- [Command Reference](COMMAND-GUIDE.md) - All commands with examples

**Workflows**:
- [Manual Workflows](../core/docs/WORKFLOWS.md) - Non-Claude processes
- [Platform Adaptation](../core/docs/PLATFORM-ADAPTATION.md) - AI integrations

---

**Version**: 0.0.8.2-alpha
**Last Updated**: 2026-02-21

<!-- Updated: 2026-02-21 -->
