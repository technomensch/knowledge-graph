---
id: ENH-030
type: Enhancement
status: proposed
---

# ENH-030: KG Remove / Unregister Command

**Status:** 🟡 Proposed
**Discovered:** 2026-06-28
**Related:** `kmg-init`, `kmg-list`, `mcp-server/src/config.ts`/`resolution.ts` (current
`status: pending|active|archived|deleted` registry lifecycle model — see 2026-09-01 note
below; `kmg-switch` is retired, no longer a valid reference point)
**GitHub Issue:** #256

---

## Problem

No command exists to remove or unregister a knowledge graph. Users who create temporary KGs (e.g. style guides, one-off project KGs) have no supported path to clean them up. Current workaround: manually delete the KG directory and hand-edit `~/.kmgraph/config.json` to remove the entry — error-prone and undiscoverable.

---

## Desired Behavior

A new command `/kmgraph:kmg-remove` (or `kg_remove` MCP tool) that:

1. Lists registered KGs and prompts the user to select one (or accepts a name argument)
2. Confirms intent — shows KG path, type, entry count
3. Offers two modes:
   - **Unregister only** — removes the entry from `~/.kmgraph/config.json` but leaves files on disk
   - **Unregister + delete** — removes config entry AND deletes the KG directory (with explicit confirmation)
4. If the target KG is currently active, switches to another registered KG (or clears active) before removing
5. Refuses to remove the last remaining KG without explicit `--force` flag

---

## Out of Scope

- Archiving / exporting KG content before deletion (separate enhancement)
- Bulk removal of multiple KGs in one command

---

## Notes

- ~~`config.json` manipulation already exists in `kg_config_switch` — the remove command can reuse that pattern~~ **Stale (2026-09-01) — see Status note below: `kg_config_switch` is retired.** Reuse the current `status`/`statusChangedAt` registry lifecycle in `mcp-server/src/config.ts`/`resolution.ts` instead.
- The delete-files path must be guarded: require user to type the KG name to confirm (similar to GitHub repo deletion UX)

---

## Status note (2026-09-01) — spec is stale, needs refresh before implementation

Found while auditing [[ADR-067]]'s implementation status. `kg_config_switch`
(the reuse pattern named above) is **retired** — ADR-067 §11 removed it along
with `kmg-switch` and the old `.active` pointer model entirely (shipped
v0.7.0, 2026-08-04). The "Related" line above is also stale for the same
reason (`kmg-switch` no longer exists).

Building this today should target the **current** registry lifecycle model
instead: `graphs` entries now carry a `status: pending | active | archived |
deleted` enum with `statusChangedAt` (ADR-067 §4, `mcp-server/src/resolution.ts`
/ `config.ts`) — "archive, never hard-delete" is already the invariant this
enhancement's "Unregister only" mode wants; "Unregister + delete" would be
the first caller to actually flip an entry to `deleted`. Reuse *that*
mechanism, not the removed `kg_config_switch` pattern.

**No blocker** — self-contained, can be picked up independently anytime.
Not required for ADR-067 to be considered shipped (its own §18 marked this
"efficient to fold in, not required to ship this release"). Do a quick spec
pass to replace the stale references above before implementation starts.
