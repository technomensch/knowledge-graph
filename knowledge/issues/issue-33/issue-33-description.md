---
id: issue-33
type: Hardening
status: deferred
github-issue: "#206"
branch: none
created: 2026-07-29
---

# issue-33: Handoff/Recall Commands Don't Require Tracing Linked Files — Sessions Read Only the Pointer Layer

## Problem

Observed live 2026-07-29 in a `docs-readme-poc` session picking up work via a handoff/recall flow. The session read only the top-level package files (a progress-tracker and a README) and produced a summary — but had not traced back into the actual linked source files the package pointed to (implementation logs, root-cause evolution notes, review reports, the session summary itself). The user caught this explicitly: *"you only read the package, you didn't trace back and read the full context and linked files."*

The failure mode: commands/skills that hand off or recall context (handoff packages, session summaries, issue trackers) currently present a TL;DR/pointer layer as if it were sufficient, with no explicit requirement that the model actually open and read what those pointers reference before acting or summarizing. A session can read the pointer layer, sound fully caught up, and still be working from an incomplete or wrong picture — because pointers were never dereferenced.

## Evidence: what full tracing surfaced vs. what pointer-only reading missed

After being corrected, the same session traced the full chain — README, description.md, implementation-log.md (all 12 attempts), root-cause-evolution.md (all 8 belief shifts), workflow-automation-spec.md, progress-tracker.md, both full verbatim review reports (Fable's agenda review, Codex's test-code/implementation review), plus both handoff-package docs (ARCHITECTURE-SNAPSHOT, DOCUMENTATION-MAP). Corrections/additions that surfaced only after that full trace, not from the pointer layer:

- Not "one more bug pass" — twelve attempts deep, the actual pattern is that every fix validated only against the specific checks that just failed gets caught by a differently-scoped check next round. That's recurred at least 4 times (5 judgment checks → required sections → mis-disposition → patch1_c1 itself needing review beyond self-review). The workflow-automation-spec explicitly warns against declaring "one more round" sufficient — it specifies a 2-consecutive-clean-passes counter, not 1.
- Codex's 16-item punch list is concrete and prioritized — items 1-8 are new/corrected code findings from this pass, items 9-15 restate/reconfirm Fable's agenda gaps, item 16 updates the Task 17 real-corpus smoke run. Item 1 (mixed valid+fabricated evidence spans passing silently) and item 7 (the code-fence/line-number bug) are the MUST-FIX blockers.
- Fable's separate agenda review flagged 3 open decisions blocking c2/c3 drafting regardless of c1's code state: supersession mechanism, c2-before-c3 ordering, and a concrete (not "well below 78%") resume threshold plus a named sign-off role. None of these three were resolved anywhere in the docs.
- ARCHITECTURE-SNAPSHOT confirms nothing from patch1_c1 exists in `scripts/` yet — it's 100% plan text, unmerged.

None of this changed the four candidate next steps already identified from the pointer layer — but the pointer layer alone gave headline descriptions with no actual substance behind them (no specific punch-list items, no specific open decisions), which is enough to misjudge readiness or urgency.

## Second, distinct gap found the same session: a linked file's recommendation not surfaced into the actionable checklist

Even after the full trace above, a follow-up check found the fix wasn't complete. `analysis/workflow-automation-spec.md` — a ready-to-build spec for automating the entire remaining patch-verify-repeat loop — was *mentioned* in the handoff's "Where to pick up work" section, but the actual actionable "Immediate next steps" checklist below it never listed "build the workflow" as an option. It just listed the 4 manual work threads as if they were the only way to proceed. This is why the traced summary above listed the 4 threads correctly but still never surfaced the workflow option — the file *had been read*, but its recommendation lived outside the checklist the reader actually acts from.

This is a different mechanism from the first gap (pointer-layer-only reading) and matters separately: tracing every linked file is necessary but not sufficient — a recommendation buried in background prose, rather than promoted into the actionable list, gets silently dropped even by a session that did open the file. Fixed live in that session by rewriting both `handoff-packages/2026-07-29/START-HERE.md` and the meta-issue's `README.md` "Next Steps" line so the workflow-spec option leads the checklist explicitly ("read `workflow-automation-spec.md` FIRST... building and running it is the recommended way to do the rest of this"), with the manual threads demoted to a fallback ("if you're not building the workflow yet, at minimum do the substance of Phase A by hand").

## Proposed Behavior

Two distinct fixes, not one:

