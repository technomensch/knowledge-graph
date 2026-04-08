---
description: Create comprehensive project handoff documentation for transitions or context limits
---

# /kmgraph:handoff

Create a comprehensive handoff package for project transitions, context limit preparation, or new developer onboarding.

---

## Description

This command generates a complete handoff package consolidating all work, issues, and progress into structured documentation for AI assistants or new developers.

**Package Contents:**
- **START-HERE.md** — Current session state, active branch, what's in progress
- **DOCUMENTATION-MAP.md** — File inventory with purpose annotations
- **SESSION-COMPILATION.md** — Recent session summaries linked chronologically
- **OPEN-ISSUES.md** — Unresolved issues, open PRs, pending reviews
- **ARCHITECTURE-SNAPSHOT.md** — Current codebase structure and key decisions (from ADRs)

**Purpose:** Enable seamless knowledge transfer and preparation for context window limits.

**When to use:**
- Before transitioning to another developer
- Preparing for context limit (>180K tokens)
- Completing a major release cycle
- Creating documentation for AI assistant handoffs
- Before taking a long break

---

## Usage

```bash
/kmgraph:handoff
/kmgraph:handoff --output-dir=<custom-path>
/kmgraph:handoff --skip-sessions
```

**Parameters:**
- `--output-dir=<path>` (optional): Custom output directory (default: `./handoff-packages/YYYY-MM-DD/`)
- `--skip-sessions` (optional): Exclude session compilation (faster, smaller output)
- `--force` (optional): Overwrite existing handoff package for today

---

## What Gets Created

### 1. START-HERE.md

**Current state snapshot:**
- Active branch and commit hash
- Work in progress (last 3 commits)
- Current session context
- Next steps and blockers
- Active knowledge graphs and recent lessons

**Reading time:** 5 minutes

### 2. DOCUMENTATION-MAP.md

**Master file inventory:**
- `commands/` — All slash commands with purpose
- `skills/` — Auto-triggered context providers
- `agents/` — Subagent definitions
- `hooks/` — SessionStart automations
- `docs/` — User-facing documentation structure
- `mcp-server/` — Cross-platform server components
- `core/` — Protected templates and examples
- `decisions/` — Architecture Decision Records (ADRs)
- `lessons-learned/` — Lessons and patterns by category

**Format:** Structured table with file, purpose, status, and last updated

**Reading time:** 10 minutes

### 3. SESSION-COMPILATION.md

**Recent work history:**
- Last 5 session summaries (from `docs/sessions/`)
- Commits created in each session
- Key decisions made
- Lessons learned and patterns discovered

**Reading time:** 15 minutes (skip to sections of interest)

### 4. OPEN-ISSUES.md

**Current blockers and pending work:**
- Open GitHub issues and PRs
- Pending code reviews
- Known limitations or TODO items
- Deferred tasks (marked in plans/)

**Reading time:** 5-10 minutes

### 5. ARCHITECTURE-SNAPSHOT.md

**Codebase structure and philosophy:**
- Directory tree with annotations
- Key architectural decisions (from ADRs)
- Naming conventions and patterns
- Code protection rules (protected directories)
- Version and release strategy

**Reading time:** 10 minutes

---

## Implementation Steps

### Step 1: Determine Output Directory

**If --output-dir not provided:**
```bash
output_dir="./handoff-packages/$(date +%Y-%m-%d)"
mkdir -p "$output_dir"
```

**If --output-dir provided:**
```bash
output_dir="<user-provided-path>"
mkdir -p "$output_dir"
```

**Announce to user:**
```
Handoff package will be created in: $output_dir
```

---

### Step 2: Generate START-HERE.md

**Collect current state:**
```bash
# Get active branch
current_branch=$(git rev-parse --abbrev-ref HEAD)
current_commit=$(git rev-parse --short HEAD)

# Get last 3 commits
recent_commits=$(git log --oneline -3)

# Get file count changes
files_changed=$(git diff --name-only main...HEAD | wc -l)

# Check for uncommitted changes
git status --porcelain
```

**Create START-HERE.md:**

