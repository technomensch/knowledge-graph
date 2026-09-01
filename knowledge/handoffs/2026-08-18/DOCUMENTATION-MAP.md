# Documentation Map

**Last Updated:** 2026-08-18

---

## Quick Reference

| Component | Count | Purpose |
|---|---|---|
| Commands (`commands/`) | 24 | Slash commands (/kmgraph:...) |
| Skills (`skills/`) | 16 | Auto-triggered context providers |
| Agents (`agents/`) | 11 | Subagent definitions |
| ADRs (`knowledge/decisions/`) | 70 | Architecture decisions |
| Lessons (`knowledge/lessons-learned/`) | 68 | Lessons by category |
| User Docs (`docs/`) | 1 site (multiple sections) | Docusaurus-based user docs |

---

## Directory Structure

### commands/ — Slash Commands
PROTECTED: Do NOT modify without explicit permission.

| Command | Lines |
|---|---|
| kmg-init | 1901 |
| kmg-start-issue-tracking | 691 |
| kmg-extract-chat | 632 |
| kmg-update-doc | 570 |
| kmg-create-adr | 505 |
| kmg-create-doc | 504 |
| kmg-handoff | 491 |
| kmg-meta-issue | 486 |
| kmg-migration | 429 |
| kmg-init-personal-kg | 421 |
| kmg-help | 313 |
| kmg-update-issue-plan | 249 |
| kmg-list | 247 |
| kmg-status | 212 |
| kmg-setup-platform | 203 |
| kmg-sync-all | 181 |
| kmg-capture-lesson | 174 |
| kmg-link-issue | 169 |
| kmg-session-summary | 165 |
| kmg-update-graph | 150 |
| kmg-recall | 121 |
| kmg-config-sanitization | 96 |
| kmg-add-category | 77 |
| kmg-check-sensitive | 53 |

### skills/ — Auto-Triggered Providers

| Skill | Purpose |
|---|---|
| kmg-adr-guide | Suggests /kmgraph:kmg-create-adr on architecture decisions |
| kmg-auto-recall | Guides knowledge graph search on history questions |
| kmg-brainstorm-recall | Ensures graph is consulted before any recommendation |
| kmg-capture-router | Routes capture-that/remember-that requests |
| kmg-doc-update-router | Routes explicit doc-update requests |
| kmg-docs-impact-scan | Scans for docs affected by code changes (pre-ship) |
| kmg-execute-plan | Enforces zero-deviation plan execution protocol |
| kmg-knowledge-graph-usage | Orientation to KG system architecture |
| kmg-lesson-capture | Suggests /kmgraph:kmg-capture-lesson on bugs/breakthroughs |
| kmg-paperwork-audit | Checks issue/enhancement status accuracy pre-push |
| kmg-plan-gate | Enforces user approval gates after planning/execution |
| kmg-rules-capture | Detects implicit behavioral corrections, routes to rules files |
| kmg-session-wrap | Prompts /kmgraph:kmg-session-summary at session end |
| kmg-sidebar-update | Keeps docs sidebar in sync on file moves/renames |
| kmg-stuck-work-escalation | Escalates stuck work per Plan Protocol thresholds |
| kmg-update-profile | Routes profile updates to all three profile files |

### agents/ — Subagents

| Agent | Purpose |
|---|---|
| create-adr-agent | ADR drafting/creation |
| knowledge-extractor | Parse large files for KG extraction (read-only, approval-gated writes) |
| knowledge-reviewer | Reviews captured knowledge |
| lesson-capture-agent | Captures lessons-learned entries |
| mcp-setup-agent | MCP server setup automation |
| platform-sync-agent | Cross-platform sync |
| recall-agent | Knowledge graph search/recall |
| rules-capture-agent | Routes behavioral corrections to rules files |
| session-documenter | Git archaeology for session summaries (approval-gated commits/pushes) |
| session-summary-agent | Session summary generation |
| sync-all-agent | Full-graph sync |

### hooks/hooks.json — Event Types

`SessionStart`, `UserPromptSubmit`, `PreToolUse`, `PostToolUse`, `Notification`, `Stop`

### knowledge/decisions/ — Architecture Decision Records
Directory: `knowledge/decisions/`
Current ADRs: 70

