---
id: issue-42
type: test-cases
---

# Test Cases — issue-42

Covered by `tests/test-handoff-file-tracing-gate.sh` (5/5 passing after fix):

1. All manifest files opened (absolute paths both sides) → exit 0
2. Manifest file never opened → exit 2, block message names it
3. Multiple missing files → exit 2, block message names all of them
4. **(new, regression)** Manifest path is REPO_ROOT-relative
   (`./handoff-packages/...` shape, as `commands/kmg-handoff.md` actually writes
   it) but the transcript `Read` recorded it absolute → must exit 0, since the
   file genuinely was opened. This is the case that was broken before the fix
   and is the one none of tests 1-3 exercised.
5. Already-absolute manifest path (e.g. a `summary_file` outside the repo tree)
   left untouched by the REPO_ROOT anchor, still matches correctly → exit 0

## Manual verification performed this session

Ran the patched script directly against a real session transcript
(`3039d531-6a5f-4d04-ab81-7d97f2ab82c7.jsonl`, tidal-docs project) known to have
hit the false-positive block, using its actual manifest — confirmed exit 0
post-fix vs. exit 2 pre-fix.

## Not covered / follow-up

- No test exercises a manifest path containing spaces or shell-special
  characters under the REPO_ROOT-anchored comparison — existing gap, not
  introduced by this fix.
