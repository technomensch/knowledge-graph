# Writing Good Knowledge Graph Entries

**Navigation**: [Home](../../README.md) > [Getting Started](../../docs/GETTING-STARTED.md) > Pattern Writing

**Best practices for creating valuable lessons, ADRs, and knowledge graph entries**

---

## General Principles

### 1. Write for Future-You

The person most likely to read your documentation is **you, 6 months from now**. Write as if explaining to someone who knows the project but has forgotten this specific context.

**Good:**
```markdown
# Problem
Authentication tokens were expiring during long-running imports (>1 hour),
causing imports to fail halfway through.
```

**Bad:**
```markdown
# Problem
Tokens expired.
```

### 2. STAR Format (Situation-Task-Action-Result)

Structure narratives to answer:
- **Situation:** What was the context?
- **Task:** What needed to be done?
- **Action:** What did you do?
- **Result:** What happened?

### 3. Searchable Keywords

Include terms future-you will search for:

**Good:**
```markdown
# Lesson: Database Connection Pool Exhaustion

Keywords: connection pool, postgres, max connections, timeouts,
resource exhaustion, ETIMEDOUT
```

Future search: `grep -r "connection pool" docs/` ✅ finds it

### 4. Link Aggressively

Create a web of knowledge:

```markdown
## Cross-References
- **Pattern:** [[patterns.md#connection-pooling]]
- **Related:** [[debugging/timeout-debugging.md]]
- **ADR:** [[ADR-012-postgres-config.md]]
```

---

## Lessons Learned

### Template Structure

```markdown
# Lesson Learned: [Descriptive Title]

**Date:** YYYY-MM-DD
**Category:** architecture/debugging/process/patterns
**Tags:** #tag1 #tag2

## Problem
[What went wrong? Be specific.]

## Root Cause
[Why did it happen? Dig deep.]

## Solution
[How was it fixed? Step-by-step.]

## Replication
[How to implement this solution in future.]

## Lessons Learned
[Key insights, what worked, what didn't.]

## Cross-References
[Links to related knowledge.]
```

### When to Create

✅ **DO create for:**
- Non-trivial problems (took >1 hour to solve)
- Surprising behavior (not obvious from docs)
- Complex multi-step solutions
- Patterns worth reusing

❌ **DON'T create for:**
- Routine tasks
- Obvious solutions
- One-line fixes
- Standard practices

### Writing Tips

**Problem Section:**
- Include symptoms observed
- What you tried that didn't work
- Error messages (relevant parts)

**Root Cause:**
- Don't just describe fix, explain WHY it was needed
- Include debugging steps that revealed cause
- Diagram if helpful

**Solution:**
- Step-by-step instructions
- Code samples (with context)
- Configuration changes (before/after)

**Replication:**
- Make it copy-paste-able for next time
- Include prerequisites
- Mention gotchas

**Example:**

```markdown
## Problem

CI builds failing randomly with "Cannot connect to database" error.
Happened ~20% of builds, no pattern detected. Local builds worked fine.

Tried:
- Restarting CI runner (didn't help)
- Adding retry logic (masked issue, didn't fix)
- Increasing timeout (didn't help)

## Root Cause

CI runners share database connection pool. When multiple builds run
concurrently, they exhaust the connection pool (max 20 connections).

Debugging steps:
1. Checked database logs → saw "too many connections" errors
2. Monitored connection count → spiked during concurrent builds
3. Tested with staggered builds → no failures

## Solution

Increased connection pool size for CI environment:

```javascript
// config/database.ci.js
module.exports = {
  pool: {
    min: 2,
    max: 50,  // was: 20
    acquireTimeoutMillis: 30000
  }
}
```

Deployed: Monitoring shows pool utilization now max 35/50 during peak.

## Replication

For future CI resource issues:
1. Check CI-specific config vs local
2. Monitor resource usage during concurrent runs
3. Scale resources for CI (it's parallel, not sequential)

## Lessons Learned

- CI failures often due to concurrency, not bugs
- Monitor actual resource usage (don't guess)
- CI environment needs more resources than local (parallel execution)
```

---

## Architecture Decision Records (ADRs)

### Template Structure