```markdown
# Start Here — Project Handoff

**Last Updated:** [timestamp]
**Created for branch:** $current_branch

---

## Current State

**Active Branch:** $current_branch
**Current Commit:** $current_commit
**Files Modified:** $files_changed

### Recent Work (Last 3 Commits)

$recent_commits

### In Progress

[Detect from docs/plans/ active plan file]

### Next Steps

[Infer from active plan or open issues]

### Active Knowledge Graphs

[List from ~/.claude/kg-config.json active KG]

### Recent Lessons

[List last 3 lessons from active KG's lessons-learned/]

---

## Quick Navigation

- **Setup & Installation:** docs/INSTALL.md
- **Commands Reference:** docs/reference/commands.md
- **Quickstart:** docs/quickstart.md
- **Architecture:** decisions/ (ADRs)
- **Lessons learned:** lessons-learned/ (by category)
- **Session history:** docs/sessions/
```

---

### Step 3: Generate DOCUMENTATION-MAP.md

**Scan project structure:**
```bash
# Document commands/
ls -1 commands/*.md | xargs wc -l | sort -rn

# Document skills/
ls -1 skills/*/SKILL.md 2>/dev/null | while read f; do basename $(dirname $f); done

# Document agents/
ls -1 agents/*.md

# Document hooks (from hooks.json)
jq '.hooks[] | .trigger' hooks/hooks.json 2>/dev/null

# Document decisions
ls -1 decisions/ADR-*.md | wc -l

# Document lessons
find lessons-learned -name "*.md" -type f | wc -l
```

**Create DOCUMENTATION-MAP.md:**

```markdown
# Documentation Map

**Last Updated:** [timestamp]

---

## Quick Reference

| Component | Count | Purpose |
|---|---|---|
| Commands (`commands/`) | [count] | Slash commands (/kmgraph:...) |
| Skills (`skills/`) | [count] | Auto-triggered context providers |
| Agents (`agents/`) | [count] | Subagent definitions |
| ADRs (`decisions/`) | [count] | Architecture decisions |
| Lessons (`lessons-learned/`) | [count] | Lessons by category |
| User Docs (`docs/`) | [count] | MkDocs Material site |

---

## Directory Structure

### commands/ — Slash Commands
PROTECTED: Do NOT modify without explicit permission.

| Command | Lines | Purpose |
|---|---|---|
| [command names from wc -l] | [line count] | [extracted from description] |

### skills/ — Auto-Triggered Providers

| Skill | Trigger | Purpose |
|---|---|---|
| lesson-capture | Bug solved, breakthrough made | Suggests /kmgraph:capture-lesson |
| kg-recall | History question, past decision | Guides knowledge graph search |
| session-wrap | Session end, context limit | Prompts /kmgraph:session-summary |
| adr-guide | Architecture decision | Suggests /kmgraph:create-adr |
| gov-execute-plan | "execute plan" or docs/plans/*.md | Enforces zero-deviation protocol |

### agents/ — Subagents

| Agent | Purpose | Mode |
|---|---|---|
| knowledge-extractor | Parse large files for KG extraction | Read-only (approval-gated writes) |
| session-documenter | Git archaeology for summaries | Approval-gated commits/pushes |

### decisions/ — Architecture Decision Records
Directory: `decisions/`
Current ADRs: [count]

[List all ADRs with status and category]

### lessons-learned/ — Knowledge Base by Category

| Category | Count | Latest | Purpose |
|---|---|---|---|
| [category] | [count] | [date] | [category description] |

---

## Key Files

| File | Purpose | Status |
|---|---|---|
| README.md | Project overview | [updated date] |
| CLAUDE.md | Project conventions and rules | [updated date] |
| .claude/CLAUDE.md | Personal cross-project preferences | [updated date] |
| package.json | Version, dependencies | v[version] |
| mcp-server/package.json | MCP server version | [independent version] |
| .claude/settings.json | Claude Code configuration | mcpToolSearch enabled |
| hooks/hooks.json | SessionStart automation | [hook count] hooks |

---

## Code Protection Rules

⚠️ These directories require explicit user permission before modification:

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
- package.json: v[version]
- plugin.json: v[version]
- mcp-server/package.json: v[mcp-version]
- README.md: v[version]

**Note:** mcp-server is versioned independently. Verify alignment before releasing.
```

