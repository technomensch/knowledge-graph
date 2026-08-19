---
id: ENH-061
type: Enhancement
status: resolved
github-issue: "#221"
branch: v0.7.1.3-ENH-060-profile-approval-gate
created: 2026-08-12
resolved: 2026-08-13
related_enhs: [ENH-044]
related_issues: []
related_adrs: [ADR-062]
---

# ENH-061: Extraction Fails Closed on Unscoped Runs (All Sources), Claude Attributes by `cwd` Not Directory Name

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

1. **Fully-unscoped invocation hard-stops — for all four `--source` values**
   (`claude`, `gemini`, `codex`, `all`), not just Claude. The "merges every
   session on the machine" failure mode is structural to every extractor's
   unscoped path — Gemini globs all of `~/.gemini/tmp/*` unscoped the same way
   Claude globs all of `~/.claude/projects/*`; Codex has the equivalent gap.
   Implemented once, at the shared `run_extraction.py` CLI entry point, not
   duplicated per-extractor. When `--project` is not given, stop before reading
   any session content. Explain plainly what would happen (merge sessions from
   every project on the machine, not just the current repo), ask for explicit
   confirmation to proceed anyway, and advise using `--project=<name>`.
2. **Claude-specific: `--project=<name>` matching 2+ directories shows a
   composition notice, does not hard-stop.** Since the user did explicitly
   scope something, proceed — but report source attribution before writing
   ("N sessions from `<repo>`, M from worktree `<name>`, K from
   `<other-dir>`"), computed via the `cwd` field already present in each
   session's `.jsonl` records (no new I/O pass — the parse loop already reads
   every line). This item is Claude-only because the worktree-directory-
   splitting problem it addresses is a Claude Code structural quirk — Gemini
   and Codex don't split sessions across per-worktree project directories the
   same way.
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
- [ENH-060](../ENH-060/ENH-060-specification.md) — unrelated fix, shipped together on this same branch/version (v0.7.1.3) per an explicit WIP-append decision
- `core/scripts/extract_claude.py` — the script needing the fix
- `commands/kmg-extract-chat.md` — needs the new hard-stop behavior documented
- [issue-49](../../issues/issue-49/issue-49-description.md) — cites this ENH's branch/plan as one of five fully-merged `v0.7.1.x` plans audited for the Safety-Header STATUS-freeze bug. Backlinked 2026-08-19.
