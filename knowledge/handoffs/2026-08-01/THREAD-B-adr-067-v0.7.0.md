# Thread B — ADR-067 / v0.7.0: KG Resolution Model

**Self-contained** — this file plus its linked source docs are everything you need. You
do not need Thread A's detail (issue-32) to pick this up; the only connection is a shared
file (`mcp-server/src/index.ts`) noted below for awareness, not action.

## Status

Fully resolved design, implementation-ready spec, 2763-line implementation plan — all
written, none implemented, nothing committed. Currently on branch `v0.7.0` (already
checked out, off `main`). Waiting on explicit user "Proceed"/"Start" to begin.

## The problem being solved

`kg-config.json` currently resolves "which knowledge graph" via a single mutable
`.active` pointer shared across all sessions on a machine. This produces cross-KG bleed
via three failure modes: stale/divergent pointer (issue-14), concurrency (one session's
switch silently retargets another), and context mismatch (active KG disagrees with cwd,
only partially guarded by issue-10's `KG_MISMATCH` check). Two real bugs and one live
incident (caught mid-session during this ADR's own research) confirm this is not
hypothetical.

## Resolution model (the decision)

Replace the mutable `.active` switch with **context-derived (cwd-based) resolution**:
- **Project-local** KGs (many) resolve from cwd/project-root, per call, no switch.
- **Personal** KG (exactly one) lives in `~/.kmgraph/`, resolved via explicit `scope`
  param, not a switch.
- No name given → resolve from cwd, never ask which graph (empirically dominant case —
  all 18 historical `kmg-switch` invocations were project↔project).
- Name given + exact match → route directly. Fuzzy match(es) → always show candidates,
  ask which (no silent fan-out). No match → tell the user it isn't registered, never
  search unregistered locations.
- Retires `kmg-switch` / `kg_config_switch` / `KG_MISMATCH` entirely.

Full resolution flow, registry lifecycle, concurrency-safe writer design, interactivity
discriminator for automated/CI callers, and the `[personal]`/`[project]` bracket-marker
override syntax are in the implementation spec (§3 onward) — not repeated here.

## Design/review history

Design agreed 2026-07-26, then reviewed three times by two independent models (Opus
twice, Fable once, 2026-07-26/27), with a follow-up brainstorming pass on 2026-07-28
resolving all 13 items from the Fable review plus 3 previously-undesigned mechanisms
(registry concurrency/locking, personal-scope marker syntax, moved-path compare-view).
All 22 Opus findings (14 original + 8 second-scan) have a resolved direction recorded.

The plan itself has since had a fold-in addendum merged: Task 7.2.5 (real fix for
issue-15's FTS5 misindexing bug) and Task 7.5 (ENH-030's `kg_config_remove` tool), plus
a correction to Phase 10's verification step (was checking the wrong task for issue-15).
This closes out the project's grouped-release-scope commitment: issue-10/14/23 free,
issue-15/ENH-030/ENH-051 as real implemented-and-tested tasks — none of the four closes
until actually implemented, tested, and passing.

## Architecture (implementation shape)

Additive-then-subtractive inside `mcp-server/src/`: new modules for resolution
(`resolution.ts`), interactivity (`interaction.ts`), and compare (`tools/compare.ts`);
`utils.ts` gains schema fields and an atomic/merge-aware config writer; `tools/config.ts`,
`tools/capture.ts`, `tools/search.ts`, `cli.ts`, and `index.ts` are rewired to call
resolution instead of reading `config.active`; `kg_config_switch` and `kmg-switch.md`
are deleted last, once nothing depends on them. `kg_upgrade` carries the on-disk
migration.

**Version bump:** `0.6.20` → **`0.7.0`** (minor, not patch) — schema change + two
retired public surfaces + mandatory migration, same shape as the earlier 0.6.20
cowork/global-topic migration.

## Open, undecided sub-thread (does not block this plan)

A concurrent session working **issue-18** (`gov-capture-routing`, an unreachable skill
referenced by 8+ commands/agents) found a real overlap: `gov-capture-routing`'s job
(resolve `$level`/`$target_kg` from `--user`/`--project`/`--named=<kg>`/`--active` flags,
handle KG-not-found/conflict prompts) is functionally the same category of decision as
this ADR's new `[personal]`/`[project]` bracket-marker syntax. Concretely,
`commands/kmg-sync-all.md`'s `gov-capture-routing` contract calls
`/kmgraph:kmg-switch {$restore_kg}` to restore state — a command this ADR's plan
**retires**. If issue-18 is ever "fixed" (vs. retired) without accounting for that, it
would call a command that no longer exists post-ADR-067.

This is **acknowledged, not resolved** — no scope change was made to this ADR or plan.
issue-18's own fix-vs-retire decision is explicitly deferred until after this ADR ships.
Acknowledged in spec §18 and `ROADMAP.md`. Full findings:
`knowledge/handoffs/2026-08-01-issue-18-adr-067-overlap-findings.md`.

**Also surfaced, not yet actionable:** whether `kmg-sync-all` should be formally
proposed for deprecation. No ENH exists for this yet — it's a real but informal 2026-07
chat discussion, with no evidence the command has ever actually been invoked. Not
resolved into anything actionable; just don't be surprised if it resurfaces.

## Shared-file note (for awareness only, not action)

Thread A's plan (issue-32, unrelated bug fix branching from `main`) also edits
`mcp-server/src/index.ts` (one import + one function call before
`register*Tools(server)`). If both branches are in flight, whichever merges second needs
a small manual rebase at that insertion point. Not a reason to sequence Thread B — just
don't be surprised by a conflict there.

## Source files

- `knowledge/decisions/ADR-067-mutable-active-switch-vs-context-derived-kg-resolution.md`
  — full decision record: problem, 3 rounds of review findings, rationale trail (502
  lines). Read for *why*.
- `knowledge/decisions/ADR-067-implementation-spec.md` — implementation-ready spec,
  status "Ready for implementation" (282 lines). Read for *what to build*.
- `knowledge/plans/v0.7.0-adr-067-kg-resolution.md` — the implementation plan, 2763
  lines, 10 phases, includes the folded-in issue-15/ENH-030/ENH-051 fixes.

## Next step

Review the plan, then say "Proceed" or "Start" to begin implementation on branch
`v0.7.0` (already checked out).
