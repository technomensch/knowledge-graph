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

## Status

Open — gap confirmed, no fix implemented yet. Scope TBD: could mean (a) the skill was
designed but never made discoverable in the project/plugin context it's invoked from, (b)
it was built and later something changed the invocation path without updating callers, or
(c) something else — needs investigation into how the Skill tool resolves personal
(`~/.claude/skills/`) vs. plugin-scoped (`skills/`) skill names before scoping a fix, and
whether the intended fix is relocating/duplicating the file into this repo's
`skills/gov-capture-routing/SKILL.md` or changing invocation language in the 8 referencing
files.
