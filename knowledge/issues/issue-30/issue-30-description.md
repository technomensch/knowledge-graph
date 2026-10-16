---
id: issue-30
type: Hardening
status: resolved
github-issue: "#205"
branch: none
created: 2026-07-28
related_enhs: ["ENH-065", "ENH-056"]
related_issues: ["issue-25", "issue-33", "issue-52"]
---

# issue-30: `kmg-handoff` and `kmg-session-wrap` Only Reference Session-Summary — Neither Generates One

## Problem

Confirmed 2026-07-28 while actually running `/kmgraph:kmg-handoff` with no session summary existing for the day: `commands/kmg-handoff.md` checks for today's session summary and, if absent, falls back to inline text — *"No session summary found for today — run `/kmgraph:kmg-session-summary` for current state."* It never invokes that command itself. Separately, `skills/kmg-session-wrap/` is a *prompt* skill — it suggests running `/kmgraph:kmg-session-summary` at session end/context limits, it doesn't run it either.

So both of the mechanisms a user would reasonably expect to "handle" the session-summary step — the handoff package generator, and the end-of-session skill — only ever *reference* the command. Neither auto-generates one.

This matters specifically for `kmg-handoff`: its own documentation states operational state ("current state, open issues, in-progress work") is supposed to live in the linked session summary, and the handoff package is meant to be a complete artifact for context-limit prep or developer transitions. A handoff package generated with no session summary and no fallback beyond a "go run this yourself" string is, by the command's own stated purpose, an incomplete package — the exact gap this issue documents happened live, in this session.

## Proposed Behavior

`kmg-handoff` should auto-invoke `/kmgraph:kmg-session-summary --auto` (or equivalent) when no summary exists for today, before finalizing `START-HERE.md`'s `continues_from` link — rather than leaving a dead pointer and a manual follow-up instruction. `kmg-session-wrap` staying prompt-only (not auto-generating) is more defensible, since it fires mid-session at a point where the user may still be actively working and auto-generating could be premature — that distinction is worth preserving, not both mechanisms need the same fix.

## Notes

Captured live, lightweight — not run through the full `kmg-start-issue-tracking` workflow, matching the precedent set for ENH-053/054/055 this session (small, deferred, "write it down" scope, not warranting branch+PR overhead).

## Related

- [issue-52](../issue-52/issue-52-description.md) — issue-52's spec cross-references this item.
- [ENH-065](../../enhancements/ENH-065/ENH-065-specification.md) — the single-file lightweight issue that started the pattern ENH-065 investigates.
- `commands/kmg-handoff.md`
- `commands/kmg-session-summary.md`
- `skills/kmg-session-wrap/`
- [issue-31](../issue-31/issue-31-description.md) — also touches `commands/kmg-handoff.md`
  directly (its stale pre-migration output-path bug); non-conflicting, additive fixes —
  good single-PR candidate alongside this issue.
- [issue-56](../issue-56/issue-56-description.md) — added the missing `kg_upgrade` category
  and `CHANGELOG.md` disclosure that this issue's batched `[0.7.4]` PR (with issue-31) was
  missing for the `kmg-handoff.md` output-path change.
- [ENH-056](../../enhancements/ENH-056/ENH-056-specification.md) — umbrella enhancement for documented multi-step commands being inconsistently executed; this issue is its instance #1.
- [issue-25](../issue-25/issue-25-description.md) — lightweight-vs-full workflow authority issue, cited this issue as lightweight-path precedent.
- [issue-33](../issue-33/issue-33-description.md) — adjacent handoff/recall gap; this issue is cited as related to it.

## Resolution (2026-08-22)

Fixed — `commands/kmg-handoff.md` now auto-invokes `session-summary-agent --auto` when no summary exists for today, before finalizing START-HERE.md's `continues_from` link. `kmg-session-wrap` intentionally left prompt-only, per this issue's own note that the two mechanisms don't need the same fix. Batched with issue-31 in one PR (same file, non-conflicting), per this issue's own suggestion. GitHub issue #205 close is a separate, explicit follow-up.
