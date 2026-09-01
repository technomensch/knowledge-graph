# Documentation Map

**Last Updated:** 2026-07-14

---

## Quick Reference

| Component | Count | Purpose |
|---|---|---|
| Commands (`commands/`) | 25 | Slash commands (/kmgraph:...) |
| Skills (`skills/`) | 15 | Auto-triggered context providers |
| Agents (`agents/`) | 11 | Subagent definitions |
| ADRs (`knowledge/decisions/`) | 64 (+1 template) | Architecture decisions |
| Lessons (`knowledge/lessons-learned/`) | 61 | Lessons by category |
| User Docs (`docs/`) | 122 | Docusaurus Material site (`.md`/`.mdx`) |
| Hooks (`hooks/hooks.json`) | 6 | SessionStart automations |

*Counts pulled live via `ls`/`find`/`wc -l` at package generation time — no hardcoded values (ADR-059).*

---

## Directory Structure

### commands/ — Slash Commands
PROTECTED: Do NOT modify without explicit permission.

| Command | Lines | Purpose |
|---|---|---|
| kmg-add-category | 71 | Add a new category to the active knowledge graph with optional custom prefix and git strategy |
| kmg-capture-lesson | 176 | Capture a lesson-learned entry into the active knowledge graph |
| kmg-check-sensitive | 106 | Scan the active knowledge graph for potentially sensitive information using regex patterns |
| kmg-config-sanitization | 96 | Interactive wizard to set up pre-commit hooks that scan for sensitive information |
| kmg-create-adr | 502 | Create a new Architecture Decision Record (ADR) using the active knowledge graph |
| kmg-create-doc | 504 | Scaffold a new documentation file using the active project's doc standards |
| kmg-extract-chat | 660 | Automate extraction of chat history from Claude/Gemini/Codex local logs |
| kmg-handoff | 474 | Create a comprehensive handoff package for project transitions |
| kmg-help | 314 | Display help information for any `/kmgraph:` command |
| kmg-init-personal-kg | 399 | Create a personal knowledge graph at `~/.kmgraph/` for cross-project capture |
| kmg-init | 1827 | Initialize a new knowledge graph with interactive wizard |
| kmg-link-issue | 162 | Manually link an existing lesson/ADR to a GitHub issue with bidirectional references |
| kmg-list | 272 | Display all configured knowledge graphs with locations, categories, git strategies |
| kmg-meta-issue | 483 | Initialize and manage meta-issue tracking for complex, multi-attempt problems |
| kmg-migration | 432 | Inspect and restore knowledge graph archives created by the knowledge-file-migrator |
| kmg-recall | 93 | Search across all project memory systems for relevant knowledge/decisions/sessions |
| kmg-session-summary | 153 | Document the current Claude Code session before context limits or milestones |
| kmg-setup-platform | 205 | Detect installed AI coding tools and write appropriate config |
| kmg-start-issue-tracking | 683 | Initialize issue tracking for a specific problem or enhancement |
| kmg-status | 215 | Display active knowledge graph information, statistics, quick reference |
| kmg-switch | 230 | Switch between configured knowledge graphs |
| kmg-sync-all | 172 | Automate the full knowledge synchronization pipeline (replaces 4 manual invocations) |
| kmg-update-doc | 570 | Update an existing documentation file, guided mode for `--user-facing` |
| kmg-update-graph | 150 | Extract structured insights from lessons-learned and sync to the knowledge graph |
| kmg-update-issue-plan | 249 | Reflect Knowledge Graph insights into issue tracking plans |

### skills/ — Auto-Triggered Providers

| Skill | Purpose |
|---|---|
| kmg-adr-guide | Auto-surface ADR creation when user makes architectural decisions |
| kmg-auto-recall | Auto-invoke knowledge graph search on history/past-decision questions |
| kmg-brainstorm-recall | Ensure the knowledge graph is consulted before any recommendation is made |
| kmg-capture-router | Route capture-that / remember-that requests to the correct destination |
| kmg-doc-update-router | Intercept explicit doc-update requests and route to the correct command |
| kmg-docs-impact-scan | Fires on pre-ship signals to scan for docs affected by code changes |
| kmg-execute-plan | Enforce zero-deviation plan execution protocol |
| kmg-knowledge-graph-usage | Orientation to the Knowledge Graph system architecture |
| kmg-lesson-capture | Auto-capture lessons on complex bug fixes / breakthroughs |
| kmg-plan-gate | Enforce user approval gates after superpowers planning/execution skills |
| kmg-rules-capture | Detect implicit mid-session behavioral corrections, route to rules file |
| kmg-session-wrap | Prompt for session summary at stop / context-limit signals |
| kmg-sidebar-update | Keep sidebar navigation in sync when a docs file moves/renames |
| kmg-stuck-work-escalation | Escalate stuck work using Plan Protocol thresholds |
| kmg-update-profile | Route profile-update requests to all three profile files |

