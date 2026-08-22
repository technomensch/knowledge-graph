---
id: issue-41
type: Enhancement
status: in-progress
github-issue: pending
branch: none
created: 2026-08-03
related-issues: [issue-18, issue-40]
---

# Issue-41: Worktree KG registration has no collision guard, no tree-identifying naming, and no merge-time conflict resolution

## Problem

ADR-067's registration model (Phase 4's `kg_config_init` duplicate-graphId flow, exercised
live this session to register a linked worktree — `v0.7.0-adr-067-c1` — as its own graph
entry, `knowledge-graph-adr-067-c1`) has no guardrails for the multi-worktree case beyond
the single content-divergence check. Four concrete gaps, found live while registering this
session's own worktree and then trying to explicitly target "the main project graph"
instead of it:

1. **No warning when a graph-touching tool fires from inside a worktree.** Registering (or
   capturing into) a worktree-specific graph happens silently — nothing tells the user
   "you're on a worktree, this graph entry is scoped to it, not the main checkout."
2. **Worktrees are not forbidden from reusing the main project's registered name.** Nothing
   stops (or even warns against) a worktree registering itself under the same `name` an
   existing entry already uses — `cfg.graphs[name] = {...}` is a plain object-key
   assignment; a same-name registration would silently overwrite the earlier entry, not
   error or merge.
3. **Registry item naming/numbering has no tree-identifying flag.** Issue/lesson/ADR
   numbers are assigned per-KG-directory-listing (`ls .../issues/ | sort -V | tail -1`),
   with a cross-branch collision check (`git log --all --oneline -- "issues/issue-N*"`)
   bolted on afterward. Neither carries which worktree/branch an item actually originated
   from in the identifier itself — a naming scheme that encoded the originating tree would
   reduce (not eliminate) collisions and make provenance visible without needing to grep
   git history.
4. **No conflict resolution when a worktree's branch merges back.** If two worktrees (or a
   worktree and the main checkout) both mint `issue-N` for different N via the same
   directory-listing logic, merging their branches produces a real content collision with
   no defined resolution strategy — first-merge-wins, manual renumbering, or something
   else is undecided.

## Concrete evidence from this session (not hypothetical)

- Registered `knowledge-graph-adr-067-c1` for this worktree via `kg_config_init` — no
  warning surfaced about worktree scope or naming risk (gap 1/2 above).
- **Live numbering collision, gap 3/4 demonstrated directly:** `issue-40` was minted on
  branch `v0.7.0-adr-067-c1` (this worktree) via its own directory-listing logic. The main
  checkout, on branch `v0.7.0`, doesn't have `issue-40` in its own working tree (different
  branch), so its own next-number logic would also produce `issue-40` — a real collision,
  only caught by manually running `git log --all --oneline -- "issues/issue-40*"` before
  filing this very issue (confirmed taken; `issue-41`, this file, is what survived the
  check).
- **Separate, related migration gap found in the same investigation:** `kmg-start-issue-tracking.md`'s
  own embedded Step 2.1 script still resolves the target KG via
  `d['graphs'][d['active']]['path']` — the `active` field ADR-067 retires entirely. The
  real production `~/.kmgraph/kg-config.json` still has `active: "docs-readme-poc"` (a
  different project's graph, not even the graph the user intended) because it hasn't been
  migrated yet — meaning this command, run as-is today, would have filed an issue into the
  wrong project's KG. Phase 7.1 (issue-18) only fixed 5 commands + 3 agents + 1 skill that
  referenced `gov-capture-routing`; `kmg-start-issue-tracking.md` was never in that list
  and still assumes the pre-ADR-067 `active`-pointer model. **This strongly suggests other
  commands beyond Phase 7.1's 9 files may have the same unmigrated assumption** — the full
  set was never audited against ADR-067's resolution model, only the ones that happened to
  also reference the separately-broken `gov-capture-routing` skill.

## What flag/command should have been used (user-facing docs gap)

Answered live this session: `kg_capture`'s `targetKg: "<name>"` param (or a command's
`--named=<kg>` flag, where supported) explicitly targets a specific registered graph by
name, overriding both cwd-based default resolution and any stale `active` pointer. This is
not currently documented anywhere as "the way to target a specific KG when working across
multiple worktrees of the same repo" — **needs to be added to user-facing docs when this
branch merges and a docs update is performed.** Cross-reference:
[issue-40](../issue-40/issue-40-description.md) for the related `--named` vs `--project`
vs `--graph` naming-clarity question — the flag exists and works, but its name and its use
case for the multi-worktree scenario aren't documented together anywhere yet.

