---
title: "ENH-043: Session-Wrap Status-Alignment Verification"
number: 043
status: proposed
version_target: TBD
github_issue: 178
created: 2026-07-17
related_adrs: []
related_enhs: ["ENH-002"]
notes: "Same subsystem as ENH-002 (session-summary/session-wrap) but distinct scope: ENH-002 covers incremental snapshot accumulation across runs; this covers verifying that outstanding-item status characterizations are still accurate at wrap time. Linked, not merged, per knowledge/rules.md same-feature-area triage rule."
---

# ENH-043: Session-Wrap Status-Alignment Verification

**Local ID:** ENH-043 | **GitHub Issue:** #178

## Problem Statement

`/kmgraph:kmg-session-summary` and its underlying `session-summary-agent` produce a draft that lists outstanding items — GitHub issues, ADRs, plan items — and characterizes each by status (open, pending, in progress, etc.). The agent currently trusts whatever status it finds (a prior summary's characterization, an assumption carried forward, or a stale read) without re-verifying that the item still actually holds that status at the moment the summary is finalized.

### Motivating Context (observed 2026-07-17)

During a session, a draft session summary characterized several ADRs and issues by status. Separately, during the same session, issue-18 (GH #176) had its own priority/status assertion change mid-session — from an implied "broken, needs fixing" framing to an explicit "low-priority, non-destructive, no demand signal" reassessment. The summary format already distinguishes "Open Issues" as a pointer/index (referencing the issue doc as source of truth) rather than duplicating its content — but there is no step that actually re-verifies the pointer's characterization (status/priority) is still accurate at wrap time. Nothing catches the case where a summary's "Open Issues" pointer says one thing while the issue's own current state says another.

This is a "keep tracked state honest" gap: the summary can silently drift out of alignment with the artifacts it points to, and nothing flags the drift.

## Proposed Behavior

Before finalizing a session summary, `session-summary-agent` should verify that any GitHub issues, ADRs, or plan items mentioned as "open" / "pending" / "in progress" in the draft actually still hold that status, rather than trusting stale assumptions or copy-forwarding a previous summary's characterization without re-checking. Concretely, this could include:

- Checking GitHub issue state via `gh issue view` for any issue referenced in the draft's "Open Issues" section
- Checking ADR frontmatter `status` field for any ADR referenced as open/proposed/pending
- Flagging (not silently correcting) any mismatch between the draft's characterization and the current source-of-truth state, so the discrepancy is visible before the summary is finalized

## Needs Scoping Before Implementation

This enhancement is proposed at the concept level only. Before implementation, the following need to be decided:

- **What exactly counts as "alignment"?** Does this mean a live re-fetch of GH issue state via `gh issue view`, a re-read of ADR frontmatter `status` fields, or both?
- **Where in the `session-summary-agent` flow does this run?** As a dedicated step before finalization (analogous to existing gate/zone steps), or folded into the existing "Open Issues" section population step?
- **What happens on mismatch?** Auto-correct the characterization, flag it inline for the user to resolve, or block finalization until reconciled?
- **Scope of items checked** — all items ever mentioned, or only items in the current draft's Open Issues / Current State sections?
- **Cost/latency tradeoff** — re-fetching GH state for every referenced issue adds API calls per wrap; needs to stay within existing non-functional latency targets for session-summary (see ENH-002's non-functional requirements for precedent).

## Related

- **ENH-002:** Session Snapshot on Capture — same subsystem (session-summary / session-summary-agent), adjacent but distinct scope. ENH-002 covers incremental snapshot accumulation and append/synthesize behavior across runs; this ENH covers verifying that a single draft's status characterizations are still accurate before that draft is finalized. Linked via `related_enhs`, not merged, per the same-feature-area triage check in `knowledge/rules.md`.
- **issue-19 (GH #177):** Hook-level enforcement for issue-creation discipline (prior-art check, provenance). Same broad family of "keep tracked state honest" concerns as this ENH, but issue-19 addresses creation-time discipline while this ENH addresses wrap-time verification of already-tracked items.
- **Session:** 2026-07-17 — session in which the issue-18/#176 status-drift was observed live alongside session-summary drafting.
