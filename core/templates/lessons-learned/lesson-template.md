---
# ====================
# YAML FRONTMATTER - Metadata for this lesson
# Fields marked [AUTO] are filled by /kg-sis:capture-lesson command
# Fields marked [MANUAL] require you to fill them in
# ====================

title: "Lesson: [Title]"  # [MANUAL] Short descriptive title (e.g., "Lesson: Database Connection Pooling")

created: YYYY-MM-DDTHH:MM:SSZ  # [AUTO] Timestamp when lesson was created (ISO 8601 format: 2024-01-15T14:30:00Z)

author: [Your Name]  # [AUTO] Filled from git config user.name

email: [Your Email]  # [AUTO] Filled from git config user.email

git:  # [AUTO] All git metadata detected automatically
  branch: [branch-name]  # Current git branch (e.g., feature/add-pooling)
  commit: [commit-hash]  # Latest commit SHA (e.g., a1b2c3d)
  pr: [pr-number or null]  # PR number if branch named like "feature/123-title", otherwise null
  issue: [issue-number or null]  # Issue number if branch named like "issue/456-bug", otherwise null

sources:  # [MANUAL] External articles/docs consulted (optional, delete if not used)
  - url: "https://example.com/article"  # Full URL to source
    title: "Article Title"  # Title of article/documentation
    accessed: "YYYY-MM-DD"  # Date you accessed it (format: 2024-01-15)
    context: "Used for [specific insight]"  # Why you referenced this source

tags: []  # [MANUAL] Custom tags for searching (e.g., [database, performance, postgresql])

category: [architecture|process|patterns|debugging]  # [AUTO-SUGGEST] Command suggests, you can override
# - architecture: System design, component structure
# - process: Workflow improvements, tools, procedures
# - patterns: Reusable design patterns, best practices
# - debugging: Troubleshooting, bug fixes, investigations
---

# Lesson Learned: [Title]

**Date:** YYYY-MM-DD
**Category:** [architecture|process|patterns|debugging]
**Version:** 1.0

---

## Problem

[Describe the specific problem encountered]

**Context:**
- [Project or feature area]
- [Triggering conditions]
- [Initial symptoms]

**Impact:**
- [How this affected the project]
- [Who was affected]
- [Severity level]

---

## Root Cause

[Explain why the problem happened]

**Analysis:**
1. [Contributing factor 1]
2. [Contributing factor 2]
3. [Root cause identification]

**Evidence:**
- [Data or observations that led to this conclusion]
- [Debugging steps taken]

---

## Solution

[Describe how the problem was solved]

### Implementation

**Approach:**
[High-level solution strategy]

**Key Components:**
1. [Component 1 description]
2. [Component 2 description]
3. [Component 3 description]

**Code Changes:**
```language
[Example code snippets if applicable]
```

**Configuration:**
```yaml
[Example configuration if applicable]
```

---

## Verification

[How the solution was validated]

**Test Cases:**
1. [Test case 1]
2. [Test case 2]

**Results:**
- [Before measurements]
- [After measurements]
- [Success criteria met]

---

## Prevention System

[How to prevent this problem in the future]

**Immediate Prevention:**
- [Automated checks added]
- [Validation added]
- [Documentation updated]

**Systematic Prevention:**
- [Process changes]
- [Architecture changes]
- [Monitoring added]

---

## Replication Pattern

[Abstract pattern for applying this solution elsewhere]

### For Other Projects

**When to Apply:**
- [Trigger condition 1]
- [Trigger condition 2]

**Universal Pattern:**
1. [Step 1 — abstract, no project specifics]
2. [Step 2 — abstract, no project specifics]
3. [Step 3 — abstract, no project specifics]

**Customization Points:**
- [What to adapt for different contexts]
- [What to keep universal]

### Example Application

**Scenario:** [Generic scenario description]

**Implementation:**
```language
[Generic code example]
```

---

## External References

Sources consulted while solving this problem:

- **[Article Title](https://example.com/article)** — Accessed: YYYY-MM-DD
  - Context: Used for understanding [specific concept]
  - Key insight: [What we learned from this source]

- **[Documentation Page](https://docs.example.com/page)** — Accessed: YYYY-MM-DD
  - Context: Referenced for [specific implementation detail]
  - Key insight: [What we learned from this source]

---

## Related Documentation

**Knowledge Graph:**
- [Link to KG entry](../../knowledge/file.md#section) — [Brief context]

**Architecture Decisions:**
- [Link to ADR](../../decisions/ADR-XXX.md) — [Decision context]

**Other Lessons:**
- [Link to related lesson](./category/Other_Lesson.md) — [Relation]

**Meta-Issues:**
- [Link to meta-issue](../../issues/meta-issue-name/) — [Context if part of larger investigation]

---

## Lessons & Takeaways

**Key Insights:**
1. [Insight 1]
2. [Insight 2]
3. [Insight 3]

**What Worked:**
- [Success factor 1]
- [Success factor 2]

**What Didn't Work:**
- [Failed approach 1]
- [Failed approach 2]

**If We Had to Do It Again:**
- [What we'd change]
- [What we'd keep the same]

---

**Version:** 1.0
**Created:** YYYY-MM-DD
**Last Updated:** YYYY-MM-DD