Most relevant to this session's in-flight work:
- **ADR-046** — concept setup hybrid page type and how-to-guide pattern (Accepted) — modified this session (uncommitted, part of c1/issue-46 work)
- **ADR-014** — maintain dual plan-file locations (Accepted) — governs the `knowledge/plans/` + `~/.claude/plans/` dual-copy convention used throughout this session
- **ADR-029** — plan file location in knowledge graph (Accepted)
- **ADR-063** — never destroy known-good state before confirmed write (Accepted) — relevant to the c1 data-loss bug fixed this session
- **ADR-067** family — mutable active-switch vs. context-derived KG resolution (Proposed, heavily reviewed) + implementation spec
- **ADR-068** — lightweight vs. full workflow rule and piloted command completion check (Accepted)

Full list (70) with status:

ADR-001 centralized-multi-kg-configuration — Accepted
ADR-002 commands-vs-skills-architecture — Accepted
ADR-003 abandon-shadow-commands-for-file-prefix — Accepted (Deprecated in v0.0.8.3, replaced by ADR-010)
ADR-004 token-based-memory-size-limits — Accepted
ADR-005 defer-memory-rules-engine — (no status field)
ADR-006 delegated-vs-inline-kg-updates — Accepted
ADR-006 document-cache-clear-upgrade-workaround — (no status field; duplicate number with ADR-054 topic)
ADR-007 distribution-hygiene-files-allowlist — Accepted
ADR-008 third-person-language-standard — Accepted
ADR-009 three-tier-installation-architecture — Accepted
ADR-010 namespace-rename-knowledge-to-kg-sis — Accepted (Implemented v0.0.8.3-alpha)
ADR-011 defer-update-notifications — (no status field)
ADR-012 hook-security-model — (no status field)
ADR-013 documentation-update-protocol — Accepted
ADR-014 maintain-dual-plan-file-locations — Accepted
ADR-015 node-sqlite3-wasm-for-fts5-search — Accepted
ADR-016 graceful-fallback-optional-mcp-dependencies — Accepted
ADR-017 four-layer-architecture-thin-commands — Accepted
ADR-018 agents-template-platform-portability — Accepted
ADR-019 write-guard-agent-instructions-vs-data-layer — Accepted (amended v0.5.10.8)
ADR-020 lifecycle-hooks-suite-automated-capture — Accepted
ADR-021 single-source-of-truth-dry-documentation — Accepted
ADR-022 branch-creation-commands-active-work-guard — Accepted
ADR-023 single-source-of-truth-changelog — Accepted — Implemented (symlink, v0.2.1-beta)
ADR-024 decouple-issue-tracking-decisions-sequential-prompts — Accepted
ADR-025 do-not-commit-enabledplugins-blocks — Accepted
ADR-026 snapshot-gate-uses-session-summary — Accepted
ADR-027 docusaurus-restructure-diataxis-docs-feed — Accepted
ADR-028 me-and-rules-as-platform-agnostic-source-of-truth — Accepted
ADR-029 plan-file-location-in-knowledge-graph — Accepted
ADR-030 migration-moves-named-subdirs-only-never-entire-docs — (no status field)
ADR-031 lessons-learned-plural-prefix-naming — Accepted
ADR-032 platform-specific-directives-in-platform-config — Superseded (v0.3.5-beta fixup)
ADR-033 triggersmd-platform-agnostic-rule-timing-companion-file — (no status field)
ADR-034 capture-level-routing-dispatcher-agent-split — (no status field)
ADR-035 stuck-work-escalation — Proposed
ADR-036 docs-impact-scan — Accepted (implemented v0.5.9.3)
ADR-037 default-rules-for-graph-deployment — Proposed
ADR-038 model-selection-rule-for-kg-tasks — Accepted
ADR-039 profile-terminology — Accepted
ADR-040 knowledge-templates-subdirectory-structure — Accepted
ADR-041 tier-abstraction-label-system — Accepted
ADR-042 adr-implements-commit-reference-mandatory — Accepted
ADR-043 pretooluse-hook-injection-superpowers-rule-enforcement — Accepted
ADR-044 split-oversized-chat-history-files — Accepted
ADR-045 update-profile-skill-not-command — Accepted
ADR-046 concept-setup-hybrid-page-type-and-how-to-guide-pattern — Accepted
ADR-047 profile-auto-load-routing-layer-only — Accepted
ADR-048 governance-capture-routing — (no status field)
ADR-049 review-audit-protocol-post-plan-pre-push-review-governance — (no status field)
ADR-050 pre-push-composite-gate-inline-recommendation-gate — Accepted
ADR-051 session-summary-handoff-asymmetric-coupling — Accepted
ADR-052 docs-impact-scan-user-facing-guide — Accepted
ADR-053 kmg-prefix-cross-platform-naming — Accepted
ADR-054 document-cache-clear-upgrade-workaround — (no status field)
ADR-055 cross-platform-upgrade-triggering-version-sentinel-over-startup-notification — (no status field)
ADR-056 reject-plugin-split-for-contributor-only-doc-commands — Accepted
ADR-057 detection-layer-requires-unified-design-not-piecemeal-growth — Accepted (investigation settled 2026-07-03; final decision: no consolidation)
ADR-058 naming-scope-upfront-check-for-new-commands-skills-docstrings — Accepted
ADR-059 no-hardcoded-derivable-counts-in-plans — Accepted
ADR-060 narrow-kg-search-scope-away-from-raw-chat-history — Proposed
ADR-061 first-run-repair-notice-platform-specific-not-unified — Accepted
ADR-062 gemini-pb-project-scoping-fail-closed — Accepted
ADR-063 never-destroy-known-good-state-before-confirmed-write — Accepted
ADR-064 shared-module-pattern-for-slash-command-deduplication — Accepted
ADR-065 roadmap-changelog-duplication-changelog-is-source-of-truth — Accepted
ADR-066 kg-content-storage-location-for-global-and-cowork-modes — Accepted — resolved 2026-07-17 (implementation planned via v0.6.20, not yet started)
ADR-067 implementation-spec — (no status field; companion doc)
ADR-067 mutable-active-switch-vs-context-derived-kg-resolution — Proposed (design agreed 2026-07-26, reviewed 3x by Opus/Fable, all findings resolved as of 2026-07-28)
ADR-068 lightweight-vs-full-workflow-rule-and-piloted-command-completion-check — Accepted

