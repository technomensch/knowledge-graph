# Issues

**Navigation**: [Home](../../../README.md) > [Getting Started](../../../docs/GETTING-STARTED.md) > [Manual Workflows](../../docs/WORKFLOWS.md) > Templates

Tracking of investigated bugs, defects, and meta-issues.

**Total Issues:** 0
**Last Updated:** [Date]

---

## Open Issues

[Issues with Status: 🟡 OPEN]

---

## All Issues (Chronological)

[Auto-populated when issues are created]

- [issue-1: Title](issue-1/issue-1-description.md) — **Status:** 🟡 OPEN — [Brief description]

---

## Issue Statuses

- **🟡 OPEN:** Under investigation or work items pending
- **✅ RESOLVED:** Fixed — note the version/commit
- **⚪ WITHDRAWN:** No longer applicable

---

## Field Guide

**Header Fields (all manual):**
- `issue-N` - Sequential number, or a descriptive slug for meta-issue sagas (e.g. `sessionstart-hook-path-saga/`)
- `Status` - 🟡 OPEN | ✅ RESOLVED | ⚪ WITHDRAWN
- `Related` - Optional: ENHs or ADRs this issue graduated into

**Content Sections:**
- Description of the defect, with evidence (direct reproduction or code inspection)
- Work items / resolution steps
- Link to the ENH or ADR if the issue graduated into a formal enhancement/decision

**Troubleshooting:**
- Issues are created manually — no auto-fill command yet
- For sequential numbering, check the highest existing `issue-N` folder and add 1
- Meta-issue sagas (multi-attempt investigations) may use a descriptive folder name instead of `issue-N` — see `core/default-templates/meta-issue/` for that structure

---

## Creating a New Issue

1. **Determine next number:** find the highest existing `issue-N` folder and increment (or use a descriptive slug for a meta-issue saga)
2. **Create folder:** `knowledge/issues/issue-N/`
3. **Write the description:** `issue-N/issue-N-description.md`
4. **Update this index:** add entry above
5. **If it graduates into an ENH or ADR:** cross-link forward from this index to that ENH/ADR's index entry

---

## Integration

- **Enhancements:** an issue that reveals a real feature gap becomes an ENH — cross-link from `../enhancements/README.md`
- **Decisions:** an issue that reveals an architectural gap becomes an ADR — cross-link from `../decisions/README.md`
- **Meta-Issues:** complex, multi-attempt investigations use `core/default-templates/meta-issue/` instead of the flat `issue-N` shape

---

## Learn More

**Concepts & Guides**:
- [Concepts Guide](../../../docs/CONCEPTS.md) - Term explanations

**Resources**:
- [Enhancements Index](../enhancements/README.md) - Related ENHs
- [Decisions Index](../decisions/README.md) - Related ADRs
