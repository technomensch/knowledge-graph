---
id: ENH-056
type: Hardening
status: tracked
github-issue: "#199"
branch: none
created: 2026-07-28
related_issues: ["issue-25", "issue-30", "issue-33", "issue-34", "issue-35"]
related_enhs: ["ENH-052", "ENH-058"]
related_adrs: ["ADR-043", "ADR-050", "ADR-068"]
---

**Retyped `Enhancement` → `Hardening` (2026-08-01):** this work hardens existing documented behavior that isn't being enforced; it doesn't add new capability. Stays the umbrella tracking artifact (GitHub #199 preserved) — the actual mechanism design now lives in [ADR-068](../../decisions/ADR-068-lightweight-vs-full-workflow-rule-and-piloted-command-completion-check.md), which also resolves issue-25 (a blocking dependency for this enhancement's AC-3/AC-4) and pilots a fix for issue-33 (instance #3 below).

**Pilot implemented (2026-08-01):** ADR-068's Half B shipped — `scripts/handoff-file-tracing-gate.sh`, a hard-stop `Stop` hook checking `commands/kmg-handoff.md`'s embedded manifest against the session's `Read` history. First ENH-056 instance closed. Instances #1 (`kmg-handoff` never invoking `kmg-session-summary`), #2, and #4 (`kmg-meta-issue` attempt logging) remain open, per ADR-068's explicit Non-Goal against generalizing this pilot into a framework.

# ENH-056: Commands/Workflows Documented as Multi-Step Processes Are Inconsistently Executed in Full

**Local ID:** ENH-056 | **GitHub Issue:** [#199](https://github.com/technomensch/knowledge-graph/issues/199)

## Problem Statement

Commands and workflows in this project are documented as multi-step, prose-based
processes in `commands/*.md`. There is no enforcement mechanism ensuring a given
command's documented steps are actually carried out in full when it is invoked —
only the model's own adherence to the prose. In practice, that adherence is
inconsistent: steps get silently abbreviated, skipped, or reduced to a lighter-weight
substitute, with no signal to the user (or a resuming session) that anything was
missed.

This is not hypothetical. Four concrete, independent instances have surfaced so far:

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

3. **Handoff/recall consumption reads only the pointer layer, not the linked
   source files (issue-33, `knowledge/issues/issue-33/issue-33-description.md`).**
   A session picking up work in a different project (`docs-readme-poc`) via a
   handoff/recall flow read only a top-level progress-tracker and README, and
   produced a "caught up" summary without tracing into the implementation log,
   root-cause-evolution notes, or full review reports those pointers
   referenced. The user caught it live: *"you only read the package, you
   didn't trace back and read the full context and linked files."* Same shape
   as instances #1 and #2 — a documented/expected step (read what you're
   pointed at) silently skipped, no signal to the user that anything was
   missed until they checked by hand.

4. **`docs-readme-poc`'s own meta-issue workflow gap recurred after already
   being "fixed" once.** That project's `README.md` documents that Attempts
   002-007 were hand-logged directly into `implementation-log.md` instead of
   via `/kmgraph:kmg-meta-issue --add-attempt`, and that their `attempts/NNN-*/`
   folders had to be scaffolded retroactively once the gap was noticed. As of
   2026-07-29, the same README now states, verbatim: *"This has not actually
   stopped happening. Attempts 009-012 were also hand-logged directly into
   `implementation-log.md` rather than scaffolded via `--add-attempt`, and as
   of this writing their `attempts/NNN-*/` folders do not exist."* This is the
   strongest instance so far because it isn't just a fresh occurrence of the
   pattern — it's the *same* gap, in the *same* project, recurring immediately
   after a manual, one-time correction, which is direct evidence a prose-only
   fix (retroactively scaffolding the missing folders, without changing why
   they went missing) doesn't hold. Also corroborates that this isn't specific
   to `knowledge-graph`'s own commands, per the user's framing below.
   **Remediation in progress as of 2026-07-29:** that session is
   retroactively scaffolding Attempts 009-012's `attempts/NNN-*/` folders in
   the same style as Attempt 007 (substantive summary + pointer to the
   analysis file, not a full re-paste), mirroring the Attempt-008 cleanup —
   findings/results go in the attempt they belong to, recommendations/
   decisions stay in the attempt that resolved them (013). This is a second
   manual patch of the same symptom, not a fix to the underlying enforcement
   gap this enhancement tracks — worth revisiting whether it holds this time
   once confirmed done.
   **Root cause, stated precisely:** `kmg-meta-issue` has no scaffold that
   captures attempt data as a side effect of doing the troubleshooting/patching
   itself — `--add-attempt`/`--log-attempt` is a separate command the model
   must remember to invoke *in addition to* the actual work, rather than
   something the work naturally produces. That's why the same gap recurs even
   after a manual retroactive fix: the fix re-populates missing folders, it
   doesn't change the fact that capture still depends on a remembered,
   detached step. This generalizes beyond this one instance — see the
   Proposed Direction note below on automatic-capture-during-work vs.
   after-the-fact completion checks.

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

**Two distinct mechanisms, not one — instance #4 sharpens this.** A
completion-check hook (the pre-push-gate style above) verifies *after the
fact* that a documented step happened. That's necessary but doesn't address
instance #4's root cause: `kmg-meta-issue`'s attempt data isn't captured *as
a side effect of doing the work* — logging an attempt is a separate,
detached command call competing with the model's attention during actual
troubleshooting, which is exactly the kind of prose-competing-for-attention
failure ADR-043/ADR-050 already found doesn't hold up. A structurally
different fix — auto-capture triggered by the tool calls/side effects that
already happen during troubleshooting (e.g., a hook on file writes under an
`attempts/` path, or on specific tool patterns recognizable as "starting a
new attempt") — would remove the remembered step entirely rather than just
checking whether it was remembered. **This is the recommended direction for
instance #4's class of gap specifically, not just an option alongside
verification:** a completion-check hook still depends on someone/something
noticing the check failed and manually re-fixing it, which is exactly the
"fixed once, recurred anyway" cycle instance #4 already lived through.
Auto-capture removes the failure mode at its root by making the capture step
unskippable rather than merely checkable. Both mechanisms are in scope for
this enhancement overall (some commands' completion criteria may not be
tied to a detectable tool-call pattern and will need the verification
approach instead), but where a command's "did the step happen" signal
*can* be derived automatically from the work's own side effects — as
`kmg-meta-issue`'s attempt-logging can — automation, not verification, is
the target design.

**Scope of what gets auto-captured, for `kmg-meta-issue` specifically:**
matching this project's own established two-file split per attempt
(`attempt-results.md` for what was found/done, `solution-approach.md` for
what's proposed next), auto-capture needs to cover **both** categories, not
just findings:
- **Attempt-results** — the substantive findings/data a completed attempt
  produced (what Attempt 007's scaffolded folder already does: a
  substantive summary plus a pointer to the full analysis file).
- **Recommendations** — the decisions/next-steps that attempt's findings led
  to, which per the user's own correction earlier belong in the *next*
  attempt's record, not folded back into the one that produced the findings
  (e.g., 013 carries the recommendations resolved from 009-012's findings,
  not 009-012 themselves).
Auto-capturing only findings and leaving recommendations to a remembered
manual write-up would just relocate the same gap one file over.

## Scope Note

This enhancement is the general, command/workflow-execution-completeness
version of a narrower problem `ENH-052` already tracks at the pre-push layer
specifically (KG internal-paperwork consistency — README index counts,
backlink symmetry, status accuracy). ENH-052's Gate 5/Gate 6 pattern is a
useful precedent for what a mechanically-checkable completion gate looks like,
but ENH-056's scope is broader: any documented multi-step command in
`commands/*.md`, not just paperwork-adjacent ones.

## Candidate Meta-Issue Attempt-Loop Prompt (revised 2026-07-30) — not yet adopted

A potential prompt/instruction set for the recurring "next attempt in a meta-issue" pattern, offered for consideration as part of this enhancement's hardening. Originally captured verbatim from a live session, then revised in place to close gaps this enhancement itself documents (naming the scaffold command instead of leaving it implicit — instance #4 above; pinning "highest model available" to this project's own tier vocabulary; adding `context-mode`/recall usage as reliability levers, not just efficiency ones — see rationale below the prompt). Not yet reviewed, adopted, or wired into any command:

> start here - knowledge/issues/<<meta-issue-name>>/README.md
>
> You are performing the next attempt in the series based on the results, findings, and recommendations captured during the previous attempt.
>
> Before starting, use `/kmgraph:kmg-auto-recall` (or the underlying recall mechanism) if available, to establish broader context from the rest of the graph — related issues, ADRs, past decisions elsewhere in the KG — as a supplement to, not a replacement for, this meta-issue's own README/paperwork trail, which remains the isolated, authoritative record for this specific attempt.
>
> Start the attempt via `/kmgraph:kmg-meta-issue --add-attempt NNN "short name"` (or `--log-attempt NNN "hypothesis"`) — do not hand-edit `implementation-log.md` directly.
>
> Throughout every step of the current attempt, you are to complete the paperwork explicitly required in the readme.
>
> You are only patching, and testing/validating the plan — you are not running the patch itself. You are also required to retest items flagged as passing in the previous attempt, to confirm they were not false positives.
>
> If necessary, you are to update the test-cases, or add new test cases, to validate any modifications made.
>
> Use the `context-mode` plugin (`ctx_batch_execute`/`ctx_search`/`ctx_execute_file`) throughout, to keep large tool/file outputs out of this attempt's own context window rather than reading them in directly.
>
> After patching the plan, ask the configured `powerful-tier` model for the active platform (per `~/.kmgraph/me.md`) for a review, which can include testing to validate, and recommendations to address any findings. It is not making any changes — it is a read-only test and review. It is also to check the existing test-cases to ensure that they are testing as expected, and recommend updates, and/or additions if required.
>
> Close out the attempt via the same `kmg-meta-issue` command, then stop.

**Known gap in the recall line above, verified 2026-07-30 (issue-34):** `kg_search`'s FTS5 index and its linear-scan fallback both currently omit `knowledge/issues/` and `knowledge/enhancements/` from the directories they cover — recall today can surface prior decisions/ADRs but not prior issues/enhancements, despite this prompt's assumption otherwise. The prompt line is written for the intended end state; `issue-34` tracks closing the gap so it's actually true.

**Why the recall/context-mode additions matter here specifically, not just as general hygiene:** this enhancement's own thesis is that documented steps get silently dropped under attention pressure (ADR-043/ADR-050), and a context window crowded with raw tool output or missing prior history is a plausible amplifier of that exact failure mode. Keeping context lean and front-loading relevant history are reliability levers for the specific failure class this enhancement tracks, not separate concerns.

## Related

- [ENH-058](../ENH-058/ENH-058-specification.md) — companion enhancement, design
  resolved 2026-08-01: at the 2nd consecutive failure of the same test, surfaces
  a plain-English side-by-side of the current and prior finding, tagged "not
  actually fixed" / "same issue, new instance" / "different sub-issue, same
  test" — a comparison for the person to judge, not a system-rendered
  recommendation, rather than another silent patch round.
- [issue-25](../../issues/issue-25/issue-25-description.md) — the undocumented
  lightweight-vs-full-workflow authority gap; a direct contributing cause of
  instance #2 above.
- [issue-30](../../issues/issue-30/issue-30-description.md) — `kmg-handoff` /
  `kmg-session-wrap` only reference `kmg-session-summary`, never invoke it;
  instance #1 above.
- [issue-33](../../issues/issue-33/issue-33-description.md) — handoff/recall
  consumption reads only the pointer layer, never traces into the linked
  source files it references; instance #3 above.
- [issue-34](../../issues/issue-34/issue-34-description.md) — `kg_search`/FTS5
  index never cover `knowledge/issues/` or `knowledge/enhancements/`; found
  while validating the candidate attempt-loop prompt's recall claim above.
- [issue-35](../../issues/issue-35/issue-35-description.md) — dead `"knowledge"`
  directory-list entry in the same two files, a recurrence of issue-31's
  stale-pre-migration-path pattern; found in the same investigation as issue-34.
- `docs-readme-poc` repo, `knowledge/issues/style-guide-required-sections-saga/`
  — the cross-project meta-issue that instance #4 above is drawn from;
  that repo has reportedly filed its own issue for this same auto-capture
  gap. **Not yet located/linked precisely as of 2026-07-29** — backfill the
  exact sub-path/issue reference here once that work is done.
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