### knowledge/lessons-learned/ — Knowledge Base by Category

| Category | Purpose |
|---|---|
| architecture | Structural/design lessons |
| debugging | Root-cause and fix patterns |
| patterns | Reusable implementation patterns |
| process | Workflow and protocol lessons |

Total lesson files (excluding README/template/index): 68

### docs/ — User-Facing Documentation
Top-level sections: `concepts/`, `contributing/`, `demos/`, `design/`, `examples/`, `pillars/`, `reference/`, `specs/`, `superpowers/`, `templates/`, `troubleshooting/`, plus `CHEAT-SHEET.md`, `CONFIGURATION.md`, `FAQ.md`, `GLOSSARY.md`, `INSTALL.md`, `STYLE-GUIDE.md`, `TRACK-ISSUES.md`, `quickstart.mdx`, `index.mdx`.

### mcp-server/ — Cross-Platform Server
TypeScript/Node.js. Key files touched this session: `mcp-server/src/tools/capture.ts`, `mcp-server/src/tools/upgrade.ts`, plus their test files and compiled `dist/index.js` — all currently **uncommitted** (part of c1/issue-46 work, see START-HERE / orchestration plan).

---

## Key Files

| File | Purpose | Status |
|---|---|---|
| README.md | Project overview | v0.7.1.4 |
| CLAUDE.md | Project conventions and rules | current |
| .claude/CLAUDE.md | Personal cross-project preferences | current |
| package.json | Version, dependencies | v0.7.1.4 |
| mcp-server/package.json | MCP server version | v0.7.0 (independent) |
| .claude/settings.json | Claude Code configuration | present |
| hooks/hooks.json | SessionStart automation | 6 event types |

---

## Code Protection Rules

⚠️ These directories require explicit user permission before modification:

- **commands/** — LLM execution prompts; changes break slash command functionality
- **core/** (templates, examples, docs) — Structured formats with YAML frontmatter for parsing

Allowed modifications without permission:
- Documentation files (*.md)
- Test files (tests/, test-*.js)
- Examples and guides
- Template comments and field glossaries

---

## Version Consistency

**Current versions (as of this snapshot — NOT yet bumped for the pending v0.7.2 release):**
- package.json: v0.7.1.4
- .claude-plugin/plugin.json: v0.7.1.4
- mcp-server/package.json: v0.7.0
- README.md: v0.7.1.4

**Note:** mcp-server is versioned independently. The version bump to v0.7.2 has been discussed but **not executed** — it is c1's remaining Step 16 (release checklist). Verify alignment before releasing; do not assume v0.7.2 is live anywhere in the repo yet.
