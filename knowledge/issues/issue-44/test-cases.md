---
id: issue-44
type: test-cases
---

# Test Cases — issue-44

Covered by `tests/test-handoff-file-tracing-gate.sh` (9/9 passing after fix,
expanded from issue-43's 5, plus one new test in-between covered separately):

6. **(new)** Gitignored handoff-package generated in a fixture's main checkout
   (`.gitignore` explicitly excludes `handoff-packages/`), a second worktree added
   off it (never has `handoff-packages/` checked out — asserted explicitly in the
   test, not assumed), `Read` paths recorded at the main-checkout absolute path,
   `HOOK_CWD` set to the worktree → must exit 0 (file genuinely was opened, just
   not under the worktree's own `REPO_ROOT`).
7. **(new, negative twin of 6)** Same fixture, but the manifest also names a second
   file that was never `Read` anywhere (neither main nor worktree) → must still
   exit 2, and the block message must still name the genuinely-missing file. Proves
   the `PKG_ROOT` fallback doesn't mask real gaps — it only changes which path is
   *expected*, not whether the transcript's `Read` history has to actually contain
   it.

## Manual verification performed this session (independent review, Fable)

- Built a throwaway fixture repo + `git worktree add` and confirmed empirically
  that a gitignored file present in the main checkout does NOT appear in the new
  worktree (`ls <worktree>/handoff-packages` → "No such file or directory").
- Ran `git rev-parse --git-common-dir` (plain and `--path-format=absolute`) from
  both a worktree and the main checkout (toplevel and subdir) — real output
  documented in solution-approach.md, used to identify a latent bug in the
  originally-drafted (rejected) fix approach before it was ever implemented.
- `grep -rn handoff-packages` across `commands/ scripts/ skills/ agents/ hooks/
  mcp-server/src` — confirmed `handoff-file-tracing-gate.sh` is the only reader;
  `commands/kmg-handoff.md` is the only producer. No other exposure.

## Not covered / follow-up

- A manifest file that exists under NEITHER `REPO_ROOT` NOR `PKG_ROOT` (genuinely
  missing everywhere) — reasoned but not separately tested beyond Test 7's
  never-Read case, since the resolution logic is identical either way (fallback
  rewrites to a still-nonexistent path, `grep -qxF` still fails, same correct
  outcome).
- The pre-existing quirk that the gate matches `Read` tool-call *attempts*, not
  confirmed-successful reads (a failed `Read` of a nonexistent path would already
  satisfy the gate today) — noted during review, unrelated to and unchanged by
  this fix, not a regression.
