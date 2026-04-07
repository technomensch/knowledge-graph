---
title: "Lesson: Identifier Decoupling (The Serial ID Drift)"
created: 2026-01-29T09:00:00Z
author: "Example User"
git:
  branch: null
  commit: null
  pr: null
  issue: null
sources:
  - url: "https://en.wikipedia.org/wiki/System_of_record"
    title: "System of Record (Wikipedia)"
    accessed: "2026-01-29"
    context: "Defining the boundary between local and external platform identifiers"
tags: ["#identifiers", "#decoupling", "#drift", "#best-practices"]
category: process
---

# Lesson Learned: Identifier Decoupling (The Serial ID Drift)

**Date:** 2026-01-29
**Category:** Process
**Tags:** #governance #identifiers #platform-drift #mapping

---

## Problem

An AI agent attempted to "realign" local issue folders and branch names to match the platform's issue ID (e.g., GitHub Issue [ISSUE_ID]). This caused **Logical Identifier Drift**, where historical local context (Issue [LOCAL_ID]) was overwritten to satisfy external platform numbering.

**What happened:**
- Local tracking used `[LOCAL_ID]/` directory and `[LOCAL_ID]` branch
- GitHub assigned Issue [ISSUE_ID] (due to intervening PRs, discussions, other issues)
- Agent renamed local `[LOCAL_ID]/` → `[PLATFORM_ID]/` and rebased branch
- Historical references to `[LOCAL_ID]` in docs and commits became broken
- Git blame and log searches for "[LOCAL_ID]" returned nothing

**Impact:**
- Historical audit trail broken
- Cross-references in existing documentation became dead links
- Git history confused (commits reference [LOCAL_ID], directory says [PLATFORM_ID])
- Developer trust in agent governance eroded

---

## Root Cause Analysis

1. **Platform ID Drift:** Platform issue IDs are assigned serially across *all* project artifacts (Issues, PRs, Discussions). They do not represent a logical sequence of internal project tasks.

2. **Assumption of Identity:** The agent assumed a 1:1 "Identity Relationship" between local IDs and platform IDs. In reality, there is only a "Mapping Relationship."

3. **Governance Overreach:** The agent prioritized "Visual Consistency" across platforms over "Logical Persistence" of local documentation.

---

## Solution Implemented: Dual-ID Policy

Shifted from **Identity** (IDs must be the same) to **Mapping** (IDs must be linked).

### 1. Local ID (Logical Source of Truth)

- **Format:** `issue-N` or `ENH-NNN`
- **Purpose:** Logical grouping of files, plans, and branches
- **Constraint:** MUST BE PERSISTENT. Never rename a local folder to match a platform ID.

### 2. Platform ID (External Reference)

- **Format:** `#N` (GitHub), `PROJ-N` (Jira), etc.
- **Purpose:** External tracking and communication

### 3. The Mapping Mandate

```markdown
# In local issue description:
Platform Issue: #[ISSUE_ID]

# In platform issue body:
Local Tracking ID: [LOCAL_ID]
```

Every local issue description MUST have a platform reference field.
Every platform issue body MUST have a local tracking ID field.

---

## Replication Steps

1. **Establish local ID convention:**
   - Choose format: `issue-N`, `ENH-NNN`, `FEAT-NNN`
   - Document in project README or contributing guide

2. **Add mapping fields to templates:**
   ```markdown
   <!-- Issue template -->
   ## Tracking
   - Local ID: issue-XXX
   - Platform Issue: #XXX
   ```

3. **Add governance rule for AI agents:**
   ```markdown
   RULE: Never rename local directories or branches to match platform IDs.
   Local IDs are PERSISTENT. Platform IDs are REFERENCES.
   Use mapping, not identity.
   ```

4. **Create validation check:**
   - Verify local→platform mapping exists
   - Verify platform→local mapping exists
   - Flag any attempted renames as governance violations

---

## Lessons Learned

1. **Don't fight the platform:** Platform IDs will always drift. Don't waste cognitive or operational load trying to align local files to them.

2. **Logical persistence:** The filesystem is the source of truth for the developer; the platform is the source of truth for the community. Use a mapping layer to bridge them.

3. **Stop the drift:** If an agent attempts to rename versioned assets to match an external ID, it is experiencing governance overreach. Block the action.

4. **Identity ≠ Mapping:** Two systems can reference the same work without using the same identifier. This is a fundamental architectural principle.

---

## External References

Sources consulted while solving this problem:

- **[System of Record (Wikipedia)](https://en.wikipedia.org/wiki/System_of_record)** — Accessed: 2026-01-29
  - Context: Establishes the principle that different systems may have different identifiers for the same logical entity.
  - Key insight: Local project structure should maintain its own logical persistence regardless of external platform ID changes.

- **[GitHub API Documentation: Issues](https://docs.github.com/en/rest/issues/issues)** — Accessed: 2026-01-29
  - Context: Researching how GitHub handles issue numbering and migrations.

## Related Documentation

**Knowledge Graph:**
- [Identifier Decoupling](../../knowledge/patterns.md#identifier-decoupling) — The core pattern derived from this lesson.
- [Cross-Referencing](../../knowledge/concepts.md#cross-referencing) — Methods for linking disparate ID systems safely.

---

**Version:** 1.0
**Created:** 2026-01-29
**Last Updated:** 2026-02-13
