---
id: issue-18
type: Gap
status: open
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

Open — gap confirmed, no fix implemented yet. Scope TBD: could mean (a) the skill was
designed but never made discoverable in the project/plugin context it's invoked from, (b)
it was built and later something changed the invocation path without updating callers, or
(c) something else — needs investigation into how the Skill tool resolves personal
(`~/.claude/skills/`) vs. plugin-scoped (`skills/`) skill names before scoping a fix, and
whether the intended fix is relocating/duplicating the file into this repo's
`skills/gov-capture-routing/SKILL.md` or changing invocation language in the 8 referencing
files. See "Decision Fork" above for the two candidate paths, not yet chosen between.

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
