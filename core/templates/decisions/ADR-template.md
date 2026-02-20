---
# ====================
# YAML FRONTMATTER - Metadata for this ADR
# NOTE: No auto-fill commands yet - future /knowledge:create-adr will use this
# Fields marked [FUTURE-AUTO] will be auto-filled when command is built
# Fields marked [MANUAL] require you to fill them in
# ====================

title: "ADR-XXX: [Title of Decision]"  # [MANUAL] Sequential number and descriptive title (e.g., "ADR-001: Use PostgreSQL for Primary Database")

number: XXX  # [FUTURE-AUTO] ADR sequential number (e.g., 001, 002) - will auto-increment

created: YYYY-MM-DDTHH:MM:SSZ  # [FUTURE-AUTO] Timestamp when ADR was created (ISO 8601 format: 2024-01-15T14:30:00Z)

status: [Proposed|Accepted|Deprecated|Superseded]  # [MANUAL] Current decision status

author: [Your Name]  # [FUTURE-AUTO] Filled from git config user.name

email: [Your Email]  # [FUTURE-AUTO] Filled from git config user.email

git:  # [FUTURE-AUTO] All git metadata detected automatically
  branch: [branch-name]  # Current git branch (e.g., feature/add-postgres)
  commit: [commit-hash]  # Latest commit SHA (e.g., a1b2c3d)
  pr: [pr-number or null]  # PR number if branch named like "feature/123-title", otherwise null
  issue: [issue-number or null]  # Issue number if branch named like "issue/456-bug", otherwise null

implements: [version or null]  # [MANUAL] Optional: Version or feature this applies to (e.g., "v2.0.0")

related:  # [MANUAL] Optional: Links to related ADRs, lessons, KG entries
  adrs: []  # List of related ADR numbers (e.g., [1, 3, 5])
  lessons: []  # Links to lessons-learned files
  kg_entries: []  # Links to knowledge graph entries

tags: []  # [MANUAL] Custom tags for searching (e.g., [database, architecture, postgresql])

category: [architecture|process|technology]  # [MANUAL] Decision category
# - architecture: System design, component structure, patterns
# - process: Development workflow, team processes, procedures
# - technology: Tool selection, framework choices, infrastructure
---

# ADR-XXX: [Title of Decision]

**Date:** YYYY-MM-DD
**Status:** [Proposed | Accepted | Deprecated | Superseded]
**Implements:** [Version or feature if applicable]
**Related:** [Links to related ADRs, lessons, KG entries]

---

## Context

[Describe the situation that requires a decision]

**Problem:**
- [What needs to be decided]
- [Why it matters]
- [Who is affected]

**Scope:**
- [What's in scope]
- [What's out of scope]
- [Constraints or limitations]

---

## Decision

[State the decision clearly and concisely]

### Core Components

1. **[Component 1]:** [Description]
2. **[Component 2]:** [Description]
3. **[Component 3]:** [Description]

### Implementation Approach

[How this decision will be implemented]

---

## Rationale

[Explain why this decision was made]

### Why This Approach

1. **[Reason 1]:** [Explanation]
2. **[Reason 2]:** [Explanation]
3. **[Reason 3]:** [Explanation]

### Alternatives Considered

**Option A: [Name]**
- Pros: [List]
- Cons: [List]
- Rejected because: [Reason]

**Option B: [Name]**
- Pros: [List]
- Cons: [List]
- Rejected because: [Reason]

### Trade-offs

**Benefits:**
- ✅ [Benefit 1]
- ✅ [Benefit 2]

**Costs:**
- ❌ [Cost 1]
- ❌ [Cost 2]

**Mitigation:**
- [How costs are mitigated]

---

## Consequences

[Describe the impact of this decision]

### Positive

1. **[Impact 1]:** [Description]
2. **[Impact 2]:** [Description]

### Negative

1. **[Impact 1]:** [Description]
2. **[Impact 2]:** [Description]

### Neutral

1. **[Change 1]:** [Description]

---

## Implementation

**Timeline:** [When this was/will be implemented]

**Affected Components:**
- [Component 1]
- [Component 2]

**Migration Path:**
[If applicable, how to transition from old approach]

---

## Validation

**Success Criteria:**
- [Criterion 1]
- [Criterion 2]

**Metrics:**
- [Metric 1]: [Target value]
- [Metric 2]: [Target value]

**Review Date:** [Date to reassess this decision]

---

## Related Decisions

- **[ADR-XXX](ADR-XXX-title.md):** [Relationship]
- **[ADR-XXX](ADR-XXX-title.md):** [Relationship]

---

## Related Documentation

**Knowledge Graph:**
- [Link to KG entry](../knowledge/file.md#section) — [Context]

**Lessons Learned:**
- [Link to lesson](../lessons-learned/category/lesson.md) — [Context]

**Implementation:**
- [Link to code, config, or documentation]

---

## Future Considerations

1. **[Consideration 1]:** [What might change this decision]
2. **[Consideration 2]:** [Monitoring needed]

---

**Decision Made:** YYYY-MM-DD
**Last Updated:** YYYY-MM-DD
**Status:** [Current status]

