# Open Issues & Pending Work

**Last Updated:** 2026-06-07

---

## GitHub Issues (Open)

| # | Title | Labels |
|---|---|---|
| #130 | ENH-023: Extend pre-skill-rules-inject.sh to cover official marketplace skills (code-review bypass) | (none) |
| #47 | ENH-006: Sequential prompts + decoupled decisions in start-issue-tracking | enhancement |
| #46 | ENH-005: FTS5 database relocation to user-level cache (~/.claude/kg-fts5/) | enhancement |
| #41 | ENH-002: Session Snapshot on Capture — auto-trigger session summary before lessons, ADRs, issues, and enhancements | enhancement |
| #39 | [Meta] v0.2.1 backlog — kg_capture MCP tool, sync-all/update-graph refactor, skill modernization | enhancement |

---

## Open Pull Requests

| # | Branch | Title | Status |
|---|---|---|---|
| #129 | dependabot/npm_and_yarn/mcp-server/npm_and_yarn-0a9c170602 | chore(deps): bump hono from 4.12.18 to 4.12.23 in /mcp-server | Dependabot auto-PR |
| #112 | v0.5.6-update-graph-governance-migration | feat(governance): migrate MEMORY.md governance to rules/triggers + ADR-048 | Open |
| #90 | v0.3.8-chat-history-path-config | feat(config): v0.3.8 — configurable chat-history path per KG | Open |
| #76 | docs-update-no-branch-delete-rule | docs(rules): never delete branches without explicit user approval | Open |
| #73 | v0.3.2-capture-draft-approve | feat(capture): draft-and-approve flow for lessons and ADRs | Open |
| #71 | v0.2.4.1-beta | v0.2.4.1-beta: CI Node.js 24 update + version sync | Open |

**Note:** PRs #112, #90, #76, #73, #71 appear to be stale (branches significantly behind current main at v0.5.10). Review for close/rebase/supersede.

**Current branch PR:** `v0.5.10-ux-session-handoff` — no PR created yet. Awaiting user push/merge decision.

---

## Active Plans

Plans in `docs/plans/` (local only, gitignored):

| Plan File | Status | Description |
|---|---|---|
| `v0.5.10-ux-session-handoff.md` | Complete (a8dd1739) | Version-impact UX + continues_from coupling — branch complete, PR pending |
| `v0.5.11-kg-recall-rename.md` | Planned | kg-recall rename / housekeeping — independent, can start any time |
| `v0.5.10.6-template-disambiguation.md` | Proposed | ENH-022 Template Directory Disambiguation — **BRAINSTORM REQUIRED** |
| `v0.5.9-decision-governance.md` | Historical | Merged |
| `v0.5.9.3-docs-enforcement-protocol-gap.md` | Historical | Merged (commits d58462d2, 1e4f048e) |
| `v0.6.0-multi-platform-expansion.md` | Future | Multiplatform expansion — fixed scope, not yet started |
| `ENH-018-rules-h2-structure-hardening.md` | Pending | Rules file H2 structure hardening |
| `2026-05-13-shared-dedup-module.md` | Unknown | Shared deduplication module |

---

## Uncommitted Working Tree Changes

These changes exist on the working tree but have NOT been committed:

| File | Status | Notes |
|---|---|---|
| `commands/handoff.md` | Modified (M) | Unknown changes — may be test edits from this handoff run |
| `knowledge/enhancements/ENH-002/ENH-002-specification.md` | Modified (M) | Unknown scope of changes |
| `knowledge/enhancements/ENH-022/ENH-022-specification.md` | Modified (M) | Scope broadened (covered in 94c4d347?) — may have uncommitted further edits |
| `knowledge/enhancements/ENH-023/` | Untracked (new) | ENH-023 directory just created — not yet tracked |
| `.playwright-mcp/` | Untracked | Test artifact — likely gitignored or to be ignored |

**Action needed:** Review and either commit or discard these changes before pushing.

---

## Known TODOs

From `commands/`, `skills/`, `agents/` scan:

No explicit TODO/FIXME/XXX/HACK comments found in command, skill, or agent files.

---

## Enhancement Backlog (Not Yet Issued)

Enhancements tracked in `knowledge/enhancements/` that do not yet have GitHub issues:

- **ENH-022**: Template Directory Disambiguation — spec exists, BRAINSTORM REQUIRED before impl, governed by ADR-040
- **ENH-023**: Extend pre-skill-rules-inject.sh to marketplace skills — untracked directory exists, issue #130 open

---

## Deferred Tasks

From session summaries and plan files:

1. **ENH-022 brainstorm gate** — Cannot implement until brainstorming session completed; user must initiate explicitly
2. **Stale PR cleanup** — PRs #71, #73, #76, #90, #112 are all significantly behind main; need triage
3. **Potential uncaptured lessons** (from session snapshot):
   - branch-before-edit discipline pattern (branch confusion recovery)
   - Opus consultation as pre-brainstorm gate pattern
   - parallel agent sweep for multi-file correction pattern
4. **ENH-016/ADR-028 rules-capture sub-file routing** — Implemented in v0.5.10 but may need follow-up testing
5. **v0.6.0 multiplatform** — Fixed scope plan exists in docs/plans/; not started; requires dedicated session
