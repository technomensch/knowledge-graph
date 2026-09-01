# Documentation Map

**Last Updated:** 2026-08-04

---

## Quick Reference

| Component | Count | Purpose |
|---|---|---|
| Commands (`commands/`) | 24 | Slash commands (/kmgraph:...) |
| Skills (`skills/`) | 16 | Auto-triggered context providers |
| Agents (`agents/`) | 11 | Subagent definitions |
| ADRs (`knowledge/decisions/`) | 70 | Architecture decisions |
| Lessons (`knowledge/lessons-learned/`) | 65 | Lessons by category |
| User Docs (`docs/`) | MkDocs Material site | Public documentation |

---

## Directory Structure

### commands/ — Slash Commands
PROTECTED: Do NOT modify without explicit permission.

24 command files under `commands/*.md`, one per `/kmgraph:<command>` slash command (e.g. `kmg-capture-lesson.md`, `kmg-create-adr.md`, `kmg-handoff.md`, `kmg-list.md`, `kmg-status.md`).

### skills/ — Auto-Triggered Providers

| Skill | Trigger | Purpose |
|---|---|---|
| kmg-adr-guide | Architecture decision made | Suggests /kmgraph:kmg-create-adr |
| kmg-auto-recall | History question, past decision | Guides knowledge graph search |
| kmg-brainstorm-recall | Before any recommendation | Ensures KG consulted first |
| kmg-capture-router | "capture that" / "remember that" | Routes to correct capture destination |
| kmg-doc-update-router | Explicit doc-update request | Routes to correct doc command |
| kmg-docs-impact-scan | Pre-ship signal | Scans for docs affected by code changes |
| kmg-execute-plan | "execute plan" or plan invocation | Enforces zero-deviation execution protocol |
| kmg-knowledge-graph-usage | KG orientation needed | Explains KG architecture |
| kmg-lesson-capture | Bug solved, breakthrough made | Suggests /kmgraph:kmg-capture-lesson |
| kmg-paperwork-audit | Pre-ship signal | Checks issue/enhancement status + session-summary currency |
| kmg-plan-gate | After superpowers plan/execute skills | Enforces user approval gates |
| kmg-rules-capture | Implicit behavioral correction | Routes correction to correct rules file |
| kmg-session-wrap | Session end, context limit | Prompts /kmgraph:kmg-session-summary |
| kmg-sidebar-update | Docs file moved/renamed | Keeps sidebar nav in sync |
| kmg-stuck-work-escalation | Work stuck past Plan Protocol threshold | Escalates before switching tactics |
| kmg-update-profile | Profile update request | Routes changes to all three profile files |

### agents/ — Subagents

| Agent | Purpose |
|---|---|
| create-adr-agent | ADR drafting workflow |
| knowledge-extractor | Parse large files for KG extraction (read-only, approval-gated writes) |
| knowledge-reviewer | Review captured knowledge for quality |
| lesson-capture-agent | Lesson capture workflow |
| mcp-setup-agent | MCP server setup/configuration |
| platform-sync-agent | Cross-platform sync tasks |
| recall-agent | KG search/recall workflow (uses kg_resolve per ADR-067) |
| rules-capture-agent | Behavioral-correction routing |
| session-documenter | Git archaeology for session summaries (approval-gated commits/pushes) |
| session-summary-agent | Session summary generation |
| sync-all-agent | Full sync across platforms |

### knowledge/decisions/ — Architecture Decision Records
Directory: `knowledge/decisions/`
Current ADRs: 70

Status distribution: 52 Accepted, 5 Proposed (includes ADR-060, ADR-067 — see note below), 2 Superseded, 1 "Ready for implementation" (ADR-067-implementation-spec), plus minor casing variants ("accepted", "Accepted" quoted).

Most recent ADRs:

| ADR | Status |
|---|---|
| ADR-068 — Lightweight vs full workflow rule, piloted command completion check | Accepted |
| ADR-067 — Mutable .active switch vs context-derived KG resolution | **Proposed** (see note) |
| ADR-067-implementation-spec | Ready for implementation |
| ADR-066 — KG content storage location for global/cowork modes | Accepted |
| ADR-065 — Roadmap/changelog duplication, changelog is source of truth | Accepted |
| ADR-064 — Shared module pattern for slash command deduplication | Accepted |

**Open item:** ADR-067's frontmatter still reads `status: Proposed`, but the decision is fully implemented and merged to `main` (branch `v0.7.0-adr-067-c1` → PR #212 → `v0.7.0` → `main`). The repo's dominant convention for a completed decision is `status: Accepted` (52 of 70 ADRs use this exact value). This file was **not** updated in the 2026-08-04 session — flagged here as a next action, not yet done.

### knowledge/lessons-learned/ — Knowledge Base by Category

| Category | Count | Latest |
|---|---|---|
| process | 24 | Lessons_Learned_Process_Migration_Must_Grep_Prompt_Layer_Not_Just_Server_Layer.md |
| patterns | 19 | Lessons_Learned_Two_Level_Identity_Rules_Hierarchy.md |
| architecture | 10 | Lessons_Learned_Update_Notifications_NonPlugin_Users.md |
| debugging | 10 | namespace-visibility-shadow-command-failure.md |

---

## Key Files

| File | Purpose | Last Updated |
|---|---|---|
| README.md | Project overview | 2026-08-04 |
| CLAUDE.md | Project conventions and rules | 2026-06-16 |
| package.json | Version, dependencies | v0.7.0 |
| mcp-server/package.json | MCP server version | v0.7.0 (independently versioned, currently in sync) |
| .claude/settings.json | Claude Code configuration | 2026-05-25 |
| hooks/hooks.json | SessionStart + 5 other automation hooks | SessionStart, PostToolUse, PreToolUse, Stop, UserPromptSubmit, Notification |

---

## Code Protection Rules

⚠️ These directories require explicit user permission before modification:

- **commands/** — LLM execution prompts; changes break slash command functionality
- **core/** (including `core/templates/`) — Structured formats with YAML frontmatter for parsing

Allowed modifications without permission:
- Documentation files (*.md)
- Test files (tests/, test-*.js)
- Examples and guides
- Template comments and field glossaries

---

## Version Consistency

**Current versions (all in sync):**
- package.json: v0.7.0
- .claude-plugin/plugin.json: v0.7.0
- mcp-server/package.json: v0.7.0

Installed plugin (from marketplace) confirmed updated `0.6.20` → `0.7.0` on disk as of this session; a Claude Code restart is pending to pick it up in the running session.

**Note:** mcp-server is versioned independently in general — verify alignment before releasing even though it happens to match today.

---

## Open Items Carried From 2026-08-04 Session

See `knowledge/sessions/2026-08-04-main.md` for full narrative. Two concrete follow-ups not yet actioned:

1. Flip `knowledge/decisions/ADR-067-mutable-active-switch-vs-context-derived-kg-resolution.md` frontmatter `status: Proposed` → `Accepted` (or this project's exact equivalent for "implemented and merged") — the decision is fully implemented and merged into `main`.
2. GitHub issue #187 (tracking ENH-051, the `cli.ts` / `kg_config_init` path-resolution dedup) is still open despite the underlying fix having merged as part of the ADR-067 branch. Confirm the mapping is correct, then close the issue (or leave open with a comment if the mapping needs adjustment) — not done in this session.
