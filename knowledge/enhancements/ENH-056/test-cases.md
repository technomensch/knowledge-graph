# Acceptance Criteria: ENH-056

This enhancement is tracked/deferred pending scoping of the hook mechanism
(see `solution-approach.md`). Acceptance criteria below describe the target
state once implemented; they are not yet testable against working code.

## AC-1: Per-command completion criteria documented
Each command in `commands/*.md` that has multiple mandatory steps has an
enumerated, checkable "definition of done" (file/artifact/side-effect list),
either inline in the command doc or in a companion spec.

## AC-2: At least one command has an enforced completion gate
At least one high-value command (e.g. `kmg-start-issue-tracking` or
`kmg-handoff`) has a working hook-based check (in the spirit of
`pre-push-gate.sh` Gates 3/6) that can detect a partial/incomplete run and
surface it to the user, rather than silently succeeding.

## AC-3: Legitimate lightweight/deferred paths are not falsely flagged
Modes/paths that intentionally skip steps (e.g. Mode 3 "Track only" in
`kmg-start-issue-tracking`, which intentionally has no branch) do not trip
the completion gate as if they were incomplete full-workflow runs. This
depends on issue-25's rule existing (or being drafted) to distinguish
"intentionally lightweight" from "workflow silently abbreviated."

## AC-4: issue-25 addressed or explicitly deferred with rationale
Either issue-25's lightweight-vs-full-workflow rule is resolved before this
enhancement ships its hook, or the implementation explicitly documents why it
proceeded without that rule (and what risk that leaves open).

## AC-5: No regression to existing pre-push gates
Any new hook-based mechanism added under this enhancement does not break or
slow down the existing Gate 2/3/5/6 checks in `scripts/pre-push-gate.sh`.
