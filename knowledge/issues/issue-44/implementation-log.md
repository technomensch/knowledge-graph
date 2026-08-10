---
id: issue-44
type: implementation-log
---

# Implementation Log — issue-44

**2026-08-10** — Third gap in the handoff-file-tracing-gate.sh saga, same day as
issue-43's fix landed. A separate session (tidal-docs, worktree
`c13-phase5-7-quick-wins`) hit the gate again post-issue-43: a tracked
session-summary file resolved correctly (confirming issue-43's fix works), but two
`handoff-packages/` files remained permanently unsatisfiable regardless of retry —
`ls handoff-packages/2026-08-10/` inside that worktree returned "No such file or
directory." Diagnosed (and independently re-verified in this session) as
`handoff-packages/` being gitignored, so `git worktree add` never checks it out —
the package had been generated in the main checkout, not that worktree.

Tracked as issue-44/#217. This time, per explicit correction from a prior
misunderstanding on issue-43 (the user meant "Fable reviews/validates, I
implement" — not "Fable does everything end-to-end"), Fable was dispatched
review-only, with instructions not to edit any files. Its report:
- Confirmed the root-cause claim empirically (built a real throwaway fixture, not
  just reasoned about git worktree semantics).
- Found the originally-drafted fix (`git rev-parse --git-common-dir` fallback) had
  a latent bug — bare `dirname` on its relative output resolves against the wrong
  cwd — before it was ever implemented.
- Proposed a better fix: derive `PKG_ROOT` from `STARTHERE_PATH` (already
  transcript-verified to exist) instead of a fresh `git` call. Covers cross-worktree
  reads for free and avoids reintroducing a symlink-normalization risk.

Implemented directly (main session, not delegated) per the corrected workflow:
edited `scripts/handoff-file-tracing-gate.sh` per Fable's recommendation, added
Tests 6-7 to `tests/test-handoff-file-tracing-gate.sh`. First run of the new tests
had one failure (Test 7) — traced to a test-fixture naming mistake (used
`START-HERE-2.md`, which the gate's own `grep -F "START-HERE.md"` detector
correctly does not match), not a bug in the fix. Fixed the test, not the gate.
Suite now 9/9.

**Paperwork completed this pass:** solution-approach.md, test-cases.md, this log,
CHANGELOG entry, version sync to v0.7.1.2, branch pushed, PR #218 opened.

**2026-08-10 (round 2)** — Given this script's track record (three bugs in three
days, each shipping past a passing test suite), a `pr-review-toolkit:code-reviewer`
pass was run against the actual diff before merging #218 — not just against the
plan, which Fable had already validated. This is a deliberate change from
issue-42/43's workflow: plan-review alone hadn't been enough to catch this class of
bug, so review the code that actually got written too.

Found a real bug in round 1's fix: the `PKG_ROOT` fallback was gated on `[[ ! -f
"$resolved_manifest_file" ]]` (on-disk existence) instead of `READ_FILES`
membership. Reviewer built a fixture reproducing a false-block — two checkouts'
`handoff-packages/<date>/` directories collide on the same relative path (routine,
date-derived), a decoy file exists at `REPO_ROOT` but was never opened there, the
`-f` check found the decoy and never triggered the fallback, final comparison used
the wrong path and false-blocked. Confirmed via direct reproduction, not just
review commentary — reviewer ran the patched variant end-to-end before reporting.

Fixed by gating on `READ_FILES` membership instead of `-f`. Added Test 8
reproducing the reviewer's exact scenario as a permanent regression test. Suite now
10/10. CHANGELOG/README updated to reflect the corrected predicate.
