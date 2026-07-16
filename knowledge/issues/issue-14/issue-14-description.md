---
id: issue-14
type: Bug
status: resolved
github-issue: "#171"
branch: v0.6.19
created: 2026-07-14
---

# Issue-14: kg-config.json write-path split-brain — 37 files still hardcode the pre-migration `~/.claude/kg-config.json` path

## Problem

Commit `654c13fb` (this branch's own earlier work, v0.6.18-misc-patches) migrated `mcp-server/src/utils.ts`'s `CONFIG_PATH` default from `~/.claude/kg-config.json` to the platform-neutral `~/.kmgraph/kg-config.json` — with a documented legacy-read fallback (`2d0aba01`, `dd62385b`) so existing installs degrade gracefully. That migration was correct and thorough **inside `mcp-server/src/`**.

It was never propagated to the command/agent/script layer. **37 files (36 tracked + 1 gitignored)** across `commands/`, `agents/`, `scripts/`, `skills/`, `core/docs/`, and `mcp-server/src/cli.ts` still contain literal references to the old path; tier sum 6 + 5 + 1 + 24 = 36 tracked (plus the gitignored `.claude/settings.local.json`). Found via `grep -rl '\.claude/kg-config\.json' commands/ agents/ scripts/ skills/ core/ mcp-server/src/ .claude/`.

**This is not a documentation-staleness issue.** Several of these files embed raw bash (`jq`/`mv`) that reads and writes `~/.claude/kg-config.json` directly, completely bypassing `mcp-server/src/utils.ts`'s `CONFIG_PATH` resolution (which respects `KG_CONFIG_PATH` and defaults to `~/.kmgraph/kg-config.json`). Running any of these commands mutates the wrong file — silently. The command reports success; the change never reaches the file every MCP tool (`kg_config_switch`, `kg_config_list`, `kg_config_add_category`, `kg_upgrade`) actually reads from.

## Severity Triage (3 tiers, confirmed via targeted grep for write-patterns)

### HIGH — hardcoded writes, no `KG_CONFIG_PATH` override support at all (6 files)
- `commands/kmg-init.md` (38 refs — including the FTS5-migration-consent-marker write at lines 134-135, which writes to the wrong kg-config.json as a downstream symptom of this same bug, not an independent issue)
- `commands/kmg-init-personal-kg.md` (5 refs)
- `commands/kmg-add-category.md` (3 refs)
- `commands/kmg-init-shared/kmg-config-entry-write.md` (6 refs)
- `commands/kmg-init-shared/kmg-upgrade-inspector.md` (6 refs)
- `commands/kmg-switch.md` — **added 2026-07-14 (was mis-filed LOW).** Real config WRITE (`.active`/`.lastUsed` at lines 98-100); only 1 *literal* ref (line 30 definition), the writes go through the `$CONFIG_PATH` variable, which is why a literal-ref count mis-triaged it. See investigation-log Finding 1 (triage-method flaw) and Finding 2.

### MEDIUM — already got a partial v0.6.18 fix (has `${KG_CONFIG_PATH:-...}` override support), but the *default* fallback inside that override still points to the old path (5 scripts)
- `scripts/hooks-master.sh`
- `scripts/notification-dispatch.sh`
- `scripts/plan-mirror.sh`
- `scripts/post-tool-lesson-check.sh`
- `scripts/session-end-prompt.sh`

Plus, found via blast-radius investigation:
- `mcp-server/src/cli.ts:225` — a `console.log` display string in the CLI summary output, actively misleading (says `~/.claude/kg-config.json`; the actual default is `~/.kmgraph/kg-config.json`, confirmed inconsistent within the same file — `cli.ts:67` elsewhere correctly says `~/.kmgraph/`). Read-only/display, not a write, but user-facing misdirection.

### LOW — read-only lookups, prose mentions, or cosmetic strings, no write risk (24 files)
Remaining `commands/*.md` (kmg-extract-chat, kmg-sync-all, kmg-list, kmg-status, kmg-link-issue, kmg-handoff, kmg-meta-issue, kmg-update-issue-plan, kmg-update-doc, kmg-start-issue-tracking, kmg-check-sensitive, kmg-migration, kmg-setup-platform, kmg-create-adr, kmg-init-shared/kmg-fts5-rebuild), most of `agents/*.md`, `skills/kmg-knowledge-graph-usage/references/command-workflows.md`, `core/docs/PLATFORM-ADAPTATION.md`. **`kmg-switch` REMOVED from this list 2026-07-14 — promoted to HIGH (it writes).** `.claude/settings.local.json` excluded entirely — confirmed gitignored, local-only, functionally inert.

## Blast-Radius Investigation (2026-07-14, two parallel agents)

**Real-world impact — confirmed "not yet bitten," but armed:** Both `~/.claude/kg-config.json` and `~/.kmgraph/kg-config.json` currently exist and are byte-identical (verified via `jq -S .` diff, zero output). `~/.kmgraph/kg-config.json`'s mtime (Jul 12 19:25:05) predates the migration commit `654c13fb` (19:29:55) by ~5 minutes — almost certainly created by manually exercising the not-yet-committed `applyConfigLocation()` copy-based migration path during development. **Critically: `~/.claude/kg-config.json` has not been modified since Jul 10 21:57** — zero writes to the legacy path since the migration landed, meaning none of the affected files (36 tracked) have actually been invoked post-migration yet. The two files are in sync by luck (no affected command has run), not because the bug was avoided. The next invocation of any HIGH-tier command will silently diverge the two files.

**Scope check — is this bigger than kg-config.json?** No. A second agent checked whether the FTS5 search-index migration (`~/.claude/kg-fts5/` → `~/.kmgraph/index/`, an earlier two-stage migration this session also touched) has the same bug. It does not — `commands/kmg-init.md`'s FTS5 references are correctly migration-aware (they check the *old* path specifically to detect and offer migration, matching `mcp-server/src/tools/fts5.ts`'s `@deprecated` `getFTS5DbPath()` vs. the live `getPersonalDbPath()`/`getProjectDbPath()`). No third resource in the codebase shows the same two-stage-migration-with-stale-downstream-refs signature. The blast radius is bounded to kg-config.json (+ its one FTS5-consent-marker dependency) + the one `cli.ts` display bug.

