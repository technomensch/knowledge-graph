# Meta-Issue Tracking Guide

**For complex problems requiring multiple solution attempts**

---

## What is a Meta-Issue?

A **meta-issue** is structured documentation for problems that:
- Require **3+ solution attempts** before resolution
- Have **evolving root cause understanding** across attempts
- Need to track **"what we tried" and "what we learned"**
- Don't fit standard single-issue tracking

**Example:** Performance degradation that required trying caching (failed), query optimization (partial), and connection pooling (succeeded) before fully resolving.

---

## When to Create One

### ✅ CREATE a meta-issue when:

- You're on **attempt #[ATTEMPT_ID]** for the same problem
- Root cause **theory changed** after failed attempts
- Standard issue tracking **feels insufficient**
- Future-you will ask **"why did we try so many things?"**
- Problem spans **multiple components/systems**

### ❌ DON'T create for:

- First attempt at solving problem (use regular lesson)
- Multiple unrelated issues (separate lessons)
- Simple bugs with clear solutions

---

## Rule of Thumb

**If you're on attempt #[ATTEMPT_ID], create a meta-issue.**

Convert your previous attempts into the meta-issue structure retroactively.

---

## Directory Structure

```
docs/meta-issues/[issue-name]/
├── README.md                 # Navigation hub (start here)
├── description.md            # Living document (updated as understanding evolves)
├── implementation-log.md     # Timeline of all attempts
├── test-cases.md             # Validation criteria
└── attempts/
    ├── 001-baseline/
    │   ├── solution-approach.md    # What we tried
    │   └── attempt-results.md      # What happened
    ├── 002-query-optimization/
    │   ├── solution-approach.md
    │   └── attempt-results.md
    └── 003-connection-pooling/
        ├── solution-approach.md
        └── attempt-results.md
```

---

## Core Files

### README.md (Navigation Hub)

**Purpose:** Starting point for anyone reading this meta-issue

**Contents:**
- Problem summary
- Timeline of attempts
- Final resolution
- Link to detailed files

**Example:**

```markdown
# Meta-Issue: API Performance Degradation

**Status:** Resolved (Attempt 003)
**Duration:** 6 weeks

## Quick Navigation
- [Description](./description.md) - Evolving understanding
- [Implementation Log](./implementation-log.md) - Timeline
- [Test Cases](./test-cases.md) - Validation
- [Attempts](./attempts/) - Detailed solutions

## Summary
Performance degraded under load. Tried caching (failed),
query optimization (partial), connection pooling (success).

## Resolution
Attempt 003: Connection pooling + async operations
Result: 93% improvement, all targets met
```

### description.md (Living Document)

**Purpose:** Track how understanding evolved

**Key feature:** **Update this file** as each attempt reveals new information

**Structure:**

```markdown
# Description: [Problem Name]

## Current Understanding (v3)
[Latest theory after all attempts]

## Evolution of Understanding

### Version 1 (Date) - Initial Hypothesis
**Theory:** [What we thought]
**Evidence:** [Why we thought it]
**Test:** [What we tried]
**Result:** [What happened]
**Learning:** [What it revealed]

### Version 2 (Date) - Refined Hypothesis
...

### Version 3 (Date) - Final Understanding
...
```

**Why this matters:** Shows the journey from wrong understanding to correct understanding.

### implementation-log.md (Timeline)

**Purpose:** Chronological record of all work

**Structure:**

```markdown
# Implementation Log

## Attempt 001: Caching Layer
**Date:** 2024-09-01 to 2024-09-07
**Hypothesis:** Processing bottleneck
**Result:** ❌ Failed (2% improvement)
**Learning:** Processing not the bottleneck

## Attempt 002: Query Optimization
**Date:** 2024-09-15 to 2024-09-25
**Hypothesis:** Slow queries
**Result:** ⚠️ Partial (30% improvement)
**Learning:** Queries slow but not primary issue

## Attempt 003: Connection Pooling
**Date:** 2024-10-01 to 2024-10-12
**Hypothesis:** Connection overhead
**Result:** ✅ Success (93% improvement)
**Learning:** Connection management was root cause
```

### test-cases.md (Validation)

**Purpose:** Consistent testing across attempts

**Contents:**
- Success criteria (what does "solved" mean?)
- Test procedures (how to validate)
- Results for each attempt

**Example:**

```markdown
# Test Cases

## Success Criteria
- Response time: < 1,000ms (avg)
- Memory: < 512MB (peak)
- CPU: < 40% (avg)
- Error rate: < 1%

## TC-001: Load Test (100 users)
**Procedure:** ...

**Results:**
- Attempt 001: 5,100ms (FAIL)
- Attempt 002: 3,800ms (FAIL)
- Attempt 003: 380ms (PASS) ✅
```

---

## Attempt Structure

Each attempt has two files:

### solution-approach.md

**Written BEFORE attempting solution**

**Contents:**
- Hypothesis
- Expected outcome
- Implementation plan
- Configuration
- Testing approach

**Example:**

```markdown
# Attempt 001: Caching Layer

## Hypothesis
High CPU suggests processing bottleneck. Caching will reduce
redundant computation.

## Expected Outcome
70%+ cache hit rate → 70% reduction in processing time

## Implementation Plan
1. Implement LRU cache
2. Cache key from request params
3. TTL: 5 minutes

[... detailed plan ...]
```

### attempt-results.md

**Written AFTER completing attempt**

**Contents:**
- Actual results
- Comparison to expectations
- Analysis of why it worked/failed
- What was learned
- Next steps

**Example:**

