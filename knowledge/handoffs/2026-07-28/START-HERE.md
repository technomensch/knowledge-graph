# Start Here — Project Handoff

**Branch:** issue/29-chat-extraction-cross-project-bleed
**Commit:** 6bfbec29
**Continues from:** No session summary found for today (2026-07-28) — run `/kmgraph:kmg-session-summary` for current state.

---

For current state, open issues, and in-progress work: run `/kmgraph:kmg-session-summary` to generate today's summary, then read it.
For project structure and architecture: see DOCUMENTATION-MAP.md and ARCHITECTURE-SNAPSHOT.md in this package.

## Quick orientation (in lieu of a session summary)

The active thread of work right now is **ADR-067** (`knowledge/decisions/ADR-067-mutable-active-switch-vs-context-derived-kg-resolution.md`) — replacing the mutable `.active` KG-resolution pointer with context-derived resolution. It has been through:
- A full design brainstorm (3 rounds), resolving 22 findings from two independent Opus reviews
- An independent Fable review (13 more findings, § Fable Review Findings)
- An Opus validation pass on all 13 Fable findings (8 agree, 4 partial, 1 disagree)
- Live, item-by-item resolution of the Fable findings is in progress — item 1 (nested KG handling) and item 2 (cwd-change flag, folded into item 1) are resolved as of 2026-07-28; item 3 ($HOME/CI identity check) is the item being discussed when this handoff was triggered.

A related bug was filed and branched separately: **issue-29 / GitHub #197** (chat-extraction cross-project content bleed) — branch `issue/29-chat-extraction-cross-project-bleed` (the currently checked-out branch), draft PR #198, tracking-only so far (no implementation).

Read ADR-067 in full before continuing that work — it's long (400+ lines) but self-documenting, with every resolved item marked inline.
