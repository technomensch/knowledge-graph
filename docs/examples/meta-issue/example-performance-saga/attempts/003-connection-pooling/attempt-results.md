---
title: Attempt Results
---

<!-- THIS IS AN EXAMPLE — Replace with your project's meta-issues -->

# Attempt 003 Results: Connection Pooling + Async

## Actual Results

| Metric | Before (Baseline) | After Attempt 001 | After Attempt 002 | After Attempt 003 | Target |
|--------|-------------------|--------------------|--------------------|--------------------|--------|
| Response Time | 5,200ms | 5,100ms | 3,800ms | 380ms | <1,000ms |
| Memory Usage | 4.1GB | 4.4GB | 3.2GB | 280MB | <512MB |
| CPU Usage | 100% spikes | 98% spikes | 75% avg | 25% avg | <40% |
| Error Rate | 8% | 8% | 3% | 0% | <1% |

**Implementation:** Branch `perf-attempt-003-pooling`, 18 commits.

## Assessment: ✅ Success

**93% improvement in response time** — all targets met.

- Response time: 3,800ms → 380ms (93% improvement, well past the <1,000ms target)
- P95 response time: 620ms (target: <1,500ms)
- Memory: 3.8GB → 280MB (93% reduction, well past the <512MB target)
- CPU: 95% → 25% avg (75% reduction, past the <40% target)
- Error rate: 22% failed requests → 0% failed, 100% successful

## What Worked

### Connection pooling
- Connection setup: 2,400ms → 5ms (480x faster) via pool reuse
- Connection reuse rate: 95%
- Pool sized at min 5 / max 20 needed no runtime tuning during testing

### Async conversion
- 12 functions converted to `async`/`await`
- Event loop no longer blocked waiting on I/O
- Processing time: 600ms → 125ms (5x faster) from concurrent request handling

### Request queue + circuit breaker
- Queue absorbed bursts instead of spawning unbounded connections
- Circuit breaker prevented cascade failures under load
- Failed requests dropped from 22% to 0%

## What Didn't Work

### Queue depth under heavy concurrency
- At 200 concurrent users, queue depth averaged 15 — acceptable, but a reminder that the queue (not the pool) becomes the next constraint at higher scale
- Not a failure for this attempt's targets, but flagged for future capacity planning

### Nothing else fell short
- Unlike Attempts 001 and 002, no metric came in below target — this is the first attempt where "what didn't work" is minor tuning rather than a missed goal

## Analysis: Why Such a Dramatic Improvement?

### The Combined Effect

```
Connection (pooled):     5ms   (was: 2,400ms)
Query execution:       250ms   (was: 800ms — further improved under async load)
Processing (async):    125ms   (was: 600ms)
Total response time:   380ms   (was: 3,800ms — 90%+ improvement)
```

**Key insight:** Attempt 002 optimized the second-biggest bottleneck (queries) and revealed the biggest one (connections). Attempt 003 fixed the biggest bottleneck directly — and because async processing removed event-loop contention at the same time, the improvements compounded rather than simply adding up.

### Validation Under Load

```
50 concurrent users:  210ms avg, 180MB memory, 15% CPU
100 concurrent users: 380ms avg, 280MB memory, 25% CPU
200 concurrent users: 650ms avg, 420MB memory, 45% CPU, queue depth 15 avg
```

All targets held at every tested load level.

## Root Cause Theory Update

**Previous theory (Attempt 001):** Processing bottleneck → Wrong
**Previous theory (Attempt 002):** Query bottleneck → Partially correct
**Confirmed theory (Attempt 003):** Connection management + synchronous blocking

- Each request previously created a new connection (expensive handshake) — confirmed as the dominant cost
- Synchronous operations were blocking the event loop — confirmed as the secondary cost
- Fixing both together, rather than either alone, resolved the issue

## Changes Retained

✅ Keep everything from this attempt (all targets met):
- Connection pool (min: 5, max: 20)
- Async conversion of the 12 affected functions
- Request queue with circuit breaker
- Graceful degradation under queue saturation

✅ Also retained from Attempt 002 (still valuable, now compounding with pooling):
- Composite and covering indexes
- Pagination
- JOIN consolidation

## Cross-References

- **Previous:** [Attempt 002 Results](../002-caching/attempt-results.md)
- **Test Cases:** [../../test-cases.md](../../test-cases.md)
- **Implementation Log:** [../../implementation-log.md](../../implementation-log.md)
