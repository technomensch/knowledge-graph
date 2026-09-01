# Documentation Map — 2026-05-28

**Version:** 0.5.9.1 | **MCP server:** 0.3.10

---

## Component Counts

| Component | Count | Location |
|-----------|-------|----------|
| Commands | 26 | `commands/` |
| Skills | 15 | `skills/` |
| Agents | 11 | `agents/` |
| ADRs | 51 | `knowledge/decisions/` |
| Lessons | 52 (across all dirs) | `knowledge/lessons-learned/` |
| Enhancements | 20 | `knowledge/enhancements/` |
| Sessions | 29+ | `knowledge/sessions/` |

---

## Commands (`commands/`) — 26 files

| Command | Purpose |
|---------|---------|
| `add-category` | Add a new category to an existing knowledge graph with optional custom prefix |
| `capture-lesson` | Document lessons learned, problems solved, and patterns with git metadata tracking |
| `check-sensitive` | Scan active knowledge graph for potentially sensitive information before public sharing |
| `config-sanitization` | Interactive wizard to set up pre-commit hooks for sensitive data detection |
| `create-adr` | Create Architecture Decision Records with auto-filled git metadata, sequential numbering, and index auto-update |
| `create-doc` | Scaffold new documentation files with v0.0.7 language standards and Section 508 compliance |
| `extract-chat` | Extract chat history from Claude and Gemini local log sources |
| `handoff` | Create comprehensive project handoff documentation for transitions or context limits |
| `help` | Display help for any knowledge graph command from COMMAND-GUIDE.md |
| `init-personal-kg` | Create or register a personal knowledge graph for cross-project lessons |
| `init` | Initialize a new knowledge graph with wizard-based setup and flexible configuration |
| `init-shared/` | Shared modules used by init (scaffold, seed, config-entry-write, upgrade-inspector, etc.) |
| `link-issue` | Manually link existing lesson or ADR to a GitHub issue with bidirectional references |
| `list` | Display all configured knowledge graphs from ~/.claude/kg-config.json |
| `meta-issue` | Initialize and manage meta-issue tracking for complex multi-attempt problems |
| `migration` | List migration restore points and roll back knowledge graph files to a previous archived state |
| `recall` | Search across project memory systems (lessons, decisions, knowledge graph, sessions) |
| `session-summary` | Create a summary of the current active chat session |
| `setup-platform` | Detect installed AI coding tools and configure KMGraph for each one |
| `start-issue-tracking` | Initialize issue tracking for a specific problem or enhancement with structured documentation and Git branch creation |
| `status` | Display active knowledge graph status, stats, and quick command reference |
| `switch` | Change the active knowledge graph |
| `sync-all` | Automated knowledge sync orchestrator — replaces 4-step manual pipeline with 1 command |
| `update-doc` | Update an existing documentation file with standards validation and changelog enforcement |
| `update-graph` | Extract structured insights from lessons-learned and sync to knowledge graph with git metadata preservation |
| `update-issue-plan` | Synchronize Knowledge Graph extraction with active plans and local/GitHub issue tracking |

---

## Skills (`skills/`) — 15 directories, each with `SKILL.md`

| Skill | Trigger | Purpose |
|-------|---------|---------|
| `adr-guide` | Architectural decisions, choosing between technical approaches | Auto-surface ADR creation; dispatches to create-adr-agent |
| `brainstorm-recall` | Same triggers as adr-guide (fires first) | Ensure knowledge graph is consulted before any recommendation |
| `capture-router` | "capture that", "remember that" | Route capture requests to correct destination (memory/lesson/ADR) |
| `doc-update-router` | Explicit doc-update requests | Intercept and route to `/kmgraph:update-doc` wizard |
| `docs-impact-scan` | "push to origin", "open PR", "ready to push", "finishing up" | Scan all user-facing docs affected by current branch changes |
| `gov-execute-plan` | User invokes plan implementation | Enforce zero-deviation plan execution protocol |
| `gov-plan-gate` | After planning skills complete | Require explicit "Proceed" or "Start" before implementation |
| `kg-recall` | Questions about project history, past decisions, familiar problems | Auto-invoke knowledge graph search |
| `knowledge-graph-usage` | General KG orientation | Orient system to four-layer architecture and command reference |
| `lesson-capture` | Solved bugs, breakthroughs, patterns, completed debugging | Auto-capture lessons with git metadata |
| `rules-capture` | Implicit mid-session behavioral corrections | Detect and route to authoritative rule files |
| `session-wrap` | Stopping work, context limits, milestones, open plan items | Prompt for session summary |
| `sidebar-update` | Doc file moved or renamed | Detect stale sidebar entry and update sidebars.js |
| `stuck-work-escalation` | 3+ failed fix attempts, 30+ min blocked | Activate powerful-tier diagnosis with structured exit-path decision |
| `update-profile` | User asks to update profile | Route changes to all three profile files (me.md + rules.md + triggers.md) as a unit |