```markdown
# Attempt 001 Results

## Actual Results
- Cache hit rate: 85% ✅ (better than expected)
- Performance improvement: 2% ❌ (not 70%)
- Memory usage: 7% worse ❌

## Why It Failed
Cache worked but optimized wrong thing. Profiling revealed:
- Processing: 14% of total time (cache targeted this)
- Connection setup: 47% of total time (actual bottleneck)

## Learning
Don't assume bottleneck - profile first.

## Next Steps
Focus on connection setup (2,400ms)
```

---

## Workflow

### 1. Create Meta-Issue (Attempt #[ATTEMPT_ID])

```bash
mkdir -p docs/meta-issues/[issue-name]/{attempts,analysis}

# Copy templates
cp core/templates/meta-issue/README-template.md \
   docs/meta-issues/[issue-name]/README.md

cp core/templates/meta-issue/description-template.md \
   docs/meta-issues/[issue-name]/description.md

# ... (copy other templates)
```

### 2. Document Previous Attempts Retroactively

```bash
# Create directories for attempts 001 and 002
mkdir docs/meta-issues/[issue-name]/attempts/{001-caching,002-queries}

# Document what you tried (from memory/git history)
# Fill in solution-approach.md and attempt-results.md for each
```

### 3. Before Each New Attempt

**Create attempt directory:**

```bash
mkdir docs/meta-issues/[issue-name]/attempts/003-pooling
```

**Fill in solution-approach.md:**

```markdown
# Attempt 003: Connection Pooling

## Hypothesis
Connection overhead is bottleneck.

## Plan
1. Implement connection pool
2. Size: 20 per instance
3. Test under load

## Expected Outcome
90%+ improvement in response time
```

**Update description.md with new hypothesis:**

```markdown
### Version 3 (2024-10-01) - Connection Hypothesis

**Theory:** Connection overhead causing delays
**Evidence:** Profiling shows 47% time in connection setup
...
```

### 4. During Attempt

**Update implementation-log.md:**

```markdown
## Attempt 003: Connection Pooling

**2024-10-01:** Started implementation
**2024-10-05:** Pool configured, testing
**2024-10-08:** Load test shows 90% improvement!
**2024-10-12:** Deployed to production
```

### 5. After Attempt

**Fill in attempt-results.md:**

```markdown
# Attempt 003 Results

## Actual Results
- Response time: 380ms (93% improvement) ✅
- All targets met ✅

## Why It Worked
Connection reuse eliminated expensive handshakes.
Pool sizing prevented exhaustion.

## Validation
Tested at 50, 100, 200 concurrent users - all passing.
```

**Update README.md summary:**

```markdown
## Resolution
Attempt 003: Connection pooling + async
Result: 93% improvement, all targets met ✅
Status: Deployed to production, monitoring stable
```

### 6. Extract Lesson When Resolved

```bash
cp docs/templates/lessons-learned/lesson-template.md \
   docs/lessons-learned/debugging/Performance_Resolution.md

# Reference meta-issue
echo "**Meta-Issue:** [[../../meta-issues/performance/]]" >> \
  docs/lessons-learned/debugging/Performance_Resolution.md
```

---

## Tips for Effective Meta-Issues

### 1. Update description.md After Each Attempt

Show evolution of understanding:

```markdown
### Version 1: Processing bottleneck (WRONG)
### Version 2: Query bottleneck (PARTIAL)
### Version 3: Connection bottleneck (CORRECT)
```

This is valuable - shows learning journey.

### 2. Use Consistent Test Cases

Run same tests for every attempt:

```
Attempt 001: Load test → 5,100ms
Attempt 002: Load test → 3,800ms
Attempt 003: Load test → 380ms
```

Consistent measurement enables comparison.

### 3. Document Failures Honestly

**Bad:**
```markdown
Attempt 001 didn't work. Moving on.
```

**Good:**
```markdown
Attempt 001: Caching
Expected: 70% improvement
Actual: 2% improvement
Why failed: Wrong assumption about bottleneck
Value: Ruled out processing, identified real bottleneck via profiling
```

Failures have value - capture the learning.

### 4. Include Code/Config Samples

**In solution-approach.md:**

```javascript
// Proposed configuration
const cache = new LRU({
  max: 1000,
  ttl: 300000
})
```

**In attempt-results.md:**

```javascript
// What actually worked
const pool = new Pool({
  min: 5,
  max: 20
})
```

Future-you will want to see actual code.

### 5. Link Profiling Data

```markdown
# Attempt 001 Results

## Profiling Data

See: `profiling/001-cache-attempt/flame-graph.svg`

Breakdown:
- Connection: 47% (2,400ms) ← Actual bottleneck!
- Queries: 39% (2,000ms)
- Processing: 14% (700ms) ← What we optimized
```

---

## Example: Real-World Meta-Issue

See `core/examples/meta-issue/example-performance-saga/` for complete example:

- README.md - Navigation and summary
- description.md - Evolution from wrong → correct understanding
- implementation-log.md - Timeline of 3 attempts over 6 weeks
- test-cases.md - Consistent validation across attempts
- attempts/001-baseline/ - Caching attempt (failed)
- attempts/002-* - Other attempts (study the pattern)

**Study this example** to understand the structure.

---

## When to Close a Meta-Issue

**Resolved:** When solution meets all success criteria

**Abandoned:** When problem no longer relevant (requirements changed)

**Superseded:** When root cause understanding reveals it's different problem

**In all cases:**
- Document final state in README.md
- Extract key lessons to lessons-learned/
- Link from knowledge graph if pattern emerged

---

## Related

- **Examples:** [../examples/meta-issue/](../examples/meta-issue/)
- **Templates:** [../templates/meta-issue/](../templates/meta-issue/)
- **Workflows:** [WORKFLOWS.md#workflow-6-create-meta-issue](./WORKFLOWS.md#workflow-6-create-meta-issue)
- **Architecture:** [ARCHITECTURE.md](./ARCHITECTURE.md)
