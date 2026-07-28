---
id: issue-30
type: Hardening
status: deferred
github-issue: null
branch: none
created: 2026-07-28
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

- `commands/kmg-handoff.md`
- `commands/kmg-session-summary.md`
- `skills/kmg-session-wrap/`
