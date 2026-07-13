---
id: issue-10
type: Bug
status: resolved
branch: v0.6.16-update-claude-extract-chat-for-sub-agents
resolved-on-branch: v0.6.18-misc-patches
created: 2026-07-11
resolved: 2026-07-12
related-adrs: [ADR-001]
related-enhs: []
target-release: v0.6.18
---

# Issue-10: kg_capture KG_MISMATCH false positive when KG path doesn't end in /docs

## Problem

`getProjectRoot()` in `mcp-server/src/utils.ts:86-91` special-cases KG paths ending in `/docs`, stripping that suffix to derive the project root:

```ts
export function getProjectRoot(kgPath: string): string {
  if (kgPath.endsWith('/docs')) {
    return path.dirname(kgPath);
  }
  return kgPath;
}
```

For any KG whose configured `path` does **not** end in `/docs` (this repo's own `~/.claude/kg-config.json` active KG is `/Users/mkaplan/GitHub/knowledge-graph/knowledge` — ends in `/knowledge`), the function falls through and returns `kgPath` unchanged. `kg_capture`'s mismatch check (`capture.ts:254-262`) then requires the caller's `cwd` to be literally inside that KG path. Any tool call made from the repo root (one directory above `knowledge/`) — the normal working directory for this project — gets rejected with `KG_MISMATCH`, even though it is the correct, active KG for that project.

Confirmed live 2026-07-11: `kg_capture` (session-summary-agent, cwd `/Users/mkaplan/GitHub/knowledge-graph`) rejected a legitimate session-summary write with `KG_MISMATCH` (`activeKgRoot: "/Users/mkaplan/GitHub/knowledge-graph/knowledge"`, `cwd: "/Users/mkaplan/GitHub/knowledge-graph"`). Workaround used: retry with explicit `targetKg` param, which bypasses this check entirely — meaning the check is both wrong for non-`/docs` KG layouts and easily bypassed, so it's currently more friction than protection for this repo's own KG.

This is a repo/code bug in `getProjectRoot()`, not a local `kg-config.json` misconfiguration — the config's `path` field correctly points at the KG's actual content directory (`knowledge/`), which is where all the ADR/ENH/session files live per this repo's own structure. The function's `/docs`-suffix assumption doesn't generalize to KGs whose content directory is named `knowledge/` (or anything else).

## Scope note (multi-KG relevance)

Directly relevant to [ADR-001: Centralized Multi-KG Configuration](../../decisions/ADR-001-centralized-multi-kg-configuration.md) — ADR-001 established the `~/.claude/kg-config.json` active-pointer model this bug lives inside. Any user whose KG content directory isn't literally named `docs` (this repo included) hits the same false positive. Flagged there.

## Proposed Fix (implemented)

Generalize `getProjectRoot()` so it doesn't hardcode `/docs` as the only recognized content-dir suffix — e.g. accept any single trailing path segment as the content dir and return its parent, or read the KG's registered `path` against the repo root directly instead of pattern-matching the suffix. Needs a decision on which approach before implementing (not scoped here — this issue is a bug report, not a fix spec).

## Resolution (2026-07-12)

Fixed on branch `v0.6.18-misc-patches`, commit `78957a88` ("fix(mcp-server): generalize getProjectRoot beyond /docs suffix"). `getProjectRoot()` replaced with an unconditional `path.dirname(kgPath)` — no longer pattern-matches on the `/docs` suffix at all, so any KG content-directory name (`knowledge/`, `docs/`, or otherwise) resolves correctly. Covered by new tests in `mcp-server/tests/utils.test.ts` (3 tests); full suite passed with no regressions at the time.

## Related

- [ADR-001: Centralized Multi-KG Configuration](../../decisions/ADR-001-centralized-multi-kg-configuration.md)
- `mcp-server/src/utils.ts:86-91` (`getProjectRoot`)
- `mcp-server/src/tools/capture.ts:254-262` (mismatch check call site)
