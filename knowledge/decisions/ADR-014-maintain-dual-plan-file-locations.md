---
title: "ADR-014: Maintain Dual Plan File Locations"
number: 014
created: 2026-03-01T12:00:00Z
status: Accepted
author: Claude Sonnet 4.6
email: noreply@anthropic.com
git:
  branch: v0.0.8.7.3-alpha-fix-installer-page
  commit: 56b96ea7a7c04b96c7d8e8c0f2d1e3a4
  pr: null
  issue: null
implements: null
related:
  adrs: []
  lessons:
    - lessons-learned/process/Lessons_Learned_Plan_File_Dual_Location_Protocol.md
  kg_entries: []
tags:
  - process
category: process
---

# ADR-014: Maintain Dual Plan File Locations

**Status:** Accepted
**Decided:** 2026-03-01
**Category:** Process (Development Workflow)

---

## Context

Claude Code plan mode automatically generates `~/.claude/plans/` files when exiting plan mode. However, the project's CLAUDE.md protocol requires a separate `docs/plans/` file to exist BEFORE implementation begins.

These serve different purposes:
- `~/.claude/plans/` — Internal to Claude Code; ephemeral; session-specific
- `docs/plans/` — Project audit trail; local-only; required before code changes

A protocol violation occurred during `v0.0.10-docs` branch implementation when code changes began without creating the project-level plan file in `docs/plans/`. This demonstrates the need for explicit architectural guidance on managing both locations.

---

## Decision

**Establish and maintain the dual-location plan file system as follows:**

1. **~/.claude/plans/** continues as the automatic internal storage created by Claude Code plan mode
2. **docs/plans/** becomes the mandatory project-level audit trail that MUST be created immediately after plan mode exit, BEFORE any implementation begins
3. Both files are treated as required for complete implementation tracking
4. The workflow is: Exit plan mode → Create docs/plans/ → THEN implement

---

## Rationale

### Why Dual Locations Solve the Problem

| Concern | Solution |
|---------|----------|
| Session continuity | `~/.claude/plans/` provides session-to-session context (ephemeral) |
| Project audit trail | `docs/plans/` provides persistent record of implementation intent (local, gitignored) |
| Cross-session knowledge | Both enable picking up work in future sessions with clear intent |
| Checklist enforcement | `docs/plans/` checkboxes track progress; `~/.claude/plans/` only provides reference |

### Why Not Consolidate Into One File?

**Alternatives considered:**
- Use only `~/.claude/plans/` — Would lose persistent local record; no project visibility
- Use only `docs/plans/` — Would duplicate plan mode's work; no session continuity in Claude Code
- Share via git commits — Would commit local planning details; violates gitignore strategy

**Why dual locations is best:**
- Respects each system's strengths (Claude Code's internal storage vs. project-level audit)
- Enables both session continuity AND project documentation
- Fits existing gitignore strategy (plans are local-only)
- Minimal overhead (copy operation ~30 seconds per session)

### Key Trade-Offs Accepted

✅ **Benefits:**
- Complete audit trail for implementation decisions
- Clear procedure prevents protocol violations
- Session-to-session continuity preserved
- No git commit pollution (files are gitignored)

❌ **Costs:**
- One additional manual step (copy plan to docs/plans/) per implementation
- Requires explicit pre-implementation checklist
- Small context overhead in CLAUDE.md to document both locations

---

## Consequences

### Positive Impacts

✅ **Protocol compliance:** Explicit dual-location system matches CLAUDE.md requirements
✅ **Audit trail:** Project maintains local record of implementation plans (even if not committed)
✅ **Prevention:** Protocol violations (code without plan) become visible by missing docs/plans/ file
✅ **Clarity:** Developers understand why two plan files exist and serve different purposes
✅ **Continuity:** Multi-session work can reference the original plan document

### Negative Impacts

❌ **Manual overhead:** Requires explicit file copy (mitigated by pre-implementation checklist)
❌ **Documentation burden:** Must explain dual-location system in CLAUDE.md and onboarding

### Mitigation Strategies

**For manual overhead:**
- Add step to pre-implementation checklist
- Keep process simple: `cp ~/.claude/plans/[file] docs/plans/`
- Automate via pre-commit hook (future enhancement)

**For documentation burden:**
- Add "Plan File Protocol" section to CLAUDE.md
- Link to Lessons_Learned_Plan_File_Dual_Location_Protocol.md
- Update project onboarding documentation

---

## Implementation Notes

### Pre-Implementation Checklist (Required)

Before starting ANY code changes:

```
☐ Exit plan mode → ~/.claude/plans/ created
☐ Create docs/plans/ → cp ~/.claude/plans/[file] docs/plans/v[version]-[description].md
☐ Verify file exists → ls docs/plans/v[version]*
☐ ONLY THEN begin implementation
☐ Update checkboxes in docs/plans/ as steps complete
```

### File Naming Convention

- **Internal:** `~/.claude/plans/{auto-generated-name}.md`
- **Project:** `docs/plans/v{version}-{description}.md`
- **Example:** `docs/plans/v0.0.10-docs-fix-broken-core-links.md`

### Version Number Alignment

The version in docs/plans/ filename should match the branch/feature version:
- Branch: `v0.0.10-docs-grid-cards-format`
- Plan file: `docs/plans/v0.0.10-docs-grid-cards-format.md`

---

## Related Decisions

- **ADR-013:** Documentation Update Protocol (plans must document changes)
- **ADR-010:** Namespace Rename (governance for renaming protocols)

---

## Related Lessons Learned

- **Lessons_Learned_Plan_File_Dual_Location_Protocol.md** — Full pattern with examples and prevention checklist

---

## Verification

This decision is verified by:

1. **Presence of docs/plans/ file** — Before implementation begins, file must exist
2. **Checkbox updates** — docs/plans/ file shows progress (checked off as steps complete)
3. **Commit messages** — Reference to docs/plans/ file in commit messages
4. **No protocol violations** — Future implementations should not skip docs/plans/ creation

---

## Questions for Implementation

- Should docs/plans/ creation be automated in a pre-commit hook? (Deferred to v0.0.11)
- Should plan file metadata be tracked in a database? (Deferred to future; currently file-based)
- Should plans be synced to knowledge graph? (Deferred; currently local-only)

---

**Created:** 2026-03-01
**Status:** Accepted
**Category:** Process
**Implementation reference:** v0.0.10-docs-fix-broken-core-links.md (first plan using dual-location system)
