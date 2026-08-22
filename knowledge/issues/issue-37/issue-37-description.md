---
id: issue-37
type: Enhancement
status: deferred
github-issue: "#238"
branch: none
created: 2026-08-01
---

# issue-37: Explore Auto-Trigger vs. Manual Invocation for `kmg-sync-all`

## Problem

The user has never invoked `/kmgraph:kmg-sync-all` (a manual batching command that runs
capture-lesson → update-graph → update-issue-plan → GitHub comment, plus an FTS5
refresh, via `agents/sync-all-agent.md`'s 8-step pipeline). This raised the question of
whether the command should be deprecated, kept as-is, or replaced by an automated
trigger.

## Context gathered this session (recall + direct file checks)

- **What it does:** `commands/kmg-sync-all.md` is a convenience dispatcher only —
  nothing about it is auto-triggered; it requires explicit manual invocation.
- **No existing ADR/ENH/issue already answers this.** Checked ADR-067 (does not
  redesign or replace `kmg-sync-all`'s function — only forces a mechanical fix to its
  `kmg-switch` restore-step call, since ADR-067 retires `kmg-switch`). Checked ADR-057 /
  ENH-036 (detection-layer skill consolidation — Accepted/Withdrawn 2026-07-03): this
  answers a *different* question (should the 5 detection skills merge into fewer skills)
  and does not evaluate auto-triggering `kmg-sync-all`'s batch pipeline itself. Checked
  ADR-068 (Proposed 2026-08-01, handoff/recall file-tracing pilot + lightweight-vs-full
  workflow rule): also a different mechanism — verifies files were *read*, does not
  automate `kmg-sync-all`'s steps, and its own Non-Goals explicitly rule out generalizing
  its completion-check to other commands right now.
- **Prior related discussion:** a 2026-07-02 chat brainstorm
  (`knowledge/chat-history/2026-07/2026-07-02-claude.md`, ~lines 717-773) floated "does
  `kmg-sync-all` stay as a permanent manual override, or get deprecated once auto-capture
  handles the common path?" as an open design gap, alongside a similar question about the
  3 suggestion-only capture skills. Never resolved, never formalized into an ENH.
- **Conclusion:** whether `kmg-sync-all`'s pipeline should be auto-triggered (as opposed
  to whether detection skills should consolidate, or whether handoff reads should be
  verified) is a genuinely unexplored design question — not previously proposed and
  rejected under a different name.

## Scope (not yet decided)

- Should `kmg-sync-all`'s 8-step pipeline ever fire automatically (e.g. on session end,
  on a detection signal), replacing manual invocation for the common path?
- If so, on what trigger, and does it risk the same silent-capability-loss failure mode
  ADR-057's rejected consolidation attempts hit?
- If not, is `kmg-sync-all` worth keeping as a manual-only convenience command, or is it
  dead weight given zero observed real-world usage?

No design work has been done yet. This issue exists to track the question, not to answer
it.

## Related

- `commands/kmg-sync-all.md`, `agents/sync-all-agent.md` — the command/agent in question
- `knowledge/decisions/ADR-067-mutable-active-switch-vs-context-derived-kg-resolution.md`
  — does not address this; only fixes a broken call site
- `knowledge/decisions/ADR-057-detection-layer-requires-unified-design-not-piecemeal-growth.md`,
  `knowledge/enhancements/ENH-036/` — adjacent but answers a different question
  (skill consolidation, not pipeline auto-triggering); Withdrawn/no-consolidation
- `knowledge/decisions/ADR-068-lightweight-vs-full-workflow-rule-and-piloted-command-completion-check.md`
  — adjacent but different mechanism (file-read verification, not auto-triggering)
- `knowledge/chat-history/2026-07/2026-07-02-claude.md` — origin of the original,
  unresolved deprecation question
- `knowledge/sessions/2026-08-01-v0.7.0.md` (lines 59, 107) — prior session's
  "flagged, not decided" note on this same topic
