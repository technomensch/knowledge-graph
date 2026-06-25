---
title: "Lesson: Template Source Files Should Encode Role, Not Deployed Output Name"

created: 2026-04-09T00:00:00Z

author: technomensch

email: 917847+technomensch@users.noreply.github.com

git:
  branch: v0.3.0-beta
  commit: a6aa52f96da7318e1395ac6c02e686f3a7006700
  pr: null
  issue: null

tags: [templates, naming, core-templates, init, collision, overwrite, patterns, file-naming]

category: patterns
---

# Lesson Learned: Template Source Files Should Encode Role, Not Deployed Output Name

**Date:** 2026-04-09
**Category:** patterns
**Version:** 1.0

---

## Problem

Two template files in `core/templates/knowledge/` were destined for different deployment locations (`$KG_PATH/index.md` and `$KG_PATH/knowledge/index.md`) but shared the same source filename `index.md`. The new Phase 3C template would have silently overwritten the existing KG category navigator template.

**Context:**
- Template files live in `core/templates/knowledge/`
- The existing `index.md` was the KG category navigator, deploying to `$KG_PATH/knowledge/index.md`
- A new root-level KG orientation template also needed to deploy as `index.md`, but to `$KG_PATH/index.md`
- The plan specified "create `core/templates/knowledge/index.md`" — the file already existed with completely different content

**Impact:**
- Silent overwrite of the category navigator template at plan execution time
- Collision was invisible until the plan ran — no naming conflict at the plan-writing stage
- Required halting implementation to update the plan, ADR-028, and session summary before proceeding
- Severity: high — silent data loss of a protected template file

---

## Root Cause

Template source filenames were named after their deployed output name (`index.md`) rather than their role. When a second template needed to deploy as `index.md` to a different location, the collision was invisible until execution time.

**Analysis:**
1. Source filenames in `core/templates/` mirrored deployed output names, not purpose
2. Two different templates can legitimately deploy to the same output filename at different target paths
3. There is no namespace separation between templates targeting different deployment roots
4. The plan author had no way to detect the collision without reading the existing file

**Evidence:**
- Discovered during v0.3.0-beta Phase 3C execution when the plan specified creating `core/templates/knowledge/index.md` and the file already existed
- The existing file was the KG category navigator (`knowledge/index.md`); the new file was a root-level KG orientation page (`index.md`)
- Both legitimate, both needed, completely different content — same source name

---

## Solution

Rename template source files to encode their role, not their deployed output name.

### Implementation

**Rename applied:**
- `core/templates/knowledge/index.md` (KG category navigator) → `core/templates/knowledge/kg-category-index.md`
- New root-level KG orientation template → `core/templates/knowledge/kg-index.md`

**Deploy-time mapping in `commands/init.md`:**
```bash
cp ".../kg-category-index.md" "$KG_PATH/knowledge/index.md"
cp ".../kg-index.md" "$KG_PATH/index.md"
```

Both deploy as `index.md` at their respective targets. The copy command in the init script handles the rename at deploy time — not the source filename.

**General rule:** Template source filenames in `core/templates/` encode their role/purpose. Deployed output names are controlled by the copy command in the init script.

---

## Verification

**Test Cases:**
1. Two templates with different role names both deploy as `index.md` to different paths — no collision
2. Plan says "create `core/templates/knowledge/kg-index.md`" — clearly distinct from `kg-category-index.md`
3. Reviewer reading the plan can distinguish the two files by name alone

**Results:**
- Collision eliminated: role-based names are unique within `core/templates/knowledge/`
- Deployed output names unchanged: both targets still receive `index.md`
- Plan language is unambiguous: two different source names, two different purposes

---

## Prevention System

**Immediate Prevention:**
- When adding any new template to `core/templates/`, ask: "Could another template ever deploy to the same output filename in a different location?"
- If yes, use a role-descriptive source name (e.g., `kg-index.md`, `kg-category-index.md`) rather than the output name
- Update the copy command in `commands/init.md` (and `commands/init-personal-kg.md` if relevant) to map the role name to the correct output name

**Watch for hardcoded loops:**
- `commands/init-personal-kg.md` uses a hardcoded `for f in ...` loop
- If the loop lists template filenames explicitly, a rename requires updating both the file and the loop
- Always grep for the old filename across `commands/` after any template rename

**Systematic Prevention:**
- Treat `core/templates/` source filenames as role identifiers, not output filename mirrors
- Document the source-to-output mapping in the init command's copy block comments
- When writing plans that create templates, include both the source name and the target deploy path to make the distinction explicit

---

## Replication Pattern

This is a **source-name vs. output-name separation** pattern. Template source filenames describe what the template is; deploy-time copy commands describe where it goes.

### How to Apply When Adding a New Template

1. Identify the deployed output filename (e.g., `index.md`)
2. Ask: "Is there already a template in `core/templates/` that deploys to a file with this name at any location?"
3. If yes (or possibly yes): choose a role-descriptive source name instead
4. Add an explicit copy command in `commands/init.md`:
   ```bash
   cp "$TEMPLATE_DIR/role-name.md" "$TARGET_PATH/output-name.md"
   ```
5. If `commands/init-personal-kg.md` has a hardcoded filename loop, update it too

### Example

**Scenario:** Adding a third template that deploys as `index.md` to `$KG_PATH/archive/index.md`

**Wrong approach:**
```
core/templates/knowledge/index.md   ← collision with existing files
```

**Correct approach:**
```
core/templates/knowledge/kg-archive-index.md   ← role-descriptive, unique
```
```bash
cp ".../kg-archive-index.md" "$KG_PATH/archive/index.md"
```

---

## Related Documentation

**Architecture Decisions:**
- ADR-028 — KMGraph knowledge structure and template organization

**Other Lessons:**
- [KMGraph Fingerprint Detection Before Migration](./Lessons_Learned_KMGraph_Fingerprint_Detection_Before_Migration.md) — Related pattern: use specific identifiers rather than generic names to avoid false matches

**Session Reference:**
- knowledge/sessions/2026-04/2026-04-09-v0.3.0-beta-implementation-snapshot.md — Implementation context where collision was discovered

---

## Lessons & Takeaways

**Key Insights:**
1. Source filenames and deployed output filenames serve different purposes — conflating them causes invisible collisions
2. The init script's copy command is the single source of truth for source-to-output mapping
3. Collisions in `core/templates/` are silent and easy to miss at plan-writing time — naming discipline is the only defense

**What Worked:**
- Role-descriptive source names (`kg-category-index.md`, `kg-index.md`) are immediately distinguishable
- The copy command makes the mapping explicit and reviewable

**What Didn't Work:**
- Naming template source files after their output file — works until a second template targets the same output filename at a different path

**If We Had to Do It Again:**
- Establish the role-name convention at the time the first template was added to `core/templates/`
- Include a note in the `core/templates/` directory or init command comments explaining the naming convention

---

**Version:** 1.0
**Created:** 2026-04-09
**Last Updated:** 2026-04-09
