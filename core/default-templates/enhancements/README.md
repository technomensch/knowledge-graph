# Enhancements (ENH)

**Navigation**: [Home](../../../README.md) > [Getting Started](../../../docs/GETTING-STARTED.md) > [Manual Workflows](../../docs/WORKFLOWS.md) > Templates

Formal tracking of proposed and resolved enhancements.

**Total ENHs:** 0
**Last Updated:** [Date]

---

## Open ENHs

[ENHs with Status: 🟡 Proposed]

---

## All ENHs (Chronological)

[Auto-populated when ENHs are created]

- [ENH-001: Title](ENH-001/ENH-001-specification.md) — **Status:** 🟡 Proposed — [Brief description]

---

## ENH Statuses

- **🟡 Proposed:** Under consideration, not yet implemented
- **✅ Resolved:** Implemented and shipped (note the version, e.g. "Resolved in v0.6.15")
- **⚪ Withdrawn:** Superseded or no longer applicable — link the decision that withdrew it

---

## Field Guide

**Header Fields (all manual):**
- `ENH-NNN` - Sequential number (e.g., ENH-001, ENH-002)
- `Status` - 🟡 Proposed | ✅ Resolved | ⚪ Withdrawn
- `Discovered` - Date the gap/need was found (format: 2026-01-15)
- `Governed by` - Optional: ADR that governs this ENH's scope/approach
- `Related` - Optional: other ENHs, ADRs, issues, or affected files

**Content Sections:**
- **Problem** - What gap or need this ENH addresses, with evidence (direct code/file inspection, not assumption)
- **Proposed Behavior** - What should exist instead
- **Explicitly Out of Scope** - What this ENH deliberately does not cover
- **Affected Files** - Table of files this ENH touches and their role
- **Acceptance Criteria** - Checklist that must be fully checked before marking Resolved

**Troubleshooting:**
- ENHs are created manually — no auto-fill command yet
- For sequential numbering, check the highest existing ENH number (across `knowledge/enhancements/`) and add 1
- Replace all `[bracketed placeholders]` with your content

---

## Creating a New ENH

1. **Determine next number:** find the highest existing `ENH-NNN` folder and increment
2. **Create folder:** `knowledge/enhancements/ENH-NNN/`
3. **Write the spec:** `ENH-NNN/ENH-NNN-specification.md` — Problem, Proposed Behavior, Explicitly Out of Scope, Affected Files, Acceptance Criteria
4. **Link governance:** if an ADR constrains this ENH's approach, set `Governed by`
5. **Update this index:** add entry above, cross-link from `../decisions/README.md` if a `Governed by` relationship exists

---

## Integration

- **Decisions:** ENHs governed by an ADR cross-link both directions (see `../decisions/README.md`)
- **Issues:** an issue that graduates into a real feature gap becomes an ENH — cross-link from `../issues/README.md`
- **Plans:** implementation plans reference their parent ENH in the `Governed by`/`Related` fields

---

## Learn More

**Concepts & Guides**:
- [Concepts Guide](../../../docs/CONCEPTS.md) - Term explanations

**Resources**:
- [Decisions Index](../decisions/README.md) - Related ADRs
- [Issues Index](../issues/README.md) - Related issues
