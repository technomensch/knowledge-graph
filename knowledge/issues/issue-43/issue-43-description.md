---
id: issue-43
type: Bug
status: tracked
github-issue: "#215"
branch: v0.7.1.1-issue-43-worktree-repo-root-mismatch
created: 2026-08-10
---

# Issue-43: `handoff-file-tracing-gate.sh` Hard-Blocks Every Session Run Inside a Git Worktree — `CLAUDE_PROJECT_DIR` Resolves to the Main Repo, Not the Worktree

## Problem

`scripts/handoff-file-tracing-gate.sh` (fixed in issue-42/#213 for the plain
relative-vs-absolute case) still hard-blocks (`exit 2`) every session that reads a
handoff package from inside a **git worktree**, even when every manifest file was
genuinely opened.

Observed live in a separate session (`tidal-docs` project, `kmgraph` v0.7.1
installed — confirmed the issue-42 fix is present), session working inside
`.claude/worktrees/c11-voice-canary-gate/`. The gate fired 4 times identically
despite the linked files being read via absolute paths each time:

```
knowledge/sessions/2026-08/2026-08-10-v1.0_docs_0.0.10.1-voice-tone-fork.md
handoff-packages/2026-08-10/DOCUMENTATION-MAP.md
handoff-packages/2026-08-10/ARCHITECTURE-SNAPSHOT.md
```

Read paths recorded in the transcript were absolute *inside the worktree*:
`/Users/mkaplan/GitHub/tidal-docs/.claude/worktrees/c11-voice-canary-gate/handoff-packages/2026-08-10/DOCUMENTATION-MAP.md`.

## Root Cause

issue-42's fix anchors relative manifest paths at:

```bash
REPO_ROOT="${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"
```

`CLAUDE_PROJECT_DIR` is documented (and confirmed by
[anthropics/claude-code#36360](https://github.com/anthropics/claude-code/issues/36360))
to resolve to the **original/main repo root**, not the worktree — by design, since
`.claude/` itself lives only in the main checkout. So inside a worktree session:

- `REPO_ROOT` resolves to the main `tidal-docs` checkout.
- The manifest's relative paths (e.g. `./handoff-packages/...`) get anchored there:
  `<main-repo-root>/handoff-packages/...`.
- The transcript's `Read` calls are absolute paths inside the worktree:
  `<main-repo-root>/.claude/worktrees/c11-voice-canary-gate/handoff-packages/...`.
- These can never exact-match — same failure shape as issue-42, different anchor
  source.

Related, not identical, precedent in Claude Code itself:
[#46808](https://github.com/anthropics/claude-code/issues/46808) (hooks not
triggered in worktrees at all) and
[#72714](https://github.com/anthropics/claude-code/issues/72714) (`/worktree` can
write `core.hooksPath` into the main repo's shared config) — a recurring class of
"tooling conflates worktree-scope and main-repo-scope" bugs in this product.

## Confirmed Not Previously Discussed

Searched the KG (`worktree` + `handoff-file-tracing-gate`/`REPO_ROOT`, ADR-068's
Non-Goals, issue-42's own "Not covered / follow-up" section) — no prior discussion
or deferred decision found. issue-42's follow-up list only flagged shell-special-character
manifest paths as a known gap; worktrees were never on it. This is a newly
discovered gap, not a reopened or previously-deferred one.

## Fix Direction (not yet implemented)

Prefer `git rev-parse --show-toplevel` over `CLAUDE_PROJECT_DIR` when computing
`REPO_ROOT` for this comparison. `--show-toplevel` is worktree-aware statelessly —
run from inside a worktree it returns the worktree's own root; run from the main
checkout it returns the main root. No worktree registration involved or needed
(worktree registration is a KG-registry concept — `kg-config.json`/`kg_resolve` —
unrelated to this path-anchoring bug, and treating an ephemeral worktree as its own
registered KG would be the wrong fix shape entirely).

Needs design/verification before implementation:
- Whether to flip the precedence entirely (`show-toplevel` first, `CLAUDE_PROJECT_DIR`
  fallback) or detect worktree context specifically (`git rev-parse --is-inside-work-tree`
  plus comparing `--show-toplevel` against `--git-common-dir`'s parent) and only
  override in that case — the latter avoids changing behavior for the non-worktree
  case entirely.
- Regression test coverage for a manifest generated inside a worktree, `Read` paths
  absolute inside that same worktree.

## Related

- [issue-42](../issue-42/issue-42-description.md) — the fix this is a follow-on gap to; same script, different anchor source
- [ADR-068](../../decisions/ADR-068-lightweight-vs-full-workflow-rule-and-piloted-command-completion-check.md) — the pilot mechanism both issues are regressions/gaps in
- [issue-33](../issue-33/issue-33-description.md) — original gap this mechanism was built to close; deferred, unrelated second gap
- `scripts/handoff-file-tracing-gate.sh` — the script needing the fix
- `tests/test-handoff-file-tracing-gate.sh` — needs a 6th test for the worktree case
