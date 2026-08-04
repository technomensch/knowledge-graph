---
id: issue-18
type: Gap
status: resolved
github-issue: "#176"
created: 2026-07-17
related-issues: [issue-17]
target-release: null
---

# Issue-18: `gov-capture-routing` skill referenced by 8+ commands/agents but not invocable

## Problem

`skills/kmg-session-summary.md`'s (and four other commands' and three agents' and one
skill's) documented "Level Routing Detection" step says to invoke a `gov-capture-routing`
skill to detect the user/project/named/active level signal and resolve `$level`,
`$target_kg`, `$target_path`, `$restore_kg` for the calling dispatcher. This step is
supposed to fire automatically before dispatching to the underlying agent.

When actually invoked (via the Skill tool, as `kmgraph:gov-capture-routing`), it failed
with `Unknown skill: kmgraph:gov-capture-routing`.

## Confirmed references (8+ files assume it exists and will auto-fire)

- `commands/kmg-sync-all.md`
- `commands/kmg-recall.md`
- `commands/kmg-capture-lesson.md`
- `commands/kmg-session-summary.md`
- `commands/kmg-create-adr.md`
- `agents/create-adr-agent.md`
- `agents/lesson-capture-agent.md`
- `agents/session-summary-agent.md`
- `skills/kmg-auto-recall/SKILL.md` (also documents a fallback for this specific skill
  being unavailable — see Consequence below)

## Confirmed NOT a naming drift

`skills/kmg-capture-router/SKILL.md` exists in this repo and is a real, working skill —
but it does something different: it routes ad-hoc "capture that" / "remember that"
requests to a destination (memory, lesson, or ADR) based on conversational referent. It
is a WHAT-type-of-capture router. `gov-capture-routing` is about WHERE content goes —
resolving `--user`/`--project`/`--named`/`--active` KG-level routing flags for
session-summary/recall/capture-lesson/create-adr/sync-all commands. These are genuinely
different mechanisms, not the same skill renamed.

## What the two related ADRs actually say