---

### Step 4: Generate SESSION-COMPILATION.md

**Collect recent sessions:**
```bash
# Find docs/sessions/ directory
session_dir="docs/sessions"

# List last 5 session files by date
ls -1tr $session_dir/*/*.md 2>/dev/null | tail -5
```

**Create SESSION-COMPILATION.md:**

```markdown
# Session Compilation

**Compilation Date:** [timestamp]
**Branch:** [current-branch]

---

## Summary

Last 5 sessions and key decisions:

[For each session file, extract:]
- Date and title
- Type (Feature, Bug Fix, Refactoring, Planning, Documentation)
- Key commits created (hash + message)
- Decisions made
- Lessons learned
- Next steps

---

[Include chronologically ordered summaries from last 5 sessions]

---

## Patterns Discovered Across Sessions

[Scan recent sessions for recurring patterns, decisions, or learnings]
```

---

### Step 5: Generate OPEN-ISSUES.md

**Scan for open issues:**
```bash
# GitHub issues (if available)
gh issue list --state open --json title,body,number 2>/dev/null

# Open pull requests
gh pr list --state open --json title,headRefName,number 2>/dev/null

# Check docs/plans/ for active plans
ls docs/plans/*.md 2>/dev/null | head -3

# Check for TODO comments
grep -r "TODO\|FIXME\|XXX\|HACK" commands/ skills/ agents/ 2>/dev/null | head -5
```

**Create OPEN-ISSUES.md:**

```markdown
# Open Issues & Pending Work

**Last Updated:** [timestamp]

---

## GitHub Issues

[List all open issues with descriptions]

---

## Open Pull Requests

[List all open PRs with branches and status]

---

## Active Plans

[List active implementation plans from docs/plans/]

---

## Known TODOs

[Scan codebase for TODO/FIXME comments and list top 5]

---

## Deferred Tasks

[List tasks marked as deferred or future in plans]
```

---

### Step 6: Generate ARCHITECTURE-SNAPSHOT.md

**Create ARCHITECTURE-SNAPSHOT.md:**

```markdown
# Architecture Snapshot

**Snapshot Date:** [timestamp]
**Current Release:** v[version]

---

## Project Purpose

Knowledge management plugin for Claude Code: capture, organize, and retrieve institutional knowledge across projects.

---

## Directory Structure

\`\`\`
knowledge-graph/
├── commands/              🔒 PROTECTED — Slash commands (/kmgraph:...)
├── skills/               — Auto-triggered context providers
├── agents/               — Subagent definitions for heavy-lift tasks
├── hooks/                — SessionStart automation (hooks.json)
├── mcp-server/           — Cross-platform MCP server (TypeScript/Node.js)
├── core/                 🔒 PROTECTED — Templates, examples, docs
│   ├── templates/        — YAML frontmatter structures
│   ├── examples/         — Reference implementations
│   └── scripts/          — Python extraction utilities
├── docs/                 — Docusaurus documentation site
│   ├── reference/        — Commands, skills, agents, hooks, templates
│   ├── guides/           — How-to guides
│   ├── quickstart.md
│   ├── CHEAT-SHEET.md
│   ├── plans/            — Implementation plans (gitignored)
│   ├── sessions/         — Session summaries (gitignored)
│   └── chat-history/     — Extracted chat logs (gitignored)
├── decisions/            — Architecture Decision Records (ADRs)
├── lessons-learned/      — Lessons by category
├── knowledge/            — Quick-reference knowledge graph
├── CLAUDE.md             — Project conventions and rules
├── .claude/              — Claude Code configuration
├── README.md             — Project overview
├── package.json          — Plugin version and dependencies
└── .claude-plugin/       — Plugin manifest
\`\`\`

---

## Architectural Principles

1. **Modular KG system** — Multi-KG support with active/inactive switching
2. **Layered documentation** — Commands (CLI), Skills (context), Agents (heavy-lift)
3. **Approval gates** — Subagents wait for user approval before writes
4. **Git-aware** — Preserves commit metadata, branch context, issue links
5. **Privacy-first** — Sessions and chat history never committed to repo

---

## Key Decisions (from ADRs)

[List all ADRs with decision and rationale]

---

## Code Protection Rules

**🔒 PROTECTED DIRECTORIES** (require explicit permission):
- **commands/** — Contains LLM execution prompts; changes break slash commands
- **core/templates/** — Structured YAML formats; changes break parsing

**✅ Allowed Modifications** (no permission needed):
- Documentation files (*.md)
- Test files and examples
- Template comments and field glossaries

---

## Naming Conventions

### Branch Names
- Feature: `v{major}.{minor}.{patch}-{description}` (e.g., v0.0.10.1-alpha-skills)
- Bug fix: `v{major}.{minor}.{patch}.{subpatch}-fix-{description}` (e.g., v0.0.8.7.3-alpha-fix-installer)
- Docs site only: `docs-update-{description}` (e.g., docs-update-command-guide) — no version prefix

### Commit Format
```
type(scope): subject

