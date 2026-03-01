# Knowledge Graph Quick Reference

> **Claude Code only:** The `/kmgraph:` prefix requires Claude Code with this plugin installed. Other IDEs access equivalent functionality through MCP tools.

One-page cheat sheet for the Knowledge Management Graph. For detailed documentation, see [Command Guide](COMMAND-GUIDE.md).

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
- **Create comprehensive project handoff** → `/kmgraph:handoff`

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
| `/kmgraph:handoff` | Create comprehensive handoff documentation for transitions or onboarding |

---

## Auto-Triggered Skills

Skills activate automatically based on conversation context. No invocation needed.

| Skill | Trigger Condition | Suggests |
|-------|------------------|----------|
| `lesson-capture` | Bug solved, breakthrough made, "figured it out" | `/kmgraph:capture-lesson` with pre-filled context |
| `kg-recall` | History question, "have we solved this?", past decision | `/kmgraph:recall` with extracted search terms |
| `session-wrap` | Context approaching limit, major milestone, session end | `/kmgraph:session-summary` before compaction |
| `adr-guide` | Architecture decision discussed, "I'm thinking of using..." | `/kmgraph:create-adr` with decision guidance |
| `gov-execute-plan` | "execute plan", implementation start, `docs/plans/*.md` mentioned | Zero-deviation 8-step execution protocol |

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

## Need More Help?

- **Want detailed examples?** → [Command Guide](COMMAND-GUIDE.md) — All commands with full documentation
- **New to the system?** → [Getting Started](GETTING-STARTED.md) — Setup and first lesson walkthrough
- **Understanding terminology?** → [Concepts Guide](CONCEPTS.md) — Definitions of all key terms
- **Using other platforms?** → [Platform Adaptation](reference/PLATFORM-ADAPTATION.md) — Cursor, Windsurf, Continue setup
- **Configuring settings?** → [Configuration Guide](CONFIGURATION.md) — Post-install options and workflows

---

## Related Documentation

**Getting started**:
- [Getting Started Guide](GETTING-STARTED.md) — Installation, setup wizard, first lesson (5 min)
- [Installation](INSTALL.md) — Universal installer for all platforms and LLMs
- [Configuration Guide](CONFIGURATION.md) — Sanitization, team workflows, MCP server configuration

**Learning**:
- [Command Reference Guide](COMMAND-GUIDE.md) — Complete command documentation with examples and learning path
- [Concepts Guide](CONCEPTS.md) — Plain-English definitions and explanations of all key terms
- [Examples](examples/) — Real-world lesson, ADR, and KG entry examples

**Advanced topics**:
- [Workflows](reference/WORKFLOWS.md) — Step-by-step guides for manual workflows
- [Platform Adaptation](reference/PLATFORM-ADAPTATION.md) — Integration for Cursor, Windsurf, Continue, VS Code, Aider
- [Style Guide](STYLE-GUIDE.md) — Documentation authoring standards and best practices

---

**Version**: 0.0.10-alpha
**Last Updated**: 2026-02-27