**ADR-034** ("Capture Level Routing — Dispatcher/Agent Split with Shared
gov-capture-routing Skill"), status `Accepted — implemented in v0.3.9-beta (branch:
v0.3.9-capture-level-routing, PR #91)`, is the ADR that designed this exact mechanism —
dispatchers do NL detection, agents apply flags only, and `gov-capture-routing` is the
single shared skill in between, invoked by all 6 dispatchers.

Critically, ADR-034's own "Related" section states the implementation lives at
**`~/.claude/skills/gov-capture-routing.md`** — i.e., by design, a user-home-directory
skill file, not a file checked into this project repo. Its "Consequences" section
explicitly flags this as a known negative: *"`gov-capture-routing` skill must be kept in
sync with dispatcher expectations — a vocabulary change requires updating one file, but
that file is not checked into the project repo."*

**ADR-048** ("Governance Capture Routing — update-graph flag-only, session-wrap as action
point"), status `Accepted`, despite the similar-sounding title, is **not** the same
mechanism. It concerns a completely different concern: how `update-graph`/`knowledge-extractor`
Step 8 emits a plain-language governance flag (instead of writing directly to
`MEMORY.md`), how `rules-capture` pairs new rules with trigger entries, and how
`session-wrap` is the action point for surfacing governance signals. It does not design
or reference KG-level (`--user`/`--project`/`--named`/`--active`) routing at all. Anyone
searching ADRs by title alone for "capture routing" would find this ADR and could
mistakenly believe it's the relevant design doc — it is not.

## New finding during this investigation: the file DOES exist, just not where the Skill tool can see it

Verified live: `~/.claude/skills/gov-capture-routing.md` exists on disk, dated April 15,
2026 (matching ADR-034's implementation date), with the exact frontmatter, output
contract (`$level`, `$target_kg`, `$restore_kg`, `$target_path`), and NL trigger
vocabulary described in the ADR. It is a real, complete, well-formed skill file.

It is **not** part of this git repository (confirmed: no match in `git log --all` for any
path resembling `gov-capture-routing` under `skills/`), and it does not follow this
project's `skills/<name>/SKILL.md` directory convention — it's a flat file directly under
the user's personal `~/.claude/skills/` directory, outside the kmgraph plugin's own
`skills/` tree entirely.

This is very likely *why* the Skill tool call failed as `Unknown skill:
kmgraph:gov-capture-routing`: the Skill tool appears to resolve skill names within the
invoking plugin's namespace (`kmgraph:`), and a loose personal file living outside the
plugin's `skills/` directory is invisible to that resolution — regardless of whether the
file itself is well-formed or correct.

So this is not simply "the skill was never built." It was built, matches its ADR, and
still doesn't work under the invocation path the 8+ referencing files assume. Whether the
fix is (a) moving/duplicating the skill into the project's `skills/gov-capture-routing/SKILL.md`
so it's discoverable in-plugin, (b) changing how commands invoke it, or (c) something
else, is not yet decided — see Status below.

## Consequence — no graceful fallback (mostly)

Observed live during a real `/kmgraph:kmg-session-summary` run: the Skill tool call
errored, and the command had **no defined fallback or error-surfacing behavior** for this
case — the calling assistant had to notice the tool error and improvise a fallback
(defaulting to `--active` level) rather than the command handling it gracefully or
alerting the user that automatic level-routing had silently failed.

Notably, `skills/kmg-auto-recall/SKILL.md` (line 28) is the one exception: it already
documents a fallback for this exact failure mode — *"`gov-capture-routing` is Claude
Code-only. On non-Claude platforms or if unavailable: dispatch directly to recall-agent
with `--scope=active` as fallback (UQ-8)"* — meaning at least one caller anticipated this
gap. The other 7 referencing files have no equivalent fallback language.

## Related

Same broader class as [issue-17](../issue-17/issue-17-description.md) (GH #175):
documented automatic behaviors/triggers that reference a mechanism which doesn't actually
fire in practice — a second, distinct concrete instance found the day after issue-17.

## Provenance / Historical Context

Filesystem investigation across related personal repos (confirmed this session) traces
where `gov-capture-routing.md` actually came from:

- `/Users/mkaplan/GitHub/optimize-my-resume/.agent/workflows/` is a separate, non-Claude-Code,
  home-grown workflow-file convention — not this project's `skills/<name>/SKILL.md` format.
  It contains `gov-execute-plan.md`, `gov-git-branch.md`, `gov-git-commit.md`,
  `gov-git-push.md`, `gov-read-only-mode.md`, all dated Feb 11, 2026.
- The user's personal `~/.claude/skills/gov-*.md` files mirror these same 5 files, dated
  Feb 13, 2026 (2 days later) — a manual copy/mirror for cross-project reuse in Claude Code
  sessions.
- Critically, `gov-capture-routing.md` has **no counterpart** in `.agent/workflows/` at all.
  It was created directly in `~/.claude/skills/` on **April 15, 2026 — the exact same date
  as ADR-034** (the ADR that designed the capture-level-routing mechanism this skill
  implements). Every other file in `.agent/workflows/` stops at April 14; nothing was added
  there after.
- `optimize-my-resume/.agent/workflows/` also contains `know-capture-lesson.md`,
  `know-recall.md`, `know-update-graph.md`, `know-sync-all.md`,
  `know-update-issue-plan.md` — these appear to be the direct prototype/predecessor this
  entire kmgraph plugin (`kmg-*` skills) was later extracted from as its own standalone
  product.
- A git branch exists in `optimize-my-resume`: `v9.3.5.5-enh-008-gov-sync` — implying some
  cross-project sync mechanism for these `gov-*` files was planned/branched at some point.
  No actual ENH-008 spec file was found in that repo (searched, came up empty). This lead is
  **unresolved** — an open thread, not a confirmed fact.

**Interpretation (not fact, but well-supported by the evidence above):** the other `gov-*`
skills are legitimately personal, cross-project workflow preferences (git commit
conventions, plan-execution protocol) — reasonable to keep unshipped/personal.
`gov-capture-routing` is categorically different: it's a required dependency of 6 built-in
kmgraph commands (session-summary, create-adr, capture-lesson, rules-capture, recall,
sync-all). The distinction between "personal workflow habit" and "core plugin dependency"
was apparently never consciously made when ADR-034 was written — the skill was placed in
`~/.claude/skills/` out of habit (that's where the author's other similarly-named `gov-*`
files already lived), not because it was deliberately decided to keep it unshipped.

## Priority Reassessment

This has been silently non-functional since April 15, 2026 — the entire time ADR-034's
feature has existed — with no prior bug report surfacing it before this session, despite
several months of the plugin being live on the marketplace.

The failure mode is **not destructive**: when the routing skill can't resolve, all 6
affected commands simply fall back to using the active KG, which is exactly the
pre-ADR-034 default behavior. Nothing is lost or corrupted; the feature just never
activates.

Given zero demand signal in 3+ months of real usage, this should be treated as
**LOW/MEDIUM priority, not urgent** — explicitly downgrading any "this is broken" framing
to "this is a designed enhancement that has never activated."

## Decision Fork — Fix vs. Simplify

Two genuinely different paths forward, neither obviously correct — this needs a
deliberate decision later, not a default toward "fix it" just because a gap was found:

1. **Fix properly** — migrate `~/.claude/skills/gov-capture-routing.md`'s content into this
   project's own shipped `skills/` tree (e.g. `skills/kmg-capture-level-routing/SKILL.md`)
   so the ADR-034 feature actually works for every installer, not just the original
   author's machine.
2. **Simplify away** — since nobody has missed this capability in 3+ months of it silently
   not working, formally retire the ambition: remove the `gov-capture-routing` invocation
   from all 8 referencing files, accept "always use the active KG" as the real, documented
   behavior, and mark ADR-034 as superseded/retired rather than trying to finally make it
   work.

This document does not recommend one path over the other — that decision is left open.

## Status

Resolved — see the "## Resolved (2026-08-03) — Phase 7.1 landed" section near the end of this file for the actual fix and commit history. This paragraph is left in place as the historical, in-progress framing that was accurate at the time it was written.

## Prior Art / Recall Findings (2026-08-01)

Recall run across ADRs, issues, enhancements, chat-history, and session summaries (issues/enhancements searched via direct grep, not `kg_search` — FTS5 doesn't cover those dirs yet, see issue-34). No prior decision or explicit user lean toward fix-vs-retire exists anywhere in the KG.

- `ADR-034` itself anticipated this fragility (Consequences section flags sync-drift risk from the skill living outside the repo) but never chose "migrate into repo" at design time.
- `ADR-048` confirmed unrelated (per this issue's own "What the two related ADRs actually say" section above).
- `issue-19` and session summary `knowledge/sessions/2026-07/2026-07-18-2026-07-17-main.md` both explicitly log the fork as "deliberately left open — low priority, no forcing function yet." No lean recorded.
- **New since this issue was filed:** `issue-36` (filed same session as issue-34/35) is a second, independent instance of the same failure class — `kmgraph:recall` skill also unresolvable — and explicitly cross-references this issue's Decision Fork as applying there too. `knowledge/sessions/2026-07-31-main.md:26-27` (most recent) logged a third instance of the same phantom-skill-reference pattern.
- `issue-17` confirmed same broad class ("documented automatic behavior that doesn't fire") but carries no fix-vs-retire framing of its own — a different concrete instance, not decision guidance.

**Net effect on the "zero demand signal, low/medium priority" framing above:** softening. The gap has now recurred twice more (issue-36, and the 2026-07-31 session finding) since this issue's original "3+ months, no prior bug report" framing was written. Worth weighing when the fork is finally decided — deferring again means a third caller inherits the same unresolved question issue-36 already inherited once.

**ADR-067 overlap found — handed off, not decided here:** ADR-067 (in-progress on this branch, owned by a separate concurrent session) designs a `[personal]`/`[project]` marker mechanism that overlaps functionally with what `gov-capture-routing` was built to do, and its stated retirement of `kmg-switch` would break `kmg-sync-all.md`'s restore step if `gov-capture-routing` is ever fixed rather than retired. Full findings and recommendation: `knowledge/handoffs/2026-08-01-issue-18-adr-067-overlap-findings.md`. This issue's Decision Fork should be resolved in light of that handoff, not independently — leans toward "retire," pending the ADR-067 owner's read.

**`gov-` prefix provenance (confirmed, does not bear on the fork):** `/Users/mkaplan/GitHub/optimize-my-resume/chat-history/2026-02/2026-02-11-claude.md` (lines ~4837-6890) is where the flat `.agent/workflows/` prefix naming convention was designed — `gov-` for governance/enforcement/git-ops, `know-` for knowledge/recall, `plan-`/`proj-`/`doc-` for the rest — chosen over nested `SKILL.md` directories at the time. This confirms *why* the naming pattern exists, not why `gov-capture-routing` specifically lives outside the repo: per this issue's own Provenance section, `gov-capture-routing.md` was created later (April 15, 2026, same day as ADR-034) with no counterpart in the Feb 11 batch. Checked (also grepped, no hits): personal graph config has no separate `personal` KG registered; `Resume_Analyzer_Optimizer` repo has no matching content.

## Decision — RETIRE (2026-08-03, ADR-067 owner's read)

The handoff referenced above (`knowledge/handoffs/2026-08-01-issue-18-adr-067-overlap-findings.md`) has now been read by the ADR-067 owner, live, this session. Formal call: **retire `gov-capture-routing`** — option 2 from the Decision Fork above, not option 1 ("fix properly"). Both fork branches are now resolved.

**Why retire, concretely — new evidence beyond what this issue already had:**

- **Switch/restore half is already moot.** ADR-067 Phase 6 retired `kg_config_switch`/`kmg-switch.md` entirely, and `commands/kmg-sync-all.md`'s restore-step contract was rewritten in that same phase's doc sweep to say "No switch/restore needed... resolve automatically from context." Half of what `gov-capture-routing` coordinated (`$restore_kg`) no longer has anything to restore.
- **Level-detection half is now also functionally subsumed** — not because ADR-067 explicitly designed against `gov-capture-routing` (it doesn't reference it anywhere; confirmed by grep across the ADR text), but because a concrete replacement mechanism now exists: `kg_capture` gained a `scope: "project"|"user"` parameter this session, bringing it in line with `kg_search`/`kg_config_add_category`/`kg_fts5_status`/`kg_fts5_rebuild`/`kg_upgrade`, which already had one. Combined with `[personal]`/`[project]` marker parsing (added Phase 6) and cwd-derived resolution (added Phase 1), a command no longer needs a separate routing skill to detect `--user`/`--project`/`--named`/`--active` intent and pre-resolve `$target_kg`/`$level` — it can pass `scope`/`targetKg` straight to the MCP tool, which resolves and gates internally.
- **A real, serious bug surfaced as a direct consequence of this investigation.** Three agents — `agents/create-adr-agent.md`, `agents/lesson-capture-agent.md`, `agents/session-summary-agent.md` — each have a `--user` code path whose documented behavior is to bypass `kg_capture` entirely and write directly via the Write tool to `~/.kmgraph/{decisions,lessons-learned,sessions}/`. That bypass completely skips every personal-KG confirmation gate ADR-067 Phase 6 built (`confirmPersonalScopeAccess`, `confirmFirstWrite`) — a `--user`-path write through these 3 agents currently gets zero confirmation gating, directly contradicting these same files' own stated invariant ("No Write/Edit — all writes go through kg_capture," per `lesson-capture-agent.md`). This made sense before ADR-067, when `kg_capture` had no path to the personal graph at all — it is now both obsolete and a live security hole sitting directly next to the gates this session just hardened.

**What's being done:** a new Phase 7.1 is being added to the ADR-067 implementation plan (`knowledge/plans/v0.7.0-adr-067-p7.1.md`, orchestration updated) to:

1. Remove the `gov-capture-routing` invocation from the 5 referencing commands (`kmg-session-summary.md`, `kmg-recall.md`, `kmg-capture-lesson.md`, `kmg-create-adr.md`, `kmg-sync-all.md`) and 1 skill (`kmg-auto-recall/SKILL.md`), replacing it with direct NL-to-scope/targetKg detection.
2. Remove the `--user: bypass kg_capture` special case from the 3 agents above, routing all levels (`--user`/`--project`/`--named`/`--active`) through `kg_capture` uniformly via `scope`/`targetKg`.

Status is set to `in-progress` (not `resolved`/`closed`) — the decision is final, but the actual fix (Phase 7.1) has not landed yet.

**Correction after independent review (2026-08-03), before Phase 7.1 executed:** an independent review pass caught two things missing from the decision above, both folded into Phase 7.1's plan before any of it ran, not left as a gap:
- **The 3 agents have a second Write-tool bypass**, separate from the `--user`-flag one described above — an "MCP unreachable/failed" fallback that fires regardless of scope. Once the `--user`-flag bypass is closed, this second one would become reachable for `scope:"user"` writes too, with the same zero-gating problem AND a wrong-target bug (it writes to the project-local KG, not personal). Phase 7.1's Task 7.1.1 now explicitly closes both, not just the first.
- **The "functional subsumption" framing above overstates how clean the replacement is.** `gov-capture-routing`'s actual skill file has real capability (richer NL vocabulary, conflict-resolution with a persisted preference, multi-capture-in-one-message) that Phase 7.1's flag-to-scope replacement does not reproduce. Since the skill was never reachable in production, this isn't a regression against real behavior — but it's a real, conscious narrowing of what ADR-034 originally designed, and Phase 7.1 now documents that explicitly rather than implying nothing was lost.

## Resolved (2026-08-03) — Phase 7.1 landed

Phase 7.1 has been fully executed and committed on branch `v0.7.0-adr-067-c1`. Six commits, in order:

1. `0f9b0416` — `kg_capture` gained its `scope` param (the replacement primitive Phase 7.1 builds on).
2. `092a975c` — Task 7.1.1: closed both Write-tool bypasses (the `--user`-flag bypass and the "MCP unreachable" fallback flagged in the Correction above) in all 3 agents (`create-adr-agent.md`, `lesson-capture-agent.md`, `session-summary-agent.md`).
3. `634adcf1` — doc updates following from Task 7.1.1.
4. `6e59df63` — Task 7.1.2: retired the `gov-capture-routing` invocation from the 5 referencing commands (`kmg-session-summary.md`, `kmg-recall.md`, `kmg-capture-lesson.md`, `kmg-create-adr.md`, `kmg-sync-all.md`).
5. `72e2f9ed` — Task 7.1.3: updated `kmg-auto-recall` skill (the one file that had already documented a fallback for this exact gap — see "Consequence" above).
6. `3523e571` — Task 7.1.4: repo-wide sweep for stray `gov-capture-routing` references, marked ADR-034 **Superseded**, and fixed a mislabeled `knowledge/rules.md` reference found during the sweep.

**Post-landing verification found and fixed one more real bug.** The real slash commands can't be exercised live to verify this kind of change — `/kmgraph:kmg-recall` resolves from the installed plugin cache at `~/.claude/plugins/cache/`, not this git worktree, so invoking it would run the stale pre-Phase-7.1 cached command, not the new local edits. Verification instead used a manual trace-through of the new Level Routing Detection logic in `kmg-recall.md` against `recall-agent`'s own documented flag semantics.

That trace-through caught a real bug: `kmg-recall.md`'s replacement text had carried forward the retired `gov-capture-routing` skill's original wording verbatim — "nothing specified, or `--active` -> all configured KGs" — which incorrectly forced an explicit `--active` flag even when the user had signaled nothing. This short-circuited `recall-agent`'s own smarter auto-detect logic (search all KGs when a personal KG is registered, active-only otherwise), because `recall-agent`'s own flag table defines an explicit `--active` as meaning the single cwd-resolved KG only — not all KGs. Net effect before the fix: a bare `/kmgraph:kmg-recall <topic>` with a personal KG registered would have searched only the active KG instead of the intended project+personal default. Fixed in commit `96c8f901` — "nothing specified" now passes no level flag at all, letting `recall-agent`'s auto-detect run unshortcircuited.

**Two more things found during the same trace-through, deliberately NOT fixed here — filed as [issue-40](../issue-40/issue-40-description.md) instead:**

- `agents/session-summary-agent.md` has an explicit "Targeting for `--project`" section spelling out that `targetKg` is what's actually passed to `kg_capture`, but no equivalent explicit "Targeting for `--named`" section — ambiguous whether `--named=<kg>` follows the same `targetKg` pattern or something else. Likely also true of `lesson-capture-agent.md`/`create-adr-agent.md`, not individually re-checked.
- The `--named=<kg>` flag name itself may be a poor choice — `commands/kmg-extract-chat.md` already uses `--project=<fragment>` for an unrelated purpose (filtering chat sessions by project name/path fragment), which would collide in meaning if `--named` were simply renamed to `--project` (these 5 commands already have a separate bare `--project` flag meaning "current repo's own KG", no value). A rename needs its own design decision, not a mechanical find-replace.

These were left as a new issue rather than folded into this one because they span more files than Phase 7.1 touched and deserve their own scoped investigation.

**Re-verified after the `96c8f901` fix, before closing this out:** full `npx jest` (38 suites / 366 tests) and `npx tsc --noEmit` both clean; the MCP-level cwd-alternation + personal-scope-isolation regression check (3 sandboxes, 1 persistent connection, 9 steps) re-run and still passing; and the specific `kmg-recall.md` "nothing specified" trace re-walked against `recall-agent.md`'s real auto-detect contract, confirmed correct — no level flag is now passed when nothing is signaled, letting `recall-agent`'s own `all`/`active` auto-detect run unshortcircuited.
