# Open Issues & Pending Work

**Last Updated:** 2026-05-27

---

## Open GitHub Issues

| # | Title | Label |
|---|---|---|
| #47 | ENH-006: Sequential prompts + decoupled decisions in start-issue-tracking | enhancement |
| #46 | ENH-005: FTS5 database relocation to user-level cache (~/.claude/kg-fts5/) | enhancement |
| #41 | ENH-002: Session Snapshot on Capture — auto-trigger session summary before captures | enhancement |
| #39 | v0.2.1 backlog — kg_capture MCP tool, sync-all/update-graph refactor, skill modernization | enhancement |

---

## Open Pull Requests

| # | Title | Branch | Age |
|---|---|---|---|
| #122 | chore(deps): bump npm_and_yarn group (Dependabot) | dependabot/npm_and_yarn-e0efebc1f3 | 2026-05-25 |
| #112 | feat(governance): migrate MEMORY.md governance to rules/triggers + ADR-048 | v0.5.6-update-graph-governance-migration | 2026-05-05 |
| #90 | feat(config): v0.3.8 — configurable chat-history path per KG | v0.3.8-chat-history-path-config | 2026-04-13 |
| #76 | docs(rules): never delete branches without explicit user approval | docs-update-no-branch-delete-rule | 2026-04-11 |
| #73 | feat(capture): draft-and-approve flow for lessons and ADRs | v0.3.2-capture-draft-approve | 2026-04-10 |
| #71 | v0.2.4.1-beta: CI Node.js 24 update + version sync | v0.2.4.1-beta | 2026-04-09 |

> ⚠️ Several PRs are significantly stale (v0.3.x branches while main is at v0.5.8). Review whether these should be closed, rebased, or merged before v0.5.9 ships.

---

## Active Plans (local, not committed)

| Plan | Status | Notes |
|---|---|---|
| `v0.5.9-decision-governance.md` | Ready to execute | Execute in Antigravity/Gemini |
| `ENH-018-rules-h2-structure-hardening.md` | Deferred | v0.6.x target |
| `v0.6.0-dependency-analysis.md` | Unknown | Pre-existing, review status |
| `v0.6.0-multi-platform-expansion.md` | Unknown | Pre-existing, review status |
| `v0.5.4-profile-autoload.md` | Unknown/stale? | Pre-dates v0.5.8 |

---

## Tracked ENHs (untracked in repo — need commit)

| ENH | Title | Status |
|---|---|---|
| ENH-015 | (v0.5.9-related — check spec) | Untracked |
| ENH-016 | Rules File Auto-Split Recommendation | Untracked |
| ENH-017 | start-issue-tracking Step 1.2 version UX | Untracked, in v0.5.9 scope |
| ENH-018 | Rules File H2 Structure Hardening | Untracked, deferred |

---

## Uncommitted Changes on main

All changes below need a commit before branching for v0.5.9:

- `ROADMAP.md` (staged) — ENH-018 v0.6.x entry
- `knowledge/decisions/ADR-028-*` — Decision Governance Protocol amendment
- `knowledge/decisions/ADR-043-*` — Pre-session update
- `knowledge/rules.md` — Path F mid-session discovery routing
- `knowledge/lessons-learned/README.md` — Pre-session update
- 4 new untracked lesson files (architecture/)
- ENH-015–018 directories
- This handoff package
