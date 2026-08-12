---
id: ENH-061
type: Enhancement
status: proposed
github-issue: "#221"
branch: v0.7.1.3-ENH-060-profile-approval-gate
created: 2026-08-12
related_enhs: [ENH-044]
related_issues: []
related_adrs: [ADR-062]
---

# ENH-061: Claude Extractor Fails Closed on Unscoped Extraction, Attributes by `cwd` Not Directory Name

## Problem

`core/scripts/extract_claude.py`'s `--project` substring match technically works
for the bug ENH-044 tested (cross-project contamination) — [ADR-062](../../decisions/ADR-062-gemini-pb-project-scoping-fail-closed.md)'s
original scope explicitly excluded Claude on that basis. Nobody had tested the
cross-*worktree*-of-the-same-project case until a real session hit it directly
(2026-08-12): a git worktree gets its own separate `~/.claude/projects/`
directory, and `--project=<repo-name>` substring-matches all of them at once,
silently merging distinct working contexts into one output file.

Worse, independently verified: **omitting `--project` entirely doesn't just mix
worktrees — it merges sessions from every project on the entire machine**, since
there is no cwd-derived default scope at all today.

Full evidence (real directory listing showing 3 incompatible worktree-naming
conventions, a confirmed-real stale worktree directory, and the `cwd`-field
attribution mechanism) is recorded in [ADR-062's Amendment — v0.7.1.3](../../decisions/ADR-062-gemini-pb-project-scoping-fail-closed.md#amendment--v0713-2026-08-12--extended-to-the-claude-extractor),
which this ENH implements.

## Scope (Phase 1 — this ENH)

1. **Fully-unscoped invocation hard-stops.** When `run_extraction.py --source
   claude` (or `--source all`) is invoked with no `--project`, stop before
   reading any session content. Explain plainly what would happen (merge
   sessions from every project on the machine, not just the current repo),
   ask for explicit confirmation to proceed anyway, and advise using
   `--project=<name>`.
2. **`--project=<name>` matching 2+ directories shows a composition notice, does
   not hard-stop.** Since the user did explicitly scope something, proceed —
   but report source attribution before writing ("N sessions from `<repo>`, M
   from worktree `<name>`, K from `<other-dir>`"), computed via the `cwd` field
   already present in each session's `.jsonl` records (no new I/O pass — the
   parse loop already reads every line), cross-referenced against a freshly-run
   `git worktree list --porcelain` (never cached) where applicable.
3. Directory-name parsing (any of the three coexisting conventions) is a
   fallback only, for the case where a project directory has already been
   log-rotated to nothing and there's no `.jsonl` left to read `cwd` from.

## Explicitly Deferred (not this ENH)

- **Proactive prompts** — "you're in a worktree, did you mean the worktree
  instead of the main repo?" / "worktree X hasn't been extracted yet, want me
  to?" — the real feature the user wants, sequenced as a fast-follow once this
  ENH's attribution mechanism is live and trusted. Depends on nothing this ENH
  doesn't already build.
- **Extraction-state ledger** — tracking what's already been extracted per
  worktree root. Likely unnecessary: existing uuid-dedup (`parse_seen_uuids`,
  `extract_claude.py:80-117`) may already answer "already extracted?" without
  new persistent state. Defer until proven needed.
- **Flipping the default globally** (repo-scoped-by-default even when `--project`
  matches cleanly) — a bigger policy change breaking existing bare-invocation
  habits, needing its own version bump and separate deliberation if pursued.

## Related

- [ADR-062 Amendment](../../decisions/ADR-062-gemini-pb-project-scoping-fail-closed.md#amendment--v0713-2026-08-12--extended-to-the-claude-extractor) — the decision this ENH implements
- [ENH-044](../../issues/chat-extraction-reliability-saga/attempts/ENH-044/specification.md) — the sibling Gemini fix this extends the same principle to
- `core/scripts/extract_claude.py` — the script needing the fix
- `commands/kmg-extract-chat.md` — needs the new hard-stop behavior documented
