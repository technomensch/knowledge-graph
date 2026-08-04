# Solution Approach: ENH-056

## Direction

Investigate a hook-based completion-check mechanism, extending the pattern
already established in `scripts/pre-push-gate.sh` (Gates 2/3/5/6), so that
invoking a documented multi-step command can be verified against its expected
artifacts/side effects rather than relying solely on the model's adherence to
the command's prose instructions.

This spec deliberately stops short of a finalized design. The investigation
needs to answer, per command, at minimum:

1. **What counts as "done"?** Each command in `commands/*.md` needs its own
   completion criteria enumerated (e.g. for `kmg-start-issue-tracking`: spec
   file exists AND branch exists AND GitHub issue exists AND, if Mode 1/2,
   plan file exists). This is not uniform across commands the way "does this
   flag file exist" is uniform today.
2. **Where does the check fire?** Candidates include a `PreToolUse` hook on
   `git push` (matching the existing Gate 3/Gate 6 pattern), a `Stop` hook
   checking session-level completion state, or a dedicated flag-file-per-step
   pattern written incrementally as each step completes (so a partial run can
   be detected, not just an all-or-nothing check at the end).
3. **How is a genuinely-deferred/lightweight path distinguished from a
   silently-skipped one?** This is where issue-25's missing rule becomes load
   bearing — a hook cannot enforce "the full workflow ran" if there is no
   documented, agreed set of conditions under which the lightweight path is
   the *correct* choice. issue-25 should be resolved (or at least drafted)
   before or alongside implementation here, otherwise the hook will either
   over-fire on legitimate lightweight captures or under-fire because the
   distinction was never encoded.
4. **False-positive tolerance.** Gates 2/3/5/6 are cheap, deterministic, and
   rarely wrong. A per-command completion check risks being either too loose
   (misses real gaps) or too strict (blocks legitimate partial/deferred work,
   e.g. Mode 3 "Track only" in `kmg-start-issue-tracking`, which intentionally
   skips branch creation). Any implementation must account for the workflow's
   own legitimate modes, not just treat every unfinished step as a failure.

## Non-Goals for This Spec

- Not committing to a specific hook implementation, script, or per-command
  rule set here — that is scoping/implementation work for whenever this is
  picked up.
- Not resolving issue-25's rule gap here — that is a separate, cross-referenced
  piece of work this enhancement depends on but does not subsume.

## Suggested Next Steps (when implementation is scoped)

1. Resolve or draft issue-25's rule first.
2. Enumerate completion criteria for the highest-value commands first —
   `kmg-start-issue-tracking` and `kmg-handoff`/`kmg-session-summary` are the
   two with concrete, already-documented instances (this spec, issue-30).
3. Prototype one command's completion gate end-to-end before generalizing to
   a framework that covers all commands — avoid over-building a generic
   mechanism before it's proven on a single real case.
