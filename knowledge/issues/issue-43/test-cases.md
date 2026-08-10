---
id: issue-43
type: test-cases
---

# Test Cases — issue-43

Covered by `tests/test-handoff-file-tracing-gate.sh` (6/6 passing after fix;
was 5/5 before this issue's Test 5 was added):

1. No handoff file read this session → exit 0 (fail open)
2. All manifest files opened (absolute paths both sides) → exit 0
3. Manifest file never opened → exit 2, block message names it
4. Manifest path REPO_ROOT-relative, transcript `Read` absolute → exit 0
   (issue-42's regression test)
5. **(new, regression)** Session inside a **git worktree**: fixture repo +
   `git worktree add` worktree, manifest written with a `./`-relative path
   inside the worktree, transcript `Read` paths absolute *inside the worktree*,
   hook invoked with `CLAUDE_PROJECT_DIR` deliberately pointed at the **main**
   fixture checkout and input JSON `cwd` set to the worktree — the documented
   real-world failure condition. Must exit 0. Verified this test catches the
   bug: the pre-fix (HEAD) script exits 2 on the identical scenario, the
   patched script exits 0.

Test-fixture note: `TEST_DIR` is now canonicalized via `pwd -P` because macOS's
`mktemp -d` returns paths under the `/var → /private/var` symlink, while
`git rev-parse --show-toplevel` returns physical paths — without
canonicalization Test 5 fails on a byte-for-byte path comparison that real
sessions (under `/Users/...`) never hit. The shared `INPUT` for tests 1–4 also
gained a `cwd` field matching real hook payloads.

## Manual verification performed this session

Ran the HEAD (pre-fix) and patched scripts side by side against a scripted
reproduction of the tidal-docs failure shape (throwaway repo + worktree,
manifest `./handoff-packages/2026-08-10/DOCUMENTATION-MAP.md`, in-worktree
absolute `Read` transcript, `CLAUDE_PROJECT_DIR`=main checkout):
pre-fix exit 2, post-fix exit 0.

## Not covered / follow-up

- Manifest paths containing spaces or shell-special characters — pre-existing
  gap carried forward from issue-42, unchanged by this fix.
- Session launched in a subdirectory of a git repo (non-worktree) — git-first
  resolution anchors at the toplevel, not the subdir; accepted limitation, see
  [solution-approach.md](solution-approach.md).
- Transcript `Read` paths that traverse symlinks a real `--show-toplevel` would
  canonicalize away — not observed in practice (session cwds under `/Users/...`).
