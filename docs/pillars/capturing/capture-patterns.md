---
title: Capture Patterns
category:
  uri: capturing
position: 3
slug: pillars-capturing-capture-patterns
parent:
  uri: pillars-capturing-index
---

# Capture Patterns

> "I keep solving the same class of problem. How do I turn that into something reusable?"

A pattern generalizes a solved problem into a named, reusable solution. Use it when the same class of problem can recur — not just to document a single incident.

## Patterns vs. lessons

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

## The command

A pattern entry is appropriate when all of the following are true:

- The same problem can recur in different contexts or projects.
- The solution is transferable without deep rework.
- The insight is not obvious from standard documentation.

If any condition fails, create a lesson instead.

You've observed the problem at least once and can name the solution in a noun phrase — then run:

```bash
/kmgraph:capture-lesson --category patterns
```

When prompted, provide the pattern name as the title and paste the filled template as the body. The command will write the entry to the active knowledge graph and index it for full-text search.

Confirm with `/kmgraph:recall [pattern name]` — the entry should appear.

## Name the pattern

Choose a noun phrase that describes the technique, not the symptom:

- **Good:** "Connection Pooling", "Retry with Exponential Backoff", "Centralized Resource Pooling"
- **Weak:** "Fix for CI timeouts", "What we did with Postgres"

The name is the primary search key. It must be recognizable out of context.

## Template

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

## Link the lesson

If the pattern was derived from a specific lesson, open that lesson file and add a cross-reference in its `Cross-References` section:

```markdown
## Cross-References
- **Pattern:** [[patterns/connection-pooling.md]]
```

Bidirectional linking is required for the graph traversal in `/kmgraph:recall` to surface the connection. Maintain links in both directions: in the **pattern file**, list every lesson that instantiates or informs the pattern under `Cross-References`; in each **lesson file**, list the derived pattern under its `Cross-References` section. Use the wiki-link format `[[relative/path.md]]` for all internal references — absolute URLs and bare filenames are not indexed by the graph traversal engine.

## Related

- [Capture Lessons Learned](./capture-lessons-learned.md) — the foundational capture flow
- [Architecture Decisions](./architecture-decisions.md) — when a pattern influences a design choice
- [What to Capture](./what-to-capture.md) — deciding which entry type fits

---

## Reference

### Good pattern vs. weak pattern

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

### STAR format

Structure knowledge narratives to answer:

- **Situation:** What was the context?
- **Task:** What needed to be done?
- **Action:** What did you do?
- **Result:** What happened?

### Review checklist

Before finalizing a pattern (or any knowledge entry):

**Content:**
- [ ] Title is descriptive and searchable
- [ ] Problem/context clearly explained
- [ ] Solution includes enough detail to replicate
- [ ] Key insights explicitly stated
- [ ] Examples included (code, config, diagrams)

**Structure:**
- [ ] Follows template for document type
- [ ] Sections in logical order
- [ ] Headers used for navigation
- [ ] Lists/bullets for scanability

**Connections:**
- [ ] Cross-references to related knowledge
- [ ] Keywords/tags for search
- [ ] Category appropriate
- [ ] Links use correct format (`[[relative/path.md]]`)

**Quality:**
- [ ] Written for future-you (6 months later)
- [ ] Specific enough to be useful
- [ ] Concise enough to be readable
- [ ] Free of sensitive data

### Common mistakes

#### 1. Too abstract

**Weak:**
```markdown
# Lesson: Performance Optimization
We optimized the system and it got faster.
```

**Strong:**
```markdown
# Lesson: Database Query N+1 Problem
Reduced API response time from 5s to 300ms by converting
15 sequential queries to a single JOIN query.
```

#### 2. Missing context

**Weak:**
```markdown
Changed max_connections to 100.
```

**Strong:**
```markdown
Increased PostgreSQL max_connections from 50 to 100.

**Why:** 5 app instances * 20 pool size = 100 connections needed.
**Impact:** Eliminated "too many connections" errors.
```

#### 3. No replication steps

**Weak:**
```markdown
Fixed the bug by adding validation.
```

**Strong:**
```markdown
**Fix:**
1. Add validation schema in `config/validation.js`
2. Import in request handler: `const { validate } = require('./validation')`
3. Call before processing: `if (!validate(req.body)) return 400`
4. Add test in `tests/validation.test.js`
```

#### 4. Weak cross-references

**Weak:**
```markdown
Related to some other docs.
```

**Strong:**
```markdown
## Cross-References
- **Pattern:** [[patterns.md#input-validation]]
- **Gotcha:** [[gotchas.md#validation-bypass]]
- **Related Lesson:** [[debugging/validation-regression.md]]
- **ADR:** [[ADR-008-validation-strategy.md]]
```