```markdown
# ADR-NNN: [Decision Title]

**Status:** Accepted/Rejected/Deprecated/Superseded
**Date:** YYYY-MM-DD
**Authors:** [Names/roles]

## Context
[Forces at play, why decision needed]

## Options Considered
[What alternatives were evaluated]

## Decision
[What was chosen and why]

## Consequences
[Positive and negative outcomes]

## Related
[Links to lessons, patterns, other ADRs]
```

### When to Create

✅ **DO create for:**
- Architectural choices affecting multiple components
- Technology selection (framework, database, library)
- Process changes affecting team
- Tradeoff decisions with lasting impact

❌ **DON'T create for:**
- Implementation details (use lessons)
- Temporary solutions
- Obvious choices (no tradeoffs)

### Writing Tips

**Context:**
- Explain the problem requiring decision
- Describe constraints (technical, organizational, time)
- State goals/requirements

**Options:**
- List 2-4 serious alternatives
- Pros/cons for each
- Why obvious choice might NOT be best

**Decision:**
- Which option chosen
- Why this one over others
- What values/priorities drove choice

**Consequences:**
- Positive outcomes expected
- Negative tradeoffs accepted
- Monitoring plan

**Example:**

```markdown
# ADR-012: Database Connection Pooling Strategy

**Status:** Accepted
**Date:** 2024-10-15

## Context

Application experiencing database connection exhaustion under load.
Need to decide on connection management strategy.

Constraints:
- PostgreSQL limit: 100 connections
- 5 application instances
- Peak: 200 concurrent requests

## Options Considered

### Option 1: No Pooling (Status Quo)
**Pros:** Simple, no configuration
**Cons:** Connection per request (expensive), exhausts limit
**Verdict:** ❌ Rejected - doesn't scale

### Option 2: Application-Level Pooling
**Pros:** Full control, language-native
**Cons:** Each instance has separate pool (5 * 20 = 100 connections)
**Verdict:** ⚠️ Works but inefficient

### Option 3: PgBouncer (Connection Proxy)
**Pros:** Centralized pooling, 1000+ client connections → 100 DB connections
**Cons:** Additional infrastructure, single point of failure
**Verdict:** ✅ Chosen

## Decision

Use PgBouncer in transaction pooling mode.

**Why:**
- Centralized pool shared across all instances
- Can support 1000+ client connections with 100 DB connections
- Mature, battle-tested solution
- Minimal application changes

**Configuration:**
```ini
[databases]
myapp = host=postgres port=5432

[pgbouncer]
pool_mode = transaction
max_client_conn = 1000
default_pool_size = 20
reserve_pool_size = 5
```

## Consequences

**Positive:**
- ✅ Scales to 200+ concurrent requests
- ✅ Reduces DB connection overhead
- ✅ Centralized monitoring

**Negative:**
- ❌ Additional infrastructure to maintain
- ❌ Transaction pooling limits (no prepared statements across requests)
- ❌ Requires monitoring PgBouncer health

**Mitigations:**
- Deploy PgBouncer as HA pair (Kubernetes deployment)
- Monitor with Prometheus metrics
- Document transaction pooling limitations

## Review

Revisit if:
- Application instances > 20 (may need larger pool)
- Prepared statements become requirement
- PgBouncer becomes bottleneck

## Related

- **Lesson:** [[debugging/connection-pool-exhaustion.md]]
- **Pattern:** [[patterns.md#centralized-resource-pooling]]
```

---

## Knowledge Graph Entries

### Patterns

```markdown
## Pattern Name

**Problem:** [One-sentence problem description]

**Solution:** [One-sentence solution]

**When to use:** [Trigger conditions]

**Quick Reference:**
- [Bullet points with key facts]

**Cross-References:**
- **Lesson:** [[link]]
- **ADR:** [[link]]
```

**Example:**

```markdown
## Connection Pooling Pattern

**Problem:** Creating database connection per request is expensive and doesn't scale

**Solution:** Maintain pool of reusable connections shared across requests

**When to use:** 
- High-throughput applications (>100 req/sec)
- Database connection overhead noticeable
- Connection limit constraints

**Quick Reference:**
- Pool size: 10-20 per application instance
- Idle timeout: 30-60 seconds
- Max wait time: 5-10 seconds
- Monitor: Pool utilization, wait time, errors

**Cross-References:**
- **Lesson:** [[debugging/connection-pool-exhaustion.md]]
- **ADR:** [[ADR-012-pgbouncer.md]]
```

