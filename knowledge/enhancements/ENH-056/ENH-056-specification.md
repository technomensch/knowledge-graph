---
id: ENH-056
type: Enhancement
status: tracked
github-issue: "#N"
branch: issue/ENH-056-workflow-execution-completeness
created: 2026-07-28
related_issues: ["issue-25", "issue-30"]
related_enhs: ["ENH-052"]
related_adrs: ["ADR-043", "ADR-050"]
---

# ENH-056: Commands/Workflows Documented as Multi-Step Processes Are Inconsistently Executed in Full

**Local ID:** ENH-056 | **GitHub Issue:** #N (see frontmatter after creation)

## Problem Statement

Commands and workflows in this project are documented as multi-step, prose-based
processes in `commands/*.md`. There is no enforcement mechanism ensuring a given
command's documented steps are actually carried out in full when it is invoked —
only the model's own adherence to the prose. In practice, that adherence is
inconsistent: steps get silently abbreviated, skipped, or reduced to a lighter-weight
substitute, with no signal to the user (or a resuming session) that anything was
missed.

This is not hypothetical. Two concrete, independent instances surfaced in the same
session that produced this spec:

1. **`kmg-handoff` / `kmg-session-wrap` never generate a session summary
   (issue-30, `knowledge/issues/issue-30/issue-30-description.md`).**
   `commands/kmg-handoff.md` only *checks whether* a session summary exists for
   today and, if not, falls back to inline text pointing the user at
   `/kmgraph:kmg-session-summary` — it never invokes that command itself.
   `skills/kmg-session-wrap/` is a prompt-only skill: it suggests running the
   summary command, it doesn't run it. Both mechanisms a user would reasonably
   expect to "handle" the session-summary step turn out to only *reference* it.
   Found live, when `/kmgraph:kmg-handoff` was run with no summary existing for
   the day.

2. **This exact enhancement's own first capture attempt was itself an instance
   of the bug it describes.** When this cross-cutting pattern was first
   identified in-session, the assistant captured it as a lightweight,
   local-file-only note — no branch, no GitHub issue, no PR — rather than
   running the full `/kmgraph:kmg-start-issue-tracking` workflow that exists
   specifically for this purpose. The user caught this and asked for the full
   workflow to be run properly, filed as an Enhancement (which is how this
   ENH-056 spec itself came to be written the second time). This is a rare
   case where the bug demonstrated itself, live, in the same session that
   identified it — direct evidence, not a hypothetical extrapolation.

The user's own framing of the pattern, verbatim: *"I am noticing more and more
that commands and workflows are not being fully run when called. I think we
are going to need more hooks. examples include handoffs in other projects just
creating a one page handoff, not the workflow. the one just now where issues
are tracked but without the workflow, the git issue is not created."* — and
the user further noted this is not unique to this project; similar
command/workflow structures in other projects show the same symptom.

## Contributing Cause: The Two-Path Ambiguity (issue-25)

`issue-25` (`knowledge/issues/issue-25/issue-25-description.md`) already
documents a directly relevant, un-resolved gap: there is no rule distinguishing
when a lightweight, hand-written capture is acceptable versus when the full
`/kmgraph:kmg-start-issue-tracking` workflow must run. Both paths currently
claim the same territory (e.g. `knowledge/enhancements/ENH-NNN/`), with
materially different weight, and nothing adjudicates between them.

This is not a coincidental parallel — it is a direct contributing cause of
instance #2 above. Without a documented, followed rule for "when is lightweight
capture acceptable vs. when must the full workflow run," this exact class of
gap (silently taking the lighter path) will keep recurring regardless of any
hook-based enforcement added under this enhancement. issue-25 and ENH-056
should be treated as two halves of the same problem: issue-25 is the missing
*rule*, ENH-056 is the missing *enforcement* for when the rule (once it exists)
or the command's own documented steps are not followed.

