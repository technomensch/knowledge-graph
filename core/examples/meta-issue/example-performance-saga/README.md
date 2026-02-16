<!-- THIS IS AN EXAMPLE — Replace with your project's meta-issues -->

# Meta-Issue: Performance Optimization Saga

**Created:** 2024-09-01  
**Status:** Resolved (Attempt 003)  
**Total Attempts:** 3  
**Duration:** ~6 weeks

---

## Overview

This directory tracks a complex, multi-attempt problem that required iterative refinement to solve. Use this as a template for your own meta-issue tracking.

---

## Quick Navigation

- **[Description](./description.md)** - Living document of problem understanding (updated as learning evolves)
- **[Implementation Log](./implementation-log.md)** - Timeline of all attempts with results
- **[Test Cases](./test-cases.md)** - Validation criteria used across attempts
- **[Attempts](./attempts/)** - Detailed folders for each solution approach

---

## Problem Statement

System performance degraded significantly under realistic load conditions, despite passing all unit tests. Multiple solution approaches were required before identifying and addressing the root cause.

**Symptoms:**
- Response time >5s under 100 concurrent users (target: <1s)
- Memory usage climbing to 4GB+ (target: <512MB)
- CPU spiking to 100% during operations (target: <40%)

**Complexity:**
- Multiple contributing factors (not single issue)
- Performance acceptable in development, failed in production-like conditions
- Required 3 distinct solution approaches before resolving

---

## Why a Meta-Issue?

This problem qualified as meta-issue because:

1. **Multiple Attempts Required:** Standard troubleshooting didn't solve it
2. **Evolving Understanding:** Root cause theory changed across attempts
3. **Complex Interactions:** Multiple system components contributed
4. **Learning Value:** Pattern worth documenting for future reference

**Rule of thumb:** If you're on attempt #[ID], create a meta-issue.

---

## Timeline Summary

| Attempt | Date | Approach | Result |
|---------|------|----------|--------|
| [001](./attempts/001-baseline/) | 2024-09-01 - 09-07 | Add caching layer | ❌ Failed (incorrect assumption) |
| [002](./attempts/002-query-optimization/) | 2024-09-15 - 09-25 | Optimize database queries | ⚠️ Partial (30% improvement, not enough) |
| [003](./attempts/003-connection-pooling/) | 2024-10-01 - 10-12 | Connection pooling + async | ✅ Success (met all targets) |

---

## Root Cause (Final Understanding)

**Initial hypothesis:** Inefficient data processing (wrong)  
**Attempt 2 hypothesis:** Slow database queries (partially correct)  
**Final understanding:** Connection management + synchronous blocking

**Actual root cause:**
- Creating new database connection per request (expensive)
- Synchronous operations blocking event loop
- No connection pooling or reuse
- Combined effect created bottleneck

**Key insight:** Performance issues often have multiple contributing factors, not single "smoking gun."

---

## Resolution

**Winning approach:** Attempt 003 - Connection pooling + async

**Critical changes:**
1. Implemented connection pool (reuse connections)
2. Converted synchronous operations to async
3. Added request queueing with circuit breaker
4. Implemented graceful degradation under load

**Results:**
- Response time: 5s → 380ms (93% improvement)
- Memory usage: 4GB → 280MB (93% reduction)
- CPU usage: 100% spikes → 25% avg (75% reduction)

---

## Lessons Learned

### What Worked

- **Systematic testing:** Test cases validated each attempt objectively
- **Incremental understanding:** Each attempt refined root cause theory
- **Documentation:** This meta-issue preserved all context for future

### What Didn't Work

- **Initial assumptions:** Started with wrong mental model of bottleneck
- **Unit tests alone:** Passed all tests but failed realistic load
- **Single-attempt thinking:** Expected first solution to work

### Key Insights

1. **Performance issues multi-faceted:** Rarely single cause
2. **Test under realistic conditions:** Unit tests ≠ production load
3. **Document evolution:** Track how understanding changed
4. **Pattern recognition:** Similar symptoms ≠ same root cause

---

## When to Use This Pattern

Create a meta-issue when:

- **3+ attempts** at same problem
- **Root cause unclear** after initial investigation
- **Multiple hypotheses** need testing
- **Learning valuable** for future similar issues
- **Standard issue tracking insufficient**

---

## Directory Structure

```
example-performance-saga/
├── README.md                 # This file (navigation hub)
├── description.md            # Living problem description (updated as understanding evolves)
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

## Related

- **Lesson Learned:** (Create after resolving to extract patterns)
- **ADR:** (If architectural decision emerged from resolution)
- **Pattern:** [[patterns.md#meta-issue-tracking]]
