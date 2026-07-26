# issue-28: Implementation Log

**2026-07-18** — Found live, in-session, on branch `v0.6.20-storage-migration-completion`, while verifying the issue-27 fix in `mcp-server/src/tools/upgrade.ts`. Confirmed via `grep` that the live `kg_upgrade` tool was running the installed plugin cache's `mcp-server/dist/index.js` (version 0.6.16, fix absent), not this repo's own rebuilt copy (fix present). Verified the issue-27 fix worked anyway via a direct stdio JSON-RPC call to the repo's own `dist/index.js` with `CLAUDE_PLUGIN_ROOT` unset.

Searched `docs/`, `CLAUDE.md`, `INSTALL.md`, and `knowledge/decisions/` for an existing dev-loop mechanism covering this. Found related-but-not-identical prior art: `ADR-054` (post-update stale cache, not active local dev), `Lessons_Learned_Debugging_Plugin_Cache_Not_Synced_From_Local_Repo.md` (covers `commands/`/`core/`/`skills/`, not verified for `mcp-server/dist/`), `local-marketplace-testing-workflow.md` and `claude-code-plugin-cache-stale-after-update.md` (same family, different specific scenarios). No existing documented solution for this exact case. Filed as Hardening, Mode 3 (Track only) — no branch, no GitHub issue, `status: deferred`. No ADR filed — judged a process/tooling gap, not an architectural decision point (see issue-28-description.md's "On the ADR question").

Companion lesson captured: `knowledge/lessons-learned/debugging/Lessons_Learned_Debugging_MCP_Server_Rebuild_Not_Reflected_In_Live_Plugin_Tool_Calls.md`.

No implementation performed. No further work logged.
