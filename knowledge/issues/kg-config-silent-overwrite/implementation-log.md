# Implementation Log

Chronological record of all investigative attempts.

**Total Attempts:** 1 (root-cause confirmed; fix not yet implemented)
**Last Updated:** 2026-07-10

---

## Attempt 000: Discovery (2026-07-10)

**Status:** Not an investigative attempt — initial discovery during unrelated work.

**Context:**
While wrapping up a chat-extraction-reliability session, ran `/kmgraph:kmg-switch knowledge-graph` to fix what was assumed to be a stale `active` pointer (flagged earlier in that session's own saga notes). The switch failed: no KG named `knowledge-graph` was registered at all. Inspecting `~/.claude/kg-config.json` directly found only one entry, `test-kg`, pointing at a temp scratch directory with placeholder timestamps.

**What was checked:**
- `~/.claude/kg-config.json` contents and mtime
- Git history for `~/.claude` (none — not a repo)
- Time Machine snapshots (only one, too old to help)
- Shell history for `kg-config` references (none found)

**What was NOT done:**
- No attempt made yet to locate/audit the kmgraph MCP server's actual source for `kg-config.json` write paths.
- No re-registration of this project's KG (`/kmgraph:kmg-init` was started but stopped before any write, correctly, pending root-cause understanding).

**Key Learning (so far):**
A tool description claiming "read-only" behavior (`kg_fts5_status`) is not itself proof of actual behavior — this issue exists precisely because something wrote to a config file with no user-visible signal, so descriptions should be verified against source before being trusted as a safety guarantee.

**Next Steps (superseded by Attempt 001 below):**
~~Locate the actual kmgraph MCP server source and audit its `kg-config.json` write paths, starting with anything that references `test-kg` as a fixture name.~~ — done, see Attempt 001.

---

## Attempt 001: Root-cause audit of kg-config.json write paths (2026-07-10)

**Status:** Root-caused. Fix not yet implemented.

**Approach:**
Traced every code path that can write `~/.claude/kg-config.json`, in order: (1) `mcp-server/src/utils.ts`'s `readConfig()`/`writeConfig()` — confirmed `CONFIG_PATH` correctly respects a `KG_CONFIG_PATH` env override; (2) `mcp-server/tests/*.test.ts` — confirmed `capture.test.ts`/`upgrade.test.ts` properly `jest.mock("../src/utils.js")`, and `fts5.test.ts`'s `rebuildIndex()` calls don't touch config at all; (3) `mcp-server/src/tools/fts5.ts`'s `registerFts5Tool` handler (the real `kg_fts5_rebuild` implementation) — confirmed it only additively sets `fts5: true` on the *already-active* graph entry, never replaces `config.graphs` wholesale; (4) `mcp-server/src/cli.ts`'s `runInit()` — confirmed it reads existing config first and only adds one new entry, never wipes; (5) `scripts/hooks-master.sh` — found the actual bug: line 12 hardcodes `CONFIG_PATH="$HOME/.claude/kg-config.json"` with no env override; (6) `tests/test-hooks.sh` and `tests/test-stop-hook.sh` — found both directly `cp`/`rm -f` the real config file in place (multiple times per script) to work around (5), relying solely on a `trap cleanup EXIT` to restore a backup.

**Outcome:**
Confirmed root cause: `scripts/hooks-master.sh:12`'s hardcoded config path forces `tests/test-hooks.sh`/`tests/test-stop-hook.sh` to clobber the real `~/.claude/kg-config.json` in place during every run. A `trap cleanup EXIT` restore step exists, but is a single point of failure — any non-graceful termination (killed process, closed terminal, crashed shell) leaves the real file in whatever fixture state it was clobbered to. The surviving `test-kg` entry's exact shape (name, `2026-01-01T00:00:00.000Z` placeholder timestamps) matches `tests/fixtures/valid-config.json` and inline fixtures in `test-hooks.sh` precisely — not a coincidental match.

Further investigated user's follow-up questions (when/live-in-production/blast-radius): confirmed via `git log`/`git show main` that the bug was introduced 2026-03-03 (`test-hooks.sh`, commit `094e74434`) and 2026-04-29 (`test-stop-hook.sh`, commit `35348c3b`), is still present unpatched on `main` as of the most recent touch (`824b3968`, 2026-05-25) and as of this session, and ships in every installed plugin cache (confirmed present in this machine's own `~/.claude/plugins/cache/.../kmgraph/0.6.16/tests/`) with no packaging exclusion. `tests/run-all-tests.sh` includes both scripts in its standard suite, so this is a live, repeated exposure for any contributor running normal tests — not a one-time historical event.

**Key Learning:**
The first-pass "Blast radius" write-up was too narrow — it initially concluded "not this specific user's problem to prioritize" without separately assessing whether the bug is still live and how often it's actually triggered in normal workflows. Root-causing a mechanism and assessing its ongoing exposure are two different questions; both need to be answered explicitly, not just the first one.

**Next Steps:**
Implement the fix: env-var override for `hooks-master.sh`'s `CONFIG_PATH`, remove the real-file clobbering from both test scripts in favor of that override, and consider hardening the restore path (trap on `INT TERM` too, atomic write for the restore) as defense in depth.

---

## Statistics

**By Outcome:**
- Discovery: 1
- Root-caused: 1
- Fixed: 0

---

## Pattern Analysis

**What's been tried:**
- Direct inspection of the config file and machine-level recovery sources (git, Time Machine, shell history) — all came up empty or unhelpful for recovering lost data, but not needed once root cause was found via source audit instead.
- Full source-code audit of every write path to `kg-config.json`, ruling out five candidates before confirming the actual one.
- Git history/branch audit to establish introduction date, current live status on `main`, and packaging/distribution scope.

**What hasn't been tried:**
- Implementing and verifying the fix (deliberately interrupting a test run mid-clobber to confirm the real config survives post-fix).
- Determining whether a user-facing advisory is warranted for past affected contributors.
