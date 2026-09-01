# Architecture Snapshot — knowledge-graph

Captured: 2026-06-10
Current version: **0.5.10.2**

## What It Is

KMGraph is a knowledge management tool — a Claude Code extension plus a cross-platform MCP server. It provides structured knowledge capture, lesson-learned documentation, ADR tracking, cross-session memory, and governance automation for AI-assisted development projects.

## Top-Level Directory Structure

```
knowledge-graph/
├── commands/          # Claude Code slash commands — PROTECTED
├── skills/            # Auto-triggered context providers
├── agents/            # Subagent definitions
├── hooks/             # hooks.json — SessionStart automation
├── mcp-server/        # Cross-platform MCP server (TypeScript/Node.js)
├── core/              # Platform-agnostic templates, docs, examples — PROTECTED
├── docs/              # MkDocs Material documentation site
├── knowledge/         # Project memory: ADRs, lessons, sessions, enhancements, plans
├── .claude-plugin/    # Claude Code plugin manifest and marketplace entry
└── .codex-plugin/     # Codex CLI plugin manifest and MCP config (new in v0.5.10.2)
```

## Component Roles

### commands/
Slash commands executed by Claude Code under the `kmgraph` namespace (e.g., `/kmgraph:recall`). 25 commands. PROTECTED — do not modify without explicit user permission.

### skills/
Auto-triggered context providers that inject behavior at workflow phase transitions. 15 skills. Key skills:

| Skill | Purpose |
|---|---|
| `lesson-capture` | Suggests `/kmgraph:capture-lesson` when bugs/breakthroughs occur |
| `kg-recall` | Guides knowledge graph search for project history/past decisions |
| `session-wrap` | Prompts `/kmgraph:session-summary` when stopping or near context limits |
| `adr-guide` | Suggests `/kmgraph:create-adr` when architecture decisions are made |
| `gov-execute-plan` | Enforces zero-deviation plan execution with strict constraints |
| `docs-impact-scan` | Gates pre-push on doc impact verification |
| `gov-plan-gate` | Blocks implementation start without an approved plan |

### agents/
Heavy-lift task handlers that keep the main context clean. 11 agents. Key agents:

| Agent | Purpose |
|---|---|
| `knowledge-extractor` | Read-only parsing of large files for KG extraction (approval-gated writes) |
| `session-documenter` | Git archaeology for session summaries (approval-gated commits/pushes) |
| `recall-agent` | Broad cross-source search across lessons, decisions, sessions |
| `rules-capture-agent` | Routes behavioral corrections to the correct rules file |

### mcp-server/
TypeScript/Node.js MCP server. Provides `kg_*` tools for cross-platform access (works outside Claude Code). Build output at `mcp-server/dist/index.js`. Version is independent of the main plugin version.

### core/
Platform-agnostic templates and scaffolds. PROTECTED — these are the distributed templates that get installed into user projects via `/kmgraph:init`. Do not modify without explicit user permission.

### knowledge/
The project's own memory system. Subdirectories:

| Path | Contents |
|---|---|
| `knowledge/decisions/` | 51 ADRs |
| `knowledge/lessons-learned/` | 52 categorized lessons (architecture: 10, debugging: 8, patterns: 18, process: 16) |
| `knowledge/sessions/` | Session summaries by month |
| `knowledge/enhancements/` | Enhancement specs (ENH-NNN/) |
| `knowledge/plans/` | Working implementation plans (gitignored) |

## Platform Support

| Platform | Install Path | Namespace |
|---|---|---|
| Claude Code | `.claude-plugin/` | `/kmgraph:<command>` |
| Codex CLI | `.codex-plugin/` (new v0.5.10.2) | via MCP tools |
| Cross-platform MCP | `mcp-server/` | `kg_*` tools |

## Code Protection Rules

- `commands/` — NEVER modify without explicit user permission
- `core/templates/` — NEVER modify without explicit user permission
- MCP server (`mcp-server/`) — independent versioning; build before push

## Recent Key ADRs (Last 5)

| ADR | Decision |
|---|---|
| ADR-047 | (see `knowledge/decisions/`) |
| ADR-048 | (see `knowledge/decisions/`) |
| ADR-049 | Review audit protocol — governs post-plan, pre-push review gate timing |
| ADR-050 | Pre-push composite gate + inline recommendation gate design |
| ADR-051 | Session-summary / handoff asymmetric coupling — session-summary reads handoff; handoff does not read session-summary |

## Branch Naming Conventions

| Change Type | Branch Format | Example |
|---|---|---|
| Feature development | `v{ver}-{description}` | `v0.5.10.2-codex-marketplace` |
| Bug fix | `v{ver}-fix-{description}` | `v0.0.8.7.3-alpha-fix-installer-page` |
| Docs site only | `docs-update-{description}` | `docs-update-command-guide` |

**Branch hierarchy:** Chained branches must branch from their parent, not main. Verify parent is fully committed before creating a child branch.

## Version File Sync Policy

Before any push, these 3 files must be in sync:
- `package.json` (root)
- `.claude-plugin/plugin.json`
- `.claude-plugin/marketplace.json` (`plugins[0].version`)

The MCP server (`mcp-server/package.json`) is versioned independently.

## Commit Format

```
type(scope): subject
[blank line]
Body with context. Closes #N.
[blank line]
Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```

Types: `feat` | `fix` | `docs` | `refactor` | `chore` | `perf` | `style` | `test` | `build` | `ci` | `revert`

## Mandatory Plan Protocol

Every implementation plan must include:
1. Create branch from correct parent
2. Create `knowledge/plans/{filename}.md` (copy from `~/.claude/plans/` — gitignored, never committed)
3. Implementation steps
4. Commit, push, PR, merge

Plans are LOCAL-ONLY and gitignored. Never attempt to commit plan files.

## Docs Update Policy

- Docs-only branches: `docs-update-{description}`; publish one post to `docs-updates/YYYY-MM-DD-{slug}.mdx`; NOT to `CHANGELOG.md`
- Code releases: use `v{ver}-{description}`; update `CHANGELOG.md`
- Update affected reference and guide pages in `docs/` whenever behavior changes
