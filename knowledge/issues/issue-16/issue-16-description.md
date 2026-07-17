---
id: issue-16
type: Bug
status: fixed
github-issue: "#174"
created: 2026-07-16
related-issues: []
target-release: null
---

# Issue-16: mcp-server kg_version / MCP handshake reports stale hardcoded 0.3.10

## Problem

`kg_version` tool and the MCP handshake (`serverInfo.version` reported to any MCP client on connect) both report a hardcoded `"0.3.10"`, completely divorced from `mcp-server/package.json`'s actual version. This means anyone connecting an MCP client or running `kg_version` sees `0.3.10` regardless of the actual installed version (e.g., `0.6.18`, `0.6.19`, etc.). Pre-existing on `main` — not a regression introduced by any single branch, just never caught until now.

## Root Cause

Two-fold:

1. **Build scripts inject a hardcoded literal** — Both esbuild build scripts in `mcp-server/package.json` (`build:bundle` and `build:cli`) injected `--define:__SERVER_VERSION__` as a literal string `"0.3.10"` instead of deriving it from `package.json`. This is a static define that gets baked into `dist/bundle.js` and `dist/cli.js` at compile time.

2. **index.ts constructor also hardcodes the version** — `mcp-server/src/index.ts`'s `new McpServer({ name, version })` constructor hardcoded `version: "0.3.10"` directly in the source, never referencing the `__SERVER_VERSION__` define at all. So even if the build scripts were fixed, the handshake version would still be wrong because the code ignores the define.

**Why only these two places?** Every other call site in the codebase handles versioning correctly:
- `mcp-server/src/tools/fts5.ts:556` (the `kg_upgrade` rebuild path) passes `resolvedType` correctly.
- `mcp-server/src/tools/search.ts:68` passes `kgType` when resolving the DB path.
- `mcp-server/src/tools/version.ts` already uses the correct `__SERVER_VERSION__` pattern with a fallback: `typeof __SERVER_VERSION__ !== "undefined" ? __SERVER_VERSION__ : "0.0.0"`.

So this is a localized version-reporting bug, not a codebase-wide pattern.

## Blast Radius (assessed 2026-07-16)

- Affects all MCP clients connecting to `mcp-server` — they receive `"0.3.10"` in `serverInfo.version` regardless of actual version.
- Affects the `kg_version` tool output — users see `"0.3.10"` when they should see the real version.
- No data-loss or wrong-results risk — version reporting is informational only, doesn't affect actual tool behavior.
- Only two locations need fixing: the two build scripts and one line in `index.ts`.
- Pre-existing on `main` — the hardcoded `"0.3.10"` has been in the codebase for many releases; `mcp-server` bumped versions multiple times (0.3.x, 0.4.x, 0.5.x, 0.6.x) while the hardcoded string was never updated.

## Recommended Fix

Straightforward fix, no design or architecture questions:

1. Update `mcp-server/package.json` build scripts:
   - Change `build:bundle` and `build:cli` to inject `--define:__SERVER_VERSION__=$npm_package_version` instead of the literal `"0.3.10"`.
   - This makes the baked-in version always track `package.json` going forward (no future drift).

2. Update `mcp-server/src/index.ts`:
   - Replace the hardcoded `version: "0.3.10"` with `version: typeof __SERVER_VERSION__ !== "undefined" ? __SERVER_VERSION__ : "0.0.0"`.
   - This mirrors the existing pattern already used in `mcp-server/src/tools/version.ts`.

3. Rebuild `dist/` and verify:
   - Both `dist/cli.js` and `dist/index.js` should bake the current version, with zero remaining `0.3.10` references.
   - `kg_version` should report the actual version.
   - The MCP handshake `serverInfo.version` should report the actual version.

No test changes or new test coverage needed — version reporting is introspection-only and doesn't affect tool behavior.

## Status

**Fixed (2026-07-16), landed on v0.6.19 commit ffed79f0, not yet merged to main.**

Both `mcp-server/package.json` build scripts now inject `$npm_package_version` instead of the literal. `mcp-server/src/index.ts` now uses the `__SERVER_VERSION__`-with-fallback pattern. `mcp-server` bumped `0.6.18` → `0.6.19` (version change driven by other fixes in this release too: `cli.ts` config-path fix and `capture.ts` FTS5 routing fix from [[issue-15]]), `dist/` rebuilt and verified. Confirmation:

- `grep -r "0.3.10" dist/` returns zero matches.
- `kg_version` reports `0.6.19`.
- MCP handshake reports `serverInfo.version: "0.6.19"`.
- `tsc --noEmit` clean (no type errors).

Cross-checked by running full test suite (`npm test` in `mcp-server/`): all tests pass, including the version tool test which verifies `kg_version` output.

Not pushed, no PR — awaiting user go-ahead. Will be merged to `main` as part of `v0.6.19` release.