1. Commands/skills in the handoff/recall family (`kmg-handoff`, `kmg-session-summary` consumption, issue/enhancement pickup flows) should make tracing linked source files a mandatory step before the model produces a "caught up" summary or proceeds to a recommendation — not an implicit expectation of the prose. A "Start-of-Session Reading" style checklist (as already used in this project's own session-summary docs) is the right *shape* for what "done" looks like here, but per ENH-056's own findings below, a checklist embedded in prose is not sufficient by itself.
2. Independently of whether every linked file gets traced, any actionable recommendation surfaced *inside* a linked file (e.g. "there's a ready-to-build automation spec, use it") needs to be promoted into the document's own actionable checklist, not left as a passing mention elsewhere in the prose — the second gap above shows a file can be read in full and its recommendation still get dropped if it isn't in the list the reader actually acts from.

**This is a third instance of ENH-056's pattern, not a standalone fix.** `ENH-056` (`knowledge/enhancements/ENH-056/ENH-056-specification.md`, filed 2026-07-28) already documents that commands/workflows described as multi-step prose processes are inconsistently executed in full, with two prior concrete instances (issue-30: `kmg-handoff`/`kmg-session-wrap` never actually invoke `kmg-session-summary`; and ENH-056's own first capture attempt skipping the very workflow it was describing). ENH-056 also already carries the hard-won lesson, backed by `ADR-043` and `ADR-050`, that prose-based instructions competing for attention inside a single command file are *not* reliably followed step-by-step — a deterministic hook, not more/better prose, is what actually worked for this failure class previously. This issue's "read the linked files" gap is the same shape of problem (a documented step silently skipped) and should be designed as part of ENH-056's completion-check mechanism, not as its own separate prose fix — otherwise it just becomes a fourth instance of the pattern it's trying to close.

## Notes

Captured live, lightweight, local-only — matching the precedent set for issue-30/ENH-053/054/055: small, deferred, "write it down" scope, not warranting branch+PR overhead. Originated in `docs-readme-poc`, filed here in `knowledge-graph`'s KG since that's this session's active project.

## Related

- `commands/kmg-handoff.md`
- `commands/kmg-session-summary.md`
- issue-30 (adjacent gap: handoff/wrap never auto-generate a session summary in the first place; also ENH-056's instance #1)
- **ENH-056** (`knowledge/enhancements/ENH-056/ENH-056-specification.md`) — the umbrella enhancement this issue is a third concrete instance of; any fix here should ride ENH-056's eventual deterministic-hook mechanism rather than being designed in isolation
- `ADR-043`, `ADR-050` — prior evidence that prose-based step enforcement doesn't reliably hold, cited via ENH-056

## Fix Design (2026-08-01)

**[ADR-068](../../decisions/ADR-068-lightweight-vs-full-workflow-rule-and-piloted-command-completion-check.md) (status: Proposed) pilots a fix for this issue's first gap** (pointer-layer-only reading) — a hard-stop check comparing a handoff/recall document's declared file list against everything actually opened (`Read` calls) across the full session, fail-open when no manifest exists. Scoped to a single pilot only, deliberately not a general framework (see ADR-068's Non-Goals) and deliberately not adopting `docs-readme-poc`'s heavier `ADR-023` precedent (independent second-agent verification, evidence citations) — this check has no judgment component, so that machinery isn't needed.

- [issue-42](../issue-42/issue-42-description.md) — regression found in this ADR-068 pilot mechanism itself (relative-vs-absolute path mismatch hard-blocked every session), not a reopening of this issue.
- [issue-43](../issue-43/issue-43-description.md) — follow-on gap found 2026-08-10 in the same pilot mechanism: `REPO_ROOT` anchoring (issue-42's fix) resolves to the main repo, not a git worktree, reproducing the same mismatch shape inside worktree sessions.

**This issue's second gap (buried recommendation not promoted to the checklist) remains unresolved** — ADR-068 explicitly defers it as judgment-shaped, out of scope for the pilot. Still open, tracked here.

**First gap resolved (2026-08-01)** via `knowledge/plans/v0.7.0-c3-adr-068-pilot.md` — `commands/kmg-handoff.md` now embeds a file manifest in generated `START-HERE.md`, and `scripts/handoff-file-tracing-gate.sh` hard-stops a session at `Stop` time if any manifest file wasn't opened. `status` stays `deferred` pending the second gap, since this issue isn't fully closed.
