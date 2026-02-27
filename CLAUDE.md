# KMGraph Knowledge Management

A knowledge management tool: Claude Code extension + cross-platform MCP server.

## Quick Reference

- **Claude Code namespace:** `kmgraph`
- **Slash commands:** `/kmgraph:<command>`
- **MCP tools:** `kg_*` (cross-platform)

## Architecture

- `commands/` — Claude Code slash commands (PROTECTED: do not modify)
- `skills/` — Auto-invoked context providers
- `agents/` — Subagent definitions
- `hooks/hooks.json` — SessionStart automation
- `mcp-server/` — Cross-platform MCP server (TypeScript/Node.js)
- `core/` — Platform-agnostic templates, docs, examples (PROTECTED: do not modify)
- `docs/` — MkDocs Material documentation site

## Skills

Auto-triggered context providers that enhance agent behavior:

- **lesson-capture** — Suggests `/kmgraph:capture-lesson` when bugs are solved or breakthroughs made
- **kg-recall** — Guides knowledge graph search when asking about project history or past decisions
- **session-wrap** — Prompts `/kmgraph:session-summary` when stopping work or approaching context limits
- **adr-guide** — Suggests `/kmgraph:create-adr` when making architecture decisions
- **gov-execute-plan** — Enforces zero-deviation plan execution protocol with strict constraints

## Subagents

Heavy-lift task handlers that keep main context clean:

- **knowledge-extractor** — Read-only parsing of large files for KG extraction (approval-gated writes)
- **session-documenter** — Git archaeology for session summaries (approval-gated commits/pushes)

## Code Protection Rules

⚠️ NEVER modify `commands/` or `core/templates/` without explicit user permission.

## Version Naming Conventions

| Change Type | Branch Format | Example |
|---|---|---|
| Feature development | `v{ver}-{description}` | `v0.0.9.1-alpha-claude-md` |
| Bug fix | `v{ver}-fix-{description}` | `v0.0.8.7.3-alpha-fix-installer-page` |
| Docs-only update | `v{ver}-docs-update-{description}` | `v0.0.9-docs-update-command-guide` |

## Key Workflows

- **Plans:** Create in `docs/plans/` BEFORE any code changes
- **Branches:** Push to origin, await user review (never auto-merge)
- **Versions:** Sync package.json + plugin.json before pushing (mcp-server independent)
- **Docs updates:** Update COMMAND-GUIDE, CHEAT-SHEET, GETTING-STARTED when behavior changes

## Commit Format (Conventional)

Types: `feat` | `fix` | `docs` | `refactor` | `chore` | `perf` | `style` | `test` | `build` | `ci` | `revert`

Format: `type(scope): subject` — include `Closes #N` in body. Scope auto-detected from changed file paths.

## Branch Hierarchy

Chained branches must branch from their parent branch, not main (e.g., `v0.0.10.2` branches from `v0.0.10.1`).

Verify parent branch is fully committed before creating child branch.

## Quick Commands

```bash
# Version check across all version files
grep -r "version" package.json .claude-plugin/plugin.json mcp-server/package.json

# Check for stale /knowledge: references
grep -r "/knowledge:" scripts/

# Build & verify docs
mkdocs build
```

## Active Work

Check `git branch` and `docs/plans/` for current work in progress.
