# ADR-016: Graceful Fallback Pattern for Optional MCP Server Dependencies

**Date:** 2026-03-16
**Status:** Accepted
**Implements:** v0.1.2-beta — Native FTS5 Search (zero-config upgrade path)
**Related:** [ADR-015](ADR-015-node-sqlite3-wasm-for-fts5-search.md), [Lesson: FTS5 and Context-Mode v0.1.1+v0.1.2](../lessons-learned/architecture/Lessons_Learned_FTS5_Search_And_Context_Mode_v0.1.1_v0.1.2.md)

---

## Context

kmgraph's MCP server has a zero-config install model: the SessionStart hook (`hooks-master.sh`) runs `npm install --omit=dev` automatically when `node_modules` is absent. This means users never need to manually install dependencies.

When a new npm dependency is added in a plugin upgrade (e.g., `node-sqlite3-wasm` in v0.1.2), two timing problems arise:

1. **Install timing:** The hook only ran `npm install` when `node_modules/@modelcontextprotocol` was absent. For existing users, that folder already existed — so the new dependency would never be installed automatically.

2. **Startup timing:** Between plugin upgrade and first session restart (when the hook runs), the new package does not exist on disk. If the MCP server tries to `import` it at module load time, the server crashes before any tool can respond.

**Problem:**
- New optional dependencies must install automatically for existing users on upgrade (no manual action)
- The MCP server must start cleanly even when a new dependency is not yet installed
- Features backed by the missing dependency should degrade gracefully, not crash

**Scope:**
- In scope: pattern for adding optional npm dependencies to the MCP server; hook-based auto-install detection
- Out of scope: required dependencies (those that already install correctly on first run)

---

## Decision

Use two complementary mechanisms:

1. **package.json hash check in hooks-master.sh** — detects when `package.json` has changed since the last install and triggers `npm install` automatically
2. **`try/require` fallback pattern in TypeScript** — loads the optional package at runtime with a boolean guard, so the MCP server starts cleanly if the package is absent

### Core Components

**Component 1: package.json hash check (hooks-master.sh)**

Store an md5 hash of `package.json` in `node_modules/.pkg-installed-hash` after each successful install. On every SessionStart, recompute the hash and compare. If different, trigger `npm install`.

```bash
MCP_PKG_HASH_FILE="$PLUGIN_ROOT/mcp-server/node_modules/.pkg-installed-hash"

if [ -f "$MCP_PKG_JSON" ]; then
    if command -v md5sum &> /dev/null; then
        CURRENT_HASH=$(md5sum "$MCP_PKG_JSON" | cut -d' ' -f1)
    elif command -v md5 &> /dev/null; then
        CURRENT_HASH=$(md5 -q "$MCP_PKG_JSON")
    fi
    STORED_HASH=$(cat "$MCP_PKG_HASH_FILE" 2>/dev/null || echo "")
    if [ -n "$CURRENT_HASH" ] && [ "$CURRENT_HASH" != "$STORED_HASH" ]; then
        NEEDS_INSTALL=true
    fi
fi

# After successful install:
echo "$CURRENT_HASH" > "$MCP_PKG_HASH_FILE"
```

**Component 2: try/require fallback (TypeScript)**

Replace static `import` with a `try/require` block. Guard all feature usage with a boolean flag.

```typescript
let OptionalClass: any;
let featureAvailable = false;
try {
  OptionalClass = require("optional-package").ClassName;
  featureAvailable = true;
} catch {
  // Package not installed yet — feature disabled until next restart
}

export function featureFunction(...): ReturnType {
  if (!featureAvailable) {
    return safeDefault; // or throw descriptive error
  }
  const instance = new OptionalClass(args);
  // ...
}
```

**TypeScript note:** Any function that accepts an instance of the dynamically-loaded class must type that parameter as `any`. TypeScript cannot use a `let` variable as a type annotation (TS2749: "refers to a value, not a type").

### Implementation Approach

When adding any optional npm dependency to the MCP server:
1. Add the package to `package.json` dependencies — the hash check in `hooks-master.sh` will trigger reinstall on the next user session start
2. Load the package with `try/require`, not `import`
3. Set a `featureAvailable` boolean flag
4. Guard all usage of the package with the boolean flag
5. Return a meaningful fallback (empty results, helpful error message) when the flag is false

---

## Rationale

### Why This Approach

1. **Hash check covers all future dependency changes:** Any future addition to `package.json` triggers reinstall automatically. This is a one-time fix that prevents the "existing user doesn't get new dep" problem forever.
2. **`try/require` is the idiomatic Node.js pattern for optional deps:** It is used by countless popular packages (e.g., `chalk`, `dotenv`) for the same reason — the package might not be present and should not crash the host process.
3. **Boolean guard is explicit:** The `featureAvailable` flag makes it obvious in the code that the feature may be absent. There is no hidden state — every path that uses the optional package checks the flag first.
4. **Restart is the correct recovery action:** After the hook installs the missing package on session start, the MCP server needs to restart to pick up the new module. This aligns with how Claude Code manages MCP server connections.

### Alternatives Considered

**Option A: Require users to manually run `npm install` after upgrading**
- Pros: Simple — no hook changes needed
- Cons: Breaks the zero-config promise; users who don't read changelogs will get silent failures; support burden increases
- Rejected because: Zero-config install is a core design principle of kmgraph

**Option B: Check for the specific new package folder (`node_modules/node-sqlite3-wasm`)**
- Pros: More targeted than a hash check
- Cons: Requires a new check for every new dependency added in the future; hash check handles all cases generically
- Rejected because: Too specific; creates maintenance debt

