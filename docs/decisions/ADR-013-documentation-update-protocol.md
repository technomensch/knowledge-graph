---
title: "ADR-013: Documentation Update Protocol for Multi-Branch Releases"
number: 013
created: 2026-02-27T00:00:00Z
status: "Accepted"
author: "technomensch"
category: "process"
tags: ["documentation", "release-management", "process"]
decision: "Establish two-layer documentation update protocol mandatory for all multi-branch feature releases"
related:
  adrs: [001, 002, 008]
  lessons: ["documentation-update-triggers-multibranchfeatures.md"]
---

# ADR-013: Documentation Update Protocol for Multi-Branch Releases

**Status**: Accepted
**Date**: 2026-02-27
**Category**: Process
**Severity**: Mandatory (All Future Releases)

---

## Context

Knowledge Graph v0.0.10 feature development spans 4 serialized branches (v0.0.10.0-10.3). Despite planning comprehensive documentation updates in v0.0.10.1 ("Step 5"), these updates were deferred to a retroactive final branch (v0.0.10-docs-update-release-sync) because:

1. No explicit trigger mechanism to enforce documentation updates at release end
2. Planned task visibility insufficient to prevent deferral during active development
3. No distinction between "per-feature doc updates" and "comprehensive release sync"

This resulted in:
- Three weeks of delay before documentation matched released features
- User confusion about which features were available in which version
- Inconsistent version numbers across 4 configuration files
- Missing CHANGELOG entries for three weeks post-release

## Decision

Establish **mandatory two-layer documentation update protocol** for all multi-branch releases (v0.0.11 onwards):

### Layer 1: In-Process Updates (Per-Feature-Branch)
**Timing**: When each feature branch is merged to main
**Scope**: Documentation files referencing the feature
**Enforcement**: Feature branch PR review checklist includes: "Documentation files referencing this feature have been updated"
**Owner**: Feature branch author

**Example**: If v0.0.11.1 adds new skills, update GETTING-STARTED.md "Skills and Subagents" section immediately.

### Layer 2: Release Sync (Final-Branch)
**Timing**: After ALL feature branches merged to main (before release tag)
**Scope**: Comprehensive release documentation
**Enforcement**: Separate documented final branch with explicit plan file
**Owner**: Release lead (designated session/developer)

**Branch Name Convention**: `v{major}.{minor}-docs-update-{description}`
**Example**: `v0.0.11-docs-update-release-sync`

**Mandatory Updates**:
- [ ] README.md: version number, feature summary, command count
- [ ] CHANGELOG.md: complete release notes for all v0.0.11.x releases
- [ ] CHEAT-SHEET.md: new commands, updated skill trigger tables, delegation syntax
- [ ] All doc files: version consistency (package.json, plugin.json, mcp-server/package.json, README.md)
- [ ] All doc files: cross-references to new features
- [ ] mkdocs build verification: zero warnings

---

## Rationale

### 1. **Portfolio Quality Requires Completeness**
Every release must present a complete, consistent view to users:
- Updated README (feature summary)
- Updated CHANGELOG (release history)
- Updated CHEAT-SHEET (quick reference)
- Version numbers synchronized across all files
- All documentation builds cleanly

### 2. **Separation of Concerns**
- Feature development and release documentation are distinct concerns
- Creating separate final branch makes release documentation unavoidable
- Layer 1 (per-feature) prevents accumulated doc-drift
- Layer 2 (comprehensive sync) catches integration issues

### 3. **User Empathy**
Users rely on documentation to:
- Discover new features (README feature summary, CHEAT-SHEET new commands section)
- Understand changes (CHANGELOG)
- Know which version they're using (consistent version numbers)
- Find detailed guidance (COMMAND-GUIDE)

Stale documentation erodes trust and increases support burden.

### 4. **Release Discipline**
Making final docs-update a separate branch enforces release discipline. It cannot be forgotten or deferred because:
- It's a documented, visible step
- It's a required PR to main
- It's part of the "definition of done" for a feature series

---

