# Documentation Map

**Last Updated:** 2026-07-21

---

## Quick Reference

| Component | Count | Purpose |
|---|---|---|
| Commands (`commands/`) | 25 | Slash commands (`/kmgraph:...`) |
| Skills (`skills/`) | 16 | Auto-triggered context providers |
| Agents (`agents/`) | 11 | Subagent definitions |
| Hooks (`hooks/hooks.json`) | 13 | Lifecycle automation entries |
| ADRs (`knowledge/decisions/`) | 68 | Architecture decisions |
| Enhancements (`knowledge/enhancements/`) | 46 | Feature/enhancement specs (ENH-NNN) |
| Issues (`knowledge/issues/`) | 28 | Bug/gap tracking (issue-N) |
| Lessons (`knowledge/lessons-learned/`) | 56 | Lessons by category (real files on disk — `lessons-learned/debugging/` is entirely gitignored, so `git ls-tree` undercounts by 7) |
| User Docs (`docs/`) | 122 | Docusaurus site (`.md`/`.mdx`) |

Counts recounted directly from the filesystem on 2026-07-21 (commands/agents/hooks/docs unchanged this branch; skills +1, ADRs -1, enhancements +2, issues +4, lessons -1 — see per-section notes below for what moved).

---

## Directory Structure

### commands/ — Slash Commands
🔒 **PROTECTED** — do NOT modify without explicit permission.

25 command files covering: init/setup (`kmg-init`, `kmg-init-personal-kg`, `kmg-switch`, `kmg-list`, `kmg-add-category`), capture/recall (`kmg-capture-lesson`, `kmg-recall`, `kmg-sync-all`), issue/enhancement tracking (`kmg-start-issue-tracking`, `kmg-update-issue-plan`, `kmg-link-issue`, `kmg-meta-issue`), session/handoff (`kmg-session-summary`, `kmg-handoff`), docs (`kmg-create-doc`, `kmg-update-doc`), governance (`kmg-check-sensitive`, `kmg-create-adr`), and platform (`kmg-setup-platform`, `kmg-extract-chat`). Full listing: `ls commands/*.md`.

### skills/ — Auto-Triggered Providers

16 skills, key ones: `kmg-auto-recall` (history/past-decision questions), `kmg-lesson-capture` (bug solved/breakthrough), `kmg-session-wrap` (session end signals), `kmg-adr-guide` (architecture decisions), `kmg-execute-plan` (zero-deviation plan execution), `kmg-capture-router`/`kmg-doc-update-router`/`kmg-rules-capture` (ad-hoc capture routing), `kmg-docs-impact-scan` (pre-push doc sync gate), `kmg-brainstorm-recall` (pre-plan prior-art enforcement), `kmg-plan-gate` (post-plan approval gate), `kmg-stuck-work-escalation`, `kmg-sidebar-update`, `kmg-update-profile`, and **`kmg-paperwork-audit`** (new this branch — companion to `scripts/pre-push-gate.sh` Gate 6; checks resolved-without-evidence status drift and session-summary currency against branch HEAD). Full listing: `ls -d skills/*/`.

**Note:** `skills/knowledge-graph-usage/` is a stray pre-existing empty directory (only a `.DS_Store`, no `SKILL.md`) left over from an older skill rename; it is not one of the 16 and predates this branch.

