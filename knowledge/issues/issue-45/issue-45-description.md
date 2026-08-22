---
id: issue-45
type: Bug
status: resolved
github-issue: "#222"
branch: v0.7.1.4-issue-45-meta-issue-attempts-paperwork-drift
created: 2026-08-13
---

# Issue-45: Meta-Issue "Attempts" Convention Drifts From Paperwork — Enforced Only By Prose, Failed 3x

## Problem

The meta-issue "Attempts" convention (`README.md` = terse index, `implementation-log.md` =
chronological per-attempt log, `attempts/NNN-*/attempt-results.md` = full detail) is correctly
designed but enforced only by prose — the scaffold's own "How to Use This Meta-Issue" section
just asks people to remember to use `--add-attempt` next time. That has now failed three times
in one real meta-issue instance
(`knowledge/issues/style-guide-required-sections-saga/` in the `tidal-docs` repo, a downstream
consumer of this plugin):

1. **Attempts 002–007** — hand-logged directly into `implementation-log.md` instead of scaffolded
   via `--add-attempt`; `attempts/NNN-*/` folders didn't exist for days, retroactively scaffolded
   2026-07-28.
2. **Attempts 009–012** — same pattern, retroactively fixed as part of Attempt 013 (2026-07-29).
3. **Attempt 015** (2026-08-12/13) — the `attempts/015-voice-pronoun-canary-gate/` folder exists,
   but has no corresponding `## Attempt 015` entry in `implementation-log.md` at all. With that
   designated chronological-log tier empty, all ongoing detail piled into the meta-issue's
   `README.md` instead — its Attempt-15 index-list entry ballooned to 13,194 characters (vs. a
   ~350-char median across the other 14 entries) before being caught and manually trimmed.

A deeper, independent read of the same `README.md` found the bloat isn't unique to Attempt 15:
the file is 41.5KB total, and separately from the Attempt-15 entry it already carries four other
full per-attempt writeups promoted to top-level `##` sections (a Corpus-Wide Trend Analysis, an
Opus holistic audit, a Fable agenda review, a Codex review) plus a 12.7KB "Quick Summary" — i.e.
"detail lands in README instead of its designated file" was already the house style before
Attempt 15, a broken-windows precedent rather than something new.

## Root Cause

The convention is real and correctly designed (confirmed by reading
`core/default-templates/meta-issue/README.md` and `implementation-log.md` in this repo — the
`## Attempt NNN: [Approach Name] (YYYY-MM-DD)` header format and the folder-per-attempt structure
are both explicit and internally consistent). But nothing mechanically checks that a
`knowledge/issues/*/attempts/NNN-*/` folder has a matching `## Attempt NNN` header in that issue's
`implementation-log.md`, and nothing checks README `## Attempts` index-entry size. The only
enforcement is the scaffold's own prose reminder, which the same failure mode has now defeated
three times.

Separately, `core/default-templates/meta-issue/README.md`'s `## Attempts` section only implies
brevity via a placeholder example (`— [Status] — [Brief outcome]`); it never states the
one-line-per-attempt / pointer-elsewhere rule anywhere explicitly.

`skills/kmg-paperwork-audit/SKILL.md` documents deferring index-count and backlink-symmetry
checks to `scripts/pre-push-gate.sh` Gate 5 (confirmed: Gate 5 in this repo's
`scripts/pre-push-gate.sh` covers KG index-count drift + backlink symmetry per ENH-052, unrelated
to meta-issue attempts). That script lives under this repo's own `scripts/` directory, which is
not part of the distributed plugin surface (`commands/`, `skills/`, `agents/`, `hooks/`,
`mcp-server/`, `core/` per this repo's `CLAUDE.md`) — it does not exist in `tidal-docs` or any
other consumer repo. Any new mechanical check for this convention cannot assume
`pre-push-gate.sh` is present; it needs to be self-contained wherever it runs in a consumer repo.

## Impact

- Chronological history of a meta-issue becomes unreliable — the designated log tier
  (`implementation-log.md`) can silently go empty for an entire attempt while work still happened.
- README bloats from an index (should stay small and scannable) into a duplicate detail store,
  defeating the three-tier design's purpose.
- The failure is silent: nothing surfaces the drift until a human happens to notice (as in
  Attempt 015), by which point cleanup is manual and retroactive.

## Related

- [issue-49](../issue-49/issue-49-description.md) — cites this issue's branch/plan (`v0.7.1.4-issue-45`) as one of five fully-merged `v0.7.1.x` plans audited for the Safety-Header STATUS-freeze bug. Backlinked 2026-08-19.

## Reported By

Relayed from a peer session (Fable) investigating the `tidal-docs` meta-issue instance; confirmed
by the user as an authentic report and requested for tracking in this repo (2026-08-13).
