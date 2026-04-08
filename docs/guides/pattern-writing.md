---
id: pattern-writing
title: Write a High-Quality Pattern Entry
sidebar_label: Pattern writing
description: How to structure a reusable pattern entry in the knowledge graph
---

# Write a High-Quality Pattern Entry

## Goal

Produce a pattern entry that any team member can apply without revisiting the original problem. A well-formed pattern generalizes a solved problem into a named, reusable solution — it is not a retelling of a single incident.

---

## Patterns vs. Lessons

| Dimension | Lesson | Pattern |
|---|---|---|
| Scope | A specific incident | A recurring class of problems |
| Voice | Narrative ("we found…") | Prescriptive ("when X, do Y") |
| Name | Descriptive title | A noun phrase that names the technique |
| Reuse | Documents what happened | Guides future decisions |

A lesson is raw material. A pattern is the distillation. Use `/kmgraph:capture-lesson --category patterns` when the insight applies beyond the incident that produced it.

**Example:**
- Lesson: "CI builds failed because the connection pool was exhausted by parallel runners."
- Pattern: **Connection Pooling** — maintain a shared pool of reusable connections; do not allocate one connection per request.

---

## Prerequisites

- The user has a configured knowledge graph (`/kmgraph:status` shows an active graph).
- The pattern has been observed at least once and has a clear problem–solution pair.
- The user can state the pattern name in a noun phrase (e.g., "Retry with Exponential Backoff").

---

## Steps

### 1. Identify whether the entry qualifies as a pattern

A pattern entry is appropriate when all of the following are true:

- The same problem can recur in different contexts or projects.
- The solution is transferable without deep rework.
- The insight is not obvious from standard documentation.

If any condition fails, create a lesson instead (see [PATTERNS-GUIDE](../reference/PATTERNS-GUIDE.md)).

### 2. Name the pattern

Choose a noun phrase that describes the technique, not the symptom:

- **Good:** "Connection Pooling", "Retry with Exponential Backoff", "Centralized Resource Pooling"
- **Weak:** "Fix for CI timeouts", "What we did with Postgres"

The name is the primary search key. It must be recognizable out of context.

### 3. Fill in the pattern template

```markdown
## [Pattern Name]

**Problem:** [One sentence. What recurring situation does this solve?]

**Solution:** [One sentence. What is the canonical response?]

**When to use:**
- [Trigger condition 1]
- [Trigger condition 2]

**Quick Reference:**
- [Key configuration value or threshold]
- [Key constraint or warning]
- [Monitoring recommendation]

**Cross-References:**
- **Lesson:** [[path/to/originating-lesson.md]]
- **ADR:** [[path/to/related-adr.md]]
```

Every field is required. A missing "When to use" section is the most common reason a pattern becomes useless six months later.

### 4. Capture the pattern

Run the capture command, specifying the `patterns` category:

```bash
/kmgraph:capture-lesson --category patterns
```

When prompted, provide the pattern name as the title and paste the filled template as the body. The command will write the entry to the active knowledge graph and index it for full-text search.

### 5. Link the originating lesson

If the pattern was derived from a specific lesson, open that lesson file and add a cross-reference in its `Cross-References` section:

```markdown
## Cross-References
- **Pattern:** [[patterns/connection-pooling.md]]
```

Bidirectional linking is required for the graph traversal in `/kmgraph:recall` to surface the connection.

---

## Verify

After capture, confirm the entry is searchable and well-formed:

1. Run `/kmgraph:recall [pattern name]` — the new entry should appear in results.
2. Open the captured file and check:
   - All five template fields are present and non-empty.
   - "When to use" has at least two specific trigger conditions.
   - "Cross-References" links resolve to real files.
   - The pattern name appears in the file's heading (used by graph indexing).
3. If the originating lesson exists, open it and confirm the back-link is in place.

---

## Good pattern vs. weak pattern

**Weak pattern entry:**

```markdown
## Performance Fix

**Problem:** Things were slow.
**Solution:** We made it faster.
**When to use:** When slow.
**Quick Reference:** (none)
**Cross-References:** (none)
```

Problems: vague problem statement, no trigger conditions, no actionable reference, no links.

**Strong pattern entry:**

```markdown
## Connection Pooling

**Problem:** Creating a new database connection per request is expensive
and fails under concurrent load.

**Solution:** Maintain a shared pool of pre-allocated connections;
application instances borrow from and return to the pool.

**When to use:**
- Application handles >100 requests/second
- Database connection overhead is measurable (>5ms per request)
- Connection limit constraints exist at the database layer

**Quick Reference:**
- Pool size: 10–20 per application instance
- Idle timeout: 30–60 seconds
- Max wait time: 5–10 seconds
- Monitor: pool utilization, wait time, timeout errors

**Cross-References:**
- **Lesson:** [[debugging/ci-connection-pool-exhaustion.md]]
- **ADR:** [[decisions/ADR-012-pgbouncer.md]]
```

The strong version names a specific condition, states a testable solution, gives numeric guidance, and links to the evidence.

---

## Linking patterns to related lessons

Patterns and lessons form a two-way reference network. Maintain links in both directions:

- In the **pattern file**: list every lesson that instantiates or informs the pattern under `Cross-References`.
- In each **lesson file**: list the derived pattern under its `Cross-References` section.

This enables `/kmgraph:recall` and `/kmgraph:update-graph` to traverse the network and surface related knowledge automatically.

Use the wiki-link format `[[relative/path.md]]` for all internal references. Absolute URLs and bare filenames are not indexed by the graph traversal engine.

---

## Next steps

- Run `/kmgraph:update-graph` to extract the new pattern into `MEMORY.md` so it is available at the next session start.
- If the pattern influenced an architecture decision, create a companion ADR with `/kmgraph:create-adr` and link it in the pattern's `Cross-References`.
- Review the [PATTERNS-GUIDE](../reference/PATTERNS-GUIDE.md) for the full lesson and ADR templates, the review checklist, and examples of common mistakes.
