---
id: issue-43
type: Bug
status: resolved
github-issue: "#215"
branch: v0.7.1.1-issue-43-worktree-repo-root-mismatch
created: 2026-08-10
resolved: 2026-08-10
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

## Fix (implemented 2026-08-10)

Flipped the precedence entirely — `git rev-parse --show-toplevel` first,
`CLAUDE_PROJECT_DIR` as fallback for non-git contexts only — with one hardening
beyond the drafted direction: git is anchored at the **session's cwd from the hook
input JSON** (`git -C "$HOOK_CWD"`), not the hook process's own cwd, which is not
guaranteed to be inside the worktree when the hook fires:

```bash
HOOK_CWD=$(printf '%s' "$INPUT" | jq -r '.cwd // ""' 2>/dev/null || true)
[[ -z "$HOOK_CWD" || ! -d "$HOOK_CWD" ]] && HOOK_CWD="$(pwd)"
REPO_ROOT="$(git -C "$HOOK_CWD" rev-parse --show-toplevel 2>/dev/null || echo "${CLAUDE_PROJECT_DIR:-$HOOK_CWD}")"
```

`--show-toplevel` is worktree-aware statelessly — each worktree is its own valid
toplevel; only `--git-common-dir` is shared with the main checkout. No worktree
registration involved or needed (worktree registration is a KG-registry concept —
`kg-config.json`/`kg_resolve` — unrelated to this path-anchoring bug, and treating
an ephemeral worktree as its own registered KG would be the wrong fix shape entirely).

The worktree-detection-only alternative (`--is-inside-work-tree` + comparing
`--show-toplevel` against `--git-common-dir`'s parent) was rejected — see
[solution-approach.md](solution-approach.md). Regression coverage added as Test 5
in `tests/test-handoff-file-tracing-gate.sh` (see [test-cases.md](test-cases.md)).

## Related

- [issue-42](../issue-42/issue-42-description.md) — the fix this is a follow-on gap to; same script, different anchor source
- [issue-44](../issue-44/issue-44-description.md) — follow-on gap found 2026-08-10: this fix's worktree-anchored `REPO_ROOT` is correct, but gitignored manifest files (`handoff-packages/`) never get checked out into a worktree at all, so the anchor points to a location where they structurally can't exist
- [ADR-068](../../decisions/ADR-068-lightweight-vs-full-workflow-rule-and-piloted-command-completion-check.md) — the pilot mechanism both issues are regressions/gaps in
- [issue-33](../issue-33/issue-33-description.md) — original gap this mechanism was built to close; deferred, unrelated second gap
- `scripts/handoff-file-tracing-gate.sh` — the script needing the fix
- `tests/test-handoff-file-tracing-gate.sh` — needs a 6th test for the worktree case
- [issue-49](../issue-49/issue-49-description.md) — cites this issue's branch/plan (`v0.7.1.1-issue-43`) as one of five fully-merged `v0.7.1.x` plans audited for the Safety-Header STATUS-freeze bug. Backlinked 2026-08-19.
