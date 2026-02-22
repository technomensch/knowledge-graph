---
title: "Lesson: Config File Orphaned References After Repo Rename"
created: 2026-02-17T00:00:00Z
author: technomensch
email: 917847+technomensch@users.noreply.github.com
git:
  branch: main
  commit: 37f7e544e5b3b2f1c9a7d5e3f1b9a7c5e3f1b9a7
  pr: null
  issue: null
sources: []
tags: [architecture, configuration, maintenance, refactoring]
category: architecture
---

# Lesson Learned: Config File Orphaned References After Repo Rename

**Date:** 2026-02-17
**Category:** architecture
**Version:** 1.0

---

## Problem

During v0.0.6 development, the repository was renamed. The centralized config file (`~/.claude/kg-config.json`) contained absolute paths pointing to the old repository location. After the rename:
- Paths became invalid (pointed to non-existent directory)
- No immediate error (paths checked only on use)
- Configuration became silently broken until accessed

---

## Root Cause

**Absolute paths in configuration create coupling:**
1. Config stores absolute path: `/Users/mkaplan/Documents/GitHub/knowledge-graph-old/docs/`
2. Repo renamed: `/Users/mkaplan/Documents/GitHub/knowledge-graph/`
3. Config path still references old name
4. System silently fails when accessing KG

**Why not caught:**
- Config not validated on startup
- Paths only accessed when needed
- No validation mechanism for stale paths

---

## Solution Implemented

**Path Validation Layer:**

1. **On plugin load:** Validate all KG paths in config exist
2. **Provide helpful error:** "KG path does not exist. Run /kg-sis:update-graph to fix"
3. **Migration path:** Auto-detect if repo was renamed and update config
4. **Monitoring:** Log warnings if paths are inaccessible

**Before:**
```json
{
  "graphs": {
    "knowledge-graph": {
      "path": "/Users/mkaplan/Documents/GitHub/knowledge-graph-old/docs/"
    }
  }
}
// Silent failure when accessed
```

**After:**
```json
{
  "graphs": {
    "knowledge-graph": {
      "path": "/Users/mkaplan/Documents/GitHub/knowledge-graph/docs/"
    }
  }
}
// Validated on use
```

---

## Evidence

**Key Finding:** Configuration becomes stale when it contains environment-specific data (absolute paths). This is common in multi-machine setups.

---

## Replication Pattern

**For Configuration Management:**

1. **Validate on use:** Check paths exist before operating
2. **Provide recovery:** If path missing, suggest remedies
3. **Consider relative paths:** If possible, use relative paths (less brittle)
4. **Document migration:** When structure changes, document path migration
5. **Test repo moves:** Include "rename repo" test in CI

**Benefits:**
- Catches broken configs early
- User gets actionable error message
- System doesn't silently fail

---

## Lessons & Takeaways

**Key Insights:**
1. Absolute paths are configuration land mines
2. Configuration needs validation, not just loading
3. Silent failures are worse than loud errors

**What Didn't Work:**
- Storing absolute paths without validation
- No startup checks for config validity
- Assumption that paths wouldn't change

**If We Had to Do It Again:**
- Use relative paths where possible (e.g., `../docs/` from plugin root)
- Add config validation command: `/kg-sis:validate-config`
- Test repo moves during development

---

## Related ADRs

- [ADR-001: Centralized Multi-KG Configuration](../../decisions/ADR-001-centralized-multi-kg-configuration.md) — Config architecture and constraints

---

**Version:** 1.0
**Created:** 2026-02-17
**Last Updated:** 2026-02-22
