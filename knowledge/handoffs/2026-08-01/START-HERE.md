# Start Here — Project Handoff

**Branch:** v0.7.0
**Commit:** 88d665ff
**Continues from:** knowledge/sessions/2026-08-01-v0.7.0.md

---

For current state, open issues, and in-progress work: read the session summary linked above.
For project structure and architecture: see DOCUMENTATION-MAP.md and ARCHITECTURE-SNAPSHOT.md in this package.

**Superseded note:** this handoff package previously described a Thread A / Thread B dual-branch model (issue-32 vs. ADR-067/v0.7.0). That model is stale — issue-32 shipped separately, and the project now runs a single shared `v0.7.0` branch with sequential commit-groups (C1-C4). See `knowledge/plans/v0.7.0-overview.md` (gitignored, not in this package) for the live tracker.

**ADR-067 (C1) plan status:** fully reviewed, hardened, and split into an executable multi-file
set — `knowledge/plans/v0.7.0-adr-067-orchestration.md` plus `v0.7.0-adr-067-p0.md` through
`p9.md` (10 phases). Full review record, including a plan-corruption incident (concurrent-session
race on the gitignored plan-mirror — see `~/.kmgraph/lessons-learned/process/` for the captured
lesson) and its resolution, is in `knowledge/analysis/adr-067-plan-review-findings.md`.
**Zero implementation code written yet** — this is plan-review-and-authoring work only; real
execution starts at Phase 0. All of this is gitignored, not in this package; see the session
summary linked above for the full narrative.

<!-- kmgraph-handoff-manifest
```json
["/Users/mkaplan/GitHub/knowledge-graph/knowledge/sessions/2026-08-01-v0.7.0.md", "/Users/mkaplan/GitHub/knowledge-graph/handoff-packages/2026-08-01/DOCUMENTATION-MAP.md", "/Users/mkaplan/GitHub/knowledge-graph/handoff-packages/2026-08-01/ARCHITECTURE-SNAPSHOT.md", "/Users/mkaplan/GitHub/knowledge-graph/knowledge/analysis/adr-067-plan-review-findings.md"]
```
-->
