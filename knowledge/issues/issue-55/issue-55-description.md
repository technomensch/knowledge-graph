---
id: issue-55
type: Bug
status: resolved
github-issue: "#TBD"
branch: v0.7.4-bug-fixes
created: 2026-08-22
related_issues: ["issue-41", "issue-15", "issue-34", "issue-35"]
---

# issue-55: `kg_search`'s project-local FTS5 index path is keyed only by KG name, not by path — stale/cross-repo index collisions silently return wrong (often empty) results

## Problem

Found 2026-08-22 while investigating a `test-mcp-tools.sh` failure surfaced by the v0.7.4-bug-fixes branch's final test-suite pass: `kg_search` returned "No results found for \"MCP Server\"" against a freshly-planted test fixture (`decisions/ADR-001.md`, containing the literal text "MCP Server" multiple times) in a brand-new, never-indexed project-local KG.

## Root Cause

`mcp-server/src/tools/fts5.ts:39-45`, `getProjectDbPath(kgName)`:

```ts
export function getProjectDbPath(kgName: string): string {
  // TODO(v0.3.7): name collision risk — two repos with the same kgName share this file.
  // Future: use a registry with stable content-hash IDs as filenames.
  const dir = path.join(os.homedir(), ".kmgraph", "index", "projects");
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, `${kgName}.db`);
}
```

The project-local FTS5 index file path is derived **only** from the KG's `name` field (a user-chosen string, not guaranteed unique) — never from the KG's actual filesystem path. The code already carries a TODO from v0.3.7 flagging exactly this risk, but it was never addressed.

`mcp-server/src/tools/search.ts:78-90`, `searchKg()`, is where the risk becomes a real bug:

```ts
const dbPath = resolveDbPath(kgName, kgType);
let results: SearchResult[];
let usingFts5 = false;

if (fs.existsSync(dbPath)) {
  try {
    results = searchFts5(dbPath, query, kgPath);
    usingFts5 = true;
  } catch (err) { ... }
} else {
  results = [];
}

if (!usingFts5) {
  // ... correct linear-scan fallback over kgPath's actual files ...
}
```

If **any** file exists at `~/.kmgraph/index/projects/<kgName>.db` — built at any point in the past, for any KG that happened to share that name — `searchKg()` takes the FTS5 branch and queries that file. It never checks whether the index actually corresponds to *this* KG's path/content. The correct linear-scan fallback (which does search the right files, and works fine on its own) only runs when no file exists at that name-keyed path at all.

## Reproduction (confirmed live, not hypothesized)

1. `tests/test-mcp-tools.sh` always registers its test KG under the fixed name `"test-kg"`, in a fresh `mktemp -d` directory, and plants `decisions/ADR-001.md` + `lessons-learned/architecture/test-lesson.md` (both containing "MCP Server").
2. A **prior, unrelated test run** (days earlier, 2026-08-18) had left behind `~/.kmgraph/index/projects/test-kg.db` — a real FTS5 index built for a *different* temp directory's content that no longer exists.
3. Today's test run: `kg_search({"query":"MCP Server"})` → `searchKg()` finds `test-kg.db` already exists (leftover, unrelated to today's fixtures) → takes the FTS5 branch → queries the stale index → finds nothing matching → returns `"No results found for \"MCP Server\" in KG (test-kg)."`, even though the actual, current KG directory has the exact text right there on disk.
4. **Confirmed the fix hypothesis directly:** deleting the one stale file (`rm ~/.kmgraph/index/projects/test-kg.db`) took `tests/test-mcp-tools.sh` from 25/27 to 27/27 passing, with zero code changes. The linear-scan fallback logic itself is correct — verified by reading `searchFile()`/`walkDir()`, both sound.

## Why This Is Not Just a Test-Isolation Problem

