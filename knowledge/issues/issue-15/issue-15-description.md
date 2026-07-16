---
id: issue-15
type: Bug
status: tracked
github-issue: "#172"
created: 2026-07-16
related-issues: [issue-14]
target-release: null
---

# Issue-15: Personal-KG FTS5 search index built in the wrong bucket — `rebuildIndex` never receives `kgType`

## Problem

When a lesson/ADR/decision is captured into a **personal** knowledge graph, the server rebuilds its FTS5 search index in the wrong location. The index ends up at `~/.kmgraph/index/projects/<name>.db` (the project-KG bucket) instead of `~/.kmgraph/index/personal.db` (the personal-KG bucket). Later, `kg_search` against that personal KG correctly looks in `~/.kmgraph/index/personal.db`, finds nothing usable there, and silently falls back to a plain linear text scan instead of using FTS5. Results are still correct — this is not a data-loss or wrong-results bug — but search is slower than intended and the index that gets built is never actually read.

## Root Cause

`mcp-server/src/tools/fts5.ts:305` — `rebuildIndex(kgPath, kgName, kgType = "project-local")` accepts a `kgType` parameter that determines which bucket `resolveDbPath` (`fts5.ts:60`) routes the index to. Two call sites in `mcp-server/src/tools/capture.ts` (lines 286 and 347) call `rebuildIndex(kgPath, kgName)` — omitting the third argument entirely, so it silently defaults to `"project-local"` regardless of the KG's actual registered type.

Every other caller in the codebase already passes the type correctly:
- `mcp-server/src/tools/fts5.ts:556` (the `kg_upgrade` rebuild path) passes `resolvedType`.
- `mcp-server/src/tools/search.ts:68` passes `kgType` when resolving the DB path to read from.

So this is isolated to exactly the two capture.ts call sites — not a broader pattern.

## Discovery Context

Found 2026-07-16 during the operational acceptance-test matrix run for [[issue-14]] (config-path split-brain fix, branch `v0.6.19`). Row 8 (search) showed a personal-KG search returning correct results but without the expected `(FTS5)` tag in its status output, indicating a linear-scan fallback. Confirmed by reading `capture.ts`/`fts5.ts` directly. **Unrelated to issue-14's config-path migration** — this bug lives in the search/capture subsystem, not in config-path resolution, and predates the v0.6.19 branch. Filed as its own issue rather than folded into issue-14's scope, matching this project's convention of giving tangential findings (e.g. ADR-066, ADR-067) their own tracking artifact rather than scope-creeping the issue that surfaced them.

**Evidence of real-world impact:** on the machine where this was found, `~/.kmgraph/index/personal.db` (the correct bucket) is stale from mid-June, while `~/.kmgraph/index/projects/personal-kg.db` (the misrouted bucket) is recent — consistent with this bug having quietly degraded personal-KG search to linear-scan-only for roughly a month prior to discovery.

## Blast Radius (assessed 2026-07-16)

- Exactly 2 buggy call sites, both in `capture.ts` (lines 286, 347), both calling the same function the same wrong way.
- No other `rebuildIndex`/`resolveDbPath` caller is affected — both other call sites already pass the type correctly.
- Only affects KGs with `type: "personal"`. Project-local KGs are unaffected only because "project-local" also happens to be the accidental default.
- No data-loss or wrong-results risk — capture always writes the actual knowledge file correctly; only the search index location is wrong, and search degrades gracefully to a correct (if slower) fallback.
- 3 test files reference `rebuildIndex`/`resolveDbPath` (`fts5.test.ts`, `search.test.ts`, `capture.test.ts`); only `capture.test.ts` has assertions that hard-code the buggy 2-argument call shape (`toHaveBeenCalledWith(kgRoot, "test-kg")`, 2 occurrences) and will need updating alongside the fix.

## Recommended Fix

Minor, contained fix — not a candidate for a multi-phase plan or brainstorm session:

1. At both `capture.ts` call sites (286, 347), look up the KG's registered type from the `config` object already in scope (e.g. `config.graphs[kgName]?.type ?? "project-local"`) and pass it as the third argument: `rebuildIndex(kgPath, kgName, kgType)`.
2. Update the 2 existing `capture.test.ts` assertions that assert the old 2-argument call shape.
3. Add a new regression test asserting that capturing into a `type: "personal"` KG calls `rebuildIndex` with `"personal"` specifically — this exact bug is the kind TDD should catch on the first pass.
4. Optional, not required: a one-time cleanup step for existing installs with a stray misrouted `projects/<personal-kg-name>.db` file — not strictly necessary since a fresh `kg_fts5_rebuild`/sync naturally repopulates the correct bucket, and the stray file is inert (never read) rather than harmful.

Scale: single small branch, TDD (red test → fix → green), no ADR or cross-tier plan needed.

## Status

**Fixed (2026-07-16), not yet pushed.** Landed on branch `v0.6.19` (commit `fb8bf665`) alongside issue-14's config-path fix, rather than its own branch — bundling small unrelated fixes onto the active release branch matches this project's existing practice (the prior `v0.6.18-misc-patches` branch did the same for issue-10/11/12 + dependabot alerts). Both `capture.ts` call sites now look up `config.graphs[kgName]?.type ?? "project-local"` and pass it to `rebuildIndex`. Added a regression test asserting personal-KG captures call `rebuildIndex` with `"personal"` (confirmed to fail pre-fix), updated 2 pre-existing assertions that hard-coded the old 2-argument call shape. Full suite: 144/144 pass, typecheck clean (re-verified after the move).

Independently reviewed by Claude Opus (different model from the implementer): verdict **✅ Correct as-is**, zero Critical/Important findings, two minor informational notes (neither requiring change — confirmed no `config.graphs` null-crash risk, confirmed the two updated assertions correctly exercise the fallback branch). Opus re-ran the test suite and typecheck independently rather than trusting the report; both green. No further pass needed.

Not pushed, no PR — awaiting user go-ahead.
