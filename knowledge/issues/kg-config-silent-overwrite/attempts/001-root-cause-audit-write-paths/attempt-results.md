# Attempt 001: Results

**Status:** Success (root cause confirmed; fix pending)
**Completed:** 2026-07-10

## What Happened

Root cause: `scripts/hooks-master.sh:12` hardcodes `CONFIG_PATH="$HOME/.claude/kg-config.json"` with no env override, so `tests/test-hooks.sh` and `tests/test-stop-hook.sh` clobber the real file in place and rely on a `trap cleanup EXIT` to restore a backup. Any non-graceful termination leaves fixture state behind. The surviving `test-kg` entry matches `tests/fixtures/valid-config.json` and inline fixtures.

Exposure: introduced 2026-03-03 (`094e74434`) and 2026-04-29 (`35348c3b`); still unpatched on `main` as of `824b3968`; shipped in the installed plugin cache; both scripts are in `tests/run-all-tests.sh`.

## Next Steps

Add an env-var override for `hooks-master.sh` `CONFIG_PATH`, remove real-file clobbering from both test scripts, and harden the restore path (trap on `INT TERM`, atomic restore).
