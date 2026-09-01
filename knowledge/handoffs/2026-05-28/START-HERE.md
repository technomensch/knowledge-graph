# Handoff — 2026-05-28

**Project:** KMGraph — Claude Code extension + cross-platform MCP server
**Version:** 0.5.9.1 (package.json + plugin.json)
**MCP server version:** 0.3.10
**Working directory:** `/Users/mkaplan/GitHub/knowledge-graph`
**Handoff created:** 2026-05-28

---

## Situation at a Glance

v0.5.9.1 shipped and merged to main. Two bugs (issue-5, issue-6) are tracked and planned. The fix plan (v0.5.9.2) is fully written, Opus-reviewed, and ready to execute — but cannot start until the v0.5.9.1 branch (ADR-049 + ENH-016 + hook fixes) is committed and merged, since v0.5.9.1 adds the Review Audit Protocol (ADR-049) that governs v0.5.9.2 execution.

**CRITICAL:** v0.5.9.1 branch work is staged on `main` but not yet committed. The worktree at `/private/tmp/knowledge-graph-v0.5.9.2` is on branch `v0.5.9.2-fix-gh-issue-create` and has modified files not yet committed either.

---

## Active Branches

| Branch | Location | Status | Next Action |
|--------|----------|--------|-------------|
| `main` | `/Users/mkaplan/GitHub/knowledge-graph` | Untracked files only (issue-5/, issue-6/, .playwright-mcp/) | No action needed — these are deferred |
| `v0.5.9.1-review-audit-protocol` | (does not exist as local branch — work is staged on main HEAD) | ADR-049 written on disk, staged in decisions/README.md; branch not yet created | Create branch, commit staged + untracked ADR-049/ENH-019, push, PR, merge |
| `v0.5.9.2-fix-gh-issue-create` | `/private/tmp/knowledge-graph-v0.5.9.2` | Modified ADR-024, ADR-043, ENH-015, ENH-017; untracked issue-5/, issue-6/ | BLOCKED — cannot execute until v0.5.9.1 merges |

---

## Uncommitted Changes

### Main worktree (`/Users/mkaplan/GitHub/knowledge-graph`, branch: main)

| File/Path | Status | Notes |
|-----------|--------|-------|
| `knowledge/decisions/README.md` | Modified (staged) | ADR count updated 46 → 49 |
| `knowledge/decisions/ADR-049-*.md` | Untracked | New ADR for Review Audit Protocol — include in v0.5.9.1 |
| `knowledge/enhancements/ENH-019/` | Untracked | ENH-019 spec — include in v0.5.9.1 |
| `knowledge/issues/issue-5/` | Untracked | Bug: start-issue-tracking never calls gh issue create — deferred to v0.5.9.2 |
| `knowledge/issues/issue-6/` | Untracked | Bug: post-plan validation advisory only — deferred to v0.5.9.2 |
| `.playwright-mcp/` | Untracked | Playwright MCP config — deferred (v0.5.9.2 or later) |

### v0.5.9.2 worktree (`/private/tmp/knowledge-graph-v0.5.9.2`, branch: v0.5.9.2-fix-gh-issue-create)

| File | Status | Notes |
|------|--------|-------|
| `knowledge/decisions/ADR-024-*.md` | Modified | Cross-linking metadata |
| `knowledge/decisions/ADR-043-*.md` | Modified | Cross-linking metadata |
| `knowledge/enhancements/ENH-015/ENH-015-specification.md` | Modified | Coordination note |
| `knowledge/enhancements/ENH-017/ENH-017-specification.md` | Modified | Coordination note |
| `knowledge/issues/issue-5/` | Untracked | Local issue tracking |
| `knowledge/issues/issue-6/` | Untracked | Local issue tracking |

---

## Active Plan

**File:** `~/.claude/plans/v0.5.9.2-fix-gh-issue-create.md`
**Working copy:** `docs/plans/v0.5.9.2-fix-gh-issue-create.md`
**Size:** 496 lines, 15 tasks
**Status:** STOPPED — Opus-reviewed, READY TO EXECUTE
**Prerequisite:** v0.5.9.1 must merge before execution begins

**What the plan fixes:**
- issue-5 (#124): `commands/start-issue-tracking.md` never calls `gh issue create` — Step 5 rewrite
- issue-6 (#125) Layer 2 only: `~/.kmgraph/plan-rules.md` false "blocking gate" claim fixed to "advisory reminder"
- issue-6 Layer 3 (hard gate in gov-execute-plan): DEFERRED to v0.6.0

---

## Next Steps (Priority Order)

1. **Complete v0.5.9.1** — Create branch `v0.5.9.1-review-audit-protocol` from current main HEAD, commit staged `knowledge/decisions/README.md` + untracked `ADR-049` + `ENH-019`, push, open PR, merge. Do NOT include issue-5/, issue-6/, .playwright-mcp/.

2. **Execute v0.5.9.2 plan** — After v0.5.9.1 merges: apply the Review Audit Protocol (ADR-049) as pre-execution gate, then say "Proceed" to start the 15-task plan in the worktree at `/private/tmp/knowledge-graph-v0.5.9.2`.

3. **Close stale PRs** — Five open PRs are stale (see Open PRs table below). Recommend closing #73, #71 as abandoned. Review #112, #90, #76 — likely close without merge.

4. **Deferred work** — `.playwright-mcp/` and issue-6 Layer 3 (hard gate) both target v0.6.0.

---

## Open GitHub Issues

| # | Title | Type | Priority |
|---|-------|------|----------|
| #125 | Post-plan validation not enforced (advisory-only hook) | Bug | High — Layer 2 fix in v0.5.9.2 plan; Layer 3 deferred v0.6.0 |
| #124 | start-issue-tracking never calls gh issue create | Bug | High — core fix in v0.5.9.2 plan |
| #47 | ENH-006 sequential prompts | Enhancement | Medium — deferred |
| #46 | ENH-005 FTS5 relocation | Enhancement | Medium — deferred |
| #41 | ENH-002 session snapshot on capture | Enhancement | Low — deferred |
| #39 | v0.2.1 backlog (meta) | Meta | Low — historical tracking |

---

## Open PRs

| # | Branch | Status | Recommendation |
|---|--------|--------|----------------|
| #112 | v0.5.6-update-graph-governance-migration | Stale | Close — superseded by v0.5.9 governance work |
| #90 | v0.3.8-chat-history-path-config | Stale | Evaluate — may have usable content; likely close |
| #76 | docs-update-no-branch-delete-rule | Stale | Close — rule is now in knowledge/rules.md |
| #73 | v0.3.2-capture-draft-approve | Stale | Close — feature not adopted |
| #71 | v0.2.4.1-beta | Stale | Close — very old beta branch |

---

## Quick Navigation

- Plan (active): `~/.claude/plans/v0.5.9.2-fix-gh-issue-create.md`
- Worktree (v0.5.9.2): `/private/tmp/knowledge-graph-v0.5.9.2`
- ADR index: `knowledge/decisions/README.md`
- Rules: `knowledge/rules.md` + `~/.kmgraph/rules.md`
- Governance rules: `~/.kmgraph/governance-rules.md`
- Session logs: `knowledge/sessions/2026-05/`
- Enhancements: `knowledge/enhancements/`
- Issues (local): `knowledge/issues/`
- CHANGELOG: `CHANGELOG.md`
- Docs: `docs/` (MkDocs Material site)
