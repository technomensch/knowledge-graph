# Handoff: issue-34 + issue-35 FTS5/Search Directory Fixes Complete, Uncommitted-Push Pending (2026-08-01)

**Type:** Implementation complete on local branch — no push, no PR, not yet reviewed by the user beyond the implementing agent's own automated verification.

**Continues from:** plan `knowledge/plans/v0.7.0-c2-issue-34-35-patch.md`, `knowledge/issues/issue-34/` (`kg_search`/FTS5 index never covers `knowledge/issues/` or `knowledge/enhancements/`), and `knowledge/issues/issue-35/` (dead `"knowledge"` directory-list literal in the same two files, a recurrence of issue-31's stale-pre-migration-path pattern).

## What was done

Both fixes were implemented per the plan, as two separate commits on branch `v0.7.0`:

1. **`d3db547e`** — `fix(mcp-server): remove dead knowledge path literal from FTS5/search dir lists` — resolves `knowledge/issues/issue-35/`.
2. **`50d839f8`** — `fix(mcp-server): add issues/enhancements to FTS5 index and search fallback dirs` — resolves `knowledge/issues/issue-34/`.

Both commits touch the same two files:
- `mcp-server/src/tools/fts5.ts` — `contentDirs` array
- `mcp-server/src/tools/search.ts` — fallback `searchDirs` array

Net effect: the dead `"knowledge"` entry (never a real content subdirectory post-migration) is removed from both directory lists, and `"issues"` / `"enhancements"` are added to both, so `kg_search`'s FTS5 index and its linear-scan fallback now actually cover `knowledge/issues/` and `knowledge/enhancements/` content.

## Verification performed

- Full `mcp-server` test suite: **151/151 passing locally.**
- A local repro script was also used to validate the fix, run directly against the local source tree — **not** through the deployed/installed `kmgraph` MCP plugin, since the installed plugin runs a separately built copy and does not reflect local source edits. This means end-to-end verification through the actual installed plugin path has not been done.

## Explicitly NOT done

- **Not pushed to origin.** Both commits exist only on the local `v0.7.0` branch.
- **Not tested or reviewed by the user.** All verification above is the implementing agent's own local unit-test run plus a local repro script — no user-facing confirmation that `kg_search` actually surfaces issues/enhancements content through the real installed plugin.
- No PR opened, and none planned unless requested.

## Downstream reference

`knowledge/enhancements/ENH-056/ENH-056-specification.md` documents a "known gap" (verified 2026-07-30) where its candidate attempt-loop prompt assumes recall covers prior issues/enhancements — an assumption issue-34 directly blocked. That spec has been updated in this same session with a pointer to commit `50d839f8` and the same not-yet-pushed / not-yet-user-verified caveat as above, so ENH-056 doesn't overstate the fix as verified-in-practice.

## Follow-up

- Push `d3db547e` and `50d839f8` to origin when the user is ready.
- No PR planned unless the user requests one.
- Once pushed, consider a follow-up verification pass through the actual installed `kmgraph` plugin (not just local source), since that path has not been exercised yet.
