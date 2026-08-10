---
id: issue-44
type: Bug
status: resolved
github-issue: "#217"
branch: v0.7.1.2-issue-44-worktree-gitignored-handoff-files
created: 2026-08-10
resolved: 2026-08-10
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

## Fix (implemented)

An independent review pass (Fable) found a simpler and strictly more accurate fix
than the originally drafted `git rev-parse --git-common-dir` approach: the script
already holds an exact, verified anchor to the package's true root —
`STARTHERE_PATH`, the transcript's own absolute `Read` path for the file that was
actually opened (guaranteed to exist on disk, checked at line 58). Deriving
`PKG_ROOT` from it and falling back to it when the `REPO_ROOT`-anchored path
doesn't exist on disk:

```bash
PKG_ROOT=""
if [[ "$STARTHERE_PATH" == */handoff-packages/* ]]; then
  PKG_ROOT="${STARTHERE_PATH%/handoff-packages/*}"
fi
```

```bash
resolved_manifest_file="${REPO_ROOT}/${manifest_file#./}"
if [[ -n "$PKG_ROOT" && "$PKG_ROOT" != "$REPO_ROOT" ]] \
   && ! printf '%s\n' "$READ_FILES" | grep -qxF "$resolved_manifest_file"; then
  resolved_manifest_file="${PKG_ROOT}/${manifest_file#./}"
fi
```

**Corrected after code review (same day):** the first implementation gated the
fallback on `[[ ! -f "$resolved_manifest_file" ... ]]` — on-disk existence — rather
than on whether that path was actually `Read`. A `pr-review-toolkit:code-reviewer`
pass reproduced a real false-block: `handoff-packages/<date>/` directory names are
date-derived, so two independent checkouts routinely collide on the same relative
path; if a same-named decoy file happens to exist at the `REPO_ROOT`-anchored
location (never opened there — the real read happened at `PKG_ROOT`), the
existence check saw a "real" file and never triggered the fallback, so the
`grep -qxF` comparison used the wrong (decoy) path and false-blocked. Fixed by
gating on `READ_FILES` membership instead of `-f` — the fallback now fires
whenever the primary path wasn't actually read, regardless of what happens to
exist on disk there.

Why this beats the git-common-dir fallback (rejected):
1. **Covers cross-worktree reads for free** (worktree A generates, worktree B
   reads) — the anchor is wherever the package actually is, not just "the main
   checkout." The originally-flagged scope question dissolves.
2. **Same-source path spelling** — `PKG_ROOT` derives from the transcript's own
   `Read` path, so the expected path is spelled exactly as `Read` records paths,
   immune to the symlink-normalization mismatch class (macOS `/tmp` →
   `/private/tmp`) that a fresh `git rev-parse` call could reintroduce — the exact
   failure shape issue-42/43 already fixed once.
3. No git call at all for this fallback — one less moving part.

Verified during review (empirically, not just reasoned): `git worktree add` never
checks out gitignored content — confirmed against a real throwaway fixture, not
assumed. `git rev-parse --git-common-dir`'s plain (non-`--path-format=absolute`)
output is relative from the main checkout (`.git`/`../.git`) and absolute from a
worktree — the originally-drafted fallback's bare `dirname` would have been buggy
in the main-checkout case had it been used (harmless there only because the
fallback is moot in that case, but wrong code) — documented here so it isn't
rediscovered as "the git-common-dir approach should have worked."

## Related

- [issue-42](../issue-42/issue-42-description.md) — first fix in this saga (relative vs absolute path exact-match)
- [issue-43](../issue-43/issue-43-description.md) — second fix (`CLAUDE_PROJECT_DIR` vs worktree root); confirmed working correctly for tracked files by this issue's own observation
- [ADR-068](../../decisions/ADR-068-lightweight-vs-full-workflow-rule-and-piloted-command-completion-check.md) — the pilot mechanism all three issues are gaps/regressions in
- [issue-33](../issue-33/issue-33-description.md) — original gap this mechanism was built to close; deferred, unrelated second gap
- `scripts/handoff-file-tracing-gate.sh` — the fixed script (`PKG_ROOT` fallback)
- `tests/test-handoff-file-tracing-gate.sh` — expanded to 9/9 (Tests 6-7)
- `commands/kmg-handoff.md:154` — where `handoff-packages/` output originates, and where it's gitignored
