---
id: issue-42
type: Bug
status: resolved
github-issue: "#213"
branch: v0.7.0-fix-handoff-gate-path-mismatch
resolved-on-branch: v0.7.0-fix-handoff-gate-path-mismatch
created: 2026-08-06
resolved: 2026-08-06
---

# Issue-42: handoff-file-tracing-gate.sh Hard-Blocked Every Session — Relative Manifest Paths Never Matched Absolute Read Paths

## Problem

`scripts/handoff-file-tracing-gate.sh` is a `Stop` hook (wired in `hooks/hooks.json`) that blocks session end if a handoff package's embedded file manifest names files the session never opened. Its manifest-vs-transcript comparison (line ~55, `grep -qxF`) did an exact-string match between the manifest's paths and the transcript's recorded `Read` paths.

The manifest is built by `commands/kmg-handoff.md:154` from `output_dir="./handoff-packages/$(date +%Y-%m-%d)"` — always relative to repo root. The `Read` tool always records an absolute path in the transcript. Relative can never exact-match absolute, so the gate reported every manifest file as "missing" and hard-blocked (`exit 2`) unconditionally, on every session that read a handoff package — even when every file genuinely was opened. This was live in `hooks.json`, actively firing on every session that touched a handoff package.

## Root Cause

Path-shape mismatch between the manifest writer and the transcript reader:

- Manifest paths: repo-root-relative (`./handoff-packages/...`), by construction in `commands/kmg-handoff.md:154`.
- Transcript `Read` entries: always absolute.
- The gate's comparison (`grep -qxF`, exact string match) never accounted for this — a relative string can never equal an absolute string under exact match, so every manifest entry registered as "missing" regardless of whether the file was actually opened.

## Fix (implemented)

`scripts/handoff-file-tracing-gate.sh` now resolves `REPO_ROOT="${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"` — the same convention already used by `scripts/check-github-issue-sync.sh` and `scripts/pre-push-gate.sh` — and anchors each relative manifest path at `REPO_ROOT` before comparing it against the absolute `READ_FILES` entries collected from the transcript. An already-absolute manifest path is left untouched.

## Test Coverage (why this shipped past "4/4 passing")

Added a 5th regression test to `tests/test-handoff-file-tracing-gate.sh` that specifically exercises a REPO_ROOT-relative manifest path against an absolute Read path. The first 3 existing tests all used already-absolute paths on both sides (via `$TEST_DIR/a.md`), which is exactly why this bug shipped past a "4/4 passing" test suite in the first place — none of the existing tests exercised the real-world path shape the manifest actually produces. `bash tests/test-handoff-file-tracing-gate.sh` now reports 5/5 passing.

## Related

- This hook was **ADR-068**'s pilot ([ADR-068](../../decisions/ADR-068-lightweight-vs-full-workflow-rule-and-piloted-command-completion-check.md)), landed via `knowledge/plans/v0.7.0-c3-adr-068-pilot.md`, closing part of [issue-33](../issue-33/issue-33-description.md)'s first gap (pointer-layer-only reading).
- [issue-33](../issue-33/issue-33-description.md) — this is a **regression discovered in that same mechanism**, not a reopening of issue-33. issue-33 itself remains `deferred` (its second gap, buried recommendations not promoted to checklists, is unrelated and still open).
- `scripts/handoff-file-tracing-gate.sh` — the fixed hook
- `tests/test-handoff-file-tracing-gate.sh` — the expanded regression suite (5/5 passing)
- `commands/kmg-handoff.md:154` — where the manifest's relative `output_dir` originates
- [issue-43](../issue-43/issue-43-description.md) — follow-on gap found 2026-08-10: this fix's `REPO_ROOT` anchor (`CLAUDE_PROJECT_DIR`) resolves to the main repo, not a git worktree, reproducing the same mismatch shape inside worktree sessions
