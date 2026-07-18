# issue-28: Test Cases

No implementation exists yet (Mode 3 — Track only, deferred). These are the checks that confirmed the finding itself, and the checks a future fix would need to satisfy.

## Checks That Confirmed the Finding (already performed, this session)

- [x] `grep -c "already exists with different content" <installed-plugin-cache-path>/mcp-server/dist/index.js` → `0` (fix string absent from the version live tool calls actually run).
- [x] Same grep against this repo's own rebuilt `mcp-server/dist/index.js` → `1` (fix string present, confirming the repo build is correct but not live).
- [x] Direct stdio JSON-RPC call (`node dist/index.js`, `CLAUDE_PLUGIN_ROOT` unset, `initialize` + `tools/call` over stdin) against the repo's own `dist/index.js` returned the fixed behavior — confirms the workaround is viable.
- [x] Searched `docs/`, `CLAUDE.md`, `INSTALL.md`, `knowledge/decisions/` for an existing documented dev-loop mechanism — none found (see issue-28-description.md "What Was and Wasn't Investigated").

## Checks a Future Fix Would Need to Satisfy (not yet implemented)

- [ ] Whatever dev-loop mechanism is chosen (see solution-approach.md candidates) must be verified to actually change what `kg_*` tool calls execute in a live Claude Code session — not just what a standalone `node dist/index.js` process returns.
- [ ] If the fix extends the `cp`-to-cache workaround: confirm whether `/reload-plugins` alone reconnects the MCP server process, or whether a manual "MCP Server → Reconnect" step (per `claude-code-plugin-cache-stale-after-update.md`) is also required for `mcp-server/dist/` changes specifically.
- [ ] If a documented recipe is written: confirm it works end-to-end for a fresh contributor with no prior context (not just for the person who discovered the workaround).
