<!--
PLAN TEMPLATE
Naming conventions:
  Feature plan:   v{version}-{description}.md          (e.g., v0.3.0-beta-default-kg-path.md)
  Bugfix plan:    v{version}-fix-{NNN}-{description}.md (e.g., v0.3.0-beta-fix-001-migration-edge-case.md)
  Hotfix plan:    v{version}-hotfix-{NNN}-{description}.md
  Docs-only plan: docs-update-{description}.md

Fields marked [AUTO] are filled by tooling. Fields marked [MANUAL] require human input.
Fields marked [POST] are filled after implementation completes.
-->

---
title: "[MANUAL] Short plan title"
date: YYYY-MM-DD                        # [AUTO] Date plan was written
plan_type: feature                      # [MANUAL] feature | bugfix | hotfix | docs | refactor
status: planned                         # [MANUAL] planned | in-progress | implemented | superseded
version: v0.0.0                         # [MANUAL] Target release version (e.g., v0.3.0-beta)
branch: ""                              # [MANUAL] Git branch for this plan
implemented_in: ""                      # [POST]  Actual version after implementation (may differ from version above)
parent_plan: ""                         # [MANUAL] For bugfix/hotfix: filename of the plan this fixes (e.g., v0.3.0-beta.md)
related_plans: []                       # [POST]  Bugfix/hotfix plans that were spawned from this one
tags: []
---

# Plan: [Title]

**Version:** [Target version]
**Branch:** `[branch-name]`
**Plan type:** [Feature | Bugfix | Hotfix | Docs | Refactor]
**Status:** [Planned | In Progress | Implemented | Superseded]

<!-- For bugfix/hotfix plans, add: -->
<!-- **Fixes:** [parent plan filename] — [one-line description of what broke] -->

---

## Context

[2-4 sentences explaining why this plan exists. For bugfix plans: describe what the original plan got wrong and what the symptom was. For feature plans: describe the gap or opportunity.]

---

## Plan Lineage

<!-- Fill this section when relationships exist. Leave blank for standalone feature plans with no related fixes yet. -->

### Parent Plan
<!-- Bugfix/hotfix plans only. Feature plans: remove this subsection. -->
- [v0.0.0-description.md](../v0.0.0-description.md) — [what this plan is fixing from the parent]

### Related Fix Plans
<!-- Feature plans: list bugfixes spawned from this work (fill post-implementation). -->
<!-- Format: - [v0.0.0-fix-001-description.md] — [what it fixed] — [status: implemented | open] -->
- *(none yet)*

---

## Implementation Sequence

### Phase 1 — [Phase Name]

**File(s):** `path/to/file`

[Description of changes]

**Phase 1 Completion Checklist:**
- [ ] [Task]
- [ ] `/kmgraph:capture-lesson` — [what to capture if non-obvious]

---

### Phase 2 — [Phase Name]

*(add phases as needed)*

---

## Files to Update

| File | Change | Phase |
|---|---|---|
| `path/to/file` | [description] | Phase 1 |

---

## Verification

1. **[Test name]**: [What to do and what to expect]
2. **[Test name]**: [What to do and what to expect]

---

## Scope Boundaries

- [What this plan covers]
- [What this plan explicitly does NOT cover]
- CHANGELOG.md update required before push
- Version bump: list affected version files

---

## Implementation Record

<!-- Fill this section after implementation completes. -->

**Implemented in version:** [e.g., v0.3.0-beta]    <!-- [POST] -->
**Merged via:** [PR #NNN or commit hash]             <!-- [POST] -->
**Date completed:** YYYY-MM-DD                       <!-- [POST] -->

### Deviations from Plan
<!-- What changed during implementation vs. what was written here. -->
- *(none)* — or list changes with reason

### Fix Plans Spawned
<!-- If bugs were found during implementation, list the fix plans created. -->
- *(none)* — or: [v0.0.0-fix-001-description.md] — [what broke]
