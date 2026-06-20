# ENH-027: Superpowers Brainstorming Spec → KG Linkage

**Status:** Proposed
**Version:** TBD
**Parent:** ADR-029 (plan file location), ENH-015 (decision governance / brainstorm-recall)

---

## Problem

`superpowers:brainstorming` fires as a side effect of hooks and keywords — often without explicit user intent to start a full design session. When it does produce a spec file, the output lands in `docs/superpowers/specs/` with no connection to the knowledge graph. If a related ENH, ADR, or issue spec already exists, the brainstorming output is a second orphaned artifact that `kg_search` and recall cannot connect to its parent.

## Scope

1. **Recall-based parent detection** — before writing the spec file, brainstorming runs `kg_search` on the topic. If one strong match is found (ENH/ADR/issue), auto-route without prompting. If multiple matches or weak confidence, ask the user which artifact (or "none") before writing.
2. **Routing on confirmed match** — spec written to `knowledge/enhancements/ENH-NNN/` (or equivalent artifact folder) with a `related:` frontmatter field pointing to the parent spec file.
3. **Fallback for no match** — write to `docs/specs/` (not `docs/superpowers/specs/`) and flag the file as unlinked so a future `sync-all` pass can attempt linkage.
4. **Rules update** — update `triggers.md` spec gate from `docs/specs/` to reflect the routing logic (matched → artifact folder, unmatched → `docs/specs/`).

## Out of Scope

- Changing when brainstorming triggers (accidental trigger reduction is a separate concern)
- Merging brainstorming output into an existing ENH spec (brainstorming output remains a separate file; it links, not merges)

## Success Criteria

- A brainstorming session on a topic matching an existing ENH produces a spec in that ENH's folder with correct `related:` frontmatter
- A brainstorming session on an unmatched topic writes to `docs/specs/` (not `docs/superpowers/specs/`)
- `kg_search` on the ENH topic surfaces both the original spec and the brainstorming spec
- No spec file is written to `docs/superpowers/specs/` after this ships

## Deferred From

N/A — new ENH identified during plan-rules update session (2026-06-17)

## Related

- ADR-029: plan file location in knowledge graph
- ENH-015: decision governance / brainstorm-recall skill
