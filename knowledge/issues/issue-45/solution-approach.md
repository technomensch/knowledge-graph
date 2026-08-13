# Solution Approach — Issue-45

## Principle

Prose enforcement has failed 3x in one instance. The fix is a mechanical, grep-able check, not
another reminder. (A one-line explicit rule in the scaffold template is worth adding too, but
only as something for the mechanical check to *cite* — it is not the fix itself.)

## Proposed Scope (from the original report, not yet re-validated against current skill internals)

1. **Folder ↔ log-header invariant.** For every `knowledge/issues/*/attempts/NNN-*/` folder in
   the changed/relevant scope, verify a matching `^## Attempt NNN` header exists in that issue's
   `implementation-log.md`. Flag mismatches (folder with no header, or — worth checking during
   planning — header with no folder, the inverse drift).
2. **README size guardrail.** In the same check, flag any single numbered item in a meta-issue
   README's `## Attempts` list whose entry exceeds roughly 1,500–2,000 characters. Calibration
   points from the real instance: the manually-trimmed Attempt-15 entry landed at ~1,350 chars;
   the prior largest *legitimate* entry was 1,708 chars.
3. **Placement.** `scripts/pre-push-gate.sh` is dev-only tooling for this source repo — it is not
   shipped to consumer repos, so it cannot be assumed present. The check must be self-contained
   in whatever ships to consumers, most likely `skills/kmg-paperwork-audit/SKILL.md` (it already
   owns the "checks Gate 5 doesn't do mechanically" scope boundary and already runs on the same
   pre-ship trigger set) — needs confirmation this is the right home vs. a new dedicated skill,
   during plan review.
4. **Template rule.** Add a one-line explicit rule (not just an implied-by-example placeholder)
   to `core/default-templates/meta-issue/README.md`'s `## Attempts` section — likely an HTML
   comment stating the one-line-per-attempt / pointer-to-`attempt-results.md` /
   pointer-to-`implementation-log.md` convention directly, so the mechanical check has something
   explicit to cite when it flags a violation.

## Open Questions for Plan Review

- Does this check only apply to meta-issues (folders with `attempts/`), or to every
  `knowledge/issues/*`? (Regular non-meta issues don't have an `attempts/` subfolder at all in
  this repo's own convention — confirm scope is meta-issue-only.)
- Should the check run repo-wide (every meta-issue) or scoped to the current branch's diff, matching
  `kmg-paperwork-audit`'s existing Step 1 diff-scoping method?
- Is a bash-only implementation (grep/find, no LLM judgment needed for the folder/header
  invariant) feasible entirely within the skill doc's existing bash-snippet pattern, or does it
  need agent-side file listing since skills describe behavior for the agent to execute rather than
  ship their own interpreter?

## Resolution (2026-08-13)

All four open questions answered during plan review, see
`knowledge/plans/v0.7.1.4-issue-45-meta-issue-attempts-paperwork-drift.md` for full detail and the
tested scripts:

- Scope: meta-issue only, detected as `attempts/` directory **or** `## Attempt N` headers present
  (either alone was a blind spot against real fixtures in this repo).
- Full repo-wide scan every run, not diff-scoped — drift can predate the current branch.
- Bash-only (grep/find/awk), no agent-side judgment needed; confirmed feasible and landed as a new
  Step 5 in `skills/kmg-paperwork-audit/SKILL.md`.
- Threshold landed at a flat 2,000 chars rather than the original 1,500-2,000 range — the
  tidal-docs calibration data isn't independently verifiable from this repo, and the real failure
  (13,194 chars) is far enough past any threshold in that range that precision doesn't matter.