## Scope

Two related but distinct follow-ups:

- **This issue (worktree registration guardrails):** the 4 numbered gaps above — needs its
  own design (warning UX, name-collision hard-block, tree-identifying naming scheme,
  merge-time resolution strategy) before implementation, not a mechanical fix.
- **The migration-completeness finding** (`kmg-start-issue-tracking.md` and potentially
  other commands still reading `config.active`): needs a full audit of every command/agent/skill
  in this plugin against ADR-067's actual resolution model (cwd-derived `resolveGraph`,
  `scope`/`targetKg` params) — not just the 9 files Phase 7.1 happened to touch because
  they also referenced `gov-capture-routing`. **This needs its own new ADR-067 phase plan**,
  scoped as: enumerate every command/agent/skill referencing `config.active`, `.active`,
  `kg-config.json`'s active field, or any other pre-ADR-067 resolution assumption, and
  migrate each to the new model. Recommend numbering it the next available phase slot in
  `knowledge/plans/v0.7.0-adr-067-orchestration.md` (Phase 7.1 already exists for the
  gov-capture-routing-specific retirement; this is a broader, separate sweep).

## Priority

Not urgent for the worktree-guardrail half (gaps 1-4) — no data loss observed, failure
mode is silent overwrite/collision, not corruption, and the only person hitting it so far
is the plugin's own author mid-development. The migration-completeness half is more
time-sensitive: if this branch merges without that audit, commands beyond the already-fixed
9 will silently misbehave against real user configs (as `kmg-start-issue-tracking.md` just
demonstrated) the first time someone runs one on a stale, unmigrated `kg-config.json`.

## Status

**In progress — one half done, one half open.**

- **Migration-completeness half: done**, see update below.
- **Worktree-registration-guardrails half (gaps 1-4 above): still tracked only.** No plan,
  no implementation started — per its own explicit scoping, this half needs its own design
  pass (warning UX, name-collision hard-block, tree-identifying naming scheme, merge-time
  resolution strategy) before implementation, not a mechanical fix.

**Update (2026-08-03): migration-completeness half done.** Became Phase 7.2
of `knowledge/plans/v0.7.0-adr-067-orchestration.md` (worktree-local plan file). Full audit
found 12 confirmed `.active`-resolution bugs (11 commands/agents + `INSTALL.md`) plus 13
stale `kmg-switch`/`kg_config_switch` doc references — both now fixed and committed
(`5e41277d`, `418e468e` on branch `v0.7.0-adr-067-c1`). A new `kg_resolve` MCP tool
(`633e4a22`) was built as the foundation: it runs the real `resolveGraph()` cwd-walk once
and returns `{name, path}`, so commands thread the result as a literal instead of
re-implementing resolution in shell.

**New finding surfaced during that audit, same bug class:** `agents/recall-agent.md`'s
Step 0 had no cwd-mismatch guard at all — it read `.active` directly with zero check
against the current working directory, unlike `agents/knowledge-extractor.md`, which
already had one ("verify active KG matches cwd, block if mismatch"). This repo's own
`~/.kmgraph/kg-config.json` had `.active` pointing at `docs-readme-poc` (not
`knowledge-graph`) during the session that found this — live drift, not hypothetical.
Fixed (`43123886`): `recall-agent.md`'s Step 0 now calls `kg_resolve` directly, same as
every other migrated file — no separate mismatch check needed since `kg_resolve` derives
the graph from cwd, leaving nothing to disagree with.

All 3 Phase 7.2 tasks (7.2.1, 7.2.2, 7.2.3) are committed on branch `v0.7.0-adr-067-c1`,
none pushed. The worktree-registration-guardrails half remains untouched, per its own
"needs its own design pass" scoping — not part of Phase 7.2.

**Update (2026-08-03, later same day): full Opus review of all Phase 7.2 work, findings
fixed.** Reviewed the complete diff (`kg_resolve` tool + all 3 tasks) end-to-end. 15
findings — 3 blocking, 4 important, rest nitpicks. All fixed:

- **`commands/kmg-status.md` and `commands/kmg-list.md` were permanently broken** by
  Task 7.2.1 — both are display-only commands excluded from the migration itself, but
  they read `.active`/`lastUsed` fields that Task 7.2.1 removed from the schema
  everywhere else, so both would report "no active KG" against every correctly-migrated
  config. Fixed: both now call `kg_resolve` and display the cwd-resolved graph instead of
  a manually-selected "active" one.
