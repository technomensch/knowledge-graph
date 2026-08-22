---
id: issue-31
type: Bug
status: resolved
github-issue: "#200"
branch: none
created: 2026-07-28
related_adrs: ["ADR-066"]
related_enhs: ["ENH-056"]
---

# issue-31: `kmg-handoff` Writes to Stale Pre-Migration Path `./handoff-packages/` Instead of `knowledge/handoffs/`

## Problem

`commands/kmg-handoff.md` Step 1 hardcodes its default output directory as:

```
output_dir="./handoff-packages/$(date +%Y-%m-%d)"
```

(see `commands/kmg-handoff.md:90`, and the `--output-dir` flag doc at line 36). This is a
literal path from before the v0.6.20 KG content storage migration (commit `815c8136`,
"storage migration completion: cowork retirement, global-topic KG relocation"). The
correct post-migration location is `knowledge/handoffs/`, which is already the active,
in-use convention — see `knowledge/handoffs/2026-05-27/` and
`knowledge/handoffs/2026-05-25-v0.5.9-pre-start.md`.

Because `commands/kmg-handoff.md` was never updated when the migration landed, every
`/kmgraph:kmg-handoff` run since then has written a new dated folder to the repo root
under `handoff-packages/` instead of `knowledge/handoffs/`. This went unnoticed because
`handoff-packages/` is gitignored (`.gitignore:94`), so `git status` never surfaced the
growing pile of stray directories.

As of this session (2026-07-28), the following stray directories exist under
`handoff-packages/` at the repo root:

```
2026-04-21
2026-04-23
2026-05-25
2026-05-28
2026-06-07
2026-06-10
2026-06-14
2026-06-17
2026-07-12
2026-07-14
2026-07-18
2026-07-28
```

(12 directories confirmed present at spec time; ADR-066's narrative estimated "at least
13" — treat the exact count as a snapshot, not load-bearing, since new ones can be added
by any handoff run before this is fixed.)

## Why This Is Its Own Issue (Not Folded Into ENH-056)

`knowledge/decisions/ADR-066-kg-content-storage-location-for-global-and-cowork-modes.md`
§ "Post-Implementation Gap (2026-07-28)" documents this bug in full and states
*"Tracked as: see issue created per `/kmgraph:kmg-start-issue-tracking` (this session,
2026-07-28)"* — but no such issue was actually created at the time that line was written.
What got filed instead was `ENH-056` (GitHub issue `#199`), which is a different, broader
thing: the general cross-cutting pattern of commands/workflows not being fully executed
end-to-end. ENH-056 cites this `kmg-handoff` path bug as one of its two supporting
examples (alongside issue-30), but it does not fix this bug or track it as its own
actionable item — it's evidence for a meta-pattern, not a fix ticket. This issue is the
concrete, fixable bug: the path itself.

## Root Cause

Per ADR-066: the v0.6.20 migration plan scoped its verification to data directories and
the two `kmg-init` implementations. It never performed a repo-wide grep for old path
literals (e.g. `./handoff-packages`, `~/.claude/knowledge-graphs`,
`~/.claude/cowork-knowledge`) across `commands/*.md`. A migration that relocates a
directory will keep silently regenerating the old one forever if any generator still
hardcodes the old path.

## Scope

1. Update `commands/kmg-handoff.md`'s default output path from
   `./handoff-packages/$(date +%Y-%m-%d)` to `knowledge/handoffs/$(date +%Y-%m-%d)` (and
   update the corresponding doc line at line 36).
2. Decide what to do with the 12 existing stray `handoff-packages/*` directories —
   **open question, not resolved here:** migrate their contents into `knowledge/handoffs/`,
   or document them as safe to delete since they are gitignored and were never committed.
   Left for the implementer/user to decide, not pre-decided by this spec.

## Open Questions

- Are there other commands in `commands/*.md` with similarly stale hardcoded paths left
  over from the same v0.6.20 migration? Not audited as part of this issue — flagged here
  as a follow-up question. If the answer is yes, that strengthens the case for the
  broader repo-wide grep ADR-066 already recommends as a migration-checklist item.
  **Answered 2026-07-30 (issue-35): yes, and beyond `commands/*.md`** — `mcp-server/src/tools/fts5.ts`
  and `search.ts` both carry a dead `"knowledge"` directory-list entry left over from
  before `kgPath` was changed to point directly at `knowledge/` itself. Same root cause,
  different layer of the codebase than this issue scoped.
- Should the fix also add a `knowledge/handoffs/` existence check or a one-time migration
  helper, or is a plain path-literal edit sufficient given `handoff-packages/` content was
  never committed?

## Related

- `knowledge/decisions/ADR-066-kg-content-storage-location-for-global-and-cowork-modes.md`
  — § "Post-Implementation Gap (2026-07-28)", full narrative and root cause
- `knowledge/enhancements/ENH-056/ENH-056-specification.md` — the broader cross-cutting
  pattern this bug is cited as supporting evidence for (does not fix this bug)
- `knowledge/issues/issue-30/issue-30-description.md` — the other supporting example
  cited by ENH-056 (session-summary generation gap, a separate bug)
- `commands/kmg-handoff.md:36,90` — the stale path literal
- Same-file batching candidate: this issue and
  [issue-30](../issue-30/issue-30-description.md) both touch `commands/kmg-handoff.md`
  directly (this issue's path bug, issue-30's missing session-summary auto-invoke) —
  non-conflicting, good single-PR candidate.

## Resolution (2026-08-22)

Fixed — `commands/kmg-handoff.md`'s default output path corrected from `./handoff-packages/$(date +%Y-%m-%d)` to `knowledge/handoffs/$(date +%Y-%m-%d)` (and the matching `--output-dir` doc line). The pre-existing stray `./handoff-packages/*` directories at the repo root (count re-derived live at execution time, not copied from planning-time notes — ADR-059) are left untouched — gitignored, never committed, informational only; disposition (migrate vs. delete) is left to the user's own discretion, not resolved by this fix, per this issue's own "Open Questions" framing. Batched with issue-30 in one PR (same file, non-conflicting). GitHub issue #200 close is a separate, explicit follow-up.