### Concepts

```markdown
## Concept Name

**Definition:** [Clear, concise definition]

**Why It Matters:** [Importance/value]

**Key Characteristics:**
- [Properties that define this concept]

**Examples:**
- [Real-world examples]

**Cross-References:**
- [Related concepts, patterns, lessons]
```

### Gotchas

```markdown
## Gotcha Name

**Symptom:** [What you observe]

**Gotcha:** [What's actually happening]

**Fix:** [How to solve]

**Why:** [Root cause explanation]

**Cross-References:**
- [Related lessons, patterns]
```

---

## Common Mistakes

### 1. Too Abstract

**Bad:**
```markdown
# Lesson: Performance Optimization
We optimized the system and it got faster.
```

**Good:**
```markdown
# Lesson: Database Query N+1 Problem
Reduced API response time from 5s to 300ms by converting
15 sequential queries to single JOIN query.
```

### 2. Missing Context

**Bad:**
```markdown
Changed max_connections to 100.
```

**Good:**
```markdown
Increased PostgreSQL max_connections from 50 to 100.

**Why:** 5 app instances * 20 pool size = 100 connections needed.
**Impact:** Eliminated "too many connections" errors.
```

### 3. No Replication Steps

**Bad:**
```markdown
Fixed the bug by adding validation.
```

**Good:**
```markdown
**Fix:**
1. Add validation schema in `config/validation.js`
2. Import in request handler: `const { validate } = require('./validation')`
3. Call before processing: `if (!validate(req.body)) return 400`
4. Add test in `tests/validation.test.js`
```

### 4. Weak Cross-References

**Bad:**
```markdown
Related to some other docs.
```

**Good:**
```markdown
## Cross-References
- **Pattern:** [[patterns.md#input-validation]]
- **Gotcha:** [[gotchas.md#validation-bypass]]
- **Related Lesson:** [[debugging/validation-regression.md]]
- **ADR:** [[ADR-008-validation-strategy.md]]
```

---

## Review Checklist

Before finalizing a knowledge entry:

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
- [ ] Links use correct format

**Quality:**
- [ ] Written for future-you (6 months later)
- [ ] Specific enough to be useful
- [ ] Concise enough to be readable
- [ ] Free of sensitive data (see SANITIZATION-CHECKLIST)

---

## MEMORY.md System

### What is MEMORY.md?

A special file that syncs your most important patterns to Claude's persistent memory.

**Location**: `/MEMORY.md` in your knowledge graph root

### How It Works

1. You capture lessons and patterns over time
2. Run `/kg-sis:update-graph` (extracts patterns from lessons)
3. Top patterns written to `MEMORY.md`
4. Claude reads `MEMORY.md` at session start
5. Claude "remembers" your patterns automatically

### MEMORY.md Lifecycle

**Active** (`MEMORY.md`):
- Current, frequently-used patterns
- Target: <200 lines (keeps Claude context efficient)
- Updated by `/kg-sis:update-graph`

**Archived** (`MEMORY-archive.md`):
- Older patterns, still valid but less used
- Moved by `/kg-sis:archive-memory`
- Retrievable via `/kg-sis:restore-memory`

### Managing MEMORY.md

**When to archive**:
- MEMORY.md exceeds 200 lines
- Patterns become less relevant over time
- New project phase (archive old patterns)

**When to restore**:
- Need archived pattern again
- Returning to previous project phase
- Team member needs historical context

**Commands**:
- `/kg-sis:archive-memory` - Move entries to archive
- `/kg-sis:restore-memory` - Bring back archived entries

See [Command Guide](../../docs/COMMAND-GUIDE.md) for details.

---

## Related Documentation

**Resources**:
- [Templates](../templates/) - Starting scaffolds
- [Examples](../examples/) - Real-world samples
- [Manual Workflows](WORKFLOWS.md) - Manual processes
- [Architecture](ARCHITECTURE.md) - System design
