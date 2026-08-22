---
id: issue-52
type: Enhancement
status: deferred
github-issue: "#229"
branch: none
created: 2026-08-19
related_issues: ["issue-11"]
---

# issue-52: `superpowers:brainstorming`-Originated Specs Still Bypass `start-issue-tracking`'s GitHub-Issue Creation — Research a Flag/Keyword/Trigger to Close the Gap

## Problem

`commands/kmg-start-issue-tracking.md` Step 5.0 calls `gh issue create` and writes the
resulting number back into the spec's `github-issue:` frontmatter — this part of the
pipeline works and is verified working (see Prior Research below). But specs that
originate from a `superpowers:brainstorming` session and land directly in
`knowledge/issues/issue-N/` or `knowledge/enhancements/ENH-NNN/` **never invoke
`start-issue-tracking` at all**, so Step 5.0 never runs and the item is born with
`github_issue: null` (or, correctly per the existing convention, `github_issue: pending`)
with no automatic path to ever getting a real GitHub issue unless someone notices and
files one by hand.

This is not a bug in `start-issue-tracking` itself — the tool works correctly for
anything that goes through it. The gap is upstream: nothing during a brainstorming
session flags "this output should also get a GitHub issue" or routes the resulting spec
through the tool that would create one.

## Scope for This Issue (Track Only — Research, Not Implementation)

Per explicit user instruction: **this issue tracks the problem and captures prior
research for later reference. No branch, no plan, no implementation now.** When work on
this resumes, the task is to research and propose (not yet decide) one or more
mechanisms — a flag, a keyword/trigger phrase, a post-brainstorm hook, or some other
avenue — so that brainstorming-originated issues/ENHs reliably end up in sync with a real
GitHub issue, the way `start-issue-tracking`-originated ones already do.

Candidate directions worth researching (none committed to, purely for the eventual
planning session to evaluate):
- A required keyword/trigger in `superpowers:brainstorming`'s own output contract that
  hands off to `start-issue-tracking` (or a lighter-weight subset of it, e.g. just Step
  5.0) whenever the brainstorm's conclusion is "file this as an issue/ENH."
- A `kg_capture`-level flag (e.g. `metadata.needsGithubIssue: true`) that a capture call
  can set, checked by a session-end or pre-push hook that offers to run `gh issue create`
  for any spec still carrying it.
- A scan-and-prompt mechanism, similar in shape to `scripts/check-github-issue-sync.sh`
  (issue-11) but running earlier/interactively rather than only as a pre-push advisory —
  e.g. surfaced at session-wrap time so the gap is caught same-session, not discovered
  later by the push gate.
- Revisiting whether `pending` should have a TTL or a re-prompt cadence, rather than
  being a terminal state a spec can sit in indefinitely.

## Prior Research (carried over so this is quick to pick up later)

**GitHub issue #165** ("Issue-11: ENH specs missing GitHub issues due to brainstorm
capture bypass," filed and closed 2026-07-13) is the issue that investigated this exact
problem space and is the direct ancestor of this one. Its findings, verbatim from that
investigation:

- **Cause 1 (confirmed fixed):** `start-issue-tracking` never actually called
  `gh issue create` at all — Step 5 only ever called `gh pr create --draft`, dating back
  to `v0.0.5-alpha`. Filed as GitHub #124 / local `issue-5` (2026-05-28), fixed on branch
  `v0.5.9.2-fix-gh-issue-create` (closed 2026-05-30). Confirmed working after the fix:
  ENH-023 (created 2026-06-07, after the fix landed) has a real linked issue, `#130`.
  Casualties from before the fix: ENH-013 through ENH-022 (created 2026-05-21 through
  2026-05-29), all `github_issue: null` — the tool itself silently failed for those, not a
  brainstorm-bypass case.
- **Cause 2 (still open — this issue's actual subject):** ENH-024 onward, created
  2026-06-12 and later (well after the Cause-1 fix landed), still lack a real
  `github_issue`. The identified cause: these specs were captured via an ad hoc path —
  most likely `superpowers:brainstorming` output landing directly in
  `knowledge/enhancements/ENH-NNN/` — that never invokes `start-issue-tracking`'s Step 5.0
  at all. Nothing was broken; the creation path simply never routes through the step that
  would create the GitHub issue.
- **Decision made in #165 (still standing):** keep the dual `issue-N` / `ENH-NNN`
  taxonomy, do not unify them — unifying wouldn't fix Cause 2 anyway (the bypass is about
  which command created the spec, not which taxonomy it lands in) and the blast radius
  (6+ commands/skills, `kg_scaffold`, two template sets, doc rewrites) was judged
  disproportionate.