**Known gap (open, tracked issue-18/GH#176):** `gov-capture-routing` — referenced by 8+ commands/agents as a shared routing skill, but lives as a personal file (`~/.claude/skills/gov-capture-routing.md`) outside this project's `skills/<name>/SKILL.md` convention, so it's unreachable via the Skill tool. Real file, wrong location — see issue-18 for full provenance.

### agents/ — Subagents

11 agents including: `knowledge-extractor` (read-only KG extraction, approval-gated writes), `session-documenter` (git archaeology for handoffs, approval-gated commits/pushes), `session-summary-agent` (lightweight current-session summarizer), `create-adr-agent`, `lesson-capture-agent`, `rules-capture-agent`, `platform-sync-agent`, `sync-all-agent`, `recall-agent`. Full listing: `ls agents/*.md`.

### knowledge/decisions/ — Architecture Decision Records
Directory: `knowledge/decisions/` — **68 ADRs** (recounted from the filesystem; the prior "69" figure was already stale before this branch — `ADR-template.md`, not a real ADR, was removed this branch, and one ADR number, 006, is used twice by two unrelated pre-existing files, a pre-existing anomaly not touched here).

Most recent/relevant to current work: **ADR-066** (KG content-storage location for global-topic/cowork modes — status `Accepted`, resolved 2026-07-17, implementation complete as v0.6.20), **ADR-067** (mutable `.active` switch vs. context-derived KG resolution — status `Proposed`, still open, directly relevant to ENH-049's multi-repo pain point), **ADR-028** (personal KG home at `~/.kmgraph/`, not reopened by ADR-066), **ADR-063** (never destroy known-good state before confirmed write — governs the cowork-content archive-not-delete requirement, and was invoked directly this branch when a real overwrite bug in `applyStrayKnowledgeDir()` was found and fixed).

### knowledge/enhancements/ — Enhancement Specs
**46 ENH specs.** Most recent: ENH-050 (document trigger keywords per command/skill in user-facing docs), **ENH-051** (path-delegation gap, deferred), **ENH-052** (pre-push paperwork audit gap — filed and then implemented this branch: two new gates in `scripts/pre-push-gate.sh` plus the new `kmg-paperwork-audit` skill; status remains deferred pending an unassigned CHANGELOG-currency mechanism).

### knowledge/issues/ — Issue Tracking
**28 issue docs.** Most recent (2026-07-17 through 2026-07-21): issue-21 (#182, HIGH — Codex CLI Stop-hook JSON failure), issue-22 (#184, init wizard's "selective" git-strategy scope confusion), issue-23 (#183, HIGH — `kg_config_switch` false-success bug), issue-24 (#185, `kg_capture` double-frontmatter bug), **issue-25** (path-delegation process finding), **issue-26** (process finding), **issue-27** (resolved — the `applyStrayKnowledgeDir()` data-loss bug, see ADR-063 note above), **issue-28** (dev-loop gap between rebuilt `mcp-server/dist/` and live tool calls; broadened during this branch's own functional testing to cover hooks as well as MCP tools).

### knowledge/lessons-learned/ — Knowledge Base by Category
**57 lessons** across `architecture/`, `process/`, `patterns/`, `debugging/` categories (recounted from the filesystem; `lesson-template.md`, not a real lesson, was removed this branch).

---

## Key Files

| File | Purpose | Status |
|---|---|---|
| README.md | Project overview | updated 2026-07-18 (this branch) |
| CLAUDE.md | Project conventions and rules | updated 2026-06-16 |
| package.json | Plugin version, dependencies | v0.6.20 (bumped and synced this branch) |
| mcp-server/package.json | MCP server version (independent) | v0.6.20 |
| hooks/hooks.json | SessionStart/PostToolUse automation | 13 hook entries |
| ROADMAP.md | Prioritized backlog + version history | actively maintained, updated this branch |
| ~/.claude/plans/v0.6.20-storage-migration-completion.md | Original implementation plan | 13/13 tasks done; only push/PR remains, held for go-ahead |

---

## Code Protection Rules

⚠️ These directories require explicit user permission before modification:

- **commands/** — LLM execution prompts; changes break slash command functionality
- **core/templates/**, **core/default-templates/** — structured YAML formats for parsing

**Currently approved for the v0.6.20 branch only:** `core/docs/`, `core/README.md`, `core/examples/`, `commands/kmg-init.md`, `commands/kmg-list.md` (per the v0.6.20 plan's explicit scope — do not assume this approval extends beyond this branch).

Allowed modifications without permission: documentation files (`*.md` outside `commands/`/`core/`), test files, examples/guides, template comments.

---

## Version Consistency

**On `main`:** still v0.6.19 — unaffected until this branch merges.

**On this branch (`v0.6.20-storage-migration-completion`), confirmed consistent at `0.6.20`:**
- `package.json`
- `.claude-plugin/plugin.json`
- `.codex-plugin/plugin.json`
- `.claude-plugin/marketplace.json` (embedded plugin entry)
- `mcp-server/package.json`
- both `package-lock.json` files (root and `mcp-server/`)
- `README.md`'s two version mentions

Not yet merged to `main` — awaiting the user's go-ahead to push and open the PR.

**Note:** `mcp-server` is versioned independently but has moved in lockstep with the plugin since v0.6.18 (both changed this release cycle: `cli.ts`, `config.ts`, `fts5.ts`).
