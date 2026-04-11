---
id: ENH-009
type: Hardening
status: IMPLEMENTED
github-issue: "#58"
branch: v0.2.3.4-beta
created: 2026-04-07
---

# ENH-009: start-issue-tracking — mode gate + pre-flight working-tree check

## Problem

`start-issue-tracking` treats tracking as a terminal state rather than a transition state. Two structural gaps:

1. **No mode selection gate** — the user has no way to explicitly choose between "Track then Implement", "Implement then Track", or "Track only (defer)". The current flow always assumes "Track then Implement" but provides no follow-through hook. When a user says "document only", implementation intent is left entirely in their head.

2. **No pre-flight working-tree check** — if uncommitted changes already exist that constitute a fix for the issue being tracked, they silently ride along into the tracking commit. The tracking commit and the implementation commit are conflated, and neither is clearly labelled as such. The user must ask "did you actually fix the issue?" to surface the ambiguity.

## Root Cause (Opus analysis, 2026-04-07)

The skill exits at "docs committed, branch pushed" — a terminal state. There is no successor action prompted or enforced. Mode 1 (Track then Implement) has no "Proceed to implementation now?" gate at exit. Mode 2 (Implement then Track) does not exist. Mode 3 (Track only) does not set a status flag that would surface the issue in backlog scans.

## Expected Behavior

### Mode Selection Gate (new Step 0.5, after snapshot gate)

After the session snapshot gate and before Step 1, present:

```
Issue scope identified. Choose workflow:

  [1] Track then Implement (default)
      Creates issue docs + branch, THEN you implement.
      Best for: unknown scope, needs planning, multi-phase work.

  [2] Implement then Track
      Fix already exists (or is trivial). Commits fix first,
      then generates issue docs retroactively referencing the fix commit.
      Best for: one-line fixes, hot patches, changes already in working tree.

  [3] Track only (defer implementation)
      Creates issue docs + GitHub issue. No branch created. Adds to backlog.
      Best for: deferred work, triage, reporting bugs you won't fix now.
```

**Mode 1 exit:** After Step 7 summary, add: "Proceed to implementation now? [y/N]" — if N, set `status: tracked-not-implemented` in issue description.

**Mode 2 entry:** Run pre-flight working-tree check first (see below). Commit implementation changes, then generate docs retroactively with fix commit hash recorded.

**Mode 3 exit:** Set `status: deferred` in issue description. No branch created. Issue surfaces in future backlog scans.

### Pre-flight Working-Tree Check (new Step 0.6, after mode selection)

Before creating any docs, check for uncommitted changes:

```bash
git status --porcelain
git diff --stat HEAD
```

If uncommitted changes exist:
- Display: "⚠️ Uncommitted changes detected in working tree."
- List the modified files
- Ask: "Do these changes relate to the issue being tracked?
  [y] Yes — commit as implementation before tracking
  [n] No — unrelated, continue
  [?] Not sure"
- If yes: commit the changes with a clear implementation commit message, then proceed to tracking
- If not sure: show diff summary and re-ask

### Status Field on Issue Description Template

Add `status:` field to all generated issue/enhancement description frontmatter:

```yaml
status: tracked | in-progress | implemented | deferred | tracked-not-implemented
```

### Exit Handoff Banner (new addition to Step 7)

After the existing Step 7 summary, always print:

```
Next actions:
  → To implement now:     say "Execute Step 1" or start implementation
  → To defer:             issue is flagged status: deferred
  → To update progress:   /kmgraph:update-issue-plan
  → To capture learning:  /kmgraph:capture-lesson
```

## Affected Files

- `commands/start-issue-tracking.md` — mode gate, pre-flight check, status field, exit banner
- Issue/enhancement description templates — add `status:` field

## Session Snapshot

See: `docs/sessions/2026-04/2026-04-07-session-snapshot-2026-04-06.md`