## Why this wasn't caught during the original c2 migration (654c13fb)

Not investigated in depth as part of this issue — the c2 migration's own scope was `mcp-server/src/` only; propagating the change to command/agent/script prompt text was never in that plan's Task list. This is a scope gap in the original migration, not a review failure — worth noting as a lesson (fixing the read/write path in the server layer doesn't automatically fix embedded shell in prompt files that call the file directly instead of going through the server).

## Related

- Commit `654c13fb` (kg-config.json migration), `2d0aba01`/`dd62385b` (legacy fallback fixes) — all this branch's own earlier work
- `mcp-server/src/tools/upgrade.ts:449-460` (`checkConfigLocation()`) — the correct migration-detection pattern; none of the buggy files use it
- `knowledge/decisions/ADR-001-centralized-multi-kg-configuration.md` — documents the kg-config.json migration, scoped to that one file; line 177 has one stale historical reference (non-functional, correctly annotated as historical)
- v0.6.19 branch (this issue's fix lands as c1/c2/c3, sequential commits, before the branch's final polish/version-cut work — see `knowledge/plans/v0.6.19-polish-release.md`'s Task 3 sequencing note)

## Scope for c1/c2/c3 (implementation, this issue tracks the whole thing across all three)

- **c1** — fix the 6 HIGH-tier files (real split-brain writes), now incl. `kmg-switch`; plus **Task 7 = the FTS5 stray-index cleanup** (a separate, newly-found concern in `kmg-init.md` Block A — see Corrections below, NOT part of the #171 config-path scope but bundled into c1 because it lives in the same file)
- **c2** — fix the 5 MEDIUM-tier scripts (default-value fix + seed guard) + `mcp-server/src/cli.ts:225` (display string, needs `dist/` rebuild)
- **c3** — fix the 24 LOW-tier files (read-only/prose swap; no seed preamble — relies on c2 hooks seeding first)

All three land as commits on the single `v0.6.19` branch, in an isolated worktree at `/Users/mkaplan/GitHub/knowledge-graph-v0.6.19-polish`. Plans written: `v0.6.19.c1-…`, `v0.6.19.c2-…`, `v0.6.19.c3-…` in this folder. **Review status: c1 Opus-reviewed twice (planning), c2 once, c3 review in progress.**

**c1 status: COMPLETE (2026-07-15).** All 8 tasks landed as 7 commits on `v0.6.19` (`4c34ceb0`, `a413e519`, `4acd6ace`, `e187e4b4`, `fdd6f560`, `42b54f9d`, `43d8ea45`). Task 8's live functional verification (migrated / un-migrated / truly-fresh throwaway-HOME tests) all passed; real `~/.claude/kg-config.json` and `~/.kmgraph/kg-config.json` confirmed untouched. Independent post-implementation review by Claude Fable (different model from the haiku/sonnet implementers) confirmed all 6 files PASS with no blockers — see `knowledge/lessons-learned/process/Lessons_Learned_Process_Two_Cycle_Cross_Model_Review_For_High_Risk_Changes.md` for why this project uses cross-model review on config-migration changes. One implementation incident during c1 (an incomplete preamble on the first commit, caught by direct diff inspection rather than the implementer's self-report and corrected via amend) is documented in `knowledge/lessons-learned/process/Lessons_Learned_Process_Migration_Must_Grep_Prompt_Layer_Not_Just_Server_Layer.md`.

**c2 status: COMPLETE (2026-07-15).** Both tasks landed as 2 commits (`07258f07` — 5 hook scripts, default fix + seed guard; `14527889` — `cli.ts` display string + `dist/cli.js` rebuild). Live hook-resolution test passed; typecheck clean; full mcp-server suite green (144 tests); dist rebuild scope-gated to `cli.js` only, confirmed no unrelated bundle churn.

**c3 status: COMPLETE (2026-07-15).** All 5 tasks landed as 4 commits (`e69937b5` — 15 `commands/` files; `ca5cd2e9` — 7 `agents/` files; `d41cd452` — `core/docs`+`skills/`; `c5ee5125` — `INSTALL.md` + `tests/README.md`). Task 5's whole-tree verification confirmed zero leaks. Two scope deviations from the plan, both independently confirmed correct by post-implementation review: (1) `INSTALL.md`'s plan table under-counted its live refs (named 3, actual file had 8 — the plan sampled only the start of the "Step 2C template-only install" walkthrough and missed it continues through later steps and a troubleshooting section); scope was expanded to cover all 8, only the genuinely historical line 250 left untouched. (2) `tests/README.md` was edited beyond its original task scope — the task's premise assumed the lifecycle hook scripts intentionally kept their fallback default on the old path, but that premise was wrong (c2 already migrated all 5 scripts to the new default); the test docs were simply stale, not documenting intentional legacy behavior, so fixing them was correct.

**Cumulative post-implementation review (2026-07-15):** after all three tiers landed (13 commits total on `v0.6.19`), a second independent Fable review covered the full cumulative diff (not just c1 in isolation). Verdict: READY — all three tiers PASS, both c3 scope-deviation decisions independently re-confirmed, no live old-path reference remains anywhere in the repo outside intentional preamble seed-lines and historical records. Two non-blocking observations raised for backlog (not fixed as part of c1/c2/c3, tracked below in Corrections & Findings item 6).

**Acceptance-test matrix: RUN, PASSED (2026-07-16).** All 12 applicable rows (Row 3 skipped, blocked on ADR-066) pass on both the MCP-tool surface (real stdio JSON-RPC against the compiled server) and the command/prompt surface (verbatim bash fences), with zero writes to `~/.claude/kg-config.json` or `~/.claude/kg-fts5/` observed anywhere. Full detail: `knowledge/issues/issue-14/acceptance-test-matrix.md`. One pre-existing, unrelated concern surfaced (personal-KG FTS5 index routing falls back to linear scan — does not touch the migrated config paths, not a migration failure). Filed separately as [[issue-15]] (GitHub #172) rather than folded into this issue's scope, per this project's convention of giving tangential findings their own tracking artifact.

**issue-14 is RESOLVED** as of this matrix pass. All three tiers (c1 HIGH, c2 MEDIUM, c3 LOW) plus the post-review kmg-list/kmg-status fix are on `v0.6.19` (14 commits). Not pushed/PR'd, and GitHub #171 not closed — both gated on explicit user go-ahead.

## Corrections & Findings (2026-07-14 blast-radius audit — full detail in `investigation-log.md`)

1. **Triage-method flaw** — original tiers were counted by *literal* `~/.claude/kg-config.json` refs; writes via a `$CONFIG_PATH` variable were undercounted → `kmg-switch` mis-filed LOW. Re-triaged by behavior (write vs read).
2. **`kmg-switch` → HIGH** (see above).
3. **FTS5 stray-write (NEW, separate concern):** the "Scope check" section above concluded FTS5 had *no* bug — that is now **partially corrected**. The FTS5 *consent* flow is fine, but `kmg-init.md` Block A (lines 96-107) actively `mv`s a project-root stray `.fts5.db` into the **deprecated** `~/.claude/kg-fts5/` (dead path; server reads `~/.kmgraph/index/`). Fix = delete the stray (rebuild recreates it). Handled as **c1 Task 7**.
4. **Blast radius bounded:** server owns exactly two migrated paths (`~/.kmgraph/kg-config.json`, `~/.kmgraph/index/`); all other `~/.claude/*` are genuine Claude-Code paths, out of scope.
5. **Content-storage question (PARKED, needs its own ADR):** `kmg-init.md` still stores global-topic/cowork KG *content* under `~/.claude/knowledge-graphs/` and `~/.claude/cowork-knowledge/`, while `mcp-server/src/cli.ts` already offers only `~/.kmgraph/` — a live init-flow divergence. Recall (2026-07-14) confirmed **no ADR** covers content-storage relocation. NOT in c1/c2/c3. Tracked as **ADR-066 (proposed)** and in ROADMAP Outstanding Action Items.
6. **`kmg-list.md`/`kmg-status.md` cross-fence `CONFIG_PATH` orphan bug (NEW, found 2026-07-15 during cumulative post-implementation review, fixed same day):** both files defined `CONFIG_PATH` in one bash fence and referenced it in later fences without redefining it. Each fence in these Markdown command files executes in its own separate shell process — variables do not persist across fences — so this is the exact same bug class c1 fixed in `kmg-switch.md` (Corrections item 1/2 above), just undiscovered until a cumulative Fable review flagged the two files' hardcoded `CONFIG_PATH` as a minor inconsistency and a follow-up manual check found the deeper orphan bug underneath. Neither file honored a `KG_CONFIG_PATH` override either, unlike every other file in this fix. Fixed by inserting `CONFIG_PATH="${KG_CONFIG_PATH:-$HOME/.kmgraph/kg-config.json}"` as the first statement of every config-touching fence in both files (no seed-guard needed — pure read-only surfaces, same rationale as c3). Pre-existing bug, not introduced by c1/c2/c3; caught only because those tiers' review process happened to touch these adjacent files.
