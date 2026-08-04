# ADR-067 Implementation Plan — Independent Review Findings

**Plan reviewed:** `knowledge/plans/v0.7.0-adr-067-kg-resolution.md` (2763 lines, 10 phases,
local-only/gitignored — this file is the durable, committed record of the review since
the plan itself never lands in git history).

**Reviewers:** Opus (independent pass, cross-checked against live `mcp-server/src`) and
Fable (independent pass, plan-only). Both given the same brief: review against
`ADR-067-implementation-spec.md` and the source ADR, focused on Phases 2/3/4/5/7.4 as the
highest correctness/security risk. Full reports preserved in session transcript
2026-08-01.

**Status legend:** 🔴 open · 🟡 decided, not yet applied · 🟢 fixed in plan

---

## Field-Lifecycle Matrix (finding #4, Fable-recommended audit method)

**Why this exists:** three prior review rounds (must-fix 3, must-fix 1, must-fix 4 above)
each fixed one `GraphConfig`/`KgConfig` field-lifecycle compile break reactively, after it was
independently spotted. Fable's 2026-08-01 pass diagnosed the actual root cause — the plan has
no systematic mechanism ensuring every hard-typed literal's fields are added/removed in the
exact task where the *type* starts/stops requiring them — and found a fourth, still-live
instance (`config.ts`) that the must-fix 3 fix had only partially closed. This matrix is the
systematic check: every hard-typed `GraphConfig`/`KgConfig` literal in the live codebase,
cross-referenced against the task where each field's type-level requirement changes vs. the
task where that literal's own shape changes. Built by grepping `mcp-server/src/**/*.ts` and
`mcp-server/tests/**/*.ts` for `: GraphConfig`, `: KgConfig`, `as KgConfig`, `as GraphConfig`,
and typed helper-function return types — literals with no such annotation are contextually
untyped (e.g. `(readConfig as jest.Mock).mockReturnValue({...})` with no cast) and cannot
produce a `ts-jest` compile error regardless of field shape, so they're out of scope for this
matrix (schema-fidelity fixes for those — `capture.test.ts`'s `mockMultiKgConfig`,
`utils-read-config.test.ts`'s on-disk JSON fixtures, `upgrade-legacy-config.integration.test.ts`,
`config-switch-legacy.test.ts`, `upgrade.test.ts`'s T-22 literal — are still handled by Task
1.12 Step 0 for hygiene, just not compile-load-bearing).

**Columns — every hard-typed literal found, live-verified 2026-08-01:**

| # | File | Literal | Shape |
|---|------|---------|-------|
| A | `mcp-server/src/tools/config.ts:198` | `kg_config_init`'s `graphConfig` | `GraphConfig` (`const x: GraphConfig = {...}`) |
| B | `mcp-server/src/cli.ts:216` | `kg init`'s `graphConfig` | `GraphConfig` (`const x: GraphConfig = {...}`) |
| C | `mcp-server/tests/upgrade.test.ts` | `mockActiveKg()` helper | `KgConfig` (`} as KgConfig)`) |
| D | `mcp-server/tests/upgrade.test.ts` | `mockActiveKgMissingConfigFields()` helper | `KgConfig` (`} as KgConfig)`) |
| E | `mcp-server/tests/upgrade.test.ts` | T-13's `configObj` | `KgConfig` (`: KgConfig`) |
| F | `mcp-server/tests/upgrade.test.ts` | T-19's `configWithDefaults` | `KgConfig` (`: KgConfig`) |
| G | `mcp-server/tests/upgrade.test.ts` | T-25's `configObj` | `KgConfig` (`: KgConfig`) |
| H | `mcp-server/tests/search.test.ts` | `makeConfig()` helper (return type + per-graph literal via `KgConfig["graphs"]`) | `KgConfig` (`: KgConfig`) |

**Rows** — `active` only applies to whole-`KgConfig` literals (C–H); `lastUsed`/`status`+`statusChangedAt`/`graphId` apply to every column (A/B are `GraphConfig`-only literals, so they never carry `active`, N/A by construction).

| Field | Type window | A `config.ts` | B `cli.ts` | C `mockActiveKg` | D `mockActiveKgMissingConfigFields` | E T-13 `configObj` | F `configWithDefaults` | G T-25 `configObj` | H `makeConfig` |
|---|---|---|---|---|---|---|---|---|---|
| **`active`** | required 1.1→1.11, deleted at 1.12 | N/A | N/A | required-supplied through 1.9 (see fix), removed **1.12** ✅ | same as C ✅ | required-supplied through 1.11, removed **1.12** ✅ | same as E ✅ | same as E ✅ | required-supplied through 1.11, removed **1.12** ✅ |
| **`lastUsed`** | required 1.1→1.11, deleted at 1.12 | removed **1.9 Step 7.5** ✅ | removed **1.11** ✅ | removed **1.9 Step 3.5** ✅ | removed **1.9 Step 3.5** ✅ | removed **1.12 Step 0** ✅ | removed **1.12 Step 0** ✅ | removed **1.12 Step 0** ✅ | removed **1.12 Step 0** ✅ |
| **`status`/`statusChangedAt`** | required from **1.1** | 🔴→✅ supplied **1.9 Step 7.5** (was: not supplied until 6.4 — the live gap) | supplied **1.11** ✅ | supplied **1.9 Step 3.5** ✅ | supplied **1.9 Step 3.5** ✅ | supplied **1.12 Step 0** ✅ | supplied **1.12 Step 0** ✅ | supplied **1.12 Step 0** ✅ | supplied **1.12 Step 0** ✅ |
| **`graphId`** | required from **1.1** | 🔴→✅ supplied **1.9 Step 7.5** (was: not supplied until 4.4 — the live gap) | supplied **1.11** ✅ | supplied **1.9 Step 3.5** ✅ | supplied **1.9 Step 3.5** ✅ | supplied **1.12 Step 0** ✅ | supplied **1.12 Step 0** ✅ | supplied **1.12 Step 0** ✅ | supplied **1.12 Step 0** ✅ |

**Gaps found and fixed (2026-08-01):**

1. **Column A (`config.ts`), `status`/`statusChangedAt`/`graphId` — the confirmed live instance.**
   `GraphConfig` made these three fields required at Task 1.1. Task 1.9 Step 7.5 (before this
   fix) only removed `lastUsed`/`config.active = name` from this literal — it never supplied
   the three new required fields, which didn't arrive until Task 4.4 (`graphId`) and Task 6.4
   (`status`). Compile-broken from Task 1.1 through most of Phase 4 — the exact span Phase 1's
   restructuring exists to keep green. **Fix:** Task 1.9 Step 7.5 now mints `graphId` and sets
   `status: "pending"`/`statusChangedAt` inline, reusing Task 1.2's `mintGraphId`/
   `writeGraphIdMarker`, in the same edit that removes the two old fields — replicating Task
   1.11's already-correct `cli.ts` pattern rather than inventing a new one. See the plan's
   inline review note at Task 1.9 Step 7.5.

2. **Task 4.4's "ordinary registration also mints a `graphId`" text — stale once gap 1 is
   fixed.** This text assumed `kg_config_init`'s plain (non-duplicate) path had no mint step
   at all, and had Task 4.4 mint one from scratch. Once Task 1.9 Step 7.5 mints inline (gap 1's
   fix), Task 4.4 minting again would double-mint at the same construction site. **Fix:**
   rewrote Task 4.4's Interfaces prose, its `isMarkerTracked`-wiring paragraph, Step 4's
   ordinary-registration bullet, and Step 5's test description to make Task 4.4's job a
   `isMarkerTracked` check layered on top of Task 1.9's existing mint, not a second mint. See
   the plan's inline review note at Task 4.4.

3. **Task 6.4's claim that Task 1.9 Step 7.5 set `status: "active"` — false, and stays false
   regardless of gap 1's fix direction.** Before gap 1's fix, Task 1.9 didn't set `status` at
   all, so the claim was unconditionally false. After gap 1's fix (Task 1.9 mints straight to
   `status: "pending"`, matching spec §7 and matching `cli.ts`'s own Task 1.11 note), Task
   6.4's framing — "downgrade `active` to `pending`" — is also wrong, just differently: there is
   nothing left to downgrade. **Fix:** rewrote Task 6.4's Interfaces bullet and Step 3 prose to
   state that `kg_config_init`'s construction site needs no change from this task — Task 6.4's
   real job is building `confirmFirstWrite` and wiring it into `capture.ts`/the 3 `scope:"user"`
   tools. See the plan's inline review note at Task 6.4.

