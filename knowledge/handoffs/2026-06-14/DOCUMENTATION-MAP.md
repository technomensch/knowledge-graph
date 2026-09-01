# Documentation Map (2026-06-14)

**Plugin version:** 0.5.10.8 | **MCP server:** 0.3.11

---

## Quick Reference

| Component | Count | Purpose |
|---|---|---|
| Commands (`commands/`) | 25 | Slash commands (`/kmgraph:...`) |
| Agents (`agents/`) | 11 | Subagent definitions |
| ADRs (`knowledge/decisions/`) | 54 | Architecture decisions |
| Open ENHs (`knowledge/enhancements/`) | 25 | Enhancement specs (ENH-NNN) |
| User Docs (`docs/`) | MkDocs Material site | Reference, guides, pillars |

---

## commands/ — Slash Commands (PROTECTED)

Do NOT modify without explicit user permission.

Key commands:
- `extract-chat.md` — Export chat history; **Step 0 KG guard added v0.5.10.8**
- `capture-lesson.md` — Document a lesson learned
- `session-summary.md` — Create session summary
- `create-adr.md` — Create Architecture Decision Record
- `recall.md` — Search knowledge graph
- `sync-all.md` — Full KG sync pipeline
- `update-graph.md` — Extract insights from lessons
- `handoff.md` — Create handoff package
- `switch.md` — Switch active KG
- `init.md` — Initialize / upgrade KG

---

## skills/ — Auto-Triggered Context Providers

| Skill | Trigger | Purpose |
|---|---|---|
| lesson-capture | Bug solved, breakthrough | Suggests `/kmgraph:capture-lesson` |
| kg-recall | History/past decision question | Guides KG search |
| session-wrap | Session end, context limit | Prompts `/kmgraph:session-summary` |
| adr-guide | Architecture decision | Suggests `/kmgraph:create-adr` |
| gov-execute-plan | Plan execution | Enforces zero-deviation protocol |

---

## agents/ — Subagents (11)

Key agents:
- `knowledge-extractor.md` — Read-only large-file parsing (approval-gated writes)
- `session-documenter.md` — Git archaeology for summaries (approval-gated)
- `lesson-capture-agent.md` — Captures lessons; has **Phase 0 KG CWD guard**
- `session-summary-agent.md` — Session summaries; has Phase 0 KG CWD guard
- `recall-agent.md` — Multi-source knowledge search
- `sync-all-agent.md` — Full sync pipeline orchestration

---

## knowledge/decisions/ — ADRs (54)

Key recent ADRs:
- **ADR-052** — Docs-impact-scan user-facing guide
- **ADR-051** — Session-summary handoff asymmetric coupling
- **ADR-050** — Pre-push composite gate + inline recommendation gate
- **ADR-043** — PreToolUse hook injection (superpowers rule enforcement)
- **ADR-040** — Template directory disambiguation (governs ENH-022)
- **ADR-029** — Plan file location in knowledge graph
- **ADR-019** — Write guard design (amended v0.5.10.8: Phase 2 confirmed shipped)
- **ADR-001** — Centralized multi-KG configuration

---

## knowledge/enhancements/ — Open ENHs

| ENH | Status | Target | Description |
|---|---|---|---|
| ENH-013 | deferred | v0.5.11 | Rename `kg-recall` skill (autocomplete conflict) |
| ENH-018 | deferred | v0.6.x | Rules file H2 structure hardening |
| ENH-019 | deferred | v0.6.0 | `kmg-` prefix normalization (**defines v0.6.0**) |
| ENH-022 | proposed | delivered v0.5.10.7 | Template dir disambiguation |
| ENH-023 | proposed | v0.6.x | Extend pre-skill-rules-inject to marketplace skills |
| ENH-025 | proposed | v0.6.x | Cross-platform knowledge extractor |
| ENH-026 | proposed | post-v0.5.10.8 | Write guard: sync-all/update-graph + Python-layer |

---

## Key Root Files

| File | Purpose | Version |
|---|---|---|
| `package.json` | Plugin version + deps | 0.5.10.8 |
| `.claude-plugin/plugin.json` | Plugin manifest | 0.5.10.8 |
| `mcp-server/package.json` | MCP server (independent) | 0.3.11 |
| `README.md` | Project overview | updated 0.5.10.8 |
| `CHANGELOG.md` | Release history | updated 0.5.10.8 |
| `CLAUDE.md` | Project conventions + rules | current |
| `hooks/hooks.json` | SessionStart automation | current |
| `ROADMAP.md` | Version history + planned features | current |

---

## Code Protection Rules

⚠️ Require explicit user permission:
- **commands/** — LLM execution prompts
- **core/default-templates/** — Frozen distribution scaffolds (renamed from `core/templates/` in v0.5.10.7)

No permission needed: docs, tests, examples, knowledge/, skills/, agents/
