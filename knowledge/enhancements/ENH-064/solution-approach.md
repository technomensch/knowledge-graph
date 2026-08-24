# Solution Approach: ENH-064

## Goal

Every knowledge graph scaffolded by `kmg-init` carries a README that
explains what it is and, for a reader without the plugin, how to install
it and connect to the folder.

## Approach

1. Add a README template (draft copy in
   [ENH-064-specification.md](ENH-064-specification.md#draft-readme-copy-subject-to-refinement-during-implementation))
   to the init/scaffold flow, written to `{active_kg_path}/README.md` (or
   the knowledge-graph folder root, name TBD against existing scaffold
   conventions).
2. Wire it into `kmg-init` so every newly initialized graph gets it.
3. Add a backfill path in `kmg-upgrade` for graphs that predate this
   enhancement.
4. Decide, during implementation, whether a machine-readable marker
   (`.kmgraph.yml` or similar) is needed alongside the README so
   `kmg-init` can detect "this folder exists and was already
   initialized" versus "this folder exists but was never connected to
   the plugin" — this affects both the backfill logic and any future
   double-init guard.
5. Confirm placement doesn't collide with an existing top-level
   `README.md` the user's project may already have (the knowledge-graph
   folder is nested — e.g. `knowledge/`, not repo root — so collision
   risk is low, but verify against `kg_scaffold` output before writing).

## Style Constraints (binding for implementation)

- Neutral, third-person voice.
- No em dashes.
- One mention of the KMGraph link, no repeated branding across files.
- No per-file watermarking of decisions/lessons/issues.

## Open Questions for Implementation

- Exact filename/location within the scaffold (`README.md` at graph
  root vs. elsewhere).
- Whether `.kmgraph.yml` marker is in scope for this enhancement or
  deserves its own ENH.
- Whether `kmg-upgrade` backfill should overwrite a README a user has
  since hand-edited (likely: no — check for an existing file first).

## Related

- Knowledge graph entry to be linked here after
  `/kmgraph:kmg-link-issue` (Step 6.3).
