---
id: issue-44
type: solution-approach
---

# Solution Approach — issue-44

## Fix

`scripts/handoff-file-tracing-gate.sh` derives `PKG_ROOT` from `STARTHERE_PATH` —
the transcript's own absolute `Read` path for the `START-HERE.md`-pattern file that
was actually opened this session (already verified to exist on disk at line 58,
pre-existing code). When a manifest file's `REPO_ROOT`-anchored path doesn't exist
on disk, the loop falls back to `PKG_ROOT` before giving up on that entry.

## Alternatives considered

- **`git -C "$HOOK_CWD" rev-parse --git-common-dir`'s parent directory** (the
  originally drafted approach, in the plan file) — rejected after review. Two
  problems found: (1) plain (non-`--path-format=absolute`) output is *relative*
  from the main checkout context (`.git` or `../.git`), so a bare `dirname` would
  resolve relative to the hook *process's* cwd, not `HOOK_CWD` — the exact class of
  bug issue-43 fixed, reintroduced in the fallback path itself. Would need
  `--path-format=absolute` (git ≥2.31) or manual `HOOK_CWD` prefixing to be
  correct. (2) Even corrected, only covers "generated in main, read from a
  worktree" — not cross-worktree reads (worktree A generates, worktree B reads),
  which `STARTHERE_PATH`-derived `PKG_ROOT` covers automatically since it doesn't
  care which kind of checkout the package lives in.
- **General N-worktree search** (check every known worktree, not just main) —
  unnecessary once `PKG_ROOT` is derived directly from where the file actually was
  opened; there's no "which root" search to perform.

## Why this shipped past issue-43's fix

issue-43's regression test (Test 5) creates `handoff-packages/` *inside* the
fixture worktree — a valid test of "does REPO_ROOT resolve to the worktree
correctly," but it doesn't reproduce the gitignore-exclusion condition (the
fixture's `handoff-packages/` was never gitignored in that test, so nothing
prevented it from being present). issue-44's fixture (Test 6) adds a `.gitignore`
excluding `handoff-packages/` in the fixture's main checkout and confirms via an
explicit assertion that the worktree fixture does NOT have it — matching the real
failure condition.

## Related

- [issue-44-description.md](issue-44-description.md)
- [issue-43](../issue-43/issue-43-description.md) — confirmed still correct for tracked files; this issue is additive, not a revert
- [ADR-068](../../decisions/ADR-068-lightweight-vs-full-workflow-rule-and-piloted-command-completion-check.md) — the pilot mechanism all three issues (42/43/44) are gaps in
