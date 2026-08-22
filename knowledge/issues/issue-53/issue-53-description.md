---
id: issue-53
type: Bug
status: resolved
github-issue: "#231"
branch: none
created: 2026-08-22
related-issues: [issue-54]
---

# issue-53: ADR creation has no collision check — numbers can be assigned twice

## Summary

ADR files are created without checking whether the target number is already in use. This has produced at least one real duplicate: `ADR-006` was assigned to two unrelated decisions three weeks apart (`ADR-006-delegated-vs-inline-kg-updates.md`, 2026-02-16, and `ADR-006-document-cache-clear-upgrade-workaround.md`, 2026-03-03).

## Evidence

- The second file was manually renumbered to `ADR-054` on 2026-06-15 after the collision was noticed, but the orphaned `ADR-006`-slugged file was left on disk "pending cleanup" (per `decisions/README.md`'s own note) and was never actually removed — so it kept re-triggering collision detection in `/kmgraph:kmg-init`'s wiki-link pass on 2026-08-22, two months later.
- Fixed reactively in commit `8dab9210` (2026-08-22): deleted the orphaned file, repointed 2 live cross-references (`ADR-009`, a lessons-learned file) to `ADR-054`, corrected `decisions/README.md`'s index and `Total ADRs` count.
- A second flagged pair, `ADR-067` (decision) + `ADR-067-implementation-spec` (companion doc), was investigated in the same session and found to be an intentional, already-documented pairing — not a bug, and not in scope here.

## Root Cause

Whatever creates ADR files (the `kmg-create-adr` command/agent, or manual authoring) does not check for an existing file at the target number before writing. There is also no cleanup enforcement for a "renumbered, orphan pending cleanup" state — once flagged, nothing prevents it sitting unresolved indefinitely.

## Suggested Fix (not scoped/planned — tracking only)

1. ~~Add a pre-write collision check to ADR creation (list `decisions/ADR-{N}-*.md`, refuse/renumber on match)~~ — **already done.** Verified 2026-08-22: commit `046bc2234` (2026-04-10) added exactly this — a cross-branch collision check to `create-adr-agent.md` Phase 1, four months before this issue was filed. `commands/kmg-create-adr.md` is a thin dispatcher that hands off to the same agent for number assignment, so there's no second, unpatched code path either. This item duplicated already-shipped work — same "already fixed, never recognized" pattern as the ADR-006 orphan file itself.
2. Consider whether a "pending cleanup" orphan file should be auto-flagged by the upgrade inspector (`kg_upgrade`) rather than relying on the wiki-link pass to stumble into it. — **Split out to [issue-54](../issue-54/issue-54-description.md)**, 2026-08-22: a real, unaddressed gap (the April check only fires at creation time, it can't retroactively detect an already-orphaned file), but materially bigger (new `kg_upgrade` UpgradeItem category + Zod/APPLY_ORDER wiring + tests) than item 1's scope, so it gets its own ticket rather than riding along here.

## Status

**Resolved** — item 1 (the actual collision-check ask) was already shipped before this issue existed. Item 2 (orphan detection) lives on as [issue-54](../issue-54/issue-54-description.md). Filed retroactively after being fixed reactively in commit `8dab9210` on the `main` branch (2026-08-22 session); closed the same day once item 1 was confirmed already resolved.