The reproduction above happens to be test-isolation breakage (a fixed KG name reused across test runs), but the underlying defect is a real production bug: **any two project-local KGs — in different git repos, on different machines, or the same machine at different times — that share a `name` field will silently share the same FTS5 index file.** A user who registers two separate projects both named e.g. `"backend"` would have the second one's `kg_search` calls querying (and, via `kg_fts5_rebuild`, potentially overwriting) the first one's index, with no error, warning, or collision detection — the exact failure mode the existing TODO comment predicted, now confirmed to actually occur.

## Scope

Confirmed via `git log --reverse --oneline --since="2026-08-03" -- mcp-server/src/tools/search.ts mcp-server/src/tools/fts5.ts`: only two commits touched these files since the last time the full MCP test suite was confirmed green (27/27, commit `29efa94a`, 2026-08-03) — neither of which changed `getProjectDbPath`'s name-only keying. This is not a regression introduced by this branch; it predates `v0.7.4-bug-fixes` entirely. Confirmed identical failure on `main`'s base commit (`d88614b2`) before any of this branch's work.

Not already tracked: searched `knowledge/issues/`, `knowledge/enhancements/`, all ADRs, and ran `/kmgraph:kmg-recall` — the closest matches (ENH-001 multi-KG search design, issue-41 worktree registration collisions, issue-15/34/35's earlier FTS5 directory-scope fixes) all address different bugs in the same subsystem, none this one.

## Suggested Fix (not decided, not designed — for the fix task to work out)

Key the project-local index path by both `kgName` and a stable identifier of the KG's actual filesystem location (e.g. a short hash of the realpath), not by name alone — matching the TODO's own suggestion ("registry with stable content-hash IDs as filenames"). Needs a decision on:
- Migration path for existing `~/.kmgraph/index/projects/<name>.db` files (orphan cleanup vs. leave-and-ignore).
- Whether `searchKg()` should additionally verify a found index's provenance (e.g. a stored source-path marker inside the db) before trusting it, as defense in depth even after the path-keying fix.
- Test-suite implication: `tests/test-mcp-tools.sh` and any other suite using a fixed KG name should either use a unique/randomized name per run, or this fix removes the need since the path-based key would naturally disambiguate.

## Resolution (2026-08-22)

Fixed on `v0.7.4-bug-fixes`. The index path is now keyed by **both** the KG name and a short digest of the KG's normalized filesystem path.

**Core fix (`mcp-server/src/tools/fts5.ts`)**

- New pure `computeDbPath(kgName, kgType, kgPath)` — no filesystem writes at all. Returns `<indexDir>/personal.db` for the personal graph, or `<indexDir>/projects/<sanitizedName>-<pathHash>.db` otherwise.
- `resolveDbPath(kgName, kgType, kgPath)` is now `computeDbPath(...)` plus `mkdirSync` — the write-path variant. `getProjectDbPath(kgName, kgPath)` likewise.
- `kgPathHash()` hashes `normalizeForFts5Scope(kgPath)` — the helper already in this file, which expands `~`, resolves via `realpathSync`, and falls back to `path.resolve`. Reused deliberately rather than reinvented, so `~/foo`, `/Users/me/foo`, and a symlink to either all produce the same digest regardless of the caller's `cwd`.
- `sanitizeKgNameForFilename()` collapses anything outside `[A-Za-z0-9_-]` to `-`, so a KG name can never escape `projects/`. Closes a pre-existing (never exploited) path-escape gap at the natural moment — the filename format was being rewritten anyway.
- Call sites threaded through: `search.ts`'s `searchKg()`, `fts5.ts`'s `rebuildIndex()`, and the `kg_fts5_status` handler.

**Opus review findings, all incorporated**

- **F1** — `mcp-server/tests/search.test.ts` had 6 calls to the old single-arg `getProjectDbPath(name)` signature, missed by the original design and compile errors without this. All updated.
- **F2** — `kg_fts5_status` reconstructed the db path inline from `target.graph.path`, which is stored **unexpanded** (`~/...`). Its reported `db_path` therefore both drifted from what `kg_search`/`kg_fts5_rebuild` computed and varied with `process.cwd()`. The handler now calls the same shared `computeDbPath`, which normalizes internally.
- **F3** — Naively deduping the status handler onto `resolveDbPath()` would have made a tool whose own published description promises "read-only ... never creates directories" start creating `~/.kmgraph/index/projects/`. This is exactly why the pure/side-effecting split exists, and there is an explicit test asserting no directory is created.
- **F4** — `commands/kmg-init.md` and `commands/kmg-init-shared/kmg-upgrade-inspector.md` both gated an older, separate stale-in-project-`.fts5.db` cleanup step behind "does `~/.kmgraph/index/projects/{kg_name}.db` (exact literal) exist." Post-fix a fresh index never lands at that literal, so the precondition would have reported "not migrated yet" forever. Both widened to accept either the current `<name>-<hash>.db` form or the legacy bare `<name>.db`, and both now honor `KG_INDEX_DIR`.
- **F5** — Path-keying turns a bounded-by-name index-file leak into an unbounded-by-realpath one, and nothing anywhere reaps `~/.kmgraph/index/projects/`. Added a `KG_INDEX_DIR` env override (`getIndexDir()` in `mcp-server/src/utils.ts`, mirroring the existing `KG_CONFIG_PATH` precedent), set to a temp dir by `mcp-server/tests/jest.setup.ts` and by `tests/test-mcp-tools.sh`. Verified empirically: a full `run-all-tests.sh` adds zero files to the real index directory.
- **F6** — `CHANGELOG.md`, `docs/pillars/recalling/search-the-graph.md`, `INSTALL.md`, and the FTS5 `searchDirs` lesson all documented the old literal path; all updated or genericized to point at `kg_fts5_status` instead of a hand-reconstructed filename.

**New `kg_upgrade` category: `stale-fts5-index-format`**

Added per explicit user direction ("this type of change should be handled by the `kg_upgrade` where the user decides if they want the change or not ... everything that is shipping with this update, if it impacts user-facing files or architecture, it needs to be accounted for in the upgrade script"), rather than shipping the relocation as a silent guard patch.

`checkStaleFts5IndexFormat()` fires only when an old-format `projects/<kgName>.db` exists **and** no new-format file has been built yet — so it stops firing once applied, and never fires for the personal graph. `applyStaleFts5IndexFormat()` calls `rebuildIndex()`, which post-fix writes the new hashed path, and deliberately leaves the old file in place (ADR-063 — never destroy state the user didn't agree to lose). Wired into `APPLY_ORDER`, the inspect dispatch, the `ApplyCategory` union, the `z.enum([...])` list and its description, and both "skipped checks" messages. It is **not** behind `confirmBackfix`: unlike the content-repair categories it never edits a knowledge file, only a cache file under `~/.kmgraph/index/`. Documented as section `p` of `commands/kmg-init-shared/kmg-upgrade-inspector.md`.

**Deliberately not done:** provenance verification inside a found index (a stored source-path marker checked before trusting the db). The issue's own Suggested Fix flags it as a separate, undecided follow-up; `initDb`'s existing `PRAGMA user_version = 1` leaves a migration hook if it is ever built.

**Acceptance criteria — all met**

| Criterion | Evidence |
|---|---|
| Same-named KGs at different paths get distinct index files, verified through `searchKg()`/`handleSearch()` | `tests/search.test.ts` → "issue-55: same-named KGs at different paths do not share an index" (2 tests, incl. the linear-scan-fallback case that was the original symptom) |
| A `~`-prefixed KG path resolves identically regardless of `process.cwd()` | `tests/fts5.test.ts` "resolves a ~-prefixed KG path identically regardless of process.cwd()"; `tests/fts5-scope.test.ts` "resolves a ~-registered graph to the same db_path from any cwd" |
| `kg_fts5_status` still creates no directories | `tests/fts5-scope.test.ts` "creates no directories when the index dir does not exist yet"; `tests/fts5.test.ts` "creates no directories (pure)" |
| `kg_fts5_status`'s `db_path` equals what rebuild/search use | `tests/fts5-scope.test.ts` "reports the same db_path that rebuildIndex actually writes" |
| All callers updated, including `search.test.ts` | `tsc --noEmit` clean; 6 call sites updated |
| KG name portion sanitized | `tests/fts5.test.ts` → "issue-55: sanitizeKgNameForFilename" (4 tests, incl. a hostile `../../../evil` name) |
| Test runs don't leak into the real index dir | `KG_INDEX_DIR` override; before/after `ls` of `~/.kmgraph/index/projects/` across a full suite run showed no diff |
| New opt-in `kg_upgrade` category | `tests/upgrade.test.ts` → "upgrade category: stale-fts5-index-format (issue-55)" (5 tests) |
| Both `commands/` guards still detect a current-format index | Both widened to `{kg_name}.db` OR `{kg_name}-*.db` |
| Jest suite passes | 41 suites / 523 tests green |
| `test-mcp-tools.sh` passes without manual cleanup | 27/27. **Correction (2026-08-22, post-review):** an earlier version of this row claimed re-planting the stale `~/.kmgraph/index/projects/test-kg.db` file and getting 27/27 "proves the fix" — that's wrong. This suite now exports `KG_INDEX_DIR` (its own sandboxing addition below), so it no longer consults the real `~/.kmgraph/index/projects/` at all; a file planted there has no effect on the outcome, fix or no fix. The 27/27 here demonstrates the suite is properly sandboxed (a real, separate virtue), not that the path-keying fix works. The actual proof is `mcp-server/tests/search.test.ts`'s two `handleSearch()`-level regression tests below, which exercise two same-named KGs at different paths through the real defective call path. |
| `run-all-tests.sh` full suite passes | All green |
| `CHANGELOG.md` entry | Added under `[0.7.4]` (Added + Changed + Fixed) |

## Related

- `kg-config-silent-overwrite` (`knowledge/issues/kg-config-silent-overwrite/`) — **checked, confirmed different bug.** Same surface symptom pattern (a fixture literally named `test-kg` colliding with real state) but a different file and different root cause: that issue was `~/.claude/kg-config.json` (the active-graph registry) being clobbered because `scripts/hooks-master.sh:12` hardcoded its path with no env override, forcing `tests/test-hooks.sh`/`tests/test-stop-hook.sh` to write the real file in place. Already resolved (`ac70b490`, PR #164, GitHub #163 closed 2026-07-11) — confirmed fixed in current source. This issue (issue-55) is about a *different* file (`~/.kmgraph/index/projects/<name>.db`, the FTS5 index cache) with a *different* root cause (name-only path keying, no env-override involved at all). Note in passing: `knowledge/issues/README.md`'s "Named Meta-Issues" section still lists `kg-config-silent-overwrite` as "🔴 Investigating" despite its own README saying "✅ Resolved" — stale paperwork, out of scope for this fix, flagged for a separate pass.
- issue-41 (`knowledge/issues/issue-41/`) — different worktree-registration collision class in the same registry, related but distinct (graph *entries* colliding, not FTS5 *index files*).
- issue-15 (`knowledge/issues/issue-15/`) — earlier FTS5 bug: personal-KG index built in the wrong bucket (`kgType` defaulting). Resolved. Same subsystem (`fts5.ts`), different defect.
- issue-34 / issue-35 (`knowledge/issues/issue-34/`, `knowledge/issues/issue-35/`) — earlier FTS5 directory-scope bugs (missing `issues`/`enhancements` dirs; dead `"knowledge"` path literal). Both resolved, both confirmed still fixed in current source (`contentDirs`/`searchDirs` checked directly). Same subsystem, different defect.

## Status

Resolved — see the Resolution section above. Tracked directly onto the existing `v0.7.4-bug-fixes` branch (WIP append, no new branch/version per this issue's own scope) and appended to `knowledge/plans/v0.7.4-tracker-fixes-plan.md` as an additional task. Lesson capture deferred to a plan task, to be run after the fix is implemented and reviewed.
