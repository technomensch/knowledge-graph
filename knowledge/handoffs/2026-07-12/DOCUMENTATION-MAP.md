# Documentation Map

**Last Updated:** 2026-07-12

---

## Quick Reference

| Component | Count | Purpose |
|---|---|---|
| Commands (`commands/`) | 25 | Slash commands (/kmgraph:...) |
| Skills (`skills/`) | 16 | Auto-triggered context providers |
| Agents (`agents/`) | 11 | Subagent definitions |
| ADRs (`knowledge/decisions/`) | 66 (incl. ADR-template.md) | Architecture decisions |
| Lessons (`knowledge/lessons-learned/`) | 59 | Lessons by category |
| User Docs (`docs/`) | 121 | MkDocs Material site (.md/.mdx) |

---

## Directory Structure

### commands/ — Slash Commands
PROTECTED: Do NOT modify without explicit permission.

| Command | Lines | Purpose |
|---|---|---|
| kmg-init.md | 1827 | Initialize a new knowledge graph (execution rules driven) |
| kmg-start-issue-tracking.md | 683 | Start Issue Tracking |
| kmg-extract-chat.md | 660 | Extract chat history into KG-usable form |
| kmg-update-doc.md | 570 | Update Documentation |
| kmg-create-doc.md | 504 | Create Documentation |
| kmg-create-adr.md | 502 | Create Architecture Decision Record |
| kmg-meta-issue.md | 483 | Meta-Issue Tracking |
| kmg-handoff.md | 474 | Generate handoff package (this command) |
| kmg-migration.md | 432 | Migration workflow (execution rules driven) |
| kmg-init-personal-kg.md | 399 | Initialize personal (gitignored) KG |
| kmg-help.md | 314 | Knowledge Graph Help |
| kmg-list.md | 272 | List All Knowledge Graphs |
| kmg-update-issue-plan.md | 249 | Governance Synchronization Workflow |
| kmg-switch.md | 230 | Change Active Knowledge Graph |
| kmg-status.md | 215 | Knowledge Graph Status Dashboard |
| kmg-setup-platform.md | 205 | Configure AI Platforms for KMGraph |
| kmg-capture-lesson.md | 176 | Document Lessons Learned |
| kmg-sync-all.md | 172 | Knowledge Sync All |
| kmg-link-issue.md | 162 | Link Lesson to GitHub Issue |
| kmg-session-summary.md | 153 | Session summary generation |
| kmg-update-graph.md | 150 | Update knowledge graph |
| kmg-check-sensitive.md | 106 | Scan for Sensitive Data |
| kmg-config-sanitization.md | 96 | Setup Sanitization Hooks |
| kmg-recall.md | 93 | Knowledge Recall |
| kmg-add-category.md | 71 | Add Category to Knowledge Graph |

Total: 9,198 lines across 25 commands.

### skills/ — Auto-Triggered Providers

| Skill | Trigger | Purpose |
|---|---|---|
| kmg-lesson-capture | Bug solved, breakthrough made | Suggests /kmgraph:kmg-capture-lesson |
| kmg-auto-recall | History question, past decision | Guides knowledge graph search |
| kmg-session-wrap | Session end, context limit | Prompts /kmgraph:kmg-session-summary |
| kmg-adr-guide | Architecture decision | Suggests /kmgraph:kmg-create-adr |
| kmg-execute-plan | "execute plan" or plan files | Enforces zero-deviation protocol |
| kmg-brainstorm-recall | Before any recommendation | Ensures KG consulted first |
| kmg-capture-router | "capture that" / "remember that" | Routes to correct capture destination |
| kmg-doc-update-router | Explicit doc-update requests | Routes to correct doc-update command |
| kmg-docs-impact-scan | Pre-ship signals | Scans for docs affected by code changes |
| kmg-knowledge-graph-usage | KG orientation questions | Orients to KG system architecture |
| kmg-plan-gate | Post superpowers plan/execute | Enforces user approval gates |
| kmg-rules-capture | Implicit behavioral corrections | Routes corrections to rules files |
| kmg-sidebar-update | Docs file moved/renamed | Keeps sidebar navigation in sync |
| kmg-stuck-work-escalation | Stuck-work thresholds | Escalates per Plan Protocol |
| kmg-update-profile | Profile update requests | Routes changes to profile files |
| knowledge-graph-usage | (legacy/duplicate of kmg-knowledge-graph-usage) | KG orientation |

