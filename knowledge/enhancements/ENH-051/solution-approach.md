# ENH-051: Solution Approach

**Status:** Deferred — sketch only, not scoped for implementation.

## Proposed Direction

1. Extend `kg_config_init` (`mcp-server/src/tools/config.ts`) to accept a `locationType` + `name` pair as an alternative to a pre-resolved `kgPath` — the tool computes the path server-side using the same rules `cli.ts`'s `resolveInitLocation()` currently hardcodes.
2. Update `mcp-server/src/cli.ts` to call the same resolution logic (either by calling the tool in-process or by extracting `resolveInitLocation()` into a shared function both `cli.ts` and the tool import) instead of maintaining its own switch statement.
3. Update `commands/kmg-init.md` Step 1.4 to call `kg_config_init` (or a lighter path-only variant) with the location type, and use the returned path — removing the bash `case` statement entirely rather than hand-syncing it.
4. Keep `kmg-init.md`'s wizard flow (categories, git strategy, upgrade checks) unchanged — only the path-computation step moves.

## Open Questions (not resolved here)

- Does this warrant a new lightweight tool (e.g. `kg_resolve_path`) separate from `kg_config_init`, so callers can get a path without also triggering directory/template creation? Or does `kg_config_init` grow an optional dry-run mode?
- Should `resolveInitLocation()` in `cli.ts` become the canonical implementation (imported by the MCP tool), or should the MCP tool become canonical (with `cli.ts` calling it in-process)? Either direction satisfies "one implementation, not two" — which one depends on which surface is easier to keep dependency-free.

These are implementation-scoping questions to resolve when this item is picked up, not decided now.
