---
id: issue-6
type: Bug
status: tracked
github-issue: "#125"
branch: v0.5.9.2-fix-gh-issue-create
created: 2026-05-28
related-adrs: [ADR-043, ADR-049, ENH-015]
related-enhs: [ENH-015]
---

# Issue-6: Post-Plan Validation Checklist Not Enforced — Advisory-Only Hook, Static Stub

## Problem

`plan-rules.md` specifies that the Post-Plan Validation Checklist must:
1. Run immediately after a plan file is written
2. Dynamically derive rows from both `~/.kmgraph/rules.md` and project `knowledge/rules.md`
3. **Block execution on any ❌ row**

The implementation shipped in v0.5.9 (ENH-015) does none of these:

- **Wrong enforcement point:** Runs via `PostToolUse:Write` hook — but PostToolUse hooks
  are architecturally advisory-only in Claude Code; they cannot block.
- **Static stub:** `scripts/post-plan-validate-checklist.sh` outputs a hardcoded 8-item
  checklist. The spec requires 15–20 rules derived dynamically from two rules files.
- **No blocking gate:** Script always exits 0. Rule says "Any ❌ row blocks execution."

## Evidence

- Script comment line 4: *"Does not block — PostToolUse is advisory only."*
- 5 consecutive sessions (2026-05-22 through 2026-05-28): validation asked manually every
  time, same 5 failure categories found each session (version files, docs section,
  parallelism tier labels, branch placement, plugin cache step).
- `core/templates/post-plan-validation-checklist.md` does not exist — template lives only
  at user-level `~/.kmgraph/knowledge/templates/`, not deployed to all users.

## Root Cause

ENH-015 shipped the hook and script as advisory infrastructure, intentionally deferring
the blocking gate. The `plan-rules.md` rule was written to describe the intended end state,
not the shipped state. The gap was never tracked as a bug.

## Impact

- **All users:** receive the advisory stub (8 hardcoded items, never blocks)
- **This user:** `plan-rules.md` creates expectation of blocking dynamic validation
  that the implementation cannot deliver
- **Result:** same plan quality failures repeat session after session

## Fix

Move the enforcement gate from PostToolUse hook → `gov-execute-plan` pre-flight:

1. `gov-execute-plan` already runs interactively and CAN block
2. Add a pre-flight step: read plan file, check against rules files, surface ❌ rows,
   require user to resolve before execution proceeds
3. `post-plan-validate-checklist.sh` remains advisory (correct for its hook context)
4. Promote template from `~/.kmgraph/knowledge/templates/` → `core/templates/` so it
   ships to all users

## Scope

- `skills/gov-execute-plan.md` — add pre-flight validation step
- `core/templates/post-plan-validation-checklist.md` — promote from user-level
- `scripts/post-plan-validate-checklist.sh` — update comment to clarify advisory intent
- `plan-rules.md` (user-level) — update to reflect actual enforcement point

## Related

- **ENH-015** — shipped the advisory stub; this bug tracks what was deferred
- **ADR-049** — Review Audit Protocol (post-plan/pre-push governance); enforcement design
  must stay consistent with decisions there
- **ADR-043** — PreToolUse hook injection for rule enforcement; the pattern here (hook →
  skill enforcement) applies to PostToolUse as well
- **issue-5** — sibling bug in same session; being fixed in same branch `v0.5.9.2`
- **GitHub Issue:** #125
