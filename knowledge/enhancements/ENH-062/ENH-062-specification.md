---
id: ENH-062
type: Enhancement
status: proposed
github-issue: "#241"
branch: none
created: 2026-08-22
related_issues: ["issue-53", "issue-54"]
---

# ENH-062: Track issue/ADR/ENH relationships (blocked-by, related-to, depends-on) in local KG metadata

**Local ID:** ENH-062 | **GitHub Issue:** #N (filed via `/kmgraph:kmg-start-issue-tracking`, Mode 3, track only)

## Problem Statement

This session mapped a real, useful relationship graph across open issues and enhancements — file-level overlap clusters, sequence dependencies (`blocked by`), parent/child groupings (sub-issues), and loose "related to" pointers — and wired all of it natively on GitHub (`blockedBy`/`blocking` relations, sub-issues, Project Priority field). None of that structure exists in this repo's own local KG metadata. Today, relationships between issue-N/ENH-NNN docs live only as prose links inside `## Related` sections — readable, but not machine-queryable, not validated, and not kept in sync with what GitHub actually has wired.

## Proposal

Add structured relationship fields to the local KG's frontmatter schema for issues and enhancements — something like `blocked_by: []`, `blocking: []`, `depends_on: []`, `related_to: []` (some of this already exists ad hoc as `related_issues`/`related_enhs`/`related_adrs`, inconsistently named across files — this would formalize and extend it to also capture blocking/dependency direction, not just "related").

## Open Question — Where This Belongs (needs research before scoping)

Not yet clear which layer should own this, and that's deliberate — filing this to track the question, not to prescribe the answer:

- **Templates** (`core/default-templates/.../issue-template.md`, `ENH-template.md`) — add the fields as scaffolded frontmatter keys, populated manually.
- **Command** (`kmg-start-issue-tracking.md`) — prompt for relationships at filing time (Step 2.x), auto-detect via keyword/reference scan against existing docs.
- **Skill** — a dedicated recall/consistency skill that periodically scans for undeclared relationships (e.g., two docs both naming the same file) and offers to wire them — closer to what the file-overlap audit in this session actually did.
- **Some combination** — template defines the schema, command populates it at creation time, skill keeps it in sync afterward as new docs get created that reference existing ones.

Also open: should this mirror GitHub's relationship model 1:1 (blockedBy/blocking/parent/subIssues), or use a simpler local vocabulary that maps onto GitHub's model at sync time (relevant to [[ENH-052]]'s broader "keep KG paperwork internally consistent" umbrella)?

## Related

- [issue-53](../../issues/issue-53/issue-53-description.md), [issue-54](../../issues/issue-54/issue-54-description.md) — the ADR-006/orphan-file incident that prompted this session's manual relationship-mapping exercise in the first place.
- [ENH-052](../ENH-052/ENH-052-specification.md) — broader "internal KG paperwork consistency" umbrella; this ENH's schema work would be a natural input to ENH-052's consistency checks once it exists.

## Status

Proposed — research needed to determine ownership layer (template/command/skill) before this can be scoped into an implementation plan. Filed via `/kmgraph:kmg-start-issue-tracking` Mode 3 (track only) on 2026-08-22.
