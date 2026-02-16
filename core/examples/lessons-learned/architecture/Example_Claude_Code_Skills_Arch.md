---
title: "Lesson: Platform Skill Discovery Architecture"
created: 2025-12-28T14:00:00Z
author: "Example User"
git:
  branch: null
  commit: null
  pr: null
  issue: null
sources:
  - url: "https://docs.anthropic.com/en/docs/welcome"
    title: "Anthropic Claude Documentation"
    accessed: "2025-12-28"
    context: "Researching skill discovery behavior and directory scanning"
tags: ["#claude-code", "#skills", "#architecture", "#discovery"]
category: architecture
---

# Lesson Learned: Platform Skill Discovery Architecture

## Problem

Skills/commands placed in organized nested subdirectories weren't appearing in the platform's command menu, despite being properly formatted. This caused:

- Commands silently failing to load (no error messages)
- Confusion about why "working" skills didn't appear
- Wasted time debugging skill syntax when the issue was discovery
- Need to restructure entire skill organization approach

**Specific incident:** Organized 15 skills into logical subdirectories (`governance/`, `knowledge/`, `project/`). None appeared in command menu. Spent 2 hours debugging YAML frontmatter and formatting before discovering the real issue: platform doesn't recursively discover skills.

---

## Root Cause

**Platform constraint:** The skill discovery mechanism enumerates files in a **flat** directory only, without recursion into subdirectories.

**Why this constraint exists:**
- Performance optimization (scanning nested directories on every command lookup would be slow)
- Simplicity of implementation
- Likely to remain unfixed (open feature requests exist but low priority)

**What we expected:**
```
.agent/workflows/
├── governance/
│   ├── validate-branch.md     ← Expected to discover
│   └── validate-commit.md     ← Expected to discover
└── knowledge/
    └── capture-lesson.md       ← Expected to discover
```

**What actually works:**
```
.agent/workflows/
├── gov-validate-branch.md      ← Discovered ✓
├── gov-validate-commit.md      ← Discovered ✓
└── know-capture-lesson.md      ← Discovered ✓
```

---

## Solution Implemented

### Prefix Naming Convention

Replace nested directories with flat structure using prefixes for organization:

**Prefix Strategy:**
- `gov-` → Governance/compliance skills
- `know-` → Knowledge management skills  
- `proj-` → Project-specific skills
- `doc-` → Documentation skills

**Benefits:**
- Works within platform constraints
- Still provides organization (sort by prefix)
- Clear categorization at a glance
- Grep-friendly (`grep "^gov-" *.md`)

### Documentation

Added prominent warning to project README:

```markdown
## ⚠️ Skill Organization Constraint

This platform requires FLAT skill directory structure.
Nested subdirectories are NOT discovered.

Use prefix naming for organization:
- gov-* → Governance skills
- know-* → Knowledge skills
- proj-* → Project skills

Do NOT create subdirectories like governance/ or knowledge/
```

### Migration Script

Created script to help migrate from nested to flat:

```bash
#!/bin/bash
# migrate-skills-to-flat.sh

for file in .agent/workflows/*/*.md; do
  dir=$(basename $(dirname "$file"))
  filename=$(basename "$file")
  
  # Create prefix from directory name
  prefix=$(echo "$dir" | cut -c1-3)
  
  # Move file with prefix
  mv "$file" ".agent/workflows/${prefix}-${filename}"
done

# Remove empty directories
rmdir .agent/workflows/*/
```

---

## Replication Steps

If you encounter skill discovery issues:

1. **Verify platform constraints:**
   - Check documentation for discovery mechanism
   - Test with single skill in root directory
   - Test with skill in subdirectory
   - Confirm whether recursion is supported

2. **If flat structure required:**
   - Design prefix naming convention
   - Document convention in README
   - Create migration script if needed
   - Update all documentation to reflect constraint

3. **Add developer onboarding:**
   - Include constraint in setup docs
   - Add to common gotchas list
   - Show correct example in skill template

4. **Monitor for platform changes:**
   - Watch for feature requests/issues
   - Check release notes for discovery improvements
   - Be ready to refactor if support added

---

## Lessons Learned

### What Worked Well

- **Prefix naming:** Provides same organizational benefit as directories
- **Clear documentation:** Prevents future developers from repeating mistake
- **Migration script:** Made refactoring painless

### What Didn't Work

- **Initial assumption:** Assumed nested directories would "just work"
- **Late discovery:** Should have tested discovery mechanism earlier
- **Silent failure:** Platform gave no error, made debugging difficult

### Key Insights

1. **Test platform constraints early:** Don't assume hierarchical organization works
2. **Flat can be organized:** Prefixes provide structure without nested directories
3. **Document discovered constraints:** Each limitation should become documented wisdom
4. **Silent failures are worst:** At least an error message provides a clue

### Platform-Agnostic Recommendations

When building tools that work across multiple platforms:

- **Assume least common denominator:** Use flat structure everywhere
- **Make organization explicit:** Prefixes, not implicit directory hierarchy
- **Test discovery early:** Don't wait until you have 20 skills
- **Provide migration path:** Script to refactor if constraints change

---

## External References

Sources consulted while solving this problem:

- **[Claude Documentation: Model Context Protocol (MCP)](https://docs.anthropic.com/en/docs/agents-and-tools/mcp)** — Accessed: 2025-12-28
  - Context: Understanding how tools are discovered by the model.
  - Key insight: Skill discovery for this specific platform uses a non-recursive flat scan, necessitating a prefix-based organization strategy.

- **[GitHub: MCP Feature Requests](https://github.com/modelcontextprotocol)** — Accessed: 2025-12-28
  - Context: Checking for known issues regarding nested tool directories.

## Related Documentation

**Knowledge Graph:**
- [Functional Directory Structure](../../knowledge/patterns.md#functional-directory-structure) — Recommended organization for flat discovery.
- [Flat Skill Discovery Constraint](../../knowledge/gotchas.md#flat-skill-discovery-constraint) — Analysis of the underlying platform limitation.

---

**Version:** 1.0
**Created:** 2025-12-28
**Last Updated:** 2026-02-13
