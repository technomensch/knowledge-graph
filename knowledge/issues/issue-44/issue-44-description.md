---
id: issue-44
type: Bug
status: tracked
github-issue: "#217"
branch: v0.7.1.2-issue-44-worktree-gitignored-handoff-files
created: 2026-08-10
---

# Issue-44: `handoff-file-tracing-gate.sh` Structurally Can't Be Satisfied Inside a Worktree When Manifest Files Live Under Gitignored `handoff-packages/`

## Problem

Even after issue-43's worktree-aware `REPO_ROOT` fix (v0.7.1.1), a separate session
(`tidal-docs` project, worktree `.claude/worktrees/c13-phase5-7-quick-wins/`) hit the
same hard-block:

```
knowledge/sessions/2026-08/2026-08-07-v1.0_docs_0.0.10.1.md
handoff-packages/2026-08-10/DOCUMENTATION-MAP.md
handoff-packages/2026-08-10/ARCHITECTURE-SNAPSHOT.md
```

The tracked session-summary file resolved fine once opened at its worktree-relative
path — that part of issue-43's fix works. The two `handoff-packages/` files remained
permanently unsatisfiable: `ls handoff-packages/2026-08-10/` inside the worktree
returned "No such file or directory." There is no path at which those files exist
inside that worktree, so no `Read` call could ever match the gate's expected path —
retrying does not help, this is not a state/caching problem.

## Root Cause

`handoff-packages/` is gitignored by design (same convention as `sessions/`/`plans/`
— transient, local-only; confirmed via this repo's own `.gitignore:94`). `git
worktree add` only materializes **tracked** content into a new worktree —
gitignored/untracked files present in the source working directory are never copied
over. `commands/kmg-handoff.md` generated this session's handoff package in the
**main checkout**, not in the worktree being used to read it back. The manifest's
relative paths, once anchored at the worktree's `REPO_ROOT` (issue-43's fix, working
as designed), point at a location where the referenced files simply don't exist —
distinct from issue-42 (wrong anchor: relative vs absolute) and issue-43 (wrong
anchor: main-repo vs worktree root). Here the anchor is *correct* for the worktree;
the problem is the referenced content was never generated there and gitignore
prevents it from ever appearing there.

## Fix Direction (not yet implemented, needs Fable review)

When a manifest file doesn't exist under the resolved (worktree) `REPO_ROOT`, fall
back to checking it under the **main checkout root** before declaring it missing —
derived via `git -C "$HOOK_CWD" rev-parse --git-common-dir`, whose parent directory
is the main checkout (the shared `.git` storage lives there; a worktree's own
`--git-common-dir` output points back to it, not to itself).

This only covers "handoff package generated in main, read from a worktree that
never checked it out" — not the reverse, and not cross-worktree reads (worktree A
generates a handoff package, worktree B tries to read it back). Both are far
narrower real-world cases and likely out of scope; needs a decision during
implementation review on whether to note-only or also handle.

## Related

- [issue-42](../issue-42/issue-42-description.md) — first fix in this saga (relative vs absolute path exact-match)
- [issue-43](../issue-43/issue-43-description.md) — second fix (`CLAUDE_PROJECT_DIR` vs worktree root); confirmed working correctly for tracked files by this issue's own observation
- [ADR-068](../../decisions/ADR-068-lightweight-vs-full-workflow-rule-and-piloted-command-completion-check.md) — the pilot mechanism all three issues are gaps/regressions in
- `scripts/handoff-file-tracing-gate.sh` — the script needing the fix
- `tests/test-handoff-file-tracing-gate.sh` — needs a 7th test for the gitignored-in-worktree case
- `commands/kmg-handoff.md:154` — where `handoff-packages/` output originates, and where it's gitignored
