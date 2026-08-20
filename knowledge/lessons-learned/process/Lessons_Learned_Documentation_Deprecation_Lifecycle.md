---
title: "Lesson: Documentation Deprecation Lifecycle — Deprecate → Cleanup → Removal"
created: 2026-03-28T00:00:00Z
author: Claude Sonnet 4.6
email: noreply@anthropic.com
git:
  branch: v0.2.1-beta-mcp-write-and-portability
  commit: 2b06634b
tags:
  - documentation
  - deprecation
  - lifecycle
  - user-facing
  - kmgraph
category: process
---

# Lesson: Documentation Deprecation Lifecycle — Deprecate → Cleanup → Removal

**Date:** 2026-03-28
**Category:** Process (Documentation Management)
**Discovered during:** v0.2.1-beta documentation updates (update-doc command)

---

## Problem

When updating user-facing documentation to replace old patterns (e.g., thick commands replaced by thin dispatchers + agents), the old documentation was at risk of being silently deleted. This creates two failure modes:

1. **Silent deletion:** Users following old docs hit broken workflows with no migration guidance
2. **Premature removal:** Removing docs before users have had time to adopt the new pattern

The risk is highest for KMGraph because it ships as an open-source plugin — users on older versions may be reading docs for patterns that have already been removed.

---

## Solution: Three-Phase Lifecycle

Established and implemented in `/kmgraph:update-doc` Step 6b:

### Phase 1: Deprecation (version X.Y.0)
- Mark old section with deprecation notice:
  ```markdown
  > ⚠️ **DEPRECATED (vX.Y.0):** This pattern is no longer recommended.
  > **Reason:** [why it changed]
  > **Migration path:** [concrete steps to new pattern]
  > **Removal timeline:** Scheduled for removal in v[future] ([date])
  > **Affected users:** [who this impacts]
  ```
- Keep full documentation for reference
- Commit: `docs(deprecation): mark [section] as deprecated in vX.Y.0`

### Phase 2: Cleanup (version X.Y+1.0) — requires user approval
- After 1–2 minor version cycles, audit deprecated sections
- Ask user: "This section has been deprecated since vX.Y.0. Safe to archive to docs/deprecated/?"
- If approved: move to `docs/deprecated/` archive folder
- Commit: `docs(cleanup): archive [section] to docs/deprecated/`
- Create tracking issue for removal phase

### Phase 3: Removal (version X.Y+2.0+) — requires explicit user approval
- Review archived section; confirm no remaining references or user questions
- Ask final approval before permanent deletion
- Commit: `docs(removal): delete archived [section]`
- Update CHANGELOG under "Removed" section

---

## Key Principle

**Never delete user-facing documentation without explicit approval at two gates:**
1. Cleanup gate (phase 2): "Is it safe to archive?"
2. Removal gate (phase 3): "Is it safe to permanently delete?"

Two gates protect against removing content that users or contributors still rely on.

---

## When to Apply

- Any documentation update that replaces an existing pattern, API, or command
- When a command syntax changes (old examples become invalid)
- When an architectural pattern shifts (thick commands → thin commands + agents)
- NOT needed for: typo fixes, clarifications, or additive content

---

## Implementation Location

The full deprecation format, phase descriptions, and approval language are in:
- `commands/update-doc.md` → Step 6b: Deprecation Strategy

---

## Related

- **[[ADR-013-documentation-update-protocol]]:** Documentation Update Protocol
- **Lesson:** Single Source of Truth (DRY) for Documentation

---

## See Also

- [Knowledge Graph: Patterns — Documentation Deprecation Lifecycle](../../knowledge/patterns.md#documentation-deprecation-lifecycle-deprecate--archive--remove)

---

**Category:** process
**Status:** Implemented in update-doc command (v0.2.1-beta)
**Last Updated:** 2026-03-28
