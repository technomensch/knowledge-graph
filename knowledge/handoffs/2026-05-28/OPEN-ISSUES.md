# Open Issues, PRs, and Plans — 2026-05-28

---

## Open GitHub Issues

| # | Title | Type | Assigned To | Status |
|---|-------|------|-------------|--------|
| #125 | Post-plan validation not enforced (advisory-only hook) | Bug | v0.5.9.2 | Layer 2 fix planned; Layer 3 (hard gate) deferred v0.6.0 |
| #124 | start-issue-tracking never calls gh issue create | Bug | v0.5.9.2 | Core fix planned — Step 5 rewrite |
| #47 | ENH-006 sequential prompts | Enhancement | Backlog | Deferred — no active plan |
| #46 | ENH-005 FTS5 relocation | Enhancement | Backlog | Deferred — no active plan |
| #41 | ENH-002 session snapshot on capture | Enhancement | Backlog | Deferred — no active plan |
| #39 | v0.2.1 backlog (meta) | Meta | Backlog | Historical tracking issue |

### Issue Detail: #124 — start-issue-tracking never calls gh issue create

**Problem:** `/kmgraph:start-issue-tracking` Step 5 only calls `gh pr create --draft`. The `gh issue create` call was never written into the execution steps. Every ENH and issue created locally since `v0.0.5-alpha` (commit `4641faab`) has `github-issue: null` or `"TBD"` — never synced to GitHub.

**Fix plan:** `v0.5.9.2-fix-gh-issue-create.md` — rewrite Step 5, add frontmatter write-back, draft PR with `Closes #124`.

**Local tracking:** `knowledge/issues/issue-5/`

### Issue Detail: #125 — Post-plan validation not enforced

**Problem:** `scripts/post-plan-validate-checklist.sh` is advisory only. The hook does not block plan execution on validation failures. `~/.kmgraph/plan-rules.md` incorrectly describes it as a "blocking gate."

**Fix plan:** v0.5.9.2 Layer 2 — fix false claim in plan-rules.md and clarify advisory intent in script header.

**Deferred:** Layer 3 (hard gate enforcement via `gov-execute-plan` PreToolUse:Write) is v0.6.0 scope per ENH-015 Gap 2 and Opus scope review.

**Local tracking:** `knowledge/issues/issue-6/`

---

## Open Pull Requests

| # | Branch | Age | Recommendation | Reason |
|---|--------|-----|----------------|--------|
| #112 | v0.5.6-update-graph-governance-migration | Stale | **Close** | Superseded by v0.5.8 and v0.5.9 governance work |
| #90 | v0.3.8-chat-history-path-config | Stale | **Close** | Feature not adopted; config approach changed |
| #76 | docs-update-no-branch-delete-rule | Stale | **Close** | Rule now lives in `knowledge/rules.md` (authoritative) |
| #73 | v0.3.2-capture-draft-approve | Stale | **Close** | Draft-approve UX not pursued |
| #71 | v0.2.4.1-beta | Stale | **Close** | Very old beta branch, superseded by many releases |

**None of the five open PRs should be merged.** All are stale. Close with comment referencing the superseding version.

---

## Active Plans

### v0.5.9.2-fix-gh-issue-create (PRIMARY)

**File:** `~/.claude/plans/v0.5.9.2-fix-gh-issue-create.md`
**Working copy:** `docs/plans/v0.5.9.2-fix-gh-issue-create.md`
**Lines:** 496 | **Tasks:** 15 | **Status:** READY TO EXECUTE (blocked on v0.5.9.1 merge)

**Prerequisite gate:** v0.5.9.1 (`v0.5.9.1-review-audit-protocol`) must merge before execution. Apply ADR-049 Review Audit Protocol as pre-execution gate.

**Scope:**
- issue-5 (#124): `commands/start-issue-tracking.md` Step 5 rewrite
- issue-6 (#125) Layer 2: `~/.kmgraph/plan-rules.md` + `scripts/post-plan-validate-checklist.sh` advisory clarification
- Version bump to 0.5.9.2 across `package.json`, `plugin.json`, `README.md`, `INSTALL.md`, `CHANGELOG.md`
- Docs: `COMMAND-GUIDE`, `CHEAT-SHEET`

**Out of scope:** issue-6 Layer 3 (hard gate), Layer 3b (PreToolUse:Write hard gate), core/templates promotion — all v0.6.0.

**Prior art to respect:**
- ADR-024 — sequential prompt design for start-issue-tracking
- ADR-022 — branch creation active work guard
- ENH-017 — Step 1.2 UX improvement in same file (coordinate to avoid merge conflict)

---

## Local Enhancement Tracking

| ENH | Title | Status |
|-----|-------|--------|
| ENH-002 | Session snapshot on capture | Deferred (GitHub #41) |
| ENH-005 | FTS5 relocation | Deferred (GitHub #46) |
| ENH-006 | Sequential prompts | Deferred (GitHub #47) |
| ENH-013 | Plan rules injection fix | Shipped (v0.5.8) |
| ENH-014 | MEMORY.md cascade | Shipped (v0.5.8) |
| ENH-015 | Decision Governance Protocol | Shipped (v0.5.9) |
| ENH-016 | Rules file auto-split recommendation | Shipped (v0.5.9.1) |
| ENH-017 | UX improvements for start-issue-tracking | Planned (v0.5.9.2 coordination) |
| ENH-018 | Recall vocabulary/synonym indexing | Conceptual — no plan |
| ENH-019 | ENH-019 spec (untracked, deferred) | Untracked — include in v0.5.9.1 commit |
| ENH-020 | Pending (referenced in ADR-049) | Conceptual |

---

## TODO/FIXME in Key Files

| File | Item | Urgency |
|------|------|---------|
| `commands/start-issue-tracking.md` | Step 5 never calls `gh issue create` | High — v0.5.9.2 |
| `~/.kmgraph/plan-rules.md` | False "blocking gate" claim for post-plan validation hook | High — v0.5.9.2 |
| `scripts/post-plan-validate-checklist.sh` | Advisory intent not stated in header comment | Medium — v0.5.9.2 |
| `knowledge/decisions/README.md` | Staged (count update 46 → 49) — needs commit in v0.5.9.1 | High |
| `docs/plans/v0.5.9.2-*.md` | Working copy of plan — keep in sync with `~/.claude/plans/` | Medium |
