---
id: ENH-061
type: test-cases
---

# Test Cases — ENH-061

## New: `tests/test-extraction-claude-worktree-scoping.sh` (13 assertions)

- **Test A** — unscoped extraction (no `--project`, no `--confirm-unscoped`),
  non-interactive: exits non-zero, stderr explains what would happen, advises
  `--confirm-unscoped`, no output file written.
- **Test B** — `--confirm-unscoped` overrides the gate: exits 0, output
  includes content from both the main directory and the worktree directory
  (unscoped genuinely means everything).
- **Test C** — `--project=<name>` matching both a main and worktree directory:
  exits 0 (no hard-stop — user explicitly scoped something), both
  directories' content included, composition notice printed, notice names the
  worktree's actual `cwd` value.
- **Test D** — `--project=<name>` matching exactly one directory: exits 0,
  only that directory's content included, **no** composition notice (negative
  case, proves no false-positive on a clean single-directory match).

## Regression sweep — all 11 `test-extraction*.sh` files, 100/100 passing

Confirmed via full sweep after implementation (not just the reviewer's
candidate list): `test-extraction-backup-recovery.sh`,
`test-extraction-claude-worktree-scoping.sh`, `test-extraction-codex-incremental.sh`,
`test-extraction-discovery.sh`, `test-extraction-gemini-pb-timestamp-hint.sh`,
`test-extraction-gemini-project-filter.sh`, `test-extraction-gemini-stream.sh`,
`test-extraction-multiday.sh`, `test-extraction-rebuild.sh`,
`test-extraction-subagent-repro.sh`, `test-extraction.sh`.

**7 files needed `--confirm-unscoped` added** to existing unscoped
invocations that predate this change: `test-extraction-backup-recovery.sh`
(1 call), `test-extraction-codex-incremental.sh` (2 calls, one of which would
have hard-crashed the script under `set -euo pipefail` without the fix),
`test-extraction-gemini-project-filter.sh` (2 baseline calls), `test-extraction-multiday.sh`
(4 calls), `test-extraction-rebuild.sh` (5 calls, found independently — not
in the reviewer's grep-based candidate list), `test-extraction-subagent-repro.sh`
(3 calls), `test-extraction.sh` (3 calls, one of which had a pre-existing
false-positive assertion that happened to accept the new error text's use of
the word "sessions" — resolved structurally once the call actually runs
again).

**Verified baseline (before this change):** stashed the implementation and
re-ran `test-extraction-rebuild.sh` — 19/19 passing on the unmodified tree,
confirming the 11 failures seen after implementation were caused by this
change, not pre-existing.

## Not covered / follow-up

- No test exercises the interactive (`sys.stdin.isatty()==True`) branch of
  the unscoped-confirmation prompt directly — covered by code inspection
  (Fable review) rather than an automated test, since simulating a real tty
  in a test harness is nontrivial. The non-interactive path (the one Claude
  Code itself always hits) is fully covered.
- Gemini's and Codex's own unscoped paths are covered by the shared gate
  (verified structurally — the check has no source-specific branching — and
  by the Gemini/Codex test files needing the same `--confirm-unscoped` fix),
  but no new test specifically exercises `--source gemini`/`--source codex`
  with no `--project` and no `--confirm-unscoped` end-to-end the way Test A
  does for Claude. Low risk given the shared code path, but not directly
  exercised.