---

## Agents (`agents/`) — 11 files

| Agent | Purpose |
|-------|---------|
| `create-adr-agent` | Interactive ADR creation wizard — auto-numbered files, git metadata, template population, index updates |
| `knowledge-extractor` | Read-only parsing of large files for KG extraction; approval-gated writes |
| `knowledge-reviewer` | Reviews KG entries for quality, completeness, and bidirectional linking |
| `lesson-capture-agent` | Captures a single lesson — problem, solution, context, git metadata via kg_capture |
| `mcp-setup-agent` | Detects IDE environment and auto-configures MCP server when kg_* tools fail |
| `platform-sync-agent` | Syncs relevant portions of platform config files when one is updated |
| `recall-agent` | Searches knowledge graph and memory systems for relevant lessons, decisions, patterns |
| `rules-capture-agent` | Receives structured context payload, checks for duplicate rules, drafts and writes on confirmation |
| `session-documenter` | Git archaeology for session summaries; approval-gated for all git operations |
| `session-summary-agent` | Creates lightweight session summary; checks for open plans, draft ADRs, uncaptured lessons |
| `sync-all-agent` | Full knowledge sync pipeline — scans lessons, extracts KG entries, links plans/issues, refreshes FTS5 index |

---

## Key Files

| File | Purpose |
|------|---------|
| `CLAUDE.md` | Project-level Claude Code instructions (authoritative for this project) |
| `GEMINI.md` | Gemini platform configuration |
| `~/.claude/CLAUDE.md` | Global cross-project baseline |
| `~/.kmgraph/rules.md` | Cross-project universal rules |
| `~/.kmgraph/me.md` | Cross-project identity and working style |
| `~/.kmgraph/governance-rules.md` | Plan execution governance rules |
| `~/.kmgraph/triggers.md` | When rules apply (cross-project) |
| `knowledge/rules.md` | Project-specific rules (overrides cross-project on conflict) |
| `knowledge/me.md` | Project-specific identity (gitignored) |
| `package.json` | Root version (0.5.9.1), npm scripts, dependency overrides |
| `mcp-server/package.json` | MCP server version (0.3.10) — versioned independently |
| `.claude-plugin/plugin.json` | Claude Code plugin manifest (version 0.5.9.1) |
| `hooks/hooks.json` | SessionStart automation hooks |
| `scripts/` | Lifecycle hook scripts (pre-skill-rules-inject.sh, post-plan-validate-checklist.sh, stop-plan-gate.sh, etc.) |
| `knowledge/decisions/README.md` | ADR index (currently staged with count 46 → 49) |
| `~/.claude/kg-config.json` | Multi-KG registry |
| `~/.claude/projects/.../memory/MEMORY.md` | Auto-memory index for this project |
| `docs/` | MkDocs Material documentation site |
| `core/` | Platform-agnostic templates (PROTECTED — do not modify) |

---

## Code Protection Rules

- `commands/` — PROTECTED: do not modify without explicit user permission
- `core/templates/` — PROTECTED: do not modify without explicit user permission
- Changes to either directory require a plan step and explicit user "Proceed" confirmation

---

## Lessons-Learned Structure

```
knowledge/lessons-learned/
  architecture/          # Structural and system design lessons
  debugging/             # Debugging solutions and anti-patterns
  patterns/              # Reusable design patterns
  process/               # Workflow and methodology lessons
  lesson-template.md     # Template for new lessons
  README.md              # Index
  Lessons_Learned_InBand_Version_Warning_Burst_Cadence_Pattern.md  # Root-level lesson
```

Total lesson count (all subdirs): 52