### agents/ — Subagents

| Agent | Purpose | Mode |
|---|---|---|
| knowledge-extractor | Parse large files for KG extraction | Read-only (approval-gated writes) |
| session-documenter | Git archaeology for summaries | Approval-gated commits/pushes |
| create-adr-agent | ADR creation workflow | Approval-gated writes |
| knowledge-reviewer | Review captured knowledge | Read-only |
| lesson-capture-agent | Lesson capture workflow | Approval-gated writes |
| mcp-setup-agent | MCP server setup | Approval-gated writes |
| platform-sync-agent | Sync config across AI platforms | Approval-gated writes |
| recall-agent | KG search/recall | Read-only |
| rules-capture-agent | Route behavioral corrections | Approval-gated writes |
| session-summary-agent | Session summary generation | Approval-gated writes |
| sync-all-agent | Full KG sync workflow | Approval-gated writes |

### knowledge/decisions/ — Architecture Decision Records
Directory: `knowledge/decisions/`
Current ADRs: 65 numbered ADRs (ADR-001 through ADR-064, some numbers reserved/merged) + ADR-template.md

Most recent ADRs (last 14 days, from `git log --since="14 days ago" -- knowledge/decisions/`):
- ADR-064 — Shared module pattern for slash command deduplication
- ADR-063 — Never destroy known-good state before confirmed write
- ADR-062 — Gemini `.pb` project scoping fails closed
- ADR-061 — First-run repair notice is platform-specific, not unified
- ADR-060 — Narrow KG search scope away from raw chat history
- ADR-059 — No hardcoded derivable counts in plans
- ADR-058 — Naming/scope upfront check for new commands/skills/docstrings
- ADR-057 — Detection layer requires unified design, not piecemeal growth
- ADR-056 — Reject plugin split for contributor-only doc commands

Full index: see `knowledge/decisions/README.md`.

### knowledge/lessons-learned/ — Knowledge Base by Category

| Category | Count | Latest | Purpose |
|---|---|---|---|
| architecture | 10 | 2026-06-25 | System design lessons |
| debugging | 8 | 2026-04-10 | Bug root-cause patterns |
| patterns | 19 | 2026-07-10 | Reusable implementation patterns |
| process | 22 | 2026-07-06 | Workflow/governance lessons |

---

## Key Files

| File | Purpose | Status |
|---|---|---|
| README.md | Project overview | updated 2026-07-11 |
| CLAUDE.md | Project conventions and rules | updated 2026-06-16 |
| ~/.claude/CLAUDE.md | Personal cross-project preferences | (outside repo, not version-tracked here) |
| package.json | Version, dependencies | v0.6.18 |
| mcp-server/package.json | MCP server version | v0.6.15 (independent, currently behind plugin) |
| .claude/settings.json | Claude Code configuration | see repo for current flags |
| hooks/hooks.json | SessionStart automation | 6 hook entries (SessionStart, PostToolUse x3, others) |

---

## Code Protection Rules

⚠️ These directories require explicit user permission before modification:

- **commands/** — LLM execution prompts; changes break slash command functionality
- **core/default-templates/** (a.k.a. `core/templates/`) — Structured formats with YAML frontmatter for parsing

Allowed modifications without permission:
- Documentation files (*.md)
- Test files (tests/, test-*.js)
- Examples and guides
- Template comments and field glossaries

---

## Version Consistency

**Current versions (as of 2026-07-12, branch `v0.6.18-misc-patches`):**
- package.json: v0.6.18
- .claude-plugin/plugin.json: v0.6.18
- mcp-server/package.json: v0.6.15 — **OUT OF SYNC** with plugin version; a version-sync step ("c3") is pending in the active session's plan and has not yet executed
- README.md: last updated 2026-07-11 (synced to 0.6.18 per commit `0e47f325`)

**Note:** mcp-server is versioned independently. Verify alignment before releasing.