- **`INSTALL.md`'s directory-check step referenced `$KG_PATH` without ever binding it**
  after the `kg_resolve` migration — silent false-failure in the install-verification
  section. Fixed.
- **Two more command files had the same live `KG_MISMATCH` guard bug**, found only
  because `docs/reference/command-guide.md` still described their old behavior:
  `commands/kmg-capture-lesson.md` and `commands/kmg-create-adr.md` both still compared a
  stale `.active`-derived pointer against the project's own KG and prompted on mismatch —
  neither was in Task 7.2.1's original file list. Both fixed, same pattern as everywhere
  else (`kg_resolve`, no separate mismatch check needed).
- **`docs/reference/command-guide.md` had ~20 more stale "active KG" references** beyond
  the `kmg-switch` section Task 7.2.2 already removed — the review's diff-only scope
  didn't originally cover this file's *other* content. Swept and fixed throughout.
- **`tests/test-mcp-tools.sh` and `tests/test-mcp-offload.sh` were fully broken shell
  integration tests** — both still called the deleted `kg_config_switch` MCP tool
  (hard failure, tool doesn't exist), plus several assertions checked `.active`/`"No
  active"` text that no longer matches current behavior. Rewrote both to use the
  `_meta.sandboxCwd` mechanism (the same one a real MCP client uses) instead of a shared
  "active" pointer. `test-mcp-tools.sh`: 27/27 passing after the fix (was hard-failing on
  the deleted tool). `test-mcp-offload.sh`: 7/7 passing (was 4/7).
- Cosmetic `"active"`/`"lastUsed"` fixture cleanup across `config/kg-config-template.json`,
  `tests/fixtures/*.json`, and 4 more shell test scripts — verified zero regressions
  (identical pass/fail counts before and after, confirmed via git stash comparison).
- **`tests/test-mcp-edge-cases.sh`'s "Active KG Path Issues" section fixed but
  UNVERIFIED** — same `_meta.sandboxCwd` fix applied (was relying on `"active":
  "ghost-kg"` alone, which no longer resolves anything without a matching cwd). Could not
  re-run to confirm green: `mcp-server/node_modules` was found mid-session missing
  `esbuild`/`typescript`/`jest` entirely (started present, ended missing — most likely a
  concurrent `npm install`/`prune` from another session sharing this filesystem, not
  caused by this work). Did not attempt `npm install` myself given the concurrency risk.
  **Flagging as a known, accepted risk** — the fix follows the exact pattern already
  proven working in `test-mcp-tools.sh`/`test-mcp-offload.sh` (27/27 and 7/7 respectively
  after the identical fix), so it's very likely correct, but revisit and re-run this one
  file specifically if it resurfaces as broken.

Fix commits: TBD (not yet committed as of this update — pending review).

**Update (2026-08-04): whole-branch Fable sweep found the gap this issue's own migration audit
never covered — `scripts/` was never grepped.** After ADR-067 Phase 8/9 landed (migration path
+ docs sweep), a full top-to-bottom review of the entire branch diff (`v0.7.0..HEAD`, 75 commits,
split across 5 parallel Fable reviewers by area) was run specifically to catch what a series of
per-phase-scoped reviews structurally cannot see — each phase's own diff review only ever looked
at the files that phase touched, never the accumulated whole. It found 4 Critical + 9 Important
gaps. The two structurally significant ones, both directly this issue's bug class
(`.active`-dependent code that ADR-067's resolution model broke without migrating):

- **`scripts/hooks-master.sh`, `scripts/session-end-prompt.sh`, `scripts/plan-mirror.sh`** — live
  SessionStart/Stop/PostToolUse hooks (wired in `hooks/hooks.json`), zero commits on this branch
  ever touched `scripts/` at all. This issue's original audit (`grep -rln -E "\['active'\]|\.active\b"
  commands/ agents/ skills/`) never included `scripts/` in its search scope — a straightforward
  gap in the audit's own coverage, not a subtler bug class like the JSON-key-syntax miss documented
  above. `hooks-master.sh` still greps `.active` out of the config, still *writes* `cfg.active`
  when `autoSwitch: true`, and still tells users to run the fully-retired `/kmgraph:kmg-switch`
  (three separate print statements). Every fresh install after this ships (new configs have no
  `.active` field at all) gets "no active knowledge graph" warnings on every session start/stop —
  the most user-visible regression found across the entire sweep, and it would have shipped
  silently since no test suite exercises these hook scripts.
- **`agents/session-documenter.md`** — the `--user` Write-tool bypass Phase 7.1 (this same
  session's earlier work, see below) closed in exactly 3 sibling agents
  (`create-adr-agent.md`/`lesson-capture-agent.md`/`session-summary-agent.md`, commit `092a975c`)
  was never closed here, because Phase 7.1's scope was those 3 files specifically, not "every
  agent with a capture write path." It's reachable in production: `session-summary-agent.md`'s
  `--delegate` flag forwards `--user` straight through to `session-documenter`, so
  `/kmgraph:kmg-session-summary --user --delegate` drives an ungated write to the personal KG.

Decision on `autoSwitch` (the config field `hooks-master.sh`'s bug centers on): **retire outright,
do not rebuild.** It already has zero readers anywhere in `mcp-server/src` (confirmed by the
sweep — every current reference is a writer/carry-forward, nothing consumes it) and what it
*did* — silently pick one KG as "the" active one and switch to it on cwd change — is the exact
model this whole ADR exists to eliminate. Rebuilding it in bash would reintroduce the retired
model in the one place it survived, working against the branch's own purpose. Fix routes
`scripts/`'s KG resolution through `kg_resolve` (via the mcp-server CLI) instead of reinventing
`resolveGraph()`'s cwd-walk in grep — the same reason `kg_resolve` was built in the first place
(see Task 7.2.1 above), just applied to the one call-site class that audit never reached.

Full findings list (all 4 Critical, all 9 Important, plus Minor) recorded in this session's
conversation log, not duplicated here in full — this entry exists so the `scripts/`-coverage gap
and the `autoSwitch` retirement decision specifically are traceable later if either resurfaces.

**Update (2026-08-04): all 4 Critical + 9 Important findings fixed, reviewed, and verified.**
Fixed in 4 disjoint groups (independent file sets, dispatched and reviewed in parallel), each
through a full implement → review → fix-round-if-needed cycle:

- **`scripts/`/`autoSwitch` (the big one):** added a `resolve` CLI subcommand to
  `mcp-server/src/cli.ts` that exposes the same `resolveKgPath()`/`resolveGraph()` logic
  `kg_resolve` (the MCP tool) already uses, rather than reinventing the cwd-walk in bash/grep.
  All 3 hook scripts (`hooks-master.sh`, `session-end-prompt.sh`, `plan-mirror.sh`) now call it.
  `autoSwitch` retired outright (zero readers existed already) from `upgrade.ts` and 4 command
  docs. `docs/reference/hooks.md` rewritten to match. First-pass review (Opus, full behavioral
  trace of every `ResolutionResult` outcome plus 3 hand-executed CWD scenarios) found no
  Critical but 2 real Important gaps: the new CLI subcommand's `--scope user` option had no
  `confirmPersonalScopeAccess` gate the way `kg_resolve` itself does (a real bypass, reachable
  by any Bash-capable agent) — fixed by dropping `--scope` entirely, since none of the 3 scripts
  used it; and `hooks-master.sh`'s early exit on failed project resolution was skipping
  personal-KG/profile sections that aren't project-scoped at all — now a routine, common case
  under cwd-derived resolution (previously near-never, when it only fired on missing/unset
  `.active`). Fixed by restructuring the script's exit flow so only genuinely project-scoped
  sections are gated on resolution success. Re-review (Opus, hand-traced + actually executed
  against real temp configs, not just read) confirmed both closed with no new breakage.
  Commits: `813071d8`, `e438608b`, `75660d4a`.
- **Commands/agents mechanical gaps:** closed the `--user` Write-tool bypass in
  `session-documenter.md` (a 4th capture-path agent Phase 7.1 never reached), fixed 2 more
  broken `.active`-based CWD guards, converted 2 whole command files (`kmg-update-doc.md`,
  `kmg-update-graph.md`) that no prior sweep ever touched, fixed a stale cross-reference, plus
  2 self-found extras (`platform-sync-agent.md`, a second `lesson-capture-agent.md` read). First
  review found one more live instance in a file already open in the same commit
  (`session-summary-agent.md`'s default `--active` path) — fixed and re-verified clean.
  Commits: `5b934a8d`, `1f82f9a0`, `2178a8c5`.
- **`mcp-server/src` security/path-health gaps:** closed `kg_fts5_rebuild`'s `kgPath` param
  bypassing the personal-scope gate (mirroring `compare.ts`/`sanitization.ts`'s already-fixed
  pattern), and gated archived→restore reactivation on `checkGraphPathHealth` (matching Task
  8.1's migration-time precedent) instead of silently reactivating an unhealthy path. Reviewed
  clean on first pass. Commits: `af828989`, `6700e844`.
- **Test fixtures + doc schema drift:** fixed the same mkdtemp sibling-collision fixture bug
  (`resolveGraph`'s `dirname()`-based boundary computation) in 2 more test files that a prior
  fix round missed, plus `INSTALL.md`'s and an unused test fixture's manual config template
  missing the `status`/`statusChangedAt`/`graphId` fields this branch itself added as required.
  Reviewed clean on first pass. Commits: `98f6a241`, `52c96230`.

Full suite after all fixes: 41 suites / 402 tests, `tsc --noEmit` clean. A handful of Minor
findings from the reviews were deliberately deferred, not fixed (documented in each group's
own review, not duplicated here) — none load-bearing, none blocking.

**Update (2026-08-03, later still): accepted-risk item verified, one real bug found and fixed
along the way.** `mcp-server/node_modules` restored (`npm install` in `mcp-server/`), dist
rebuilt, `tests/test-mcp-edge-cases.sh` re-run to close out the "known accepted risk" above.

- Rebuilding after `npm install` first *regressed* `test-mcp-tools.sh`/`test-mcp-offload.sh`
  from their previously-verified 27/27 and 7/7 down to 21/27 — turned out to be a stale
  `dist/index.js` left over from before `node_modules` broke, not a real regression. A second
  `npm run build` restored both to green. Noting this because it's a trap worth knowing about:
  a stale build after a dependency reinstall can look exactly like a fresh code regression.
- `test-mcp-edge-cases.sh` itself then showed 3 genuine, non-flaky failures (confirmed by
  running twice) — not the same issue as the stale-build one above:
  - Two were a test-only bug: the empty-KG assertions (search + sanitize) never passed
    `sandboxCwd` to the MCP call, so they resolved against the real process cwd instead of the
    fixture — leftover from pre-ADR-067 test authoring (the fixture config still carried the
    now-dead `"active": "empty-kg"` field, which nothing reads post-migration). Fixed: both
    calls now pass the fixture path explicitly; dead `active`/`lastUsed` keys dropped from
    that one fixture.
  - One was a **real, previously-unknown product bug**, unrelated to ADR-067's resolution
    logic itself (which traced out correct): `mcp-server/src/tools/search.ts`'s `searchKg`
    silently returned zero results for a KG registered at a path that no longer exists on
    disk, rather than erroring — every sibling tool (`kg_check_sensitive`, `kg_fts5_rebuild`,
    `kg_compare`) already errors clearly on this same condition, so `kg_search` was the
    outlier. A vanished KG directory looked identical to "searched, nothing matched," which
    is a worse failure mode than either message alone. Independently confirmed by an Opus
    review pass (agent id `a8be93851d99d1835`) before fixing. Fix: `kg_search` now errors
    (`Error: KG path does not exist: <path>`) when the sole resolved KG (searchScope:
    "active"/"personal-only") is missing, and warns-and-skips (rather than aborting) when the
    missing KG is just one of several in a `searchScope: "all"` union read.
  - All three fixed; full suite re-run green: 27/27 (`test-mcp-tools.sh`), 7/7
    (`test-mcp-offload.sh`), 12/12 (`test-mcp-edge-cases.sh`) — the accepted-risk item is now
    resolved, not just assumed-correct.
- **Known test gap, not blocking:** the new multi-KG warning path in `search.ts` (one dead
  registration among several live ones, under `searchScope: "all"`) has no test coverage —
  no existing fixture exercises that combination. Worth a follow-up test if that path matters
  in practice; the fallback behavior chosen (warn-and-skip rather than abort the whole
  cross-KG search) is the conservative default either way, so this isn't blocking the current
  branch.

## Related

- [issue-18](../issue-18/issue-18-description.md) — Phase 7.1, `gov-capture-routing`
  retirement; the 9 files fixed there are a subset of what may need migration per this
  issue's scope note above.
- [issue-40](../issue-40/issue-40-description.md) — `--named`/`--project`/`--graph` flag
  naming-clarity question; overlaps with this issue's "what flag should I have used" answer.
- `knowledge/decisions/ADR-067-mutable-active-switch-vs-context-derived-kg-resolution.md` —
  the ADR whose resolution model this issue's migration-completeness finding is about.
- [issue-29](../issue-29/issue-29-description.md) — its resolution note cites this issue's
  Phase 7.2 migration-completeness work when explaining why the `kg-config.json`/`.active`
  mechanism its own originally-proposed fix depended on is retired. Backlinked 2026-08-22.
