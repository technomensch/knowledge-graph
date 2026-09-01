# Documentation Map

**Last Updated:** 2026-06-07

---

## Quick Reference

| Component | Count | Purpose |
|---|---|---|
| Commands (`commands/`) | 24 | Slash commands (/kmgraph:...) |
| Skills (`skills/`) | 5 | Auto-triggered context providers |
| Agents (`agents/`) | 2 | Subagent definitions |
| ADRs (`knowledge/decisions/`) | 51 | Architecture decisions |
| Lessons (`knowledge/lessons-learned/`) | ~30 | Lessons by category |
| User Docs (`docs/`) | Multi-dir | MkDocs/Obsidian site |

---

## Directory Structure

### commands/ — Slash Commands
PROTECTED: Do NOT modify without explicit permission.

| Command | Purpose |
|---|---|
| add-category | Add a new category to an existing knowledge graph with optional custom prefix |
| capture-lesson | Document lessons learned, problems solved, and patterns with git metadata tracking |
| check-sensitive | Scan active knowledge graph for potentially sensitive information before public sharing |
| config-sanitization | Interactive wizard to set up pre-commit hooks for sensitive data detection |
| create-adr | Create Architecture Decision Records with auto-filled git metadata, sequential numbering, and index auto-update |
| create-doc | Scaffold new documentation files with v0.0.7 language standards, Section 508 compliance, and optional cross-reference auto-update |
| extract-chat | Extract chat history from Claude and Gemini local log sources |
| handoff | Create comprehensive project handoff documentation for transitions or context limits |
| help | Display help for any knowledge graph command — shows purpose, usage, examples, and tips pulled directly from COMMAND-GUIDE.md |
| init | Initialize a new knowledge graph with wizard-based setup and flexible configuration |
| init-personal-kg | Create or register a personal knowledge graph for cross-project lessons |
| link-issue | Manually link existing lesson or ADR to a GitHub issue with bidirectional references |
| list | Display all configured knowledge graphs from ~/.claude/kg-config.json |
| meta-issue | Initialize and manage meta-issue tracking for complex multi-attempt problems |
| migration | List migration restore points and roll back knowledge graph files to a previous archived state |
| recall | Search across project memory systems (lessons, decisions, knowledge graph, sessions) |
| session-summary | Create a summary of the current active chat session |
| setup-platform | Detect installed AI coding tools and configure KMGraph for each one |
| start-issue-tracking | Initialize issue tracking for a specific problem or enhancement with structured documentation and Git branch creation |
| status | Display active knowledge graph status, stats, and quick command reference |
| switch | Change the active knowledge graph |
| sync-all | Automated knowledge sync orchestrator — replaces 4-step manual pipeline with 1 command |
| update-doc | Update an existing documentation file |
| update-graph | Extract structured insights from lessons-learned and sync to knowledge graph with git metadata preservation |
| update-issue-plan | Synchronize Knowledge Graph extraction with active plans and local/GitHub issue tracking |

### skills/ — Auto-Triggered Providers

