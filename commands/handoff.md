
# /kmgraph:handoff

Create a comprehensive handoff package for project transitions, context limit preparation, or new developer onboarding.

---

## Description

This command generates a complete handoff package consolidating all work, issues, and progress into structured documentation for AI assistants or new developers.

**Package Contents:**
- **START-HERE.md** — Thin pointer: branch, commit, link to session summary for current state
- **DOCUMENTATION-MAP.md** — File inventory with purpose annotations
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
```

**Parameters:**
- `--output-dir=<path>` (optional): Custom output directory (default: `./handoff-packages/YYYY-MM-DD/`)
- `--force` (optional): Overwrite existing handoff package for today

---

## What Gets Created

### 1. START-HERE.md

**Thin pointer file:**
- Active branch and commit hash
- `continues_from` — repo-relative path to today's session summary (auto-detected)
- Two-line orientation: where to find current state, where to find project structure

**Reading time:** 1 minute

Operational state (current branch, open issues, in-progress work) lives in the linked session summary. START-HERE.md is a navigation aid, not a state dump.

### 2. DOCUMENTATION-MAP.md

**Master file inventory:**
- `commands/` — All slash commands with purpose
- `skills/` — Auto-triggered context providers
- `agents/` — Subagent definitions
- `hooks/` — SessionStart automations
- `docs/` — User-facing documentation structure
- `mcp-server/` — Cross-platform server components
- `core/` — Protected templates and examples
- `knowledge/decisions/` — Architecture Decision Records (ADRs)
- `knowledge/lessons-learned/` — Lessons and patterns by category

**Format:** Structured table with file, purpose, status, and last updated

**Reading time:** 10 minutes

### 3. ARCHITECTURE-SNAPSHOT.md

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

**Auto-detect today's session summary:**
```bash
current_branch=$(git rev-parse --abbrev-ref HEAD)
current_commit=$(git rev-parse --short HEAD)
active_kg=$(jq -r '.graphs[.active].path' ~/.claude/kg-config.json)
session_dir="${active_kg}/sessions"
today=$(date +%Y-%m-%d)
branch_slug=$(git rev-parse --abbrev-ref HEAD | tr '/' '-')

# Try date+branch-slug match first (most precise)
summary_file=$(find "$session_dir" -name "${today}*${branch_slug}*.md" 2>/dev/null | head -1)
# Fall back to any today-prefixed file (sessions dir only contains session files)
if [ -z "$summary_file" ]; then
  summary_file=$(find "$session_dir" -name "${today}*.md" 2>/dev/null | head -1)
fi
```

**Create START-HERE.md:**

```markdown
# Start Here — Project Handoff

**Branch:** $current_branch
**Commit:** $current_commit
**Continues from:** [repo-relative path to today's session summary, e.g. knowledge/sessions/2026-06-09-v0.5.10.1-session-summary-ops.md]
[If no summary found: "No session summary found for today — run /kmgraph:session-summary for current state."]

---

For current state, open issues, and in-progress work: read the session summary linked above.
For project structure and architecture: see DOCUMENTATION-MAP.md and ARCHITECTURE-SNAPSHOT.md in this package.
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
ls -1 knowledge/decisions/ADR-*.md | wc -l

# Document lessons (exclude README/template/index files)
find knowledge/lessons-learned -name "*.md" -not -name "README.md" -not -name "*template*" -not -name "*index*" -type f | wc -l
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
| ADRs (`knowledge/decisions/`) | [count] | Architecture decisions |
| Lessons (`knowledge/lessons-learned/`) | [count] | Lessons by category |
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

### knowledge/decisions/ — Architecture Decision Records
Directory: `knowledge/decisions/`
Current ADRs: [count]

[List all ADRs with status and category]

### knowledge/lessons-learned/ — Knowledge Base by Category

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
- **core/default-templates/** — Structured formats with YAML frontmatter for parsing

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

### Step 4: Generate ARCHITECTURE-SNAPSHOT.md

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
├── knowledge/            — Knowledge graph (sessions, decisions, lessons, enhancements)
│   ├── decisions/        — Architecture Decision Records (ADRs)
│   ├── lessons-learned/  — Lessons by category
│   ├── sessions/         — Session summaries
│   └── enhancements/     — Enhancement specs (ENH-NNN/)
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
- **core/default-templates/** — Structured YAML formats; changes break parsing

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

### Step 5: Verify Output

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
- ARCHITECTURE-SNAPSHOT.md         — [X] lines

Total: ~[XX] lines of documentation

Reading time: ~20 minutes for complete orientation
Quick reference: ~5 minutes (START-HERE → session summary link)

Next steps:
1. Read START-HERE.md — follow the continues_from link to the session summary for current state
2. Skim DOCUMENTATION-MAP.md for file locations
3. Read ARCHITECTURE-SNAPSHOT.md for codebase structure and ADRs

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

- `/kmgraph:session-summary` — Document individual sessions (operational state lives here)
- `/kmgraph:recall` — Search across captured knowledge
- `{active KG}/sessions/` — Chronological session history
- `knowledge/decisions/` — Architecture Decision Records
- `knowledge/lessons-learned/` — Lessons by category

---

**Created:** 2026-02-27
**Version:** 1.0 (Knowledge Graph Handoff)
**Related:** doc-handoff-backup.md (adapted source)
