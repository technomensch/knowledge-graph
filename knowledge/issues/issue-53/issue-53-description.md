---
id: issue-53
type: Bug
status: deferred
github-issue: "#231"
branch: none
created: 2026-08-22
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

1. Add a pre-write collision check to ADR creation (list `decisions/ADR-{N}-*.md`, refuse/renumber on match) — mirrors the existing `git log --all` cross-branch collision check already used for `issue-N`/`ENH-NNN` in `/kmgraph:kmg-start-issue-tracking` Step 2.2.
2. Consider whether a "pending cleanup" orphan file should be auto-flagged by the upgrade inspector (`kg_upgrade`) rather than relying on the wiki-link pass to stumble into it.

## Status

Deferred — tracking only, no branch or implementation plan created. Filed retroactively after being fixed reactively in commit `8dab9210` on the `main` branch (2026-08-22 session).
