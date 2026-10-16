# Attempt 001: Root-cause audit of kg-config.json write paths

**Attempt #:** 001
**Hypothesis:** Some code path in the kmgraph MCP server, hooks, or test scripts writes `~/.claude/kg-config.json` and replaced the real registry with a `test-kg` fixture entry.
**Distinct from prior attempts:** Attempt 000 was discovery only (no investigation of source).
**Success criterion:** Identify the specific write path that matches the surviving `test-kg` fixture shape.

**Date Started:** 2026-07-10
**Status:** Completed (root-caused; fix not implemented)

## Approach

Traced every writer of `kg-config.json` in order: `mcp-server/src/utils.ts` (`readConfig`/`writeConfig`, `KG_CONFIG_PATH` override), `mcp-server/tests/*.test.ts` (mocking), `mcp-server/src/tools/fts5.ts` (additive only), `mcp-server/src/cli.ts` `runInit()` (reads then adds), `scripts/hooks-master.sh` (hardcoded path at line 12), and `tests/test-hooks.sh` / `tests/test-stop-hook.sh` (copy/remove the real file in place).

Full narrative: [implementation-log.md](../../implementation-log.md) (Attempt 001).
