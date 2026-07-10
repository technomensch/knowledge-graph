# Root Cause Evolution

How our understanding of the root cause changed over time.

**Created:** 2026-07-10
**Last Updated:** 2026-07-10
**Total Belief Shifts:** 2

---

## Belief Shift #1 (2026-07-10)

**Previous Understanding:**
Unconfirmed hypothesis that an MCP kmgraph tool call this session (`kg_fts5_status`/`kg_fts5_rebuild`) itself might have triggered the overwrite via an unsandboxed test/fixture path.

**New Understanding:**
Ruled out. Traced every `kg-config.json` write path in the MCP server and CLI directly — all either properly mock config in tests (`capture.test.ts`, `upgrade.test.ts`) or only additively modify config at runtime (never wipe `config.graphs`). The actual mechanism is in this repo's bash test suite: `scripts/hooks-master.sh` hardcodes its config path, forcing `tests/test-hooks.sh`/`tests/test-stop-hook.sh` to `cp`/`rm -f` the real config file directly to test it, with only a `trap cleanup EXIT` protecting against a failed restore.

**Evidence:** Direct source read of `mcp-server/src/utils.ts`, `mcp-server/src/tools/fts5.ts`, `mcp-server/src/cli.ts`, `scripts/hooks-master.sh`, `tests/test-hooks.sh`, `tests/test-stop-hook.sh`, `tests/fixtures/valid-config.json`.

**Confidence:** High.

---

## Belief Shift #2 (2026-07-10)

**Previous Understanding:**
Initial "Blast radius" framing treated this as effectively a closed question once root cause was found — implicitly assumed the bug was a one-off or at least not worth separately assessing for ongoing exposure.

**New Understanding:**
Corrected after direct user challenge to actually check: when was this introduced, is it live in production, and what's the real blast radius (not just the mechanism). Confirmed via `git log`/`git show main` that the bug has been live and unpatched on `main` since 2026-03-03/2026-04-29 respectively, ships in every installed plugin cache, and is triggered by the standard `tests/run-all-tests.sh` suite — meaning every contributor running normal tests since those dates has been repeatedly exposed, not just this one machine on this one day.

**Evidence:** `git log --follow --diff-filter=A`, `git show main:tests/test-hooks.sh`, `git diff main -- tests/test-hooks.sh`, plugin cache inspection (`~/.claude/plugins/cache/.../kmgraph/0.6.16/tests/`), `tests/run-all-tests.sh` suite listing.

**Confidence:** High.

**Impact:** Elevates this from "local curiosity, fix when convenient" to "live, repeatedly-triggered bug affecting every contributor's dev machine, worth prioritizing a fix."
