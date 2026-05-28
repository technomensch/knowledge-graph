# Documentation Map

**Last Updated:** 2026-05-27
**Current Version:** v0.5.8

---

## Quick Reference

| Component | Count | Purpose |
|---|---|---|
| Commands (`commands/`) | 25 | Slash commands (/kmgraph:...) |
| Skills (`skills/`) | 14 | Auto-triggered context providers |
| Agents (`agents/`) | 2 | Subagent definitions for heavy-lift tasks |
| ADRs (`knowledge/decisions/`) | 48 | Architecture decisions |
| ENHs (`knowledge/enhancements/`) | 18 | Enhancement tracking |
| Lessons (`knowledge/lessons-learned/`) | ~35 | Lessons by category |
| Sessions (`knowledge/sessions/`) | ongoing | Daily session summaries |

---

## Commands (`commands/`) — PROTECTED

Do NOT modify without explicit user permission.

| Command | Purpose |
|---|---|
| `init` | Knowledge graph initialization wizard |
| `init-personal-kg` | Personal cross-project KG setup |
| `capture-lesson` | Document lessons learned |
| `create-adr` | Create Architecture Decision Records |
| `create-doc` | Create KG documentation files |
| `update-doc` | Update existing documentation |
| `recall` | Search across knowledge graph |
| `session-summary` | Generate session summary |
| `start-issue-tracking` | Initialize issue/ENH tracking with docs + branch |
| `update-issue-plan` | Sync ROADMAP/CHANGELOG for an issue |
| `sync-all` | Full knowledge sync pipeline |
| `update-graph` | Extract insights and update KG |
| `handoff` | Generate handoff package |
| `status` | Display active KG status |
| `list` | List KG contents |
| `switch` | Change active KG |
| `add-category` | Add category to active KG |
| `link-issue` | Bidirectional issue ↔ KG linking |
| `meta-issue` | Escalate recurring issues to meta-issue |
| `extract-chat` | Extract Claude/Gemini chat history |
| `setup-platform` | Configure platform-specific files |
| `migration` | Migrate KG structure |
| `check-sensitive` | Check for sensitive content before publishing |
| `config-sanitization` | Clean config files for distribution |
| `help` | Command reference |

---

## Skills (`skills/`) — Auto-Triggered

| Skill | Trigger | Purpose |
|---|---|---|
| `adr-guide` | Architecture decision detected | Suggests `/kmgraph:create-adr` |
| `capture-router` | Capture request | Routes to lesson/ADR/session based on content |
| `doc-update-router` | Doc update request | Routes to correct update command |
| `docs-impact-scan` | Plan creation | Scans for affected user-facing docs |
| `gov-execute-plan` | "execute plan" / plan file reference | Enforces 8-step zero-deviation execution (also in `~/.kmgraph/governance-rules.md`) |
| `gov-plan-gate` | Plan gate events | Stops unauthorized plan execution |
| `kg-recall` | History/past-decision question | Guides knowledge graph search |
| `knowledge-graph-usage` | KG operation request | Usage guidance |
| `lesson-capture` | Bug solved / breakthrough | Suggests `/kmgraph:capture-lesson` |
| `rules-capture` | Behavioral correction / new rule | Routes rule to correct profile file |
| `session-wrap` | Session end / context limit | Prompts `/kmgraph:session-summary` |
| `sidebar-update` | Docs sidebar change needed | Updates Docusaurus sidebar |
| `stuck-work-escalation` | 3+ failed attempts on same task | Escalates to powerful-tier |
| `update-profile` | Profile update request | Updates me.md / rules.md / triggers.md |

---

## Agents (`agents/`)

| Agent | Purpose | Authorization |
|---|---|---|
| `knowledge-extractor` | Parse large files for KG extraction | Read-only (approval-gated writes) |
| `session-documenter` | Git archaeology for session summaries | Approval-gated commits/pushes |

---

## Key ADRs (most recent / most referenced)

| ADR | Decision |
|---|---|
| ADR-041 | Tier abstraction label system (fast/standard/powerful-tier) |
| ADR-048 | Governance capture routing |
| ADR-047 | Profile auto-load: routing layer only |
| ADR-045 | Update-profile: skill not command |
| ADR-042 | ADR implements-commit reference mandatory |
| ADR-038 | Model selection rule for KG tasks |
| ADR-035 | Stuck-work escalation |
| ADR-033 | triggers.md as platform-agnostic rule-timing companion |
| ADR-032 | Platform-specific directives in platform config files |
| ADR-028 | me.md + rules.md as platform-agnostic source of truth |
| ADR-017 | Four-layer architecture: thin commands |
| ADR-002 | Commands vs. skills architecture |

---

## Profile Files (user-level, not in repo)

| File | Purpose |
|---|---|
| `~/.kmgraph/me.md` | Identity, platform tier_maps (Claude + Gemini), working style |
| `~/.kmgraph/rules.md` | Cross-project enforcement rules |
| `~/.kmgraph/plan-rules.md` | Plan protocol: branch placement, parallelism, validation |
| `~/.kmgraph/governance-rules.md` | Architectural proposals, spec/plan sync, strict execution protocol |
| `~/.kmgraph/triggers.md` | When each rule fires |
| `~/.claude/CLAUDE.md` | Lightweight pointer to profile files + Claude-specific notes |
| `~/.gemini/GEMINI.md` | Lightweight pointer to profile files + Gemini-specific notes |

---

## Key Files

| File | Purpose |
|---|---|
| `CLAUDE.md` | Project conventions (read order, tool prefs, active work) |
| `ROADMAP.md` | Feature backlog and version planning |
| `CHANGELOG.md` | Released version history |
| `package.json` | Plugin version and dependencies |
| `mcp-server/package.json` | MCP server version (independent) |
| `.claude-plugin/plugin.json` | Plugin manifest |
| `hooks/hooks.json` | SessionStart automation hooks |
| `knowledge/rules.md` | Project-level enforcement rules |
| `knowledge/me.md` | Project-level identity (gitignored) |

---

## Code Protection Rules

**PROTECTED (explicit permission required):**
- `commands/` — LLM execution prompts; changes break slash command behavior
- `core/templates/` — YAML frontmatter structures; changes break parsing

**No permission needed:**
- `*.md` documentation files
- `tests/` and test scripts
- Skills and agents (but coordinate with user)
- Examples and guides
