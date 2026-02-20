# Knowledge Graph Quick Reference

One-page cheat sheet for the Knowledge Graph plugin. Print this and tape it to your monitor.

For detailed documentation, see [Command Guide](COMMAND-GUIDE.md) (created in Session 5).

---

## I Want To...

- **Start a new knowledge graph** → `/knowledge:init`
- **Document what I just learned** → `/knowledge:capture-lesson`
- **Find something I documented before** → `/knowledge:recall "search query"`
- **See what's in my knowledge graph** → `/knowledge:status`
- **Track a complex bug across multiple attempts** → `/knowledge:meta-issue`
- **Set up team knowledge sharing** → `/knowledge:config-sanitization`
- **Summarize my current chat session** → `/knowledge:session-summary`
- **Extract my chat history** → `/knowledge:extract-chat`
- **Sync lessons to the knowledge graph** → `/knowledge:update-graph`
- **Check for sensitive data before sharing** → `/knowledge:check-sensitive`
- **Work with multiple knowledge graphs** → `/knowledge:list` then `/knowledge:switch`
- **Link lessons to GitHub issues** → `/knowledge:link-issue`

---

## Commands by Difficulty

### 🟢 Essential (Start Here)

First-time users need these for basic operation:

| Command | Purpose |
|---------|---------|
| `/knowledge:init` | Initialize a new knowledge graph with wizard-based setup |
| `/knowledge:capture-lesson` | Document lessons learned with git metadata tracking |
| `/knowledge:status` | View active knowledge graph info and quick reference |
| `/knowledge:recall` | Search across all memory systems (lessons, decisions, knowledge) |

### 🟡 Intermediate (Once Comfortable)

Active users use these for regular workflows:

| Command | Purpose |
|---------|---------|
| `/knowledge:update-graph` | Extract knowledge graph entries from lessons |
| `/knowledge:add-category` | Add a new category to existing knowledge graph |
| `/knowledge:session-summary` | Create summary of current chat session |
| `/knowledge:list` | Display all configured knowledge graphs |
| `/knowledge:switch` | Change active knowledge graph |
| `/knowledge:check-sensitive` | Scan knowledge graph for potentially sensitive information |
| `/knowledge:config-sanitization` | Interactive wizard for pre-commit hook setup |
| `/knowledge:extract-chat` | Extract chat history from Claude and Gemini logs |

### 🔴 Advanced (Power Features)

Power users leverage these for complex workflows:

| Command | Purpose |
|---------|---------|
| `/knowledge:meta-issue` | Initialize meta-issue tracking for complex multi-attempt problems |
| `/knowledge:start-issue-tracking` | Initialize issue tracking with structured docs and Git branch |
| `/knowledge:update-issue-plan` | Sync knowledge graph → plan → issue → GitHub |
| `/knowledge:link-issue` | Manually link existing lesson or ADR to GitHub issue |
| `/knowledge:archive-memory` | Archive stale MEMORY.md entries to prevent bloat |
| `/knowledge:restore-memory` | Restore archived MEMORY.md entries |
| `/knowledge:sync-all` | Automated full sync pipeline (4 steps → 1 command) |

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

1. `/knowledge:init`
   → Follow wizard to configure location, categories, and git strategy

2. `/knowledge:capture-lesson`
   → Document your first learning with guided prompts

3. `/knowledge:status`
   → Verify everything is working correctly

### Daily Use (10 minutes)

1. Solve a problem or learn something new

2. `/knowledge:capture-lesson`
   → Document it while fresh in your mind

3. `/knowledge:update-graph`
   → Sync to knowledge graph for quick reference

### Before Sharing Code (2 minutes)

1. `/knowledge:check-sensitive`
   → Scan for API keys, credentials, PII

2. Review findings carefully

3. Remove sensitive data before git push

### Working with Complex Bugs (30+ minutes)

1. `/knowledge:meta-issue`
   → Initialize tracking for multi-attempt problem

2. Attempt fixes, document each try

3. `/knowledge:update-issue-plan`
   → Sync progress to GitHub issue

### Multi-Graph Workflows

1. `/knowledge:list`
   → See all configured knowledge graphs

2. `/knowledge:switch`
   → Change to different project's KG

3. Work with that project's knowledge

---

## Quick Tips

- **Start with Essential commands** — Add Intermediate and Advanced commands as needs arise
- **Use `/knowledge:status` often** — Shows what's in your active knowledge graph at a glance
- **`/knowledge:recall` searches everything** — Lessons, decisions, knowledge entries, and session summaries
- **MEMORY.md auto-updates** — Check it before important sessions to see what context is loaded
- **Commands use colon syntax** — It's `/knowledge:` not `/knowledge-` (colon, not hyphen)
- **Git metadata is automatic** — Branch, commit, PR, and issue info captured when you create lessons
- **Categories are flexible** — Start with defaults, add custom ones with `/knowledge:add-category`
- **Sanitization is a wizard** — `/knowledge:config-sanitization` guides you through pre-commit hook setup
- **Multiple KGs are powerful** — Separate knowledge graphs for work, personal, open-source projects

---

## Getting Help

- **Detailed command docs**: See [Command Guide](COMMAND-GUIDE.md) (created in Session 5)
- **Concepts explained**: See [Concepts Guide](CONCEPTS.md) (created in Session 4)
- **Configuration help**: See [Configuration Guide](CONFIGURATION.md)
- **Platform adaptation**: See [Platform Adaptation Guide](../core/docs/PLATFORM-ADAPTATION.md)
- **Manual workflows**: See [Workflows Guide](../core/docs/WORKFLOWS.md)

---

**Version**: 0.0.7-alpha
**Last Updated**: 2026-02-20
