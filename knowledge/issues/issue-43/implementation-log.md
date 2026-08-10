---
id: issue-43
type: implementation-log
---

# Implementation Log — issue-43

**2026-08-10** — Bug surfaced the same way issue-42 did: a separate session
(tidal-docs project, kmgraph v0.7.1 installed, issue-42 fix confirmed present)
working inside `.claude/worktrees/c11-voice-canary-gate/` hit the Stop hook's
exit-2 block four times identically despite every manifest file having been
read via in-worktree absolute paths. Root cause: `CLAUDE_PROJECT_DIR` resolves
to the main checkout in worktree sessions, so issue-42's `REPO_ROOT` anchor
reconstructed main-checkout paths that can never match in-worktree transcript
paths.

**2026-08-10 (validation pass, this session)** — Independent review before
implementing confirmed the diagnosis (worktrees are independent toplevels for
`--show-toplevel`; only `--git-common-dir` is shared) but found the drafted
one-line precedence swap incomplete: bare `git rev-parse` inherits the hook
*process's* cwd, which is not guaranteed to be the session's worktree cwd.
Hardened by extracting the session `cwd` from the hook input JSON and running
`git -C "$HOOK_CWD"`. Also checked `check-github-issue-sync.sh` and
`pre-push-gate.sh` (same old `REPO_ROOT` line): both only locate their own
repo-resident files, never compare against transcript paths — not affected,
left unchanged.

Fix applied in `scripts/handoff-file-tracing-gate.sh`; regression Test 5 added
to `tests/test-handoff-file-tracing-gate.sh` (fixture repo + `git worktree add`,
`CLAUDE_PROJECT_DIR` pointed at the main fixture checkout). Suite 6/6. Test 5
first failed for a fixture-only reason — macOS `mktemp -d` symlink
(`/var` vs `/private/var`) vs git's physical paths — fixed by canonicalizing
`TEST_DIR` with `pwd -P`, not by weakening the hook's exact-match comparison.
Separately verified the HEAD (pre-fix) script exits 2 on the identical
scenario the patched script passes.

Branch `v0.7.1.1-issue-43-worktree-repo-root-mismatch`; version synced to
v0.7.1.1 (mcp-server untouched, its version unchanged per rules).

**Paperwork completed this pass:** description updated to resolved,
solution-approach.md, test-cases.md, this log, CHANGELOG entry, version sync,
branch pushed, PR opened.
