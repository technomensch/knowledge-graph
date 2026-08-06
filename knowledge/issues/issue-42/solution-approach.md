---
id: issue-42
type: solution-approach
---

# Solution Approach — issue-42

## Fix

Anchor `handoff-file-tracing-gate.sh`'s manifest paths at `REPO_ROOT` before comparing
against the transcript's absolute `Read` paths, using the same `REPO_ROOT` resolution
already established in `check-github-issue-sync.sh` and `pre-push-gate.sh`:

```bash
REPO_ROOT="${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"
```

For each manifest entry: if it already starts with `/`, leave it untouched (a
`summary_file` pointing outside the repo tree is valid); otherwise strip a leading
`./` and prefix with `REPO_ROOT` before the `grep -qxF` exact-match against
`READ_FILES`.

## Alternatives considered

- **Suffix/basename match** (`grep -qE "(^|/)$(escaped_path)\$"`) — this was the
  fix drafted mid-session against the *installed plugin cache* copy before the user
  stopped that approach. Rejected here too: a suffix match can false-positive if two
  differently-rooted files share a tail (e.g. two repos both containing
  `docs/START-HERE.md`), which the REPO_ROOT-anchor approach doesn't risk since it
  reconstructs the exact expected absolute path.
- **Normalize `READ_FILES` to relative instead of the manifest to absolute** — rejected
  because `REPO_ROOT` is already the trusted anchor point used elsewhere in this repo's
  hook scripts; anchoring the manifest (the untrusted/derived side) to it is the
  smaller, more consistent change.

## Why this shipped past a passing test suite

The original 3 tests in `tests/test-handoff-file-tracing-gate.sh` all constructed
manifest paths as already-absolute (`$TEST_DIR/a.md`), which never exercises the
real shape `commands/kmg-handoff.md:154` actually produces
(`./handoff-packages/$(date +%Y-%m-%d)/...`, relative). Test 4 (added in the fix
commit) reproduces the real shape.

## Related

- [issue-42-description.md](issue-42-description.md)
- [ADR-068](../../decisions/ADR-068-lightweight-vs-full-workflow-rule-and-piloted-command-completion-check.md) — the pilot mechanism this is a regression in
- [issue-33](../issue-33/issue-33-description.md) — unrelated, still deferred