- **`github_issue: pending` was proposed here, not as a workaround — as the designed
  answer** for exactly the brainstorm-bypass case: "Require `github_issue: pending`
  marker on draft/brainstorm-originated specs before 'in progress' — distinguishing
  legitimate drafts from actual leaks." This became `scripts/check-github-issue-sync.sh`
  (built 2026-07-12/13 per `knowledge/issues/issue-11/issue-11-description.md`, commit
  `84f1f499`), which classifies every `knowledge/issues/*/` and `knowledge/enhancements/*/`
  folder as OK (real issue) / PENDING (`github_issue: pending`, legitimate draft) / GAP
  (leak), wired as Gate 4 of `scripts/pre-push-gate.sh`.
- **Explicitly deferred by #165 to a later decision, not resolved there:** "Decide
  whether ENH-013 through ENH-022 (Cause 1's historical casualties) need retroactive GH
  issues created now or are fine left as documented gaps."

**That deferred question was answered later**, in the session recorded at
`knowledge/sessions/2026-08-04-main.md` (`as_of_commit: f98af6db`), per its own "Decisions
Made" section: *"github-issue-sync scoped to open/deferred/proposed items only, per
explicit user instruction — fixed/resolved KG items do not get a mirrored GitHub issue."*
That same session filed 7 real retroactive issues (#205–#211) for the open/deferred items
that still lacked one (issue-30/33/40, ENH-053/054/055/058), and confirmed issue-34/35
(`status: fixed`) were correctly and deliberately left without one. Note: no raw
chat-history transcript for 2026-08-04 exists in this KG (only
`chat-history/2026-08-01-claude.md` and later; the 2026-08-04 session was never
extracted) — the session-summary record is the only artifact of that decision.

**Live recurrence confirmed today (2026-08-19):** branch `v0.7.2-issues-46-51`'s
push-gate flagged 9 more folders with `github_issue`/`github-issue: null`
(`ENH-057`, `ENH-059`, `issue-34`, `issue-35`, `issue-37`, `issue-41`, `issue-49`,
`issue-50`, `issue-51`) — the same Cause 2 pattern, three-plus weeks after the last
cleanup pass. All 9 were set to `github_issue: pending` per the standing 2026-08-04
policy (no real issues filed for the now-`resolved`/`fixed` ones among them: issue-34,
issue-35, issue-49, issue-50, issue-51). This confirms the gap `#165` identified is
still live and still has no automated mitigation beyond the pending-marker/pre-push-gate
advisory pattern — it still relies entirely on someone noticing the gate output and
manually triaging, same as every prior occurrence.

## Related

- [issue-11](../issue-11/issue-11-description.md) — the github-issue-sync invariant
  (`scripts/check-github-issue-sync.sh`, Gate 4) this issue's problem space grew out of;
  GitHub #165 is issue-11's own filed issue and the direct source of the research above.
- [ENH-052](../../enhancements/ENH-052/ENH-052-specification.md) — the broader
  "internal paperwork drifts silently, nothing catches it" pattern family; github-issue-sync
  (issue-11 / Gate 4) is one of the specific mechanisms it names.
- GitHub #165 — "Issue-11: ENH specs missing GitHub issues due to brainstorm capture
  bypass" (filed + closed 2026-07-13) — full root-cause investigation this issue extends.
- GitHub #124 / local `issue-5` — Cause 1's bug and fix (`start-issue-tracking` never
  called `gh issue create`), closed 2026-05-30.
- GitHub #130 — ENH-023, confirms the Cause-1 fix worked.
- `knowledge/sessions/2026-08-04-main.md` (commit `f98af6db`) — the "open/deferred/proposed
  only" scoping decision for retroactive issue-filing.
- `scripts/check-github-issue-sync.sh` / `scripts/pre-push-gate.sh` Gate 4 — the existing
  detection mechanism (advisory, pre-push only, no earlier catch point).
- `scripts/pre-push-gate.sh` hotspot: besides Gate 4 (above) and ENH-052 (above), also
  touched by [issue-13](../issue-13/issue-13-description.md), [issue-28](../issue-28/issue-28-description.md),
  and [ENH-056](../../enhancements/ENH-056/ENH-056-specification.md) — FYI for whoever
  touches this gate next.
- `commands/kmg-start-issue-tracking.md` hotspot: besides this issue's own Step 5.0 focus,
  also touched by issue-13 (above), [issue-19](../issue-19/issue-19-description.md), and
  [issue-26](../issue-26/issue-26-description.md) — same command surface, FYI.

## Reported By

Surfaced 2026-08-19 while resolving a fresh recurrence of the same `github_issue: null`
pattern on `v0.7.2-issues-46-51` (9 folders). User specifically recalled filing an issue
before to get this "fixed" (GitHub #165) and asked for a `kg_search` recall to trace the
exact prior decision — that research is captured above so a future planning session
doesn't have to redo it.