## Proposed Direction (Not a Finalized Design)

The user's own suggested direction: **more hooks** — investigate whether a
hook-based completion-check mechanism, similar in spirit to the existing gates
in `scripts/pre-push-gate.sh`, could verify that invoking a given command
actually produced its expected artifacts/side effects, rather than relying on
the model faithfully executing every documented step in the command's prose.

This is explicitly framed as a direction to investigate, not a finalized
design, because it is materially harder than the gates that exist today:

- Today's `pre-push-gate.sh` gates check simple, generic booleans — does a
  flag file exist (Gate 3, Gate 6), does a version number match across files
  (Gate 2), does an index count match a directory count (Gate 5). These are
  mechanically checkable with no per-command knowledge baked in.
- Verifying "did `kmg-handoff` actually generate a linked session summary" or
  "did `kmg-start-issue-tracking` actually create a branch AND a GitHub issue
  AND a PR, not just a local file" requires **per-command-specific completion
  criteria** — a different check for each workflow's definition of "done" —
  not one generic mechanism that covers all commands uniformly.
- This project already has hard-won prior evidence that the *other* obvious
  fix — writing better prose, or adding more instructions to the command file
  — does not reliably solve this class of problem. `ADR-043` (PreToolUse hook
  injection for rule enforcement) and `ADR-050` (pre-push composite gate /
  inline recommendation gate, which formalized Gate 3's docs-impact-scan
  completion-flag pattern) both document that prose-based multi-step
  instructions competing for a model's attention inside a single command file
  are not reliably followed step-by-step — a structured checklist embedded in
  the same document tends to dominate attention and starve out steps that
  aren't part of that checklist's immediate focus. The fix that worked in both
  of those cases was a deterministic hook (a `PreToolUse` check on `git push`
  gated on a flag file written by the skill), not more documentation or more
  emphatic prose.

Any implementation under this enhancement should treat that lesson as load
bearing: whatever completion-check mechanism is designed needs to be
deterministic and mechanically verifiable per command (in the spirit of
Gates 2/3/5/6), not another layer of prose asking the model to remember to
check itself.

## Scope Note

This enhancement is the general, command/workflow-execution-completeness
version of a narrower problem `ENH-052` already tracks at the pre-push layer
specifically (KG internal-paperwork consistency — README index counts,
backlink symmetry, status accuracy). ENH-052's Gate 5/Gate 6 pattern is a
useful precedent for what a mechanically-checkable completion gate looks like,
but ENH-056's scope is broader: any documented multi-step command in
`commands/*.md`, not just paperwork-adjacent ones.

## Related

- [issue-25](../../issues/issue-25/issue-25-description.md) — the undocumented
  lightweight-vs-full-workflow authority gap; a direct contributing cause of
  instance #2 above.
- [issue-30](../../issues/issue-30/issue-30-description.md) — `kmg-handoff` /
  `kmg-session-wrap` only reference `kmg-session-summary`, never invoke it;
  instance #1 above.
- [ENH-052](../ENH-052/ENH-052-specification.md) — same general shape (documented
  process, no enforcement), scoped narrowly to pre-push KG paperwork
  consistency; its Gate 5/Gate 6 pattern in `scripts/pre-push-gate.sh` is
  relevant prior art for a mechanically-checkable completion gate.
- `ADR-043` (`knowledge/decisions/ADR-043-pretooluse-hook-injection-superpowers-rule-enforcement.md`)
  and `ADR-050` (`knowledge/decisions/ADR-050-pre-push-composite-gate-inline-recommendation-gate.md`)
  — prior, hard-won lesson that prose-based instructions are not reliably
  followed step-by-step; deterministic hooks, not more documentation, is what
  worked previously for this exact failure class.
- `scripts/pre-push-gate.sh` — existing gate implementation and header
  comments documenting the "why gates, not a smarter skill (ADR-043, ADR-050)"
  rationale directly.
