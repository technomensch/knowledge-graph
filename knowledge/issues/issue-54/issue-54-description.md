---
id: issue-54
type: Bug
status: deferred
github-issue: "#240"
branch: none
created: 2026-08-22
related-issues: [issue-53]
---

# issue-54: `kg_upgrade` has no check category for leftover renumbered-ADR orphan files

## Summary

Split out from [issue-53](../issue-53/issue-53-description.md)'s item 2. issue-53's actual ask (a pre-write collision check for ADR/ENH number assignment) turned out to already be shipped — commit `046bc2234` (2026-04-10) added a cross-branch collision check to `create-adr-agent.md` Phase 1, four months before issue-53 was filed. That check only fires at creation time for a brand-new number; it does not, and structurally cannot, retroactively detect an already-existing orphaned file left behind by a prior manual renumbering.

That's this issue: `kg_upgrade` (the tool that scans an installed KG for upgrade/maintenance items) has no check category that would have caught the real incident this session found — `ADR-006-document-cache-clear-upgrade-workaround.md` was manually renumbered to `ADR-054` on 2026-06-15, but the old orphaned file was left on disk "pending cleanup" (per `decisions/README.md`'s own note at the time) and was never actually removed. It sat there, undetected, for two months until the wiki-link pass stumbled into a live number collision.

## Why Bug + Gap (not Enhancement)

Filed as both `bug` and `gap` labels: the corrupted/orphaned state itself is a real defect sitting on disk right now (bug), and the tooling that should catch this class of defect has no coverage for it (gap) — `kg_upgrade` already has a detection framework (its `UpgradeItem` category system) but this specific case was never added as a category. This is not a new user-facing capability being introduced from scratch (that would be an Enhancement) — it's closing a blind spot in existing tooling.

## Root Cause

No `UpgradeItem` category in `kg_upgrade`'s schema detects: an ADR/ENH file whose number appears in a `decisions/README.md` or `enhancements/README.md` "renumbered from X" note, where the old-numbered file (X) still exists on disk unlinked from any index entry.

## Suggested Fix (not scoped/planned — tracking only)

1. Add a new `UpgradeItem` category (e.g. `orphaned-renumbered-file`) to `kg_upgrade`'s detection schema — scan `decisions/README.md`/`enhancements/README.md` for "renumbered from ADR-N"/"renumbered from ENH-N" notes, check whether the old-numbered file still exists on disk, and if so, flag it as an upgrade item (offer to delete or archive).
2. Requires: new UpgradeItem category definition, `APPLY_ORDER` sequencing entry, Zod schema wiring for the category enum, and test coverage (fixture repo with a known orphan, assert detection + apply).
3. This is a real feature-sized addition — do not bundle into a batch of near-trivial fixes. Size and schedule independently.

## Status

Deferred — tracking only, no branch or implementation plan created. Filed via `/kmgraph:kmg-start-issue-tracking` Mode 3 (track only) on 2026-08-22, split out from issue-53's item 2 after validating issue-53's item 1 was already resolved by commit `046bc2234`.
