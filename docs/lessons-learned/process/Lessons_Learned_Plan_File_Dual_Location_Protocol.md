---
title: "Lesson: Plan File Dual-Location Protocol"
created: 2026-03-01T12:00:00Z
author: Claude Sonnet 4.6
email: noreply@anthropic.com
git:
  branch: v0.0.8.7.3-alpha-fix-installer-page
  commit: 56b96ea7a7c04b96c7d8e8c0f2d1e3a4
tags:
  - workflow
  - protocol
  - planning
  - claude-code
category: process
---

# Lesson: Plan File Dual-Location Protocol

**Date:** 2026-03-01
**Category:** Process (Development Workflow)
**Duration:** v0.0.10-docs branch implementation session

---

## Problem

During the MkDocs broken links fix implementation (`v0.0.10-docs-grid-cards-format` branch), a protocol violation occurred:

- **What happened:** Exited plan mode (which created `~/.claude/plans/glowing-meandering-kettle.md`), then immediately began implementation WITHOUT creating the corresponding `docs/plans/v0.0.10-docs-fix-broken-core-links.md` file
- **What should have happened:** Both files should exist before code changes begin
- **Impact:** Implementation proceeded without a project-level audit trail. The plan file was created AFTER all steps were completed

**Root question:** "Can you identify why there was no plan created in the docs/plans folder. Doesn't the claude.md file require that?"

---

## Root Cause Analysis

**Misunderstanding of the dual-location system:**

Claude Code's plan mode automatically creates `~/.claude/plans/` files (internal storage). This DOES NOT satisfy the CLAUDE.md protocol requirement for `docs/plans/` files (project-level audit trail).

| Location | Purpose | Automatic? | Persistent? | Committed? |
|----------|---------|-----------|-----------|-----------|
| `~/.claude/plans/` | Internal session storage | ✅ Yes (plan mode exit) | ❌ No (ephemeral) | N/A |
| `docs/plans/` | Project audit trail | ❌ No (must create manually) | ✅ Yes (local) | ❌ No (gitignored) |

**Why the confusion:**
- Two different plan files serve different purposes
- Plan mode completion creates one automatically
- The other must be created explicitly BEFORE implementation
- Both must exist for the complete workflow

---

## Solution Implemented

### Pre-Implementation Checklist

Before starting ANY implementation, verify:

```
☐ Step 1: Exit plan mode
  → Automatically creates ~/.claude/plans/{file}.md

☐ Step 2: Create docs/plans/ file
  → Copy content from ~/.claude/plans/ to docs/plans/
  → Use same naming: v{version}-{description}.md
  → Verify file exists: ls docs/plans/v*

☐ Step 3: Begin implementation (ONLY after Steps 1-2 complete)
  → Start Step 1 of the implementation plan

☐ Step 4: Update checkboxes continuously
  → Mark boxes in docs/plans/{file}.md as steps complete
  → Every 3-5 edits, update progress tracking

☐ Step 5: Verify before closing session
  → All steps checked off OR
  → Clear notes on why incomplete
```

### The Three-File System Explained

**Understanding what exists when:**

| Phase | Status | Details |
|-------|--------|---------|
| **Before plan mode exit** | No files | Only conversation/notes |
| **After plan mode (pre-implementation)** | 1 file: `~/.claude/plans/` | Internal Claude Code file; user-invisible |
| **After docs/plans/ creation** | 2 files: both created | Ready for implementation |
| **During implementation** | 2 files + code changes | docs/plans/ updated with checkboxes |
| **After completion** | 3 files: plan + code + commits | Audit trail is complete |

---

## Prevention System

### For Individual Sessions

Create a **session checklist** before touching any code:

```markdown
# Pre-Implementation Verification (v0.0.10-docs branch)

## Before Step 1 of Implementation
- [ ] Plan mode exited → `~/.claude/plans/` created
- [ ] docs/plans/ file created → `docs/plans/v0.0.10-docs-fix-broken-core-links.md`
- [ ] File verified → `ls docs/plans/v0.0.10*` returns path
- [ ] Commit message drafted (reference plan in message)

## After Implementation (before closing session)
- [ ] All steps marked complete in docs/plans/
- [ ] Final commit includes reference to plan file
- [ ] Session summary created (optional)
```

### For the Project

**Add to CLAUDE.md (when plan section updated):**

```markdown
## Plan File Protocol

Plans exist in TWO locations with different purposes:

1. **~/.claude/plans/** (Internal)
   - Created automatically on plan mode exit
   - Session-specific, ephemeral
   - NOT a substitute for docs/plans/

2. **docs/plans/** (Project Audit Trail)
   - Must be created MANUALLY before implementation
   - Local-only (gitignored but required)
   - Provides persistent implementation record

**Workflow:** Exit plan mode → Create docs/plans/ → THEN implement

See Lessons_Learned_Plan_File_Dual_Location_Protocol.md for full pattern.
```

---

## Replication Pattern

**For any future implementation plan:**

1. **Complete plan mode** normally (generates `~/.claude/plans/{file}.md`)

2. **Immediately create project plan file:**
   ```bash
   # Copy content from internal file to project file
   # File naming: docs/plans/v{version}-{description}.md
   cp ~/.claude/plans/[file] docs/plans/v[version]-[description].md

   # Verify:
   ls docs/plans/v[version]*
   ```

3. **Verify file exists before ANY code changes:**
   ```bash
   # Check it's there
   cat docs/plans/v[version]-[description].md
   ```

4. **ONLY THEN begin implementation**

5. **Update checkboxes as you work** (every 3-5 edits)

6. **Commit with reference to plan:**
   ```bash
   git commit -m "feat(v0.0.10): implement [feature]

   Follows: docs/plans/v0.0.10-[description].md
   Status: Steps 1-5 complete

   Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
   ```

---

## Key Insight

★ Insight ─────────────────────────────────────

Plan mode's automatic file (`~/.claude/plans/`) serves Claude Code's internal needs. The project-level `docs/plans/` serves YOUR audit trail needs. They're complementary, not alternatives. Both must exist before implementation.

The protocol violation wasn't about forgetting a file — it was about misunderstanding that two separate files are required for complete audit tracking.

─────────────────────────────────────────────────

---

## Related Documentation

- **ADR-014:** Maintain Dual Plan File Locations (architectural decision)
- **CLAUDE.md:** Plan File Protocol section
- **MEMORY.md:** Plan File Protocol enforcement rule

---

## Checklist for Similar Problems

When you catch a protocol violation in future work:

- [ ] Identify what protocol was violated
- [ ] Document the root cause (misunderstanding vs. oversight)
- [ ] Create the missing artifact(s) retroactively
- [ ] Add a lesson for the pattern (prevents recurrence)
- [ ] Update CLAUDE.md if the protocol needs clarification
- [ ] Share with team if collaborative project

---

**Category:** process
**Status:** Lesson created from observed protocol violation
**Last Updated:** 2026-03-01
**Version:** 1.0
