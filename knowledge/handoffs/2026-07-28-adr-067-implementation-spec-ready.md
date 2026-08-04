# Handoff: ADR-067 Implementation Spec Ready (2026-07-28)

**Type:** Design/research session — no code changes.
**Status of underlying decision:** ADR-067 itself is now **fully resolved** at the design level (all 13 Fable Review Findings items + 3 previously-undesigned mechanisms). A separate, new artifact — `ADR-067-implementation-spec.md` — has been produced and is **implementation-ready**. No implementation has started. No branch, plan, or code exists yet.

**Continues from:** `knowledge/handoffs/2026-07-21-adr-067-brainstorm-in-progress.md` and today's session summary, `knowledge/sessions/2026-07-28-adr-067-fable-items-resolved-implementation-spec.md`.

## What changed this session (verified via git)

```
git status --short
 M knowledge/decisions/ADR-055-cross-platform-upgrade-triggering-version-sentinel-over-startup-notification.md
 M knowledge/decisions/ADR-067-mutable-active-switch-vs-context-derived-kg-resolution.md
 M knowledge/enhancements/ENH-054/ENH-054-specification.md
?? knowledge/decisions/ADR-067-implementation-spec.md
```

`git diff --stat`:
```
ADR-055-...-startup-notification.md | 10 ++
ADR-067-...-kg-resolution.md        | 142 ++++++++++++++++-----
ENH-054-specification.md            | 17 +++
3 files changed, 140 insertions(+), 29 deletions(-)
```

HEAD is unchanged from the start of the session: `c8dff67a` — docs(issue-31): file real kmg-handoff hardcoded-path bug, fix ADR-067 status line. No commits were created this session. **Nothing has been committed or pushed — this is pending user approval.**

## What happened this session, in order

1. Resumed ADR-067 (mutable `.active` switch vs. context-derived KG resolution) from the 2026-07-21 brainstorm. Worked through all 13 remaining "Fable Review Findings" items (items 3-13; items 1-2 were already resolved in an earlier 2026-07-28 session) one at a time with the user, resolving each via independent Opus + Fable research where warranted, and live empirical testing for two of them:
   - **Item 9 (staleness bug):** caught live via `kg_version` and `ps aux` before/after a `/reload-plugins` run.
   - **Item 10 (subagent-scope inheritance):** resolved by spawning a subagent and checking the running MCP server processes it inherited.

2. Discovered and documented one live bug as a side effect of the research: this machine had 8 running MCP server processes on stale plugin code (v0.6.16) while the installed plugin was v0.6.20 — a clean before/after repro was captured. Filed as a `## Known Gap` addendum in `knowledge/decisions/ADR-055-cross-platform-upgrade-triggering-version-sentinel-over-startup-notification.md` **per explicit user instruction: append to that existing entry, not a new issue — documentation only, no branch, no plan.**

3. Resolved the ADR's 3 remaining previously-flagged "agreed-but-undesigned" mechanisms: registry concurrency/locking, personal-scope marker syntax (`[personal]`/`[project]`), and the moved-path compare-view (`kg_compare_graphs`) — each independently sanity-checked by Opus against real code in `mcp-server/src`.

4. Appended a concrete use case (shared-login/hot-desk accountability) to `knowledge/enhancements/ENH-054/ENH-054-specification.md` as the trigger that would justify reviving that deferred enhancement.

5. Transcribed the full resolved ADR-067 design into a new implementation-ready spec: `knowledge/decisions/ADR-067-implementation-spec.md` (17 sections, ~250 lines). Had Opus independently check the new spec against the source ADR for fidelity — it found:
   - 6 broken internal cross-references (renumbering artifacts) — **fixed**.
   - 7 genuinely dropped decisions — **fixed** (re-added).
   - 1 real factual error (miscounted `JSON.parse` call sites) — **fixed**.
   - 2 open judgment calls — **both resolved**, see below.

## Judgment calls raised by the fidelity check — both resolved

1. **Whether the `$HOME` ownership check still runs in interactive mode.** Sent to the user. **Resolved: yes** — kept for interactive sessions, dropped only for automated/CI callers.
2. **mtime-vs-git-log recency contradiction.** Resolved without escalation — applied the ADR's already-established logic (git-log-based recency, not filesystem mtime) consistently across the spec.

One further open item was checked but did **not** require a design change:
- **Whether Codex's `sandbox-state-meta` capability-advertisement mechanism survives the new MCP spec's handshake removal.** Sent to both a direct web/spec-doc check and an independent Fable pass. Both converged on **low near-term risk**. A caveat was added to the spec; no redesign was triggered.

## Where things stand

- `knowledge/decisions/ADR-067-mutable-active-switch-vs-context-derived-kg-resolution.md` — all 13 Fable items + 3 mechanisms resolved inline. This is the source-of-truth design record.
- `knowledge/decisions/ADR-067-implementation-spec.md` — new, untracked, ~250 lines, 17 sections. This is the **implementation-ready** artifact — start here for any implementation work, not the ADR itself.
- `knowledge/decisions/ADR-055-cross-platform-upgrade-triggering-version-sentinel-over-startup-notification.md` — `## Known Gap` addendum documents the live stale-MCP-process bug found this session (documentation only, unrelated to whether/when ADR-067 gets implemented).
- `knowledge/enhancements/ENH-054/ENH-054-specification.md` — hot-desk use case appended; still a deferred enhancement, not scheduled.

All four files above are modified/created but **uncommitted**. No branch has been created. No implementation plan exists yet.

## Next step for whoever picks this up

1. Review `knowledge/decisions/ADR-067-implementation-spec.md` end-to-end.
2. Decide whether to proceed into `superpowers:writing-plans` for a formal implementation plan. This project's CLAUDE.md mandates a branch as the first plan step — the version-naming convention for this work would likely be something like `v{ver}-adr-067-kg-resolution`, branched from `main` at (or after) commit `c8dff67a`.
3. Or, request further changes to the spec first before treating it as final.
4. Either way, the 4 modified/new files listed under "What changed this session" should be reviewed and committed **before** moving on to implementation — per this project's approval-gate rules, nothing gets committed without being explicitly asked.

## Approval gate

This handoff and all of today's edits are **uncommitted**. No `git add`/`git commit`/`git push` has been run and none will be run without explicit user confirmation. No branch, plan, or implementation work has been started.
