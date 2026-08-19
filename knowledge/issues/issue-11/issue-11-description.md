---
id: issue-11
type: Hardening
status: tracked
github-issue: "#165"
branch: v0.6.18-misc-patches (deferred — not yet created; this work lands as an additional commit once c0 creates it)
created: 2026-07-11
related-adrs: []
related-enhs: [ENH-027]
---

# Issue-11: Two distinct, undiagnosed causes behind ENH specs missing a real GitHub issue link

## Problem

Of ~42 ENH specs in `knowledge/enhancements/`, only 5 (ENH-002, 005, 006, 009, 023) carry
a real `github_issue` value. Every other one is either `github_issue: null` in frontmatter,
or (ENH-026 onward) doesn't carry the field at all. Investigated 2026-07-11 while looking
into ENH-042 (release-doc-sync gaps); the missing-issue pattern turns out to have **two
distinct root causes**, not one, previously conflated as "these should have gone through
`start-issue-tracking` instead."

### Cause 1 (resolved): `start-issue-tracking` never called `gh issue create`

GitHub issue #124 / local `issue-5` (filed 2026-05-28, closed 2026-05-30, fixed on branch
`v0.5.9.2-fix-gh-issue-create`): the `start-issue-tracking` skill documented a "CRITICAL
RULE" about GitHub issue creation and populated a `github-issue` frontmatter field in
every spec — but Step 5 of the command only ever called `gh pr create --draft`. The actual
`gh issue create` call was never written into the execution steps, dating back to
`v0.0.5-alpha`.

**Confirmed casualties:** ENH-013 through ENH-022 (created 2026-05-21 through 2026-05-29,
all before the 2026-05-30 fix) — all `github_issue: null`. These almost certainly *did* go
through `start-issue-tracking` correctly; the tool itself silently failed to create the
issue. Not a process bypass.

**Confirmed fix worked:** ENH-023 (created 2026-06-07, after the fix) has a real issue,
`#130`.

### Cause 2 (still open): later ENHs bypass `start-issue-tracking` entirely

ENH-024 onward (created 2026-06-12+, well after the Cause-1 fix landed) still lack a real
`github_issue` — for these, the bug is not the explanation (already fixed by then). The
more plausible cause: these specs were captured via an ad hoc path — most likely
`superpowers:brainstorming` output landing directly in `knowledge/enhancements/ENH-NNN/`
— that never invokes `start-issue-tracking`'s Step 5.0 (GH issue creation) or its Step 6.4
(ROADMAP/CHANGELOG sync gate) at all.

**Cross-linked, not merged, to [ENH-027](../../enhancements/ENH-027/ENH-027-specification.md)**
("Superpowers Brainstorming Spec → KG Linkage") — ENH-027 already documents half of this
same root cause (brainstorming specs land as orphaned files, disconnected from the KG),
but scopes only the *linkage* problem, not the *missing-GitHub-issue-and-Step-6.4-sync*
problem this issue documents. Kept separate deliberately: ENH-027 is about connecting a
spec to its parent artifact; this issue is about a spec never getting a GitHub issue or
sync gate at all, regardless of parent-linkage.

## Meta-note on how this was found

This finding was nearly mishandled in real time: after diagnosing it, the initial instinct
was to silently broaden ENH-027's scope in place (a direct edit, no new GitHub issue, no
Step 6.4 gate) — which would have been the exact Cause-2 bypass pattern being diagnosed,
committed live while diagnosing it. Caught and redirected to file this properly via
`/kmgraph:kmg-start-issue-tracking` instead.

## Evidence

```bash
grep -n "github_issue\|created:" knowledge/enhancements/*/*-specification.md
gh issue view 124 --json body,createdAt,closedAt
gh issue list --state all --limit 200 --json number,title,state
```

## Deeper root-cause investigation (2026-07-11/12): is the dual taxonomy itself the problem?

Before scoping a fix, investigated whether the real root cause is deeper than Cause 2 —
specifically, whether having two separate local taxonomies (`issues/issue-N/` vs
`enhancements/ENH-NNN/`, each its own ID sequence) is itself the design flaw, since GitHub
only has one object type ("Issue") with labels distinguishing type.

