# issue-28: Solution Approach

**Status:** Deferred (Track only, Mode 3) — no fix implemented or proposed for immediate action.

## Why Deferred

This was found as a byproduct of testing issue-27's fix, not as a blocking problem for the current branch's work — the workaround (direct stdio JSON-RPC to the repo's own `dist/index.js`) was sufficient to verify the issue-27 fix without a formal dev-loop mechanism. Filing this as tracked documentation now, rather than designing a fix under time pressure, matches the pattern used for issue-25/26/27 this session: capture the finding accurately, defer the design work.

## Candidate Directions (not decided, not started)

If this is picked up later, options to weigh — none evaluated in depth here:

1. **Extend the existing `cp`-to-cache workaround** (from `Lessons_Learned_Debugging_Plugin_Cache_Not_Synced_From_Local_Repo.md`) to explicitly cover `mcp-server/dist/`, and verify whether `/reload-plugins` alone reconnects the MCP server or whether a manual MCP reconnect step is also required for compiled server code (unlike markdown-based commands/skills, MCP servers hold a live process connection that a plugin reload may not tear down and recreate).
2. **Document the stdio JSON-RPC bypass** (already discovered) as a supported dev-testing technique in a CONTRIBUTING-style doc, formalizing what was done ad hoc this session into a repeatable script or documented recipe.
3. **A local-link install mode** — e.g., a symlink from the plugin cache path to the repo's `mcp-server/dist/`, so rebuilds are picked up without any copy step. This would be the most invasive option (crosses into how Claude Code's plugin cache is structured) and was not investigated for feasibility.

No direction has been chosen. This section exists to give a future implementer a starting point, not to commit to an approach.

## Related

See [issue-28-description.md](issue-28-description.md) for the full investigation record, including what was and wasn't found in existing docs/ADRs.
