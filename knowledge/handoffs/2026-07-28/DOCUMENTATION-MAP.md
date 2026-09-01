# Documentation Map

**Last Updated:** 2026-07-28

---

## Quick Reference

| Component | Count | Purpose |
|---|---|---|
| Commands (`commands/`) | 25 | Slash commands (`/kmgraph:...`) |
| Skills (`skills/`) | 16 | Auto-triggered context providers |
| Agents (`agents/`) | 11 | Subagent definitions |
| ADRs (`knowledge/decisions/`) | 68 | Architecture decisions |
| Lessons (`knowledge/lessons-learned/`) | 65 | Lessons by category |
| Hooks (`hooks/hooks.json`) | 6 | SessionStart / lifecycle automation |

---

## Directory Structure

### `commands/` — Slash Commands
🔒 **PROTECTED** — do NOT modify without explicit permission.

25 commands under the `kmg-` prefix (e.g. `kmg-init`, `kmg-list`, `kmg-switch`, `kmg-extract-chat`, `kmg-handoff`, `kmg-start-issue-tracking`). See `docs/reference/command-guide.md` and `docs/reference/commands.md` for the full user-facing reference.

### `skills/` — Auto-Triggered Providers

16 skills, including (not exhaustive — see `skills/*/SKILL.md` for the full set):
- `kmg-capture-router` — routes "capture that"/"remember that" to memory/lesson/ADR destinations (does NOT currently trigger on "future enhancement" phrasing — tracked as **ENH-055**)
- `kmg-lesson-capture` — suggests lesson capture after bugs/breakthroughs
- `kmg-auto-recall` — guides KG search on history questions
- `kmg-adr-guide` — suggests ADR creation on architecture decisions
- `kmg-docs-impact-scan` — pre-push doc-drift scan
- `kmg-paperwork-audit` — pre-PR internal-KG-consistency check (ENH-052)

### `agents/` — Subagents

11 agents, including `knowledge-extractor` (read-only, approval-gated writes), `session-documenter` (git archaeology, approval-gated commits/pushes), `rules-capture-agent`, `create-adr-agent`.

### `knowledge/decisions/` — Architecture Decision Records

68 ADRs. Most recently active: **ADR-067** (mutable `.active` switch vs. context-derived KG resolution — currently the primary in-progress design work, see START-HERE.md). Recent status sample:

| ADR | Status |
|---|---|
| ADR-060 | Proposed |
| ADR-061–066 | Accepted |
| ADR-067 | Proposed (in-progress brainstorm, see START-HERE.md) |

### `knowledge/lessons-learned/` — Knowledge Base by Category

65 lessons across architecture/process/patterns/debugging categories. Index was found stale this session (declared 9, actual 65) and has been corrected — see `knowledge/lessons-learned/README.md`.

### `knowledge/issues/` and `knowledge/enhancements/`

28 numbered issues, ~55 enhancements (ENH-001 through ENH-055 as of this snapshot, some withdrawn/superseded). Most recent: **issue-29** (chat-extraction cross-project bleed, GitHub #197, draft PR #198), **ENH-053/054/055** (topic-KG descope, audit-log descope, capture-router vocabulary gap — all captured lightweight, not implemented).

---

## Key Files

| File | Purpose |
|---|---|
| `README.md` | Project overview |
| `CLAUDE.md` | Project conventions and rules (this repo's platform config for Claude Code) |
| `~/.kmgraph/rules.md`, `~/.kmgraph/me.md` | Personal cross-project preferences (NOT in this repo) |
| `package.json`, `.claude-plugin/plugin.json`, `mcp-server/package.json` | All at **v0.6.20** as of this snapshot — kept in sync |
| `.codex-plugin/mcp.json` | Codex MCP server registration — has a known `cwd` resolution bug (see ADR-067) |
| `hooks/hooks.json` | 6 SessionStart/lifecycle hooks |

---

## Code Protection Rules

⚠️ These directories require explicit user permission before modification:

- **`commands/`** — LLM execution prompts; changes break slash command functionality
- **`core/`** (templates, examples) — structured formats with YAML frontmatter for parsing

Allowed without permission: documentation files, tests, examples, template comments.

---

## Version Consistency

**Current versions (all in sync as of this snapshot):**
- `package.json`: v0.6.20
- `.claude-plugin/plugin.json`: v0.6.20
- `mcp-server/package.json`: v0.6.20

**⚠️ Known live issue relevant to this:** at least 5 running MCP server processes on this machine are executing **stale plugin-cache code (v0.6.16)**, discovered during the ADR-067 brainstorm (see § Fable Review Findings item 9 in ADR-067) — a plugin-cache refresh gap, not a version-file mismatch. Related to the already-tracked **issue-28** (dev-loop gap between rebuilt `mcp-server/dist/` and live tool calls).
