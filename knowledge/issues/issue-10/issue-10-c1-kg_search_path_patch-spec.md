---
id: issue-10-c1
type: Spec
status: draft
parent: issue-10
branch: v0.6.18-misc-patches
plan-slug: v0.6.18.c1-kg_search_path_patch
related-adrs: [ADR-001]
created: 2026-07-11
---

# Spec: kg_search path patch (getProjectRoot generalization)

## Problem

`getProjectRoot()` in `mcp-server/src/utils.ts:86-91` only strips a trailing `/docs`
segment when deriving a project root from a KG's configured `path`. Any KG whose
content directory has a different name (e.g. this repo's own `knowledge/`) falls
through unchanged, so the mismatch check in `capture.ts:254-262` compares `cwd`
against the full content-dir path instead of its parent — legitimate calls from
the actual project root are rejected with `KG_MISMATCH`.

Full background: [issue-10 description](issue-10-description.md).

## Decision

Generalize `getProjectRoot()` to always treat the last path segment of `kgPath` as
the content directory and return its parent — regardless of what that segment is
named. Remove the `/docs`-specific special case entirely; no suffix list, no config
lookup.

```ts
export function getProjectRoot(kgPath: string): string {
  return path.dirname(kgPath);
}
```

### Why this over the alternatives

- **Vs. comparing against a registered project root in config:** would require adding
  a `projectRoot` field to `kg-config.json` and threading it through. That deepens
  the fix's coupling to `kg-config.json`'s schema — a file whose *location* is itself
  Claude-only today (see [c2 spec](../../../docs/specs/2026-07-11-kg-config-location-refactor-design.md)).
  Keeping this fix as pure path-string derivation means it has zero dependency on
  config schema or location, so it's unaffected by whatever happens to `kg-config.json`
  later.
- **Vs. expanding the hardcoded suffix list:** still guessing, still breaks for any
  content-dir name not on the list. Doesn't fix the actual defect, just widens it.

### Known limitation (accepted)

If a KG's `path` ever points directly at a project root with no intervening content
directory (i.e., KG content lives at the project root itself, not one level under
it), `path.dirname()` would incorrectly chop off a real parent directory. No KG in
this system is configured that way today (every registered KG — project-local,
personal, cowork — stores content one directory under its project root), so this
is not a regression risk in practice. If that layout is ever introduced, it needs
its own fix at that time.

## Scope

- `mcp-server/src/utils.ts` — `getProjectRoot()` body only
- No changes to `capture.ts` call site (signature and usage unchanged)
- No changes to `kg-config.json` schema

## Testing

- Unit test: `getProjectRoot('/a/b/knowledge')` → `/a/b`
- Unit test: `getProjectRoot('/a/b/docs')` → `/a/b` (existing case still passes)
- Regression: `kg_capture` from this repo's root (`/Users/mkaplan/GitHub/knowledge-graph`)
  no longer returns `KG_MISMATCH` for the active KG at `.../knowledge-graph/knowledge`

## Out of scope

- `kg-config.json` location (`~/.claude/` vs `~/.kmgraph/`) — separate plan, see c2 spec
- `mcp-server/package.json` version drift (0.6.15 vs 0.6.18) — separate, unrelated