[bullet summary of changes]

Closes #[issue-number]

Co-Authored-By: Claude [Model] <noreply@anthropic.com>
```

Types: `feat` | `fix` | `docs` | `refactor` | `chore` | `perf` | `style` | `test` | `build` | `ci` | `revert`

### Skills & Agents
- Skills: Lowercase, kebab-case (e.g., lesson-capture, kg-recall)
- Agents: CamelCase (e.g., KnowledgeExtractor, SessionDocumenter)

---

## Version Strategy

**Current Version:** v[version]-alpha

**Versioning:**
- Major.minor.patch.subpatch format
- Alpha releases during development (v0.0.x-alpha)
- Version consistency required across: package.json, plugin.json, README.md, mcp-server/package.json
- MCP server versioned independently (may not match plugin version)

---

## Recent Architecture Changes

[List 3-5 most recent ADRs and their status]
```

---

### Step 7: Verify Output

**Confirm all files created:**
```bash
ls -lh "$output_dir"/*.md
wc -l "$output_dir"/*.md | tail -1
```

**Announce completion:**
```
✅ Handoff package created!

Location: $output_dir

Files:
- START-HERE.md                    — [X] lines
- DOCUMENTATION-MAP.md             — [X] lines
- SESSION-COMPILATION.md           — [X] lines
- OPEN-ISSUES.md                   — [X] lines
- ARCHITECTURE-SNAPSHOT.md         — [X] lines

Total: ~[XX] lines of documentation

Reading time: ~30-45 minutes for complete orientation
Quick reference: ~15 minutes (START-HERE + DOCUMENTATION-MAP)

Next steps:
1. Review START-HERE.md for current context
2. Skim DOCUMENTATION-MAP.md for file locations
3. Read SESSION-COMPILATION.md for recent decisions
4. Check OPEN-ISSUES.md for blockers

Handoff ready for sharing or archival!
```

---

## Example Output

**START-HERE.md:**
```
Active Branch: v0.0.10.3-alpha-token-optimization
Current Commit: a1b2c3d (feat: add subagent delegation blocks)
Files Modified: 5 (commands/update-graph.md, session-summary.md, extract-chat.md, plus 2 others)

Recent Work:
- Added delegation guidance to 3 heavy commands
- Deferred @import splitting (manual test required)
- Prepared for handoff command creation

In Progress: v0.0.10.3 step 4 (creating handoff command itself)
Next Steps: Document COMMAND-GUIDE.md updates, verify token reduction
```

**DOCUMENTATION-MAP.md excerpt:**
```
| Component | Count | Purpose |
|---|---|---|
| Commands | 24 | Slash commands (/kmgraph:...) |
| Skills | 5 | Auto-triggered providers |
| Agents | 2 | Subagent handlers |
| ADRs | 11 | Architecture decisions |
| Lessons | 8+ | Lessons by category |
```

---

## See Also

- `/kmgraph:session-summary` — Document individual sessions
- `/kmgraph:recall` — Search across captured knowledge
- `docs/sessions/` — Chronological session history
- `decisions/` — Architecture Decision Records
- `lessons-learned/` — Lessons by category

---

**Created:** 2026-02-27
**Version:** 1.0 (Knowledge Graph Handoff)
**Related:** doc-handoff-backup.md (adapted source)
