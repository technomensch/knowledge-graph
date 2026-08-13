---
id: ENH-061
type: solution-approach
---

# Solution Approach — ENH-061

## Fix

**1. `run_extraction.py` — shared hard-stop gate, all four `--source` values.**

New `--confirm-unscoped` flag. Immediately after argument parsing (before any
extractor module is imported), if `args.project is None and not
args.confirm_unscoped`: refuse to run. Interactive (`sys.stdin.isatty()`):
print the explanation, `input()` a y/N prompt, cancel on anything but yes —
mirrors the existing `--today` interactive-prompt pattern already in this
file. Non-interactive (Claude Code's own Bash-tool invocations have no tty):
print to stderr, `sys.exit(1)`. No source-specific branching — the check sits
before `args.source in [...]` is ever consulted, so it applies uniformly to
`claude`/`gemini`/`codex`/`all`.

**2. `extract_claude.py` — `cwd`-based composition notice, Claude only.**

Each session's first non-null `cwd` field (present in every message record,
confirmed durable back to the oldest available logs during earlier design
review) is captured during the existing per-line parse loop — no new I/O
pass. After all matched `~/.claude/projects/` directories are processed, if
`project_filter` was set and matched 2+ distinct `cwd` values, print a
breakdown ("N session file(s) from `<cwd>`") before writing, sorted by count
descending. The notice is gated on transcript `cwd` values, not on which
directory a file was found under — directory-name parsing was rejected as the
primary mechanism (three incompatible conventions confirmed to coexist on
real machines).

## Alternatives considered

See [ADR-062's amendment](../../decisions/ADR-062-gemini-pb-project-scoping-fail-closed.md#amendment--v0713-2026-08-12--extended-to-the-claude-extractor)
for the full rejected-alternatives trail from design exploration:
directory-name-convention parsing (rejected — three incompatible conventions
confirmed), a persistent extraction-state ledger (deferred — existing
uuid-dedup likely already answers "already extracted" without new state), and
flipping the unscoped default to repo-scoped globally beyond just gating the
read (deferred — bigger behavior change, its own decision if pursued).

## Review-driven corrections

An independent Fable diff review (not just a plan review — the actual
uncommitted code) found:

- **Real regression, not hypothetical:** the new hard-stop gate broke 6 of 9
  existing extraction test files that invoked the CLI unscoped, relying on
  the old always-proceeds default. One of those (`test-extraction-codex-incremental.sh`)
  would have hard-crashed mid-script (missing `|| true` under
  `set -euo pipefail`) rather than failing an assertion gracefully like the
  other five.
- **Labeling nit:** the composition notice's `cwd_session_counts` variable
  incremented once per `.jsonl` **file**, not once per emitted date-bucketed
  session, but the printed text said "session(s)" — renamed the variable to
  `cwd_file_counts` and the label to "session file(s)" for accuracy.
- Reviewer confirmed no bugs in the mechanism itself: gate coverage, tty
  branching (no hang risk), `cwd`-attribution edge cases (cwd-less leading
  records handled correctly), and the 2-vs-1 notice threshold (no off-by-one)
  all verified correct.

A 7th affected file (`test-extraction-rebuild.sh`, 5 more unscoped calls) was
found independently after the review — it wasn't in the reviewer's candidate
list because a crude `grep -L -- "--project"` filter excluded it (the file
does use `--project` in 2 of its 7 calls, just not the other 5).

## Related

- [ENH-061-specification.md](ENH-061-specification.md)
- [ADR-062 Amendment](../../decisions/ADR-062-gemini-pb-project-scoping-fail-closed.md#amendment--v0713-2026-08-12--extended-to-the-claude-extractor) — the decision this implements
