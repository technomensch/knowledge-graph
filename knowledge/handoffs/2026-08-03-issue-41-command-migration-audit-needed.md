# Handoff: issue-41 — Full Command/Agent/Skill Audit Needed for Unmigrated Pre-ADR-067 `config.active` Assumptions

**Type:** Findings/recommendation only — no code changes. Filed as a tracked-only issue per
explicit instruction; this handoff exists to make sure the finding is not lost between
sessions, not to scope or begin the fix itself.

**Continues from:** `knowledge/issues/issue-41/issue-41-description.md` (filed this session,
2026-08-03), discovered while registering this session's own worktree
(`.worktrees/v0.7.0-adr-067-c1`) as its own KG graph entry via `kg_config_init` and then
investigating how to explicitly target the main project graph instead.

## Finding

Phase 7.1 of the ADR-067 implementation plan (this session, branch `v0.7.0-adr-067-c1`)
retired the dead `gov-capture-routing` skill and migrated 9 files (5 commands + 3 agents +
1 skill) that referenced it — closing issue-18. That fix list was scoped to "files that
reference `gov-capture-routing`," not to "files that still assume the pre-ADR-067 mutable
`config.active` pointer model." Those two sets turned out not to be the same set.

Live evidence, found while working issue-41: `commands/kmg-start-issue-tracking.md`'s own
embedded Step 2.1 script still resolves the target KG via
`d['graphs'][d['active']]['path']` — the `active` field ADR-067 retires entirely in favor
of `resolveGraph()`/`scope`/`targetKg`. Checked against the real production
`~/.kmgraph/kg-config.json`: `active` is still set to `"docs-readme-poc"`, an unrelated
project's graph. This command, run as-is today against that real config, would file an
issue into the wrong project's KG. `kmg-start-issue-tracking.md` was never in Phase 7.1's
9-file list because it doesn't reference `gov-capture-routing` — it has its own,
independent, unmigrated dependency on `.active`.

This strongly suggests other commands/agents/skills beyond Phase 7.1's 9 files may have the
same gap. **The full command/agent/skill surface has never been audited against ADR-067's
actual resolution model** (cwd-derived `resolveGraph()`, `scope`/`targetKg` params) —
only the subset that happened to also reference the separately-broken
`gov-capture-routing` skill has been checked and fixed.

## Recommendation (not yet decided — surfacing for whoever picks up ADR-067 next)

- This should become its **own new ADR-067 phase plan**, not a follow-up patch. Recommend
  numbering it the next available phase slot after 7.1 (or renumbering appropriately) in
  `knowledge/plans/v0.7.0-adr-067-orchestration.md`.
- Scope: enumerate every file referencing `config.active`, `.active`, `kg-config.json`'s
  active field, or any other pre-ADR-067 resolution assumption across `commands/`,
  `agents/`, and `skills/`; migrate each to `resolveGraph`/`scope`/`targetKg`.
- Priority note from issue-41: this is more time-sensitive than issue-41's other half
  (worktree registration guardrails, which is a design-first, no-data-loss-observed
  problem). If this branch merges without the audit, commands beyond the already-fixed 9
  will silently misbehave against real user configs the first time someone runs one on a
  stale, unmigrated `kg-config.json` — as `kmg-start-issue-tracking.md` already
  demonstrates live.
- Related, lower-urgency: issue-41 also documents 4 separate gaps in worktree KG
  registration itself (no collision guard, no tree-identifying naming, no merge-time
  conflict resolution) — needs its own design pass, not bundled into the migration-audit
  phase.
- Also open: issue-40, the `--named`/`--project`/`--graph` flag-naming question, and a
  related user-facing docs gap (the answer to "how do I target a specific KG across
  worktrees of the same repo" — `kg_capture`'s `targetKg` param — isn't documented
  anywhere yet; flagged for the docs update when this branch merges).

## Related

- `knowledge/issues/issue-41/issue-41-description.md` — full issue, both halves (worktree
  registration guardrails + migration-completeness audit)
- `knowledge/issues/issue-40/issue-40-description.md` — `--named`/`--project`/`--graph`
  flag-naming question, filed alongside issue-41 from the same investigation
- `knowledge/issues/issue-18/issue-18-description.md` — Phase 7.1's `gov-capture-routing`
  retirement; the 9 files fixed there are a subset of what this audit needs to cover
- `knowledge/decisions/ADR-067-mutable-active-switch-vs-context-derived-kg-resolution.md` +
  `ADR-067-implementation-spec.md` — the resolution model every unmigrated file needs to
  move to
- `knowledge/plans/v0.7.0-adr-067-orchestration.md` — where the new phase should be added
  (in the worktree at `.worktrees/v0.7.0-adr-067-c1/knowledge/plans/`, since plans are
  gitignored and worktree-local)

## Approval gate

This handoff is new/uncommitted, as is the session summary update alongside it. No
`git add`/`git commit`/`git push` run. No edits made to issue-41, issue-40, or any file
already covered by this session's prior commits.