## Consequences

### Positive
- ✅ Consistent, up-to-date user documentation for every release
- ✅ Clear separation between feature work and release work
- ✅ Release quality visible in documentation consistency
- ✅ Reduced user confusion about available features and version identity
- ✅ Portfolio-quality releases that reflect maturity and attention to detail

### Negative
- ❌ Additional branch and PR overhead (one extra branch per release cycle)
- ❌ Release cycle takes longer (documentation sync adds ~30 min per release)
- ❌ Requires discipline to execute both layers consistently

### Mitigation
- Create master plan file BEFORE feature branches start (includes Layer 2 details)
- Add skill trigger to surface: "Documentation sync may be needed" when release appears imminent
- Build pre-commit hook to validate version number consistency
- Include docs-update checklist in release definition of done

---

## Implementation for v0.0.11+

### Master Plan File (Created Before Feature Branches)
```markdown
## v0.0.11 Release Documentation Sync

**Final Branch**: v0.0.11-docs-update-release-sync
**Depends On**: All v0.0.11.0-11.X branches merged to main

### Step 1: README.md
- [ ] Update version: 0.0.11-alpha
- [ ] Add feature summary (skills, subagents, etc.)
- [ ] Update command count if changed

### Step 2: CHANGELOG.md
- [ ] Add v0.0.11-alpha entry with date
- [ ] Document each v0.0.11.x release
- [ ] List all features, fixes, and documentation changes

### Step 3: CHEAT-SHEET.md
- [ ] Add new commands to "I Want To..." section
- [ ] Update skill trigger tables if new skills added
- [ ] Add delegation syntax examples for new subagents

### Step 4: Version Consistency
- [ ] Verify package.json version = 0.0.11-alpha
- [ ] Verify plugin.json version = 0.0.11-alpha
- [ ] Verify mcp-server/package.json version = 0.0.11-alpha
- [ ] Verify README.md version line = 0.0.11-alpha

### Step 5: All Doc Files
- [ ] COMMAND-GUIDE.md: version updated, new commands documented
- [ ] CONCEPTS.md: version updated
- [ ] GETTING-STARTED.md: version updated, new skills/subagents documented
- [ ] STYLE-GUIDE.md: version updated

### Step 6: Build Verification
- [ ] mkdocs build produces zero warnings
- [ ] All links verified working
- [ ] No 404 errors in documentation

### Step 7: Release
- [ ] Create PR for docs-update-release-sync
- [ ] Merge to main with admin privileges
```

### Per-Feature-Branch PR Review Checklist
Add to GitHub PR template for feature branches:
```markdown
## Documentation
- [ ] Documentation files referencing this feature have been updated
  - [ ] GETTING-STARTED.md (if new skills, subagents, or user-facing changes)
  - [ ] COMMAND-GUIDE.md (if new commands or significant changes)
  - [ ] CHEAT-SHEET.md (if new commands or trigger patterns)
  - [ ] Other affected docs (CONCEPTS.md, CONFIGURATION.md, etc.)
```

---

## Related Decisions

- **ADR-001**: Centralized multi-KG configuration (architecture foundation for doc consistency)
- **ADR-002**: Commands vs skills architecture (determines which doc sections update)
- **ADR-008**: Third-person language standard (applies to all documentation)
- **ADR-009**: Three-tier installation architecture (informs INSTALL.md updates)

## Lessons Learned

- [Documentation Update Triggers in Multi-Branch Feature Development](../lessons-learned/process/documentation-update-triggers-multibranchfeatures.md)

---

## Decision Authority

This decision is mandatory for all releases starting with **v0.0.11-alpha** and later.

**Enforcement**:
- Master plan file must be created before feature branches start
- Release lead must confirm both Layer 1 and Layer 2 updates before release tag
- No release can be tagged without passing release documentation checklist

---

**Created**: 2026-02-27
**Status**: Accepted
**Applies To**: v0.0.11 onwards
**Review Date**: 2026-06-27 (after v0.0.11 release to evaluate effectiveness)
