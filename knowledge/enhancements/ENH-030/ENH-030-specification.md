# ENH-030: KG Remove / Unregister Command

**Status:** 🟡 Proposed
**Discovered:** 2026-06-28
**Related:** `kmg-init`, `kmg-switch`, `kmg-list`

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

- `config.json` manipulation already exists in `kg_config_switch` — the remove command can reuse that pattern
- The delete-files path must be guarded: require user to type the KG name to confirm (similar to GitHub repo deletion UX)