| Skill | Trigger | Purpose |
|---|---|---|
| lesson-capture | Bug solved, breakthrough made | Suggests /kmgraph:capture-lesson |
| kg-recall | History question, past decision | Guides knowledge graph search |
| session-wrap | Session end, context limit | Prompts /kmgraph:session-summary |
| adr-guide | Architecture decision | Suggests /kmgraph:create-adr |
| gov-execute-plan | "execute plan" or docs/plans/*.md | Enforces zero-deviation plan execution protocol with strict constraints |

### agents/ — Subagents

| Agent | Purpose | Mode |
|---|---|---|
| knowledge-extractor | Read-only parsing of large files for KG extraction | Read-only (approval-gated writes) |
| session-documenter | Git archaeology for session summaries | Approval-gated commits/pushes |

### hooks/ — SessionStart Automations

| Hook | Trigger | Script | Purpose |
|---|---|---|---|
| SessionStart | Session open | hooks-master.sh | Validate KG config, display recent lessons, check profile file staleness |
| PostToolUse (Write\|Edit\|Bash) | After write/edit/bash | post-tool-lesson-check.sh | Check if lesson-worthy changes are undocumented |
| PostToolUse (Write\|Edit) | After write/edit | platform-file-change-check.sh | Check if platform config was modified and offer sync |
| PostToolUse (Write) | After write | plan-mirror.sh | Mirror ~/.claude/plans/ to docs/plans/ in active KG project |
| PostToolUse (Write\|Edit) | After plan write | post-plan-validate-checklist.sh | Output Post-Plan Validation Checklist advisory |
| PostToolUse (Write\|Edit) | After rules write | rules-size-check.sh | Check if rules.md exceeds split threshold |
| PostToolUse (Write\|Edit) | After plan write | plan-docs-xref-check.sh | Check for required ## Docs Impact section (Gate 1) |
| PreToolUse (Skill) | Before brainstorming/writing-plans | pre-skill-rules-inject.sh | Inject ~/.kmgraph/rules.md overrides |
| PreToolUse (Bash) | Before git commit | pre-commit-knowledge-gate.sh | Check if lesson-worthy changes are undocumented |
| PreToolUse (Bash) | Before git push | version-sync + docs-impact-scan check | Gate 2 (version sync) and Gate 3 (docs impact completion) |
| PreToolUse (UserPromptSubmit) | On user prompt submit | recommendation-gate.sh | Inline recommendation protocol gate |
| Stop | Session end | session-end-prompt.sh | Surface open plans, draft ADRs, uncaptured lessons |

### knowledge/decisions/ — Architecture Decision Records

Directory: `knowledge/decisions/`
**Current ADR count: 51** (ADR-001 through ADR-051)

Recent ADRs (last 10):
- ADR-042: adr-implements-commit-reference-mandatory
- ADR-043: pretooluse-hook-injection-superpowers-rule-enforcement
- ADR-044: split-oversized-chat-history-files
- ADR-045: update-profile-skill-not-command
- ADR-046: concept-setup-hybrid-page-type-and-how-to-guide-pattern
- ADR-047: profile-auto-load-routing-layer-only
- ADR-048: governance-capture-routing
- ADR-049: review-audit-protocol-post-plan-pre-push-review-governance
- ADR-050: pre-push-composite-gate-inline-recommendation-gate
- ADR-051: session-summary-handoff-asymmetric-coupling *(most recent — v0.5.10)*

### knowledge/lessons-learned/ — Knowledge Base by Category

| Category | Purpose |
|---|---|
| architecture | Structural/design lessons |
| process | Workflow, protocol, planning lessons |
| patterns | Reusable implementation patterns |
| debugging | Root cause analysis and fix patterns |
| governance | Rules, gates, enforcement lessons |

Most recent lessons (process category):
- `Lessons_Learned_Process_Handoff_Spec_Must_Cover_All_Artifact_Shapes.md`
- `Lessons_Learned_Process_Parallel_Opus_Review_Before_Release.md`
- `Lessons_Learned_Process_Spec_Drift_In_Command_Language.md`
- `Lessons_Learned_Upgrade_Path_Missing_FTS5_Stale_File_Cleanup.md`
- `local-marketplace-testing-workflow.md`

---

## Key Files

| File | Purpose | Status |
|---|---|---|
| README.md | Project overview | current |
| CLAUDE.md | Project conventions and rules | current |
| ~/.claude/CLAUDE.md | Personal cross-project preferences | current |
| package.json | Version, dependencies | v0.5.10 |
| .claude-plugin/plugin.json | Plugin manifest | v0.5.10 |
| mcp-server/package.json | MCP server version | v0.3.10 (independent) |
| hooks/hooks.json | SessionStart automation | 11+ hooks |
| knowledge/rules.md | Project-specific behavioral rules | current |
| knowledge/triggers.md | Rule trigger conditions | current |
| ~/.kmgraph/rules.md | Cross-project universal rules | current |

---

## Code Protection Rules

These directories require explicit user permission before modification:

- **commands/** — LLM execution prompts; changes break slash command functionality
- **core/templates/** — Structured formats with YAML frontmatter for parsing

Allowed modifications without permission:
- Documentation files (*.md)
- Test files (tests/, test-*.js)
- Examples and guides
- Template comments and field glossaries

---

## Version Consistency

**Current versions:**
- package.json: v0.5.10
- .claude-plugin/plugin.json: v0.5.10
- mcp-server/package.json: v0.3.10 (versioned independently)

**Note:** mcp-server is versioned independently. Verify alignment before releasing.

---

## docs/ Structure

```
docs/
├── .obsidian/            — Obsidian vault config
├── concepts/             — Conceptual documentation
├── contributing/         — Contribution guides
├── demos/                — Demo content
├── design/               — Design documentation
├── examples/             — Reference implementations
│   ├── decisions/
│   ├── knowledge/
│   ├── lessons-learned/
│   └── meta-issue/
├── pillars/              — Core pillars (capturing, organizing, portability, recalling, tailoring)
├── plans/                — Implementation plans (gitignored, local only)
│   ├── archive/
│   ├── docs-updates/
│   └── v0.5.x/
├── reference/            — Commands, skills, agents, hooks, templates reference
├── specs/                — Feature specifications
├── superpowers/          — Superpowers skill docs
├── templates/            — Template files
│   ├── decisions/
│   ├── documentation/
│   ├── knowledge/
│   ├── lessons-learned/
│   ├── meta-issue/
│   └── sessions/
├── troubleshooting/      — Troubleshooting guides
└── tmp/                  — Temporary working files
```