**Option C: Make the MCP server async-initialize dependencies**
- Pros: Could install missing packages at server startup
- Cons: MCP server startup would become slow and error-prone; installs mid-session are unreliable; requires network access at unexpected times
- Rejected because: Complexity and reliability concerns outweigh benefits

### Trade-offs

**Benefits:**
- ✅ Existing users get new dependencies automatically — no action required
- ✅ MCP server always starts cleanly, even with missing optional packages
- ✅ Hash check is generic — handles all future `package.json` changes, not just this one
- ✅ Graceful fallback ensures the tool panel shows all tools (feature just reports unavailable)

**Costs:**
- ❌ `try/require` bypasses TypeScript's module resolution — no type safety for the loaded class
- ❌ Small overhead: hash computation on every SessionStart (~1ms)
- ❌ Requires one session restart after upgrading before new feature is available

**Mitigation:**
- Type safety loss is isolated to the module that loads the optional package; internal functions receive typed parameters
- Hash computation cost is negligible
- The "one restart" requirement is explicitly communicated to users in the MCP tool response when the feature is unavailable

---

## Consequences

### Positive

1. **Upgrade path is seamless:** Users upgrading from v0.1.0 to v0.1.2 get `node-sqlite3-wasm` installed on their next session start with no manual steps
2. **Pattern is reusable:** Any future optional feature backed by an npm package can follow this pattern
3. **Failure mode is helpful:** When `featureAvailable` is false, tools return a message like "Restart Claude Code to complete setup" rather than crashing

### Negative

1. **One-session delay:** The feature is unavailable for exactly one session after upgrading — the session where the hook installs the package. After restarting, it is available.
2. **Hash file in node_modules:** `.pkg-installed-hash` is an unconventional file location, but `node_modules/` is the right place since it is regenerated with each install and not committed to git

### Neutral

1. **TypeScript `any` type in function signatures:** Functions that accept instances of the dynamically-loaded class use `any`. This is contained to the module boundary.

---

## Implementation

**Timeline:** Implemented 2026-03-16 in v0.1.2-beta

**Affected Components:**
- `scripts/hooks-master.sh` — added package.json hash check (Section 1)
- `mcp-server/src/tools/fts5.ts` — uses `try/require` pattern for `node-sqlite3-wasm`; `fts5Available` boolean guards all DB operations

**Migration Path:**
This pattern applies retroactively: the hash check in `hooks-master.sh` handles the v0.1.0 → v0.1.2 upgrade without any user action.

---

## Validation

**Success Criteria:**
- ✅ Existing users (v0.1.0) get `node-sqlite3-wasm` installed on next session start — verified by hash mismatch detection
- ✅ MCP server starts cleanly before `node-sqlite3-wasm` is present — verified by removing the package and starting the server
- ✅ `kg_search` falls back to linear scan when FTS5 is unavailable — verified in unit tests
- ✅ `kg_fts5_rebuild` returns helpful "restart required" message when FTS5 unavailable

**Review Date:** 2026-09-16 — reassess if Claude Code provides a better mechanism for post-upgrade dependency management

---

## Related Decisions

- **[ADR-015](ADR-015-node-sqlite3-wasm-for-fts5-search.md):** The specific package this pattern was created to support

---

## Related Documentation

**Lessons Learned:**
- [FTS5 Search and Context-Mode Integration v0.1.1+v0.1.2](../lessons-learned/architecture/Lessons_Learned_FTS5_Search_And_Context_Mode_v0.1.1_v0.1.2.md) — "What Didn't Work" section covers failed approaches that led to this pattern

**Implementation:**
- `scripts/hooks-master.sh` — hash check in Section 1 (MCP Server Auto-Build)
- `mcp-server/src/tools/fts5.ts` — `try/require` pattern at module top

---

## Distribution & Bundling Requirements

**Critical:** This pattern assumes the MCP server binary is fully functional in the deployment context. As of v0.5.10.3, bare `tsc` compilation without bundling **breaks marketplace installs** because:

1. `mcp-server/dist/index.js` is unbundled output — it contains `require()` calls to `@modelcontextprotocol/sdk`
2. Marketplace installs clone the git repo without running `npm install` in the server directory
3. Result: `Cannot find module '@modelcontextprotocol/sdk/server/mcp.js'` on every marketplace-sourced install
4. Workaround: Use esbuild to create a self-contained bundle that includes all `node_modules` dependencies

**Implication for this ADR:** The hash check and try/require patterns work correctly for **development installs** (where users run `npm install` locally) and for **plugin platforms that execute post-install hooks** (e.g., Claude Code's SessionStart hook). However, **marketplace binary distributions require esbuild bundling**, not bare tsc output. See [v0.5.10.3 tracking](#todo-link).

## Future Considerations

1. **Claude Code native upgrade hooks:** If Claude Code ever provides a post-upgrade lifecycle hook, that would be the better place to trigger `npm install` than the hash check. Revisit this ADR when such a mechanism becomes available.
2. **Generalizing the pattern:** If multiple optional features are added, consider a shared `loadOptionalDep(packageName, className)` utility that encapsulates the `try/require` + boolean flag pattern.
3. **esbuild bundling for marketplace:** All marketplace-sourced binaries must be built with esbuild to bundle dependencies. Update the MCP server build pipeline to output both a development version (for plugin platforms with hooks) and a marketplace binary (esbuild bundled).

---

**Decision Made:** 2026-03-16
**Last Updated:** 2026-03-16
**Status:** Accepted