**Archaeology performed:** traced the origin of the local `ENH-NNN` scheme back through
this project's lineage (two earlier, pre-kmgraph repos: `optimize-my-resume` and
`Resume_Analyzer_Optimizer`, both under `~/GitHub/`). Checked git log, chat-history
(raw and curated), session summaries, ADRs, lessons-learned, and plan files in both repos,
plus this project's own published user-facing docs (`docs/reference/command-guide.md`,
`docs/TRACK-ISSUES.md`, `docs/examples/lessons-learned/process/Example_Identifier_Decoupling.md`)
and 7 other doc-hosting repos. **No design rationale for the split was ever found** — the
closest artifact is the Dual-ID Policy lesson (2026-01-29), which addresses a different
question (local ID vs. external platform ID mapping) and simply states `issue-N` or
`ENH-NNN` as two accepted local formats without justifying the duality. The actual origin
traces to `optimize-my-resume` commit `2ade748` (2026-01-25, "docs(ENH-001): create
enhancement tracking..."), where the assistant's own thinking block reads *"the issues go
up to 84, but this is an enhancement so I'll use ENH-001"* — an undiscussed, on-the-spot
choice, not a deliberate decision, made even though a plan file for that same work
(`v9.2.7-issue-79-error-handling.md`) treated "Issue #79" and "Enhancement: ENH-001" as
two label fields on one unified plan/branch/commit. Checked the real GitHub issues from
that lineage directly (`gh issue list`) and confirmed GitHub itself was never split —
every item uses one issue-number sequence (`#86`, `#97`, `#99`...) with `bug`/`enhancement`
labels; `ENH-NNN` strings only ever existed as decorative text inside issue titles. User
independently recalls a deliberate discussion existed but confirms it is not recoverable
from any available source — **treated as lost, not resolved.**

## Decision (2026-07-11/12)

**History is not touched.** Existing `ENH-NNN` and `issue-N` folders stay exactly as-is —
per the project's own established principle (Dual-ID Policy lesson: "never rename a local
folder to match an external ID"), retroactively unifying old folders would violate that
same principle in the other direction.

**Going forward: keep the dual taxonomy, do not unify.** Considered and rejected unifying
to one `issue-N` sequence with type-as-label (matching GitHub's real model). Rejected
because: (1) it does not fix the actual harm — Cause 2 is a bypass around the sync/GH-issue
gate, not a consequence of having two folder names; a unified scheme with the same bypass
still produces invisible, unsynced items, just under one name instead of two; (2) given the
no-history-migration constraint, unifying would add a **third** regime (old `issue-N`, old
`ENH-NNN`, new unified `issue-N`+label) rather than eliminating the existing two — every
tool that reads these folders must still handle all three forever, so the promised
simplification is unreachable; (3) blast radius is large and disproportionate to the
benefit: 6+ commands/skills, the `kg_scaffold` MCP tool, two template sets, doc rewrites,
and a new ADR reversing a previously-established convention, for a distributed plugin
already installed by other users.

Independent second opinion obtained (Claude Fable, briefed neutrally on both options)
concurred: fix the gate, do not unify; recommended going further than a command-flow gate
— see Proposed Scope below.

## Proposed Scope (for the implementation plan)

1. **Do not implement command-flow-only gating.** A gate wired into
   `kmg-start-issue-tracking`'s Step 5.0/6.4 flow only fires when that exact command is
   invoked — precisely what got bypassed here, and will be bypassed again by the next
   lightweight capture path (matches this project's own recorded finding that
   "recommendation conversations bypass all gates").
2. **Implement a scan-based structural invariant instead:** any folder under
   `knowledge/issues/` or `knowledge/enhancements/` lacking a populated `github_issue`
   (non-null, non-`"#N"` placeholder) frontmatter field is flagged — runnable as a
   standalone check (session hook and/or CI), not dependent on which command created the
   folder.
3. **Require a `github_issue: pending` marker** on any draft/brainstorm-originated spec
   before it's considered "in progress" — so legitimate in-flight drafts are distinguishable
   from actual leaks (folders that should have synced but silently didn't).
4. Confirm whether ENH-024 through the present were in fact authored via
   `superpowers:brainstorming` bypass (spot-check a few for origin), to validate the scan
   would have caught them.
5. Decide whether ENH-013 through ENH-022 (Cause 1's historical casualties) need retroactive
   GH issues created now (backfill) or are fine left as documented historical gaps — the
   scan-based check should distinguish "pre-existing historical gap" from "new leak" so it
   doesn't flag the entire backlog on first run.
6. `ENH-027`'s own fix (recall-based parent linkage) proceeds independently — this issue's
   scan-based gate and ENH-027's linkage routing are complementary, not overlapping.

## Related

- [ENH-027](../../enhancements/ENH-027/ENH-027-specification.md) — cross-linked, KG-linkage half of this same root cause
- GitHub #124 / local `issue-5` — the Cause-1 bug and its fix
- GitHub #130 — ENH-023, confirms the Cause-1 fix worked
- `knowledge/analysis/outstanding-items-inventory-2026-07-11.md` — broader sweep this finding emerged from
- [ENH-052](../../enhancements/ENH-052/ENH-052-specification.md) — cites this issue's `pre-push-gate.sh` Gate 4 as the github-issue-sync invariant, one of the mechanisms in its "internal paperwork drifts silently, nothing catches it" pattern family. Backlinked 2026-08-19.
- [issue-13](../issue-13/issue-13-description.md) — cites this issue's Gate 4 as "unrelated to docs content," distinguishing it from the missing docs-build gate issue-13 identifies. Backlinked 2026-08-19.
