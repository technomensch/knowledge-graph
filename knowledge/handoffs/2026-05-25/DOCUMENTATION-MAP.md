# Documentation Map — 2026-05-25

---

## Quick Reference

| Component | Count | Purpose |
|---|---|---|
| Commands (`commands/`) | 25 | Slash commands (`/kmgraph:...`) |
| Skills (`skills/`) | 14 | Auto-triggered context providers |
| Agents (`agents/`) | 11 | Subagent definitions |
| ADRs (`decisions/`) | ~50 | Architecture decisions |
| Lessons (`lessons-learned/`) | ~46 | Lessons by category |
| Sessions (`knowledge/sessions/`) | ~29 | Session summaries |
| MCP server (`mcp-server/`) | — | Cross-platform TypeScript/Node.js server |

---

## Commands — `/kmgraph:*`

⚠️ PROTECTED: do NOT modify without explicit permission.

| Command | Purpose |
|---|---|
| `add-category` | Add a new KG category |
| `capture-lesson` | Document a lesson learned |
| `check-sensitive` | Audit for sensitive content |
| `config-sanitization` | Clean KG config |
| `create-adr` | Create Architecture Decision Record |
| `create-doc` | Create documentation entry |
| `extract-chat` | Extract chat history to markdown |
| `handoff` | Create handoff package |
| `help` | Show available commands |
| `init` | Initialize KG in a project |
| `init-personal-kg` | Initialize personal cross-project KG |
| `link-issue` | Link GitHub issue to KG entry |
| `list` | List KG entries |
| `meta-issue` | Create meta-issue tracking |
| `migration` | Run KG migrations |
| `recall` | Search KG memory systems |
| `session-summary` | Document current session |
| `setup-platform` | Configure a platform file (GEMINI.md, etc.) |
| `start-issue-tracking` | Begin issue tracking workflow |
| `status` | Show active KG info, counts, staleness |
| `switch` | Switch active KG |
| `sync-all` | Full KG sync pipeline |
| `update-doc` | Update documentation entry |
| `update-graph` | Extract insights from lessons to KG |
| `update-issue-plan` | Update issue-linked plan |

---

## Skills — Auto-Triggered Providers

| Skill | Trigger | Purpose |
|---|---|---|
| `adr-guide` | Architecture decision being made | Suggests `/kmgraph:create-adr` |
| `capture-router` | Capture-type decisions | Routes to correct capture target |
| `doc-update-router` | Documentation changes | Routes doc updates to correct command |
| `docs-impact-scan` | Code changes | Scans for docs that need updating |
| `gov-execute-plan` | "execute plan" / active `docs/plans/*.md` | Enforces zero-deviation plan execution |
| `gov-plan-gate` | Pre-promotion checks | Blocks plan promotion without approval |
| `kg-recall` | History/past-decision questions | Guides KG search |
| `knowledge-graph-usage` | KG usage questions | Context on KG patterns |
| `lesson-capture` | Bug solved, breakthrough | Suggests `/kmgraph:capture-lesson` |
| `rules-capture` | Behavioral correction from user | Routes to `knowledge/rules.md` or `~/.kmgraph/rules.md` |
| `session-wrap` | Session end / context limit | Prompts `/kmgraph:session-summary` |
| `sidebar-update` | Docusaurus sidebar changes | Guides sidebar.js updates |
| `stuck-work-escalation` | Repeated failures / circular work | Escalation protocol |
| `update-profile` | Profile file updates | Routes me.md / rules.md writes |

---

## Agents — Subagents

| Agent | Purpose | Mode |
|---|---|---|
| `create-adr-agent` | Create ADR via interactive wizard | Approval-gated |
| `knowledge-extractor` | Parse large files for KG extraction | Read-only; approval-gated writes |
| `knowledge-reviewer` | Review KG entries for quality | Read-only |
| `lesson-capture-agent` | Capture lessons with git metadata | Approval-gated |
| `mcp-setup-agent` | Configure MCP server registration | Approval-gated |
| `platform-sync-agent` | Sync platform config files | Approval-gated |
| `recall-agent` | Execute KG search + format results | Read-only |
| `rules-capture-agent` | Capture behavioral rules to profile files | Approval-gated |
| `session-documenter` | Git archaeology + session summary | Approval-gated commits |
| `session-summary-agent` | Lightweight session documentation | Approval-gated |
| `sync-all-agent` | Full sync pipeline execution | Approval-gated |

---

## Key Files

| File | Purpose | Version |
|---|---|---|
| `package.json` | Plugin version, dependencies | v0.5.8 |
| `.claude-plugin/plugin.json` | Claude Code marketplace manifest | v0.5.8 |
| `mcp-server/package.json` | MCP server (independent versioning) | v0.3.10 |
| `CLAUDE.md` | Project conventions, protection rules | Current |
| `hooks/hooks.json` | SessionStart automation triggers | Current |
| `knowledge/rules.md` | Project-specific behavioral rules | Current |
| `knowledge/me.md` | Project-specific identity (gitignored) | Current |
| `~/.kmgraph/rules.md` | Cross-project behavioral rules | Current |
| `~/.kmgraph/me.md` | Cross-project identity | Current |
| `~/.claude/kg-config.json` | Active KG configuration | Current |

---

## Active Plans

| Plan | Location | Status |
|---|---|---|
| `v0.5.8-fix-plan-rules-injection.md` | `docs/plans/` + `~/.claude/plans/` | Complete — needs PR |
| `v0.6.0-multi-platform-expansion.md` | `docs/plans/` + `~/.claude/plans/` | Phase 1 in progress |

---

## Code Protection Rules

⚠️ Requires explicit user permission before modification:
- `commands/` — LLM execution prompts; changes break slash commands
- `core/templates/` — Structured YAML/markdown formats for parsing

Allowed without permission:
- `*.md` docs files
- `tests/`, test scripts
- Template comments and field glossaries
- `knowledge/`, `lessons-learned/`, `decisions/`

---

## Version Consistency

| File | Version |
|---|---|
| `package.json` | 0.5.8 |
| `.claude-plugin/plugin.json` | 0.5.8 |
| `mcp-server/package.json` | 0.3.10 (independent) |

Both plugin files must be in sync. MCP server tracks independently.
