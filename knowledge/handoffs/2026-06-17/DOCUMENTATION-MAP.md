# Documentation Map

**Last Updated:** 2026-06-17
**Version:** 0.6.0

---

## Quick Reference

| Component | Count | Purpose |
|---|---|---|
| Commands (`commands/`) | 25 | Slash commands (/kmgraph:...) |
| Skills (`skills/`) | 15 | Auto-triggered context providers |
| Agents (`agents/`) | 11 | Subagent definitions |
| ADRs (`knowledge/decisions/`) | 55 | Architecture decisions |
| Lessons (`knowledge/lessons-learned/`) | 54 | Lessons by category |
| User Docs (`docs/`) | — | Docusaurus documentation site |

---

## commands/ — Slash Commands
⚠️ PROTECTED: Do NOT modify without explicit permission.

| Command | Lines | Purpose |
|---|---|---|
| kmg-add-category | 71 | Add category to knowledge graph |
| kmg-capture-lesson | 176 | Document lessons learned |
| kmg-check-sensitive | 106 | Scan for sensitive data |
| kmg-config-sanitization | 96 | Setup sanitization hooks |
| kmg-create-adr | 502 | Create architecture decision record |
| kmg-create-doc | 504 | Create documentation |
| kmg-extract-chat | 584 | Extract chat history from Claude/Gemini/Codex |
| kmg-handoff | 474 | Create handoff package |
| kmg-help | 314 | Knowledge graph help |
| kmg-init | 1757 | Initialize knowledge graph |
| kmg-init-personal-kg | 357 | Initialize personal KG |
| kmg-link-issue | 162 | Link lesson to GitHub issue |
| kmg-list | 272 | List all knowledge graphs |
| kmg-meta-issue | 483 | Meta-issue tracking |
| kmg-migration | 432 | Migration workflow |
| kmg-recall | 93 | Knowledge recall |
| kmg-session-summary | 153 | Document session summary |
| kmg-setup-platform | 205 | Configure AI platforms |
| kmg-start-issue-tracking | 683 | Start issue tracking |
| kmg-status | 215 | Knowledge graph status dashboard |
| kmg-switch | 230 | Change active knowledge graph |
| kmg-sync-all | 172 | Knowledge sync all |
| kmg-update-doc | 570 | Update documentation |
| kmg-update-graph | 150 | Update knowledge graph |
| kmg-update-issue-plan | 249 | Governance synchronization |

---

## skills/ — Auto-Triggered Context Providers

| Skill | Trigger / Purpose |
|---|---|
| kmg-lesson-capture | Bug solved or breakthrough — suggests `/kmgraph:kmg-capture-lesson` |
| kmg-auto-recall | History or past decision questions — guides knowledge graph search |
| kmg-session-wrap | Session end / context limit — prompts `/kmgraph:kmg-session-summary` |
| kmg-adr-guide | Architecture decisions — suggests `/kmgraph:kmg-create-adr` |
| kmg-execute-plan | Plan execution — enforces zero-deviation protocol |
| kmg-rules-capture | Behavioral correction — routes to correct rules file |
| kmg-capture-router | Capture routing — selects right capture tier |
| kmg-plan-gate | Pre-implementation — enforces plan-before-code |
| kmg-doc-update-router | Doc update routing — selects right doc update path |
| kmg-docs-impact-scan | Pre-push — scans for doc impact of code changes |
| kmg-brainstorm-recall | Brainstorming — searches KG for prior art |
| kmg-sidebar-update | Docs sidebar — guides Docusaurus sidebar updates |
| kmg-stuck-work-escalation | Stuck work — escalation patterns |
| kmg-update-profile | Profile updates — routes me.md/rules.md updates |
| kmg-knowledge-graph-usage | KG usage — general usage context |

---

## agents/ — Subagents

| Agent | Purpose | Mode |
|---|---|---|
| knowledge-extractor | Parse large files for KG extraction | Read-only (approval-gated writes) |
| session-documenter | Git archaeology for session summaries | Approval-gated commits/pushes |
| create-adr-agent | ADR creation with research | Approval-gated |
| lesson-capture-agent | Lesson capture pipeline | Approval-gated |
| mcp-setup-agent | MCP server setup | Approval-gated |
| platform-sync-agent | Cross-platform sync | Approval-gated |
| recall-agent | Deep recall search | Read-only |
| rules-capture-agent | Rules capture routing | Approval-gated |
| session-summary-agent | Session summary generation | Approval-gated |
| sync-all-agent | Full sync pipeline | Approval-gated |
| kmg-handoff (session-documenter variant) | Handoff package generation | Approval-gated |

---

## knowledge/decisions/ — Architecture Decision Records

55 ADRs total. Most recent:

| ADR | Status | Title |
|---|---|---|
| ADR-053 | Accepted | `kmg-` Prefix as Canonical Cross-Platform Skill and Agent Naming |
| ADR-054 | Accepted | Document Cache-Clear as Official Upgrade Path for Claude Code |
| ADR-052 | — | docs-impact-scan User-Facing Guide Page |
| ADR-051 | — | Session Summary / Handoff Asymmetric Coupling |
| ADR-050 | — | Pre-Push Composite Gate + Inline Recommendation Gate |
| ADR-049 | — | Review Audit Protocol — Post-Plan/Pre-Push Review Governance |
| ADR-048 | — | Governance Capture Routing |

---

## knowledge/lessons-learned/ — Knowledge Base by Category

| Category | Count |
|---|---|
| process | 18 |
| patterns | 17 |
| architecture | 9 |
| debugging | 8 |
| **Total** | **54** |

---

## Key Files

| File | Purpose |
|---|---|
| README.md | Project overview |
| CLAUDE.md | Project conventions and rules |
| ~/.claude/CLAUDE.md | Personal cross-project preferences |
| package.json | Plugin version (0.6.0) |
| mcp-server/package.json | MCP server version (0.6.0, independent) |
| hooks/hooks.json | SessionStart + Stop automation |
| .codex-plugin/hooks/hooks.json | Codex-specific hook configuration |
| mcp-server/src/tools/upgrade.ts | KG upgrade inspection/apply logic |
| scripts/session-end-prompt.sh | Stop hook — platform-aware JSON output |

---

## Code Protection Rules

⚠️ These directories require explicit user permission before modification:
- **commands/** — LLM execution prompts; changes break slash command functionality
- **core/default-templates/** — Structured YAML formats used during init/upgrade

✅ Allowed without permission: docs, tests, examples, template comments.
