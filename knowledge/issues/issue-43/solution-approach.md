---
id: issue-43
type: solution-approach
---

# Solution Approach — issue-43

## Fix

Invert `handoff-file-tracing-gate.sh`'s `REPO_ROOT` precedence so the
worktree-aware source wins, and anchor git at the session's cwd rather than the
hook process's cwd:

```bash
# Before (issue-42's fix):
REPO_ROOT="${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"

# After:
HOOK_CWD=$(printf '%s' "$INPUT" | jq -r '.cwd // ""' 2>/dev/null || true)
[[ -z "$HOOK_CWD" || ! -d "$HOOK_CWD" ]] && HOOK_CWD="$(pwd)"
REPO_ROOT="$(git -C "$HOOK_CWD" rev-parse --show-toplevel 2>/dev/null || echo "${CLAUDE_PROJECT_DIR:-$HOOK_CWD}")"
```

Two changes, not one:

1. **Precedence flip** — `git rev-parse --show-toplevel` first,
   `CLAUDE_PROJECT_DIR` fallback for non-git contexts only. Inside a worktree,
   `--show-toplevel` returns the worktree's own root (each worktree is an
   independent working tree; only `--git-common-dir` is shared), which is where
   the transcript's absolute `Read` paths actually live. `CLAUDE_PROJECT_DIR`
   resolves to the main checkout in worktree sessions
   ([anthropics/claude-code#36360](https://github.com/anthropics/claude-code/issues/36360)),
   which is why it can no longer be the primary source.
2. **`git -C "$HOOK_CWD"` hardening (beyond the drafted plan)** — the drafted
   precedence swap ran bare `git rev-parse`, which inherits the hook *process's*
   cwd. Claude Code does not guarantee that equals the session's cwd (the same
   scope-conflation class as the CLAUDE_PROJECT_DIR bug itself). Every hook
   event's input JSON carries a `cwd` field for the session, so the fix anchors
   git there, falling back to `pwd` when absent/invalid (e.g. older payloads,
   direct invocation, tests 1–4).

This required moving `REPO_ROOT` computation below `INPUT=$(cat)` (it previously
sat above it); `REPO_ROOT` is first consumed in the manifest loop, so ordering is
safe.

## Alternatives considered

- **Worktree-detection-only override** (`git rev-parse --is-inside-work-tree`,
  compare `--show-toplevel` against `--git-common-dir`'s parent, override only
  when they differ) — listed in the issue's open questions. Rejected: more
  moving parts for the same result. In the non-worktree git case
  `--show-toplevel` and `CLAUDE_PROJECT_DIR` agree anyway (both the repo root),
  so the unconditional flip only changes behavior where behavior was wrong.
- **Registering the worktree as its own KG** — wrong layer entirely; this is a
  path-anchoring bug in one hook, not a KG-resolution question
  (`kg-config.json`/`kg_resolve` untouched).
- **Suffix/basename matching** — already rejected in issue-42 (false-positives
  across differently-rooted files sharing a tail); nothing about the worktree
  case changes that analysis.

## Known limitation (accepted, documented)

If a session is launched in a **subdirectory** of a git repo (so
`CLAUDE_PROJECT_DIR` = that subdir and `kmg-handoff` wrote its
`./handoff-packages/...` there), git-first resolution now anchors at the repo
toplevel instead of the subdir — the pre-fix code would have anchored at the
subdir. Worst case is the same false-block this gate has always failed toward,
not a false-pass. The worktree case is the observed real-world failure and the
project-root-equals-repo-root layout is this plugin's documented deployment
shape, so the subdir layout is accepted as out of scope here.

## Other consumers of the old pattern (checked, not changed)

`check-github-issue-sync.sh:25` and `pre-push-gate.sh:89` use the identical
pre-fix `REPO_ROOT` line, but both use it only to locate their own repo files
(issue dirs, sibling scripts) and never compare against transcript absolute
paths — a main-root resolution is harmless for them (their fixtures live in the
main checkout). issue-43 is scoped to `handoff-file-tracing-gate.sh` only.

## Related

- [issue-43-description.md](issue-43-description.md)
- [issue-42](../issue-42/solution-approach.md) — same script, same failure
  shape, different anchor source
- [ADR-068](../../decisions/ADR-068-lightweight-vs-full-workflow-rule-and-piloted-command-completion-check.md) — the pilot mechanism both issues are gaps in