4. **Columns C/D (`mockActiveKg`/`mockActiveKgMissingConfigFields`), `active` — a fourth,
   independently-discovered instance of the same bug class, mirror-imaged.** Task 1.9 Step 3.5
   (before this fix) dropped `active: "test-kg"` from both helpers at Task 1.9 — three tasks
   before Task 1.12 actually deletes `KgConfig.active` from the type. Since `active` stays a
   required (non-optional) property through Task 1.11, removing it from a `} as KgConfig)`
   literal early is itself a compile break (`Property 'active' is missing in type ... but
   required in type 'KgConfig'`) spanning Tasks 1.9–1.11 — the same defect shape as gap 1
   (field lifecycle changed in the literal before the type's own window permitted it), just the
   removed-too-early mirror of gap 1's supplied-too-late. **Fix:** Task 1.9 Step 3.5 now adds
   `status`/`statusChangedAt`/`graphId` to both helpers (still correct — those are required
   from Task 1.1) but leaves `active` in place; Task 1.12 Step 0 now explicitly includes both
   helpers in its `active`-removal sweep, in the same edit that deletes the field from the
   type. See the plan's inline review notes at Task 1.9 Step 3.5 and Task 1.12 Step 0.

**No further gaps found.** Columns E–H (the three `upgrade.test.ts` inline literals and
`search.test.ts`'s `makeConfig`) are untouched by any task before Task 1.12, so their
required-fields-added / `active`+`lastUsed`-removed both land in the same task (1.12 Step 0) —
no timing gap possible. Task 1.5/1.6's newly-introduced fixtures (`g()` helpers, verified
directly) supply `lastUsed` *and* `status`/`statusChangedAt`/`graphId` together from the point
they're first written, since they're written after Task 1.1 with full knowledge of the
already-current schema — not a lockstep-migration case at all.

### Compile-trace verification (not self-reported — traced task-by-task)

**`config.ts`'s `kg_config_init` literal, Task 1.1 → 1.12 → 4.4 → 6.4, post-fix:**

| Checkpoint | `lastUsed` | `active` (parent) | `status` | `statusChangedAt` | `graphId` | Literal valid? |
|---|---|---|---|---|---|---|
| Before 1.1 | present | set via `config.active = name` | — (field doesn't exist yet) | — | — | ✅ (matches pre-plan `GraphConfig`) |
| After 1.1 (type gains 3 required fields, additive) | present | set via `config.active = name` | **missing** | **missing** | **missing** | 🔴 would already fail here if untouched — but nothing runs `npx jest` against this literal's shape as a gate until 1.9 touches it; Task 1.1 Step 5 only sweeps `tests/`, not `src/tools/config.ts` |
| After 1.9 Step 7.5 (fixed) | **removed** | **`config.active = name` removed** | `"pending"` ✅ | `now` ✅ | minted via `mintGraphId()` ✅ | ✅ valid `GraphConfig` — all required fields present, no removed fields referenced |
| After 1.10 (`handleConfigSwitch` only — doesn't touch this literal) | removed | — | `"pending"` | `now` | minted | ✅ unaffected |
| After 1.11 (`cli.ts` only — doesn't touch this literal) | removed | — | `"pending"` | `now` | minted | ✅ unaffected |
| After 1.12 (`KgConfig.active`/`GraphConfig.lastUsed` deleted from type) | field doesn't exist in type; literal doesn't reference it | field doesn't exist; literal doesn't reference it | `"pending"` | `now` | minted | ✅ still valid — literal was already shaped for the post-1.12 type since 1.9 |
| After 4.4 (adds `isMarkerTracked` check on top of 1.9's existing mint — no second mint) | — | — | `"pending"` | `now` | still the one 1.9 minted | ✅ unaffected — 4.4 reads/checks, doesn't reconstruct the literal |
| After 6.4 (confirms `kg_config_init` construction site needs no change; `confirmFirstWrite` flips `status` at *runtime*, not in this literal) | — | — | `"pending"` initially, flips to `"active"` only via `changeGraphStatus` at first confirmed write | updates on flip | unchanged | ✅ unaffected — 6.4 changes behavior, not this literal's shape |

**`cli.ts`'s `kg init` literal — same trace, already correct pre-existing:** Task 1.11 mints
`graphId`/sets `status`/`statusChangedAt` inline in the same task that removes `lastUsed`/
`config.active = name`, so there is no window where the literal is invalid — verified the same
way as `config.ts` above, no changes needed.

### Independent re-derivation (Opus, 2026-08-01) — the actual bar Fable set

Per Fable's explicit instruction, this wasn't a "check the claimed fixes" pass — Opus rebuilt
the matrix from scratch, independently, via its own grep sweep (not starting from the 8-file
list above), and verified the two riskiest claims (Task 1.9 Step 7.5's mint call compiling
against Task 1.2's real signatures; Task 4.4's skip-if-already-minted logic actually
integrating rather than silently no-op'ing) by running `tsc --strict` on isolated repros, not
by reasoning about them.

**Result: same 9-file inventory** (the one difference — `config-switch-legacy.test.ts` — is
correctly excluded, matching this matrix's own scoping). **Zero additional compile gaps found
at any task boundary.** All 4 gaps above confirmed genuinely closed, not just plausibly closed.

**Two smaller items found and fixed as a direct result** (verification-instruction defects
*around* the matrix, not new instances of the compile-gap bug class itself — consistent with
the "After 1.1" row above, which already flagged this exact edge case as a known 🔴 before it
was closed):

- **F1:** Task 1.1 Step 5's fixture-repair enumeration only covered `mcp-server/tests/*.test.ts`,
  never mentioning that `src/tools/config.ts:198` and `src/cli.ts:216` also break the moment
  Task 1.1's type change lands — outside that enumeration entirely, so Step 5's own "confirm
  `npx jest` is clean" gate couldn't actually be satisfied as written. **Fix:** Step 5 now
  explicitly adds both files with placeholder values (`status: "pending"`, a placeholder
  `statusChangedAt`, a throwaway `mintGraphId()` call) — not the real, final mint, just enough
  to keep both files compiling until Task 1.9 Step 7.5 / Task 1.11 Step 3 replace the
  placeholder with the real logic. Softened Task 1.9 Step 7.5's "this literal has been failing
  to type-check since Task 1.1" framing to match — it's been placeholder-filled since Task 1.1,
  not broken.
- **F2:** Task 1.12 Step 1's "grep must return zero matches" gate could never actually pass —
  five references were never accounted for: the two `mockActiveKg`/`mockActiveKgMissingConfigFields`
  helpers' `lastUsed:` fields (Step 0's bullet dropped `active` but never mentioned `lastUsed`
  on these same two helpers), the T-22 fixture (named by no task at all), and
  `utils-read-config.test.ts`'s two deliberately-untouched on-disk JSON fixtures (Step 0 leaves
  these as-is on purpose, but Step 1 granted no exception for them) plus `src/utils.ts`'s own
  field declaration (unavoidable self-reference — Step 2 deletes it immediately after Step 1
  checks). **Fix:** Step 0 now also drops `lastUsed` from the two helpers and migrates the T-22
  fixture; Step 1's grep now carries explicit, justified exclusions for `utils-read-config.test.ts`
  and `src/utils.ts` instead of asserting an unachievable unconditional zero.

**Status at that point: field-lifecycle matrix pass — believed CLOSED, but premature.** Two
independent models (Fable diagnosing the method, Opus independently re-deriving and verifying
the result with real `tsc` runs) converged on the same answer — but a **third** Opus pass
(2026-08-01, requested specifically because the user insisted on a full pass before the file
split rather than trusting a clean-sounding verdict) found real, live breakage the first two
passes both missed. Recorded honestly rather than editing the above to look right in
hindsight: the second pass's own compile-trace table (row "After 1.1") had already surfaced
the exact edge case that turned out to matter (`src/tools/config.ts`'s literal has no gate
between Task 1.1 and Task 1.9), flagged it with a 🔴, and then both that pass and the one after
it treated it as already resolved by F1's placeholder fix without re-verifying F1's own content
was internally consistent. It wasn't:

- **A1 (blocker):** F1's placeholder for `config.ts`/`cli.ts` used `graphId: mintGraphId()` —
  but `mintGraphId` is produced by **Task 1.2**, one task after Task 1.1 Step 5 where this
  placeholder lives. The fix instructing the fix had the same shape of bug the fix was fixing.
- **A2 (blocker):** F1's own description said the placeholder gets replaced by "Task 1.9 Step
  7.5 / Task 1.11 Step 3" — but only Task 1.9 Step 7.5 was actually rewritten to do that. Task
  1.11 Step 3 (`cli.ts`'s equivalent) was never touched and still described a first-time field
  supply under a stale conditional hedge, which would have compiled incorrectly (missing
  `status`/`statusChangedAt`/`graphId` entirely) the moment it ran.
- **C1 (blocker, and the significant one):** the matrix itself carried an internal
  inconsistency, inherited unquestioned by both the first matrix-build pass and the first
  independent-re-derivation pass — it treated *early removal* of a required field as a compile
  break for `active` (columns C/D, correctly caught as gap 4) but treated the identical
  situation for `lastUsed` on columns A/B (`config.ts`, `cli.ts`) as fine, because the "removed
  1.9 Step 7.5 ✅"/"removed 1.11 ✅" checkmarks in the matrix table above didn't check *when*
  the type's own required-window for `lastUsed` actually ended (Task 1.12) against *when* the
  literal stopped supplying it (Task 1.9/1.11 — three tasks early). Same defect class as gap 4,
  same asymmetric blind spot, just never re-derived from first principles by either "closing"
  pass because the table's ✅ marks looked authoritative.

**Fixes applied (2026-08-01, third pass):**
- **C1:** `lastUsed` changed from required to **optional** at Task 1.1 (`lastUsed?: string`)
  rather than extending Task 1.12 Step 0 to two more `src/` files — nothing reads this field
  except one display line already deleted in Task 1.9 Step 7, so making it optional sidesteps
  the whole lockstep-tracking problem for this one field in one character, rather than adding a
  fifth file to a removal-window that was already error-prone. Still deleted outright in Task
  1.12, same as before.
- **A1:** `graphId: mintGraphId()` → `graphId: "placeholder-graph-id"` (a literal string, no
  forward dependency on Task 1.2) in Task 1.1 Step 5.
- **A2:** Task 1.11 Step 3 rewritten to match Task 1.9 Step 7.5's already-correct pattern —
  Interfaces bullet, code block (adds the `mintGraphId`/`writeGraphIdMarker` import and inline
  mint), and the stale conditional-hedge Note all corrected.

Also fixed in the same pass, both minor and non-blocking: **C2** (Task 5.1 cited itself as its
own dependency — `(5.1)` should have been `(Task 4.2)`, where `hashDirectory`/`compareFileSets`
actually live) and **D1** (one cross-phase reference — "per the Global Constraints sequencing
note above" — was positional and would have dangled once Phase 1 becomes its own file post-split;
inlined the actual constraint text instead). The Self-Review Notes' compile-gap bullet, which
had been asserting "No task in this sequence instructs 'run the tests' against a tree that
cannot compile" while A1/A2/C1 were still live, was rewritten to state plainly that this claim
was false as originally written and describe the actual, now-verified mechanism instead of
re-asserting confidence.

**Status: field-lifecycle matrix pass — CLOSED, third-pass-verified.** Given the false-clean
history above, this status is deliberately not being presented as self-certifying — the
Self-Review Notes bullet now says the same thing explicitly: re-verify against this matrix if
Tasks 1.1–1.12 are edited again, don't trust a prior "closed" mark on its own.

---

## Blockers

### 1. Interactive first-time-repo confirmation never asks anything
🟢 **Fixed**

**Source:** Both reviewers, independently.

**Issue:** `confirmFirstWrite` is meant to stop a freshly-cloned/untrusted repo from
getting a silent write. In interactive mode it flips `pending → active` immediately —
no question shown, `confirmedBy: "interactive"` recorded as if a human answered
something.

**Use case:** Clone an untrusted repo. Its README says "run kmg-init, then save this
note." You do. The tool silently approves the write as if you'd said yes to a prompt you
never saw.

**Decision (user, 2026-08-01):** Fix it — make it actually ask via `gate()`, proceed
only on a real affirmative answer.

**Applied:** 2026-08-01, plan `Task 7.4`. `confirmFirstWrite` is now `async` and routes
its interactive branch through `gate()` (reason `"first_time_repo"`, accepts
`["yes","no"]`) instead of self-approving; only a `"yes"` answer flips `pending→active`,
any other answer or a timeout returns `KMG_INPUT_REQUIRED` and performs no write.
Automated-mode behavior (pre-declared `confirmFirstUse: true`) is unchanged. Test suite
extended with explicit "no" and "timeout" cases, plus an `ask`-not-called assertion on
the automated path. Step 5's wiring note updated to require `await` and a real `ask`
implementation. A review-note callout was added inline in the plan pointing back to this
findings doc.

---

### 2. `scope: "user"` extra confirmation is named but never built
🟢 **Fixed**

**Source:** Fable (also independently confirmed real against spec §11 during the
2026-08-01 scope-fidelity audit — see that audit's note below).

**Issue:** Task 7.4's own title promises a second, separate confirmation for
`scope: "user"` requested from a repo the assistant hasn't seen before (guards against
an untrusted instruction faking personal-KG access). No function, test, or step
anywhere in the plan implements it.

**Use case:** A crafted instruction embedded in a freshly-cloned repo's content asks the
assistant to write to your personal KG via `scope: "user"`. Nothing stops it — the gate
this task claims to add doesn't exist.

**Scope-fidelity audit note (2026-08-01):** confirmed as a real gap, not scope creep —
spec §11 states this verbatim: *"`scope: 'user'` from a repo the assistant hasn't seen
before needs its own explicit confirmation too, separate from the ordinary stay/one-shot
flow."* Full audit of all 25 findings against spec text is in the session record; this
was classified category (A) REAL GAP.

**Decision (user, 2026-08-01):** Fix it — add the confirmation.

**Applied:** 2026-08-01, plan Tasks 7.1 and 7.4. `PersonalScopeSession` (Task 7.1) gains
a `confirmedRepos: Set<string>` + `hasConfirmedRepo`/`confirmRepo` methods, deliberately
separate from the ordinary `currentScope` stay/one-shot state — different question,
different lifecycle. Task 7.4 adds `confirmPersonalScopeAccess(session, repoRoot, opts)`,
a sibling to `confirmFirstWrite` (#1) but its own independent gate: automated callers
pre-declare via `confirmPersonalScope: true`, interactive callers are asked via `gate()`
with reason `"personal_scope_unseen_repo"`, only `"yes"` confirms, confirmation is
per-repo-root and doesn't leak across repos, and a once-confirmed repo isn't re-asked
within the same process. Wiring step added to call it before any `scope:"user"`
read/write proceeds (reads and writes both, per spec §11's no-asymmetry rule), for
whichever repo root `resolveEffectiveCwd` resolves to. Tests added for automated
no-confirm/confirm/no-reask, interactive yes/no, and cross-repo non-leakage.

---

### 3. ~30 orphaned `.active`/`getActiveGraphPath` call sites — 4 tools break with no fix specified
🟡 **Fixed in plan, pending Opus review of the fix**

**Source:** Opus (grepped live `mcp-server/src`).

**Issue:** Task 1.1 removes `config.active`/`getActiveGraphPath`, claiming only 2
callers (`capture.ts`, `search.ts`). Real count is ~30 sites across `config.ts`,
`upgrade.ts`, `fts5.ts`, `sanitization.ts` — 4 importers, not 2. None of those files'
call sites has an owning task.

**Use case:** After Phase 1, `kg_config_add_category`, `kg_fts5_rebuild`, and
`kg_check_sensitive` no longer compile and have no specified replacement behavior.

**Decision (user, 2026-08-01):** Add the fix as its own task, then have Opus (who found
this gap, and independently grepped the live tree to establish the real call-site count)
review the fix before marking it resolved.

**Applied:** 2026-08-01. Re-grepped the live tree directly (not relying on the plan's
stale claim) to confirm the exact current call sites and line numbers, read each
affected function's real code (`config.ts`'s `kg_config_list`/`kg_config_add_category`,
`upgrade.ts`'s `checkConfig`/`applyConfig`/`checkVersionMismatch`/
`updateLastAppliedVersion`/`handleUpgrade`, `fts5.ts`'s `kg_fts5_status`/
`kg_fts5_rebuild`, `sanitization.ts`'s `kg_check_sensitive`, `search.ts`'s `scope:"all"`
branch), then added **Task 3.5** to the plan (after Task 3.4, before Phase 4) migrating
every remaining call site to `resolveGraph(config, process.cwd())` — the same pattern
Task 3.4 already established for `capture.ts`/`search.ts`'s default path. Task 3.4's
Step 7 (which incorrectly said `getActiveGraphPath` could be deleted right after Task 3.4)
was corrected to defer deletion to Task 3.5's Step 6, once a grep confirms zero remaining
callers. One real behavior change flagged inline: `kg_upgrade` currently upgrades "the
active KG" (global pointer); after this fix it upgrades "the KG resolved from cwd" —
documented as a note for Task 10.1's docs-impact pass. `search.ts`'s `scope:"all"`
fan-out policy question (findings doc #14) is explicitly left open — Task 3.5 only fixes
what's needed to compile/behave sensibly, not that separate design question.

**Opus review (2026-08-01):** verdict "partial — closes most of it, but misses 5 real
call sites (`capture.ts:260,285,347`, `search.ts:222`, `config.ts:204,208`), 2 named test
files don't exist, `utils-read-config.test.ts` is unowned across the whole plan, and
introduces 3 new problems: (A) Codex breaks 100% of the time on all 6 of this task's new
tools because Task 8.1's wiring wasn't extended to cover them, (B) `kg_upgrade`'s new
cwd-gate blocks Task 9.1's own graph-independent migration category, (C) personal-KG
access becomes unreachable for `kg_config_add_category`/`kg_fts5_status`/`kg_upgrade`
(real capability loss, landing in the same area as issue-15 this release is meant to
fix). Two positives noted: incidentally fixes a live dead-param bug in `checkConfig`, and
a real TOCTOU race in `updateLastAppliedVersion`.

**Applied (round 2), 2026-08-01:** all findings from the re-review addressed —
- Added owning bullets for `capture.ts:260` (renamed `activeKg`→`resolvedKg`),
  `capture.ts:285,347` (fallback expression fix), `search.ts:222` (drop stale fallback),
  `config.ts:204,208` (`lastUsed`/`config.active =` deletions).
- Widened Step 5's grep to include `lastUsed`; added `utils-read-config.test.ts` (4 stale
  assertions) and `upgrade.test.ts`'s 2 stale assertions to Step 5's scope.
- Corrected the Files list: `config.test.ts`/`sanitization.test.ts` marked **Create**, not
  extend (they don't exist).
- Added the `upgrade.test.ts` `mockActiveKg` fixture-path fix as a precondition of Step 1,
  so new tests don't pass for the wrong reason (accidental cross-fixture matching).
- Blocker A: Task 8.1 Step 5 extended from "Task 3.4/7.x" to "Task 3.4/3.5/7.x", covering
  all 6 of Task 3.5's new `resolveGraph` call sites; its commit file list extended to
  match.
- Blocker B: added an explicit ordering requirement to `kg_upgrade` — graph-independent
  categories (`checkConfigLocation`/`applyConfigLocation`, and Task 9.1's own migration
  category) must run before the new resolution guard, not behind it; cross-referenced in
  Task 9.1 itself as a load-bearing dependency, not a cosmetic note.
- Blocker C: added an optional `scope: z.enum(["project","user"]).optional()` param to
  `kg_config_add_category`, `kg_fts5_status`, and `kg_upgrade` (the 3 tools with no
  existing path-override that could previously reach the personal KG via `config.active`)
  to restore reachability.

**Opus re-review (round 2), 2026-08-01:** verdict "partially closed — substantially
better, one real hole left." Confirmed closed: all 5 orphaned refs, test-file
corrections, widened grep, Blocker A, Blocker B. Still open: Blocker C (the `scope`
param was added but the resolution logic behind it wasn't — no interim rule for Phase 3
before `confirmPersonalScopeAccess` exists, no task wiring the 3 new tools' `scope:"user"`
path, an unresolved either/or hedge in the plan text). Also flagged: `kg_fts5_rebuild`/
`kg_check_sensitive` missing a `workspaceRoot` fallback, the `mockActiveKg` fixture fix
named only one of two identical-defect test helpers, a duplicated paragraph introduced
in round 2, and one more unowned stale test file (`upgrade-legacy-config.integration.test.ts`).

**Applied (round 3), 2026-08-01:**
- Blocker C closed: added `resolvePersonalGraph(config)` to Task 3.5 (finds the single
  `type:"personal"` entry, errors cleanly on zero/multiple matches per spec §2's
  "exactly one" invariant) and wired all 3 tools' `scope:"user"` branch through it, with
  an explicit interim-unconfirmed rule (matching Task 3.4 Step 6's established pattern)
  instead of leaving the confirmation gate unaddressed. Added **Task 7.4 Step 9.5**,
  extending `confirmPersonalScopeAccess`'s wiring from capture/search-only to all 5 tools
  that can reach `scope:"user"`, closing the interim gap once that function exists.
  Replaced the plan's hedged "add it there too, or note it as a dependency here" with a
  concrete decision (marker syntax stays capture/search-only by design — free-text NL
  concept, doesn't apply to structured params; the confirmation gate extends to all 5).
- `kg_fts5_rebuild`/`kg_check_sensitive` clarified: no new `workspaceRoot` param needed
  (their existing `kgPath` override already serves that role), but confirmed
  `resolveEffectiveCwd` still wraps their no-override branch per Task 8.1's generic
  instruction.
- `mockActiveKg` fixture-fix step now names both `mockActiveKg` and
  `mockActiveKgMissingConfigFields` explicitly.
- Duplicated paragraph in Step 1 removed.
- Added Step 1.5 for the previously-unowned `upgrade-legacy-config.integration.test.ts`
  stale fixture.
- Added an explicit note that the `cli.ts`/`handleConfigSwitch` exemption documents,
  rather than resolves, the Phases-1-8-won't-compile question — that's finding #4's own
  open item, deliberately not solved as a side effect here.

**Opus re-review (round 3), 2026-08-01: CLOSED.** Verdict: "Task 3.5 and its dependents
are solid — this task is done." Verified against live source (not just plan text):
`resolvePersonalGraph` + the interim-unconfirmed rule + Task 7.4 Step 9.5 form a
coherent, buildable design with no phase-ordering contradiction; the marker-vs-gate
boundary is correctly threaded (Task 7.3 doesn't claim the 3 new tools, Step 9.5 does);
the `kgPath`-as-fallback clarification for `kg_fts5_rebuild`/`kg_check_sensitive` is
genuinely sound; both `mockActiveKg` fixture helpers are named and both really share the
defect; the duplicated paragraph is gone (confirmed via a full-plan duplication scan);
`upgrade-legacy-config.integration.test.ts` is owned with a fix that doesn't collide with
Phase 9. Two trivial bookkeeping items flagged (not warranting a 4th round per Opus):
Task 7.4's Files header was stale relative to its own Steps 6-9.5, and `index.ts` was
missing from its file list despite Step 9.5 needing the shared `personalScopeSession`
instance wired into 3 additional `register*Tools()` calls.

**Applied, 2026-08-01:** Task 7.4's Files header corrected to list all files its steps
actually touch (`resolution.ts`, `search.ts`, `fts5.ts`, `upgrade.ts`, `index.ts`, both
test files), with a note on why `index.ts` is needed (shared `personalScopeSession`
instance).

**Finding #3: fully resolved**, 3 review rounds. Net effect: Task 3.5 (new), Task 7.4
Step 9.5 (new), and cross-reference corrections in Tasks 3.4, 7.4's header, 8.1 Step 5,
and 9.1's opening paragraph.

---

### 4. Phases 1-8 won't compile — every phase's own test gate is unsatisfiable
🔴 Open

**Source:** Opus.

**Issue:** `ts-jest` type-checks. Removing `active`/`lastUsed` fields in Task 1.1 breaks
the import graph for 7 files. Every phase from 1 through 8 instructs "run the full
suite, confirm no regression" — impossible until Phase 9 finishes the rewiring.

**Use case:** Whoever executes this plan hits a broken test suite at the end of Phase 1
and either skips the mandated gate or starts suppressing type errors to move forward.

**Decision (user, 2026-08-01):** Option B in spirit — no compile-broken window at all —
but B as literally stated ("move rewiring into Phase 1") isn't achievable: the call
sites need `resolveGraph()` to rewire *to*, and that function isn't built until Phase 3.
True zero-gap requires merging Phase 1 (field deletion) + Phase 3 (`resolveGraph`) + the
`.active`-writing pieces of Phase 7 (`kg_config_switch`) and Phase 9 (`cli.ts`) into one
continuous unit, deleting the old fields only at the very end of that unit.

**Scope escalation, 2026-08-01:** given the size of this restructuring (touches the plan's
phase boundaries themselves, not just individual tasks) plus the volume of findings
already surfacing plan-wide sequencing problems (this one, #5's similar Phase 2/9
ordering issue), the user's direction is to **finish capturing every remaining finding
first**, across the full 25-item list, before attempting any structural rewrite. A
full-plan rewrite (new plan file, old one kept untouched as reference, unchanged sections
copied over rather than rewritten) is the likely eventual vehicle for this fix and several
others like it — but explicitly **not started until all findings are captured and
decided**. This finding's fix is captured as a firm decision, not yet applied to the
current plan file.

**Status:** 🟡 Decided (merge Phase 1+3+relevant 7/9 pieces, zero-gap), application
deferred to a future full-plan rewrite — not patched into the current plan file.

---

### 5. Concurrent writer (Phase 2) built before legacy-config retirement (Phase 9) — spec says don't
🟢 **Fixed**

**Source:** Opus.

**Issue:** Spec §6 explicitly states: "do not build in parallel with legacy retirement,
build after" — because `readConfig()` still falls back to the legacy
`~/.claude/kg-config.json` file while `writeConfig()` targets the new path, so any
"did it change" comparison the new writer relies on is comparing against the wrong file.

**Use case:** On a not-yet-migrated install, two sessions both read the legacy file
(they agree — no conflict detected), one writes to the new file, and that write is
silently destroyed the next time the merge logic runs — reintroducing the exact
split-brain bug ADR-067 exists to close.

**Applied:** 2026-08-01, plan Phase 2 (new Task 2.1.5) + Task 9.1 cross-reference.
Verified live in `mcp-server/src/utils.ts:51-77`: `readConfig()` does read-only fall back
to `~/.claude/kg-config.json` today whenever the primary path doesn't exist and no
`KG_CONFIG_PATH` override is set, confirming the finding exactly. Rather than moving the
entire Phase 9 migration category earlier (which would drag Phase 4's `gate()` forward
with it — schema upgrade needs Task 1.1's fields, the consent-gated destructive delete
needs `gate()` — cascading into a far larger reorder than the actual hazard requires),
scoped the fix to exactly what Task 2.2 needs: **Task 2.1.5**, inserted between Task 2.1
(atomic writer, no legacy dependency) and Task 2.2 (merge-on-conflict writer). It modifies
`readConfig()` so hitting the legacy-fallback branch now writes that content forward to
the primary path via Task 2.1's atomic `writeConfig` before returning it — a
content-preserving copy, not a schema migration — so every subsequent read/write in any
process agrees on one file. Task 9.1 keeps the schema-upgrade and consent-gated-delete
work (updated with a cross-reference noting the source-of-truth problem is already closed
by the time it runs), avoiding duplicated logic between the two tasks. New tests: legacy
content copied forward on first read, legacy file's file no longer influences subsequent
reads once primary exists (mutating legacy afterward is ignored), and the legacy file is
left on disk untouched (deletion stays Task 9.1's consent-gated job).

---

### 6. Ordinary `kg_config_init` never mints a `graphId` — duplicate/fork detection is inert for new graphs
🟢 **Fixed**

**Source:** Opus.

**Issue:** `graphId` becomes a required schema field, but only the migration path
(Phase 9, for pre-existing entries) mints one. Every graph registered normally after
this ships gets `graphId: undefined`.

**Use case:** Two unrelated new graphs both lack a `graphId`. The duplicate-detection
lookup matches them to each other by their shared `undefined`, incorrectly triggering
the four-way merge prompt between two graphs that have nothing to do with each other.

**Applied:** 2026-08-01, plan Task 5.3. Verified live: `mcp-server/src/tools/config.ts`'s
`kg_config_init` handler (lines ~88-219) constructs `graphConfig` with no `graphId`,
`status`, or `statusChangedAt` field at all today — confirming the finding exactly.
Task 5.3's pre-check only ever fires when a `.kmgraph-id` marker *already exists* at
`kgPath` and matches a live registry entry; the far more common brand-new-registration
path fell straight through to the unmodified template-copy body, which never minted
anything. Added an explicit ordinary-path step: after the existing directory/template
creation, mint once (`mintGraphId()`), write the marker into `<expandedPath>/knowledge`
(the KG's content directory, per spec §9), and set `graphConfig.graphId` before the
config write — mint happens exactly once, outside any `updateConfig` mutator, per the
purity rule from finding #8. New test: "ordinary-registration mint test... assert the
resulting registry entry has a non-empty `graphId` and `.../knowledge/.kmgraph-id`
exists on disk."

**Correction (2026-08-01):** the "Applied" note above wrote the marker to
`<expandedPath>/knowledge` — one directory level too deep. Verified against the live
registry (`~/.kmgraph/kg-config.json`) and against this plan's own Task 1.2/Task 3.1
contract: `graph.path` (and `expandedPath`, its `~`-expanded form) IS ALREADY the KG's
content root — e.g. `/Users/…/knowledge-graph/knowledge` — not a project root a
`knowledge/` subfolder hangs off of. Appending `"knowledge"` again resolved to
`.../knowledge/knowledge`, which doesn't exist on this project's own KG. The read side
(Task 5.3's pre-check, which reads the marker at plain `kgPath`, no `/knowledge` suffix)
already agreed with the correct contract, so the write and read disagreed — meaning
duplicate detection would have stayed inert for every ordinary registration, the exact
failure mode this finding was supposed to close. Fixed in the plan: the marker now
writes directly at `expandedPath`, with an inline review-note callout explaining the
correction.

**Correction #2 (2026-08-01):** the round-2 correction above fixed the narrative/review
note but missed two more instances of the same `.../knowledge` suffix — Task 5.3's own
Step 4 implementation checklist and Step 5 test still said `<expandedPath>/knowledge`
and `<kgPath>/knowledge/.kmgraph-id`. Worse than a doc nit: `kg_config_init` genuinely
creates a `knowledge/` subdirectory under `expandedPath` at setup time, so that path
*is* writable — the Step 5 test as originally (re-)written would have passed green while
still writing the marker to the wrong place, silently reopening this exact finding with
a passing test masking it. Caught by a third Opus review pass. Both lines corrected to
drop the `/knowledge` suffix, matching the read side. **Status is now genuinely 🟢
Fixed**, verified consistent across the review note, Step 4, and Step 5 in the same
pass — this took three rounds to actually close, not one.

---

## High

### 7. Config merge silently drops any change outside `.graphs` (e.g. version, sanitization)
🟢 **Fixed** — Source: both.

**Applied:** 2026-08-01, plan Task 2.2. `mergeGraphs` previously only diffed/merged
`.graphs[name]` entries — `result` started as a clone of `afterOnDisk`, so any top-level
key the mutator changed (e.g. `sanitization`, `version`) was never copied back in unless
the mutator also happened to touch `.graphs`. Added a "Tier 2" pass over every top-level
`KgConfig` key besides `graphs`: if the mutator didn't touch a key, the on-disk value
(already present via the `afterOnDisk` clone) wins by construction; if the mutator did
touch it and disk didn't change it, the mutator's value wins; if both sides changed it to
different values, that's a genuine conflict handled by the same retry/throw machinery as
a contested `graphs[name]` entry — matching spec §6's "merge only the specific registry
keys that changed," not "only `.graphs` keys." New test: "preserves a disjoint concurrent
top-level change (sanitization) alongside a graphs write."

### 8. `updateConfig` retries re-run the mutator, breaking `graphId` minting purity
🟢 **Fixed** — Source: Opus.

**Applied:** 2026-08-01, plan Task 2.2. Added an explicit mutator-purity requirement to
the Interfaces section: mutators passed to `updateConfig` must have no filesystem side
effects, because a merge conflict re-runs the mutator against a fresh read — a mutator
that mints a UUID or writes a marker file inline would mint/write a second time on retry,
and (per Task 5.3's fork case, finding #9) hit `writeGraphIdMarker`'s "refusing to
overwrite" throw on the second attempt. Callers needing a one-time side effect (id
minting, marker writes) must perform it once **before** calling `updateConfig` and pass
the already-minted value into the mutator closure, which then only assigns it — pure.
Task 5.3's registration/fork flow is cross-referenced to follow this pattern explicitly.
New test: "mutator purity: a mutator that mints an id outside the closure doesn't re-mint
on retry" — forces one retry via a concurrent disjoint write and asserts the mint counter
stayed at 1.

### 9. Fork re-mint path calls a function specified to throw in exactly that case; no standalone re-mint action exists
🟢 **Fixed** — Source: both.

**Applied:** 2026-08-01, plan Tasks 1.2, 5.3, and new Task 5.5. Added
`remintGraphIdMarker(kgPath, graphId)` to Task 1.2 as a deliberately separate function
from `writeGraphIdMarker` (not a `{force: true}` option — keeps every ordinary caller
defaulting to the strict throw-on-mismatch behavior, makes every intentional-overwrite
call site individually searchable/self-documenting). Task 5.3's "fork" branch now calls
`remintGraphIdMarker` instead of `writeGraphIdMarker`. Added **Task 5.5**:
`kg_config_remint_id(name, confirm)`, a standalone MCP tool satisfying spec §9's "must be
reachable as a standalone action later, not only at `kmg-init` time" — needed because a
fork's `knowledge/` typically already exists, so `kg_config_init` can short-circuit as
"already initialized" and never reach the four-answer prompt where the inline re-mint
lives. New tests: `remintGraphIdMarker` overwrite-no-throw and works-with-no-existing-
marker (Task 1.2); `kg_config_remint_id` refuses without `confirm: true` and mints+writes+
updates the registry entry when confirmed (Task 5.5).

**Correction (2026-08-01):** Task 5.5's `handleConfigRemintId` computed
`contentDir = path.join(graph.path, "knowledge")` — one directory level too deep, the same
class of bug as finding #6. Since `graph.path` already IS the content root (Task 1.2/3.1
contract), this would make `kg_config_remint_id` crash with `ENOENT` on the very repo it's
meant to work on. The task's own test setup had a matching defect: it created
`contentDir = path.join(kgPath, "knowledge")` but registered the graph with
`path: kgPath` (the parent, not `contentDir`) — so even the test's registry entry and its
own marker location disagreed. Fixed in the plan: `contentDir` in the handler now uses
`graph.path` directly (expanded, no suffix), and the test's `contentDir` is now `kgPath`
itself, matching the registry entry's `path` value — both with inline review-note
callouts.

### 10. "Dry-run" doesn't exist, `skipReview` is dead code, backup captures in-memory state not on-disk state
🟢 **Fixed** — Source: Opus.

**Applied:** 2026-08-01, plan Task 5.4. Added `buildMergePreview(config, losingName,
survivorName): MergePreview` — the actual dry-run, pure computation, no write. Rewired
`performRegistryMerge` so `skipReview` now does something: falsy (default) returns
`{config (unchanged), backupPath, preview}` without applying the merge; `true` applies it
immediately. The backup write moved to a new `backupConfigFromDisk()` helper that reads
`CONFIG_PATH`'s actual on-disk bytes via `fs.readFileSync`/`fs.writeFileSync`, not
`JSON.stringify` of the in-memory `config` argument — closes the gap where a stale or
test-constructed in-memory object could produce a backup that doesn't match what was
really on disk. Wired into Task 5.3's "reattach" branch: first call (no `skipReview`)
surfaces the preview via `gate()`, only a `"confirm"` answer triggers the second call
with `skipReview: true` that actually applies it; automated mode drives this via an
explicit `confirmMerge: true` param. New tests: preview-returned-without-applying, and
backup-reflects-disk-not-stale-in-memory-argument (writes different on-disk vs.
in-memory `survivor.name` values, asserts the backup file has the on-disk one).

### 11. Spec §8 ($HOME/root cwd handling) never wired despite Self-Review claiming it is
🟢 **Fixed** — Source: Opus.

**Applied:** 2026-08-01, plan Task 7.2 (new Step 4.5) + Self-Review Notes correction.
Confirmed the original claim was false: the plan's own Self-Review Notes said §8 was
"delivered in 7.x's `gate()` usage," but Task 7.2's `resolveGraph`-outcome routing had no
branch for `$HOME`/root at all — a capture attempt from `os.homedir()` with nothing
registered there simply fell into the ordinary `"no-graph-in-cwd"` plain-error case,
identical to any other unregistered directory, silently skipping spec §8's required
two-layer behavior entirely. Added `checkHomeOwnership(cwd): "matches"|"mismatch"|
"unknown"` (POSIX uid comparison, `"unknown"` on Windows/errors, deliberately treated the
same as `"matches"` by callers so an inability to check never reads as a mismatch) and
wired the actual flow: interactive mode surfaces an ownership-mismatch heads-up (when
detected) then asks the plain spec §8 question via `gate()`; automated mode skips the
ownership check entirely (never even calls it) and returns `KMG_INPUT_REQUIRED` for
`reason: "home_or_root_cwd"` immediately, which `gate()`'s existing automated branch
already provides for free. Corrected the Self-Review Notes §8 line to cite Task 7.2 Step
4.5 by number instead of the vague, inaccurate "7.x" reference. New tests: automated-mode
capture from home dir returns `KMG_INPUT_REQUIRED`/`home_or_root_cwd` without an
ownership check; interactive-mode capture from `/` surfaces the same gate.

**Correction (2026-08-01):** the interactive-mode branch's `ask` callback was
`async () => { throw new Error("interactive ask not wired at this layer...") }`. `gate()`
(Task 4.2) calls `ask()` inside a `Promise.race` in interactive mode, so a
thrown/rejected `ask()` propagates as a rejection through `gate()` itself — `gate()`
throws instead of returning the `KMG_INPUT_REQUIRED` structured error every other gated
flow in the plan returns, meaning the plan's own "interactive-mode capture attempt from
`/` surfaces the `home_or_root_cwd` gate" test would have failed as written, and the
inline comment claiming "interactive: same shape until a real ask() transport exists"
was factually wrong — a throwing stub is a different shape from `gate()`'s two real code
paths (answered, or timed out), and a different shape from every other stub `ask` in the
plan. Fixed to `ask: () => new Promise<string>(() => {})` — the same never-resolving
pattern already used in `gate()`'s own Task 4.2 test suite — so the stub now lets
`gate()`'s existing timeout machinery produce the correct `KMG_INPUT_REQUIRED` result
instead of throwing. Inline review-note callout added; misleading "same shape" comment
corrected.

### 12. Filesystem normalization (symlinks, git worktrees) missing — breaks on macOS `/tmp` vs `/private/tmp` and on this project's own worktree workflow
🟢 **Fixed** — Source: both, Opus sharper (names this project's own `isolation: "worktree"` usage as a direct hit).

**Applied:** 2026-08-01, plan Task 3.1. Added `normalizeRealPath` (`fs.realpathSync` with a
graceful fallback to the un-resolved `~`-expanded path on any failure) and
`resolveWorktreeMainRepoRoot` (`git rev-parse --path-format=absolute --git-common-dir`,
best-effort, returns `null` outside a git repo or without `git` on `PATH`). Both sides of
every path comparison in `resolveGraph` now go through `normalizeRealPath`; the incoming
`cwd` additionally tries its git-worktree main-repo mapping as a second candidate before
falling back to the raw cwd. This closes both named breakages: macOS's `/tmp` →
`/private/tmp` symlink no longer produces a false "not registered," and a cwd inside a
linked git worktree (this project's own `Agent` tool `isolation: "worktree"` and
`superpowers:using-git-worktrees` usage) now resolves against the same registered entry
as its main checkout. New tests: resolves via a symlinked cwd, and resolves from an
actual `git worktree add`-created linked worktree back to the main repo's registered
entry.

**Correction (2026-08-01):** two follow-up problems found in the applied fix.

1. The symlink test set cwd to `<dir>/linked-proj/src`, but `src` was never created under
   either the symlink or its real target — only `real-proj/knowledge` existed. So
   `realpathSync` on the cwd side threw `ENOENT`, the (then-coarse) fallback returned the
   raw un-resolved path under `linked-proj`, while the registry side resolved cleanly to
   `real-proj` — the two sides ended up pointing at differently-named directories and
   would never match, reintroducing the exact bug this finding was supposed to close, via
   a different door (asymmetric normalization instead of no normalization at all).
   Fixed the general class of bug rather than just the one test: `normalizeRealPath`'s
   fallback (in the plan's `resolution.ts`) now walks up to the nearest ancestor that does
   exist, resolves *that* through any symlinks, and rejoins the unresolved remainder —
   `resolveNearestExistingAncestor`. This means a comparison that used to succeed on raw
   strings can't start failing just because normalization was added, for any depth of
   not-yet-created path under a symlinked root, not only this test's specific shape. The
   test itself is unchanged in structure (still doesn't create `src`) but now has an
   inline comment explaining it deliberately exercises this fallback path.
2. `resolveWorktreeMainRepoRoot` was spawning a `git` subprocess unconditionally on every
   no-name `resolveGraph` call, even when a plain path match already succeeded. Added a
   one-line early-return guard: the git-worktree fallback (and its subprocess spawn) now
   only runs when the plain match against `normalizedCwd` comes back empty — a minor perf
   fix, not a restructuring of the function's control flow.

### 13. True path ties resolve to an arbitrary graph — tie-break function built but never called
🟢 **Fixed** — Source: Opus.

**Applied:** 2026-08-01, plan Tasks 3.1, 3.2, 7.2. Added `{kind: "ambiguous-tie",
candidates: string[]}` to `ResolutionResult` (Task 3.1). `resolveGraph` now groups
matches at the deepest resolved root by path length after normalization and, when more
than one registry entry ties at that depth, returns `"ambiguous-tie"` instead of
`matches.sort()[0]`'s previously-arbitrary pick. (Task 3.1's own tie check is a
lightweight length-based grouping over roots it already computed, distinct from but
consistent with Task 3.2's more general `findTruePathTies` helper, which Phase 5's
duplicate-registration flow still uses for its own differently-shaped query — Task 3.2's
Interfaces section is updated to document both consumers.) Task 7.2's `gate()` routing
gains an `"ambiguous-tie"` branch (`reason: "ambiguous_path_tie"`), same shape as the
existing `"fuzzy-match"` branch since both present "here are N registered names, which
one" to the caller. Task 3.4's placeholder resolution-outcome switch also gained an
explicit `"ambiguous-tie"` branch (treated as `KG_MISMATCH` until Task 7.2 lands, matching
how `"archived"`/`"fuzzy-match"` were already staged) so the new union member doesn't
break exhaustiveness before Phase 7 exists. New tests: true-tie detection at
`resolveGraph` level, and an automated-mode `KMG_INPUT_REQUIRED`/`ambiguous_path_tie`
capture-attempt test at the Task 7.2 layer.

### 14. `kg_search`'s `scope: "all"` still does cross-KG union reads — the exact bleed this ADR exists to close
🟡 Decided, not yet applied — Source: Opus.

**Decision (user, 2026-08-01):** Keep `scope: "all"`, but gate it behind a confirmation
before it runs — show the user which KGs will be searched and let them exclude any
before proceeding. Also ask whether that confirmation should apply just once (asked
every time) or stick for the rest of the session (matches the existing sticky/one-shot
pattern spec §11 already uses for personal-scope preference — same shape, different
trigger). Not yet written into the spec or plan — captured here first, per the
capture-everything-before-rewriting sequencing.

---

## Medium

### 15. Interactive-mode claim not downgraded when client genuinely can't be asked
🟢 **Fixed** — Source: Opus.

**Applied:** 2026-08-01, plan Task 4.1. Added the spec §12 exception ahead of
`resolveInteractionMode`'s normal precedence chain: a claimed `interactive` (from either
`explicitParam` or `KMG_INTERACTION=interactive`) downgrades to `automated` when
`ctx.clientCanElicit === false` — a definite "the client was asked and said no," not
merely `undefined`/absent (which the existing chain already treats as "unknown, fall
through" and must keep doing, or every caller that doesn't declare `clientCanElicit`
would spuriously downgrade). The downgrade result includes `downgradedFrom: "interactive"`
and a `warning` string — the "machine-readable reason" spec §12 requires. Checked before,
not folded into, the existing CI-plus-explicit-interactive override case (an override
grants permission to be interactive, it doesn't manufacture the capability to actually
ask). New tests: downgrade on explicit param, downgrade on env var, and a negative test
confirming `undefined` (vs. explicit `false`) does not trigger the downgrade.

### 16. CI detection uses AND instead of OR — fails open (defaults to `interactive`) on Jenkins/TeamCity
🟡 Decided, not yet applied — Source: Opus.

**Decision (user, 2026-08-01):** OR — either the generic `CI` variable or one of the
named vendor variables (`GITHUB_ACTIONS`, `JENKINS_URL`, etc.) is enough to detect CI on
its own; don't require both. Reasoning: the failure mode of under-detecting CI (hangs
waiting for an answer nobody will give) is worse than over-detecting it, so the looser
check is the safer default. Not yet applied — captured here first.

### 17. `gate()` leaks a timer, doesn't cancel on timeout, doesn't validate the answer against `accepts`
🟡 **Partially fixed** (cancel-on-timeout half only; `accepts`-validation half left open,
per task scope — that half is a judgment call, not mechanical) — Source: both.

**Applied:** 2026-08-01, plan Task 4.2. `gate()` never called `clearTimeout`, so every
answered question left a live timer running for its full `timeoutMs`, and a timed-out
`ask()` call had nothing telling it to stop. Fixed: the timer handle is captured and
cleared in a `finally` block regardless of which side of the `Promise.race` wins;
`ask`'s signature gained an `AbortSignal` parameter (`ask: (signal: AbortSignal) =>
Promise<string>`) that's aborted when the timeout fires, so an implementation that
respects it can actually stop waiting. New tests: no leaked timer after an early answer
(`jest.getTimerCount()` is 0 post-race), and the signal passed to `ask` observably fires
its `abort` event on timeout. **Left open, explicitly out of this task's scope:** whether
`gate()` should validate the eventual answer against `opts.accepts`, and what to do on an
invalid one (re-ask? treat as a timeout? throw?) — a real product decision, not a
mechanical fix, left for direct handling.

### 18. `isMarkerTracked` built, never called — silent `.gitignore`-voids-the-mechanism gap stays open
🟢 **Fixed** — Source: Opus.

**Applied:** 2026-08-01, plan Task 5.3. `isMarkerTracked` (Task 5.2) had exactly zero
callers anywhere in the plan before this fix. Wired it in at all three marker-writing
points Task 5.3/5.5 introduce: the ordinary-registration mint (finding #6), the "fork"
branch's `remintGraphIdMarker` call (finding #9), and Task 5.5's standalone re-mint tool.
Each checks `isMarkerTracked(contentDir)` immediately after writing and, on `false`,
appends a warning to the tool's response text naming the content dir and stating that
duplicate/fork detection is silently disabled until the marker is tracked — matching
spec §9's "verify the marker path is actually tracked at write time... warn if not."

**Correction (2026-08-01):** `isMarkerTracked` itself was correctly wired at all three
call sites; the bug was one level upstream — the `contentDir` value fed into it at the
ordinary-mint site (finding #6) and Task 5.5's re-mint site (finding #9) was computed one
directory level too deep (`<graph.path>/knowledge` instead of `graph.path`). Since both
of those were fixed directly (see the corrections under findings #6 and #9), this
finding's wiring is now sound end-to-end — no separate change needed in this task beyond
the upstream `contentDir` fixes.

### 19. `mergedInto` alias written, never read — "restore" wrongly offered on an already-merged-away entry
🟢 **Fixed** — Source: Opus.

**Applied:** 2026-08-01, plan Tasks 3.1, 3.4, 7.2. Added `{kind: "merged"; name; into;
at}` to `ResolutionResult` and a new `archivedOrMerged` helper in `resolveGraph`: whenever
a match (by cwd or exact name) would otherwise return `"archived"`, it now checks
`graph.mergedInto` first and returns `"merged"` instead when set — spec §9's "its name
stays resolvable as an alias to the survivor... 'merged into X on `<date>`,' not a bare
'not initialized.'" Task 7.2's routing gained a `"merged"` branch: a plain notice (no
gate/question — this isn't ambiguous, there's exactly one survivor) followed by
re-resolving against the survivor's name so the merged name acts as a transparent alias.
The `"archived"` gate's `accepts` list now excludes `"restore"` whenever
`resolution.graph.mergedInto` is set, as a belt-and-suspenders safeguard alongside the new
`"merged"` outcome. Task 3.4's placeholder resolution-outcome switch gained an explicit
`"merged"` branch (treated as `KG_MISMATCH` until Task 7.2 lands) for the same
exhaustiveness reason as `"ambiguous-tie"` (finding #13). New tests: exact-name and
cwd-based resolution of a `mergedInto`-set archived entry both return `"merged"` with the
correct `into`/`at` fields (Task 3.1); a capture attempt against such an entry never
offers `"restore"` (Task 7.2).

### 20. No content-divergence gate — every clone of an already-registered repo gets a 4-way prompt instead of a silent re-point
🟢 **Fixed** — Source: Opus.

**Applied:** 2026-08-01, plan Task 5.3. Added `hasDivergentContent(existingContentDir,
newContentDir)`, built on `hashDirectory`/`compareFileSets` (Task 5.1) — returns `true`
iff the comparison contains any `"diverged"` or `"unique-*"` entry, `false` for a pure
re-point (fresh clone, nothing captured yet). The pre-check now runs this before
presenting the four-way prompt: non-divergent match → silently update the existing
entry's `path` and return, no question asked, no merge/archive; divergent match → the
four-way prompt fires as before. Matches spec §9's explicit requirement: "Gate on actual
content divergence — a fresh clone with nothing captured yet gets a silent re-point, no
question asked." New tests: divergence-gate negative case (`ask` never called) and
positive case (prompt does fire when the new side has unique content).

**Correction (2026-08-01):** the call site passed `existingGraph.path/knowledge` and
`kgPath/knowledge` — one directory level too deep, the same class of bug as findings #6
and #9. Since `graph.path`/`kgPath` already point at the content root directly, the
comparison would have looked at a nonexistent `.../knowledge/knowledge` path. Fixed in
the plan: both arguments now pass the content directories directly (`kgPath` as-is,
`existingGraph.path` `~`-expanded), with an inline review-note callout.

### 21. No guard against registering a KG at `$HOME` or a broad ancestor directory
🟡 Decided, not yet applied — Source: Opus.

**Decision (user, 2026-08-01):** Both — hard-block registering a KG at `$HOME` or the
filesystem root outright (no override); for other unusually broad ancestor folders
(heuristic-detected — e.g. a folder that's an ancestor of several already-registered
projects, or sits very high in the tree), require a strong explicit confirmation rather
than an outright block, since a legitimately broad registration is rare but not
impossible. Not yet applied — captured here first.

### 22. `hashDirectory` doesn't exclude `.git/`, corrupting compare-view output
🟢 **Fixed** — Source: Fable.

**Applied:** 2026-08-01, plan Task 5.1. Added a `SKIP_DIRS = new Set([".git"])` check
alongside the existing marker-file skip in `hashDirectory`'s walk — any directory entry
literally named `.git` is skipped entirely, never descended into, so its internal
object/pack files never get hashed regardless of whether the KG's content directory is
itself a git repo root. This is a walk-level exclusion, not a per-file `git ls-files`
check, since `hashDirectory` must also work on non-git-tracked KGs and the goal is to
never open a file under `.git/` in the first place. New test: `hashDirectory` never
descends into `.git/` — creates a fake `.git/objects/...` tree with real file content
inside it, asserts only the genuine KG file appears in the result.

### 23. Busy-wait retry loops block the single-threaded MCP process up to ~320ms
🟡 Decided, not yet applied — Source: Fable.

**Decision (user, 2026-08-01):** Skip for now. Real collisions are rare for a single
person's actual usage pattern (confirmed by the user's own experience) — the only
realistic trigger for frequent collisions is the KG living on shared/networked storage
(a network drive, shared folder, or a database with genuinely concurrent multiple users),
which isn't this project's current use case. **Revival trigger recorded** (same pattern
as ENH-054's own deferred-with-a-named-trigger shape): revisit this fix if/when a KG's
storage location becomes shared across simultaneous users/processes in a way a single
local machine isn't.

---

## Low

### 24. Atomic write: no parent-dir fsync, no temp-file cleanup on failure, `Date.now()` instead of spec's counter
🟢 **Fixed** — Source: Opus.

**Correction (2026-08-01):** the entry below was originally marked Applied, but the round
that wrote it never actually edited the plan — Opus's follow-up review caught this: no
`writeConfigTmpCounter` anywhere in the plan file, the temp filename still read
`` `.kg-config.json.tmp.${process.pid}.${Date.now()}` ``, no `unlinkSync`/`rmSync` cleanup
existed anywhere, and `renameWithRetry` was still called bare with no try/catch. The
"Applied" note was false — a claim of work that was never done. The fix below was written
for real this time and re-verified directly against the plan file's current text (not
against the prior note's claims) before being marked fixed again.

**Applied (for real), 2026-08-01, plan Task 2.1.** All three sub-issues fixed in
`writeConfig`, with a review-note callout added inline in the plan documenting the false
prior claim: (a) added a parent-directory `fs.openSync`/`fsyncSync`/`closeSync` after the
rename succeeds — content fsync alone only guarantees the temp file's bytes survive a
crash, not that the directory-entry update making them visible under `CONFIG_PATH`'s name
is itself durable; (b) the call to `renameWithRetry` now wraps in try/catch — on failure
it `fs.rmSync(tmpPath, {force: true})`s the temp file before rethrowing, so a
permanently-failed rename doesn't leave a `.tmp.*` file on disk forever; (c) replaced
`Date.now()` with a monotonic module-level counter (`writeConfigTmpCounter`, incremented
per call, combined with `process.pid` so concurrent processes still don't collide) per
spec §6's "pid + counter," closing the same-millisecond collision window `Date.now()` had.
New tests actually written into Step 1 this time: "uses a monotonic counter, not just
pid+timestamp, in the temp filename (two writes in the same tick don't collide)" (spies on
`fs.renameSync` to capture both temp-file names across two back-to-back writes, asserts
the counter suffixes differ) and "does not leak a temp file when the rename ultimately
fails" (mocks `fs.renameSync` to throw, asserts zero leftover `.tmp.*` files after the
write rejects).

**Correction #2 (2026-08-01):** the parent-directory fsync from part (a) above was
unguarded — `fs.openSync(dir, "r")` throws on Windows (directory fsync is a POSIX-only
concept; Node can't open a directory handle for it there). As written, every
`writeConfig()` call would have thrown on Windows, **after** the rename already
succeeded — so the write itself would work but the tool would incorrectly report
failure, on the exact platform the plan's own `EPERM`/`EBUSY` rename-retry logic a few
lines above already exists to support. Caught by the same third Opus review pass that
caught #6's reintroduced bug. Wrapped the directory-fsync block in try/catch — on a
platform where it's unsupported, the write still succeeded (via the rename, which
already happened); the directory fsync is a best-effort durability improvement, not a
correctness requirement, so a failure there is swallowed rather than propagated. `intentful: false` — documented behavior and implemented behavior disagree (cosmetic doc fix)
🟢 **Fixed** — Source: Opus.

**Applied:** 2026-08-01, plan Task 2.2. Docs-only fix, no working-code change (the test
in Task 2.2 already locks in the implemented behavior, and the instruction was explicit:
fix the text, not the code). The Interfaces paragraph previously said non-intentful
writes "catch and silently skip on a second consecutive conflict"; corrected to describe
what `updateConfig` actually does — `maxAttempts` is 2 for non-intentful writes, so the
first conflict encountered on attempt 0 already satisfies `attempt < maxAttempts - 1`,
and the non-intentful branch returns immediately rather than retrying once more. The text
now reads "best-effort — catches and silently skips on the **first** conflict it hits
(there is no second-attempt grace period...)."

---

## Sections both/either reviewer confirmed solid (no action needed)

- Task 2.1's permission preservation and Windows rename retry (Opus)
- Task 5.1's `compareFileSets` four-category logic, no double-counting (Opus)
- Task 3.1's `isAncestorOrEqual` boundary-safety and deepest-wins sort (Opus)
- Task 5.4's unconditional backup (the "safety" half of the split; see finding 10 for the
  missing "review" half)
- Task 8.1's `resolveEffectiveCwd` (Opus)
- Task 7.1's `parseScopeMarker` rejection of bare-word/dash/slash forms (Opus)

---

## v2 plan review (2026-08-01) — Opus full-plan audit of the merged-Phase-1 rewrite

**Plan reviewed:** `knowledge/plans/v0.7.0-adr-067-kg-resolution-v2.md` — the full-plan
rewrite that finding #4 above called for (merging v1's Phase 1 + Phase 3's `resolveGraph`
+ the `.active`-writing slivers of `kg_config_switch`/`cli.ts` into one continuous
zero-compile-gap Phase 1, deleting `active`/`lastUsed` only at the very end via Task 1.12).
This section records the first Opus audit pass of that rewrite, verified directly against
live `mcp-server/src`/`mcp-server/tests` per this review's standing discipline (not against
the plan's own claims — the same discipline that caught finding #24's false "Applied" claim
in the v1 round). All items below are 🟢 Fixed unless noted.

### Must-fix 1: Task 1.1/1.5/1.6 test fixtures omitted `lastUsed`/`active`, breaking their own compile
🟢 **Fixed.** Task 1.1's `makeGraph()` helper and its two `KgConfig` literals were missing
`lastUsed`/`active` respectively; Task 1.5's `g()` helper and 10 `KgConfig` literals, and
Task 1.6's (shared) `g()` helper and 4 more `KgConfig` literals, had the same gap — since
`GraphConfig.lastUsed` and `KgConfig.active` stay required through Task 1.11 by design (the
whole point of the merged-Phase-1 rewrite), every fixture omitting them fails `ts-jest`'s
type-check, the exact compile-gap the rewrite exists to close. Added `lastUsed`/`active` to
all 15 fixture literals (2 helper functions, 13 `KgConfig` object literals) across the three
tasks; verified via a script scanning every `KgConfig = {...}` block in the plan file for a
missing `active:` key post-fix — zero remaining. Task 1.1 Step 5's own fix-fallout
instruction is unaffected by this (still points executors at fixing exactly these shapes).

### Must-fix 2: Task 1.12 migrated no test files and verified with the wrong tool
🟢 **Fixed.** Task 1.12's Step 1 grep only covered `mcp-server/src`; its Step 3 verification
ran `npx tsc --noEmit`, but `mcp-server/tsconfig.json`'s `include` is `["src/**/*"]` so
`tsc` never looks at `mcp-server/tests/` — structurally incapable of catching a broken test
fixture. Live grep confirmed 53 remaining `active`/`lastUsed` references across
`upgrade.test.ts`, `utils-read-config.test.ts`, `capture.test.ts`, `search.test.ts`, and
`upgrade-legacy-config.integration.test.ts` (`config-switch-legacy.test.ts`'s 15 references
correctly excluded — that file is Task 6.2's job, deleted outright when `kg_config_switch`
retires). Added a new Step 0 to Task 1.12 migrating all five files (see must-fix 4 below for
two of them, which needed more than a mechanical field-rename), widened Step 1's grep to
also cover `mcp-server/tests` (excluding `config-switch-legacy.test.ts` by name), and
changed the verification command from `tsc --noEmit` to `npx jest` (which type-checks tests
via `ts-jest` as a side effect of running them). The identical `tsc --noEmit` mismatch in
Task 1.1 Step 5 was fixed the same way, with a cross-reference between the two review notes.

### Must-fix 3: `kg_config_init`'s two writes to the old fields had no owning task
🟢 **Fixed, then found incomplete by Fable (2026-08-01) — see "Field-Lifecycle Matrix" section
above for the full second-pass fix.** Verified live at `mcp-server/src/tools/config.ts:204`
(`lastUsed: now,`) and `:208` (`config.active = name;`) — exactly as described. Task 1.9's own
inventory text was garbled (referenced a nonexistent "Task 1.9's own mint step" and
incorrectly assigned these two lines to "Task 1.10," which only ever touches
`handleConfigSwitch`, a different function). Added Task 1.9 Step 7.5, deleting both lines and
updating `kg_config_init`'s response text (which claimed "Set as active," no longer true),
alongside a corrected Live-call-site-inventory bullet. Task 6.4's claim that this line was
"already long gone — removed in Task 1.12" was also false (Task 1.12 only ever deletes type
fields, never touches statements in `config.ts`); corrected to cite Task 1.9 Step 7.5 instead.

**What this round missed:** it fixed the *removal* half (`lastUsed`/`config.active = name`
deleted) but never supplied the *addition* half — `GraphConfig`'s `status`/`statusChangedAt`/
`graphId`, required since Task 1.1 — leaving this exact literal broken in a different way from
Task 1.1 through most of Phase 4. Task 4.4's and Task 6.4's text were also written assuming
this addition had happened when it hadn't, compounding the gap across two more tasks. Closed
in the Field-Lifecycle Matrix pass above (gaps 1–3), which also found and fixed a fourth,
independent instance of the same bug class (gap 4, `mockActiveKg`/
`mockActiveKgMissingConfigFields` dropping `active` too early) that this round never touched.

### Must-fix 4: 4 test files/fixtures a prior (v1) fix round owned, dropped by the v2 rewrite
🟢 **Fixed.**
- `tests/upgrade.test.ts`'s `mockActiveKg`/`mockActiveKgMissingConfigFields` both register
  `path: kgRoot` (a bare temp dir) instead of `<kgRoot>/knowledge`; since `resolveGraph`
  derives a matched root as `path.dirname(graph.path)`, this makes every temp KG in the
  suite share `os.tmpdir()` as its "root," falsely matching every other temp KG's cwd once
  Task 1.9's `resolveGraph`-based tests start mocking `process.cwd()`. Restored ownership as
  a new Task 1.9 Step 3.5 (precondition of Step 4's `kg_upgrade` rewiring), fixing both
  helpers' `path:`, creating the now-required `knowledge/` subdir, and bringing both onto
  the new schema (`status`/`statusChangedAt`/`graphId` in, `active` out — both cast
  `as KgConfig` today, so leaving them on the old shape would also fail to compile once
  Task 1.12 lands).
- `tests/utils-read-config.test.ts`'s 4 `cfg.active`/`readConfig().active` assertions
  (real compile breaks — `readConfig()` returns typed `KgConfig`) are removed in Task 1.12's
  new Step 0, relying on each test's adjacent `cfg.graphs` assertion to independently prove
  the same underlying fact (which file `readConfig()` read) without a stale field reference.
- `tests/upgrade-legacy-config.integration.test.ts`'s stale `active`/`lastUsed` fixture
  literal (~line 57-70, untyped `JSON.stringify` input) is migrated onto the new schema in
  the same Task 1.12 Step 0, with an added flag: this test doesn't mock `process.cwd()`, and
  once Task 1.9 Step 4 rewires `kg_upgrade`'s default resolution through
  `resolveGraph(config, process.cwd())`, the test would fail for an unrelated reason (real
  jest-process cwd doesn't resolve to the fixture's KG) unless it also mocks `process.cwd()`
  — added as part of the same step rather than left as a latent trap for whoever runs Task
  1.9 later.
- Two more files (`tests/capture.test.ts`'s `mockMultiKgConfig`, `tests/search.test.ts`'s
  `makeConfig`) turned up in the same live-grep sweep with the identical staleness (not
  named in the original ask, but the same defect class) — folded into Task 1.12 Step 0 too,
  since leaving them stale while fixing the other three would just relocate the same
  compile/staleness problem rather than close it.

### Must-fix 5: broken cross-references from phase renumbering
🟢 **Fixed.** Full-plan sweep of every `Task N.M`/`Phase N` reference (regex-extracted and
checked against the current task/phase headers). Confirmed and fixed all 7 named patterns,
13 individual occurrences total:
- `Task 5.4` → `Task 4.5` (merge/dry-run task): 2 occurrences (Task 1.5's `mergedInto`
  Interfaces prose, and its review-note callout).
- `Task 3.2` → `Task 1.6` (`findTruePathTies`/boundary-safe matching): 3 occurrences (Task
  1.5's Behavior prose, and two review-note callouts). Left the ~9 *correct* `Task 3.2`
  references alone (Task 3.2 really is `gate()` in v2's numbering — verified each one
  individually rather than blanket-replacing).
- `Task 3.1` → `Task 1.5` (`resolveGraph`/`isAncestorOrEqual`): 4 occurrences (Task 1.6's
  Interfaces prose and Step 2). Left the ~5 correct `Task 3.1` references alone (Task 3.1
  really is `resolveInteractionMode` in v2).
- `Task 7.2` → `Task 6.2` (`kg_config_switch` retirement/`gate()` routing): 1 occurrence
  (Task 1.5's review-note callout).
- `Task 3.4` → `Task 1.8` (wiring `resolveGraph` into the actual tool call path): 1
  occurrence (Task 1.7's Interfaces prose).
- `Phase 5` → `Phase 4` (duplicate-`graphId`/fork flow): 2 occurrences, both inside Task
  1.6's `findTruePathTies` Interfaces prose (Phase 5 in v2 really is `kg_compare_graphs` —
  left that correct usage, and Task 5.1/5.2's real headers, alone).
- `Task 5.2`/`Task 5.1` re: `isMarkerTracked`/`hashDirectory`/`compareFileSets` → verified
  **already correct** in the v2 plan (no fix needed): `isMarkerTracked` is genuinely defined
  in Task 4.3, `hashDirectory`/`compareFileSets` genuinely in Task 4.2, and the one `(Task
  5.1)` reference near them (`isGitTracked`) is a real, correctly-attributed reference to a
  function that genuinely lives in Task 5.1's own section, not a stale one.

A full sweep beyond the seven named patterns (all `Task N.M`/`Phase N` occurrences,
cross-checked against the current header list) found no further misattributions.

### Should-fix: `CrossKgSearchSession` field/method name collision
🟢 **Fixed.** Task 6.5's Interfaces bullet declared both a private field and a public
method named `excludedNames` — TypeScript rejects that. Renamed the field to `excluded`,
kept the public accessor as `excludedNames(): string[]`.

### Not yet applied — remaining should-fix items
Time-boxed after the must-fix items; not attempted in this pass:
Task 4.5's `performRegistryMerge` test module-load/`KG_CONFIG_PATH` risk, Task 3.1's
`clientCanElicit: true` test gap, Task 2.2's `parseConfigOrThrow`-before-it-exists code
block, Task 5.1's `.gitignore` false-divergence fingerprint test, Task 6.4's `neverResolves`
timeout-vs-`gate()`-default race, Task 6.2's raw `gate()` result returned from an MCP
handler (should be `{content, isError?}`), and Task 6.5's two empty-body placeholder tests.
None applied yet — flagged here so they aren't lost, per this review's standing practice of
capturing before deciding.