### agents/ — Subagents

| Agent | Purpose |
|---|---|
| create-adr-agent | Interactive ADR creation wizard: numbering, git metadata, template, index |
| knowledge-extractor | Parse large chat/lesson/session files, extract structured insights (read-only, approval-gated writes) |
| knowledge-reviewer | Review knowledge graph entries for quality, completeness, structure |
| lesson-capture-agent | Capture a single lesson from the live session via `kg_capture` MCP tool |
| mcp-setup-agent | Auto-configuration specialist for MCP server registration |
| platform-sync-agent | Sync AI platform configuration files when one changes |
| recall-agent | Knowledge retrieval specialist — searches memory systems |
| rules-capture-agent | Receive structured payload from rules-capture skill, update target rules file |
| session-documenter | Parse git diffs/commits/file history to auto-generate session summaries (approval-gated commits/pushes) |
| session-summary-agent | Lightweight current-session summarizer; surfaces open plans/ADRs/items |
| sync-all-agent | Execute full knowledge synchronization pipeline |

### knowledge/decisions/ — Architecture Decision Records
Directory: `knowledge/decisions/`
Current ADRs: 64 (+ ADR-template.md)

Most recent 8:

| ADR | Status |
|---|---|
| ADR-058-naming-scope-upfront-check-for-new-commands-skills-docstrings | Accepted |
| ADR-059-no-hardcoded-derivable-counts-in-plans | Accepted |
| ADR-060-narrow-kg-search-scope-away-from-raw-chat-history | Proposed |
| ADR-061-first-run-repair-notice-platform-specific-not-unified | Accepted |
| ADR-062-gemini-pb-project-scoping-fail-closed | Accepted |
| ADR-063-never-destroy-known-good-state-before-confirmed-write | Accepted |
| ADR-064-shared-module-pattern-for-slash-command-deduplication | Accepted |
| ADR-065-roadmap-changelog-duplication-changelog-is-source-of-truth | Accepted |

Two open ADRs (Proposed, not yet Accepted): ADR-035-stuck-work-escalation, ADR-037-default-rules-for-graph-deployment, ADR-046-concept-setup-hybrid-page-type-and-how-to-guide-pattern, ADR-060-narrow-kg-search-scope-away-from-raw-chat-history. One Superseded: ADR-032-platform-specific-directives-in-platform-config.

Full list: `ls knowledge/decisions/ADR-*.md`.

### knowledge/lessons-learned/ — Knowledge Base by Category

| Category | Count | Purpose |
|---|---|---|
| architecture | 10 | Structural/design lessons |
| debugging | 8 | Root-cause and fix patterns |
| patterns | 19 | Reusable implementation patterns |
| process | 22 | Workflow/process lessons |

(Total 59 categorized + 2 loose files in `knowledge/lessons-learned/` root = 61 counted overall, excluding README/template/index.)

---

## Key Files

| File | Purpose | Status |
|---|---|---|
| README.md | Project overview | updated 2026-07-11, v0.6.18 |
| CLAUDE.md | Project conventions and rules | updated 2026-07-14 |
| .claude/CLAUDE.md | Personal cross-project preferences | updated 2026-07-13 |
| package.json | Version, dependencies | v0.6.18 |
| mcp-server/package.json | MCP server version | v0.6.18 (independently versioned) |
| .claude-plugin/plugin.json | Plugin manifest version | v0.6.18 |
| hooks/hooks.json | SessionStart automation | 6 hooks, last touched 2026-05-31 |

---

## Code Protection Rules

⚠️ These directories require explicit user permission before modification:

- **commands/** — LLM execution prompts; changes break slash command functionality
- **core/templates/** (referred to as `core/default-templates/` in some docs) — Structured formats with YAML frontmatter for parsing

Allowed modifications without permission:
- Documentation files (*.md)
- Test files (tests/, test-*.js)
- Examples and guides
- Template comments and field glossaries

---

## Version Consistency

**Current versions (confirmed live, 2026-07-14):**
- package.json: v0.6.18
- .claude-plugin/plugin.json: v0.6.18
- mcp-server/package.json: v0.6.18
- README.md: v0.6.18

All four are aligned as of this snapshot. **Note:** mcp-server is versioned independently — the queued v0.6.19 polish-release plan explicitly does NOT bump `mcp-server/package.json` (no mcp-server code has changed since its last bump). Verify alignment again before the v0.6.19 release actually cuts.
