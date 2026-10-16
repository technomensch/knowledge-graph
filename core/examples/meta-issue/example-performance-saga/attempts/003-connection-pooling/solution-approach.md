<!-- THIS IS AN EXAMPLE — Replace with your project's meta-issues -->

# Attempt 003: Connection Pooling + Async

## Hypothesis

Attempt 002 (query optimization) reduced query execution time by 67% (2,400ms → 800ms), but overall response time only improved 27%. Profiling revealed why: connection setup was consuming 2,400ms per request — as long as the *original*, unoptimized query time. Connection management, not query performance, was the dominant bottleneck.

**Based on Attempt 002 learnings:**
- Query execution: 21% of total time (800ms) — already optimized, keep as-is
- Connection setup: 63% of total time (2,400ms) ← **New target**
- Processing: 11% of total time (420ms) — still synchronous, blocking the event loop

**Compound hypothesis:** Connection overhead and synchronous blocking are two sides of the same problem. Pooling connections removes the per-request handshake cost; converting to async stops the event loop from stalling while waiting on I/O. Neither fix alone was expected to be sufficient — both were needed together.

## Expected Outcome

- Response time: 90%+ reduction (from 3,800ms to under 1,000ms — meets the test-cases.md target)
- Memory: 90%+ reduction (a small pool of reused connections vs. one allocation per request)
- CPU: Significant reduction (async I/O releases the event loop instead of busy-blocking it)
- Error rate: Near zero (pooling plus a circuit breaker prevent exhaustion under load)

## Implementation Plan

### 1. Connection Pool

```javascript
// Create pool once at startup, not per-request
const pool = createConnectionPool({
  min: 5,
  max: 20,
  idleTimeoutMs: 30000,
  acquireTimeoutMs: 5000
})
```

- Pool warms 5 connections on startup so early requests don't pay handshake cost
- Caps concurrent connections at 20 to avoid overwhelming the database
- Idle connections beyond the minimum are recycled after 30s

### 2. Async Conversion

- Converted 12 functions from synchronous, blocking calls to `async`/`await`
- Removed manual `db.close()` per request in favor of `pool.release(db)`
- Request handling no longer blocks the event loop while waiting on the database

### 3. Request Queue + Circuit Breaker

```javascript
const queue = createRequestQueue({
  maxQueueDepth: 50,
  circuitBreaker: {
    failureThreshold: 10,
    resetTimeoutMs: 15000
  }
})
```

- Requests beyond pool capacity wait in a bounded queue instead of spawning new connections
- Circuit breaker opens after 10 consecutive failures, giving the database time to recover
- Prevents cascade failures under sustained overload

### 4. Graceful Degradation

- When the queue is full, return a fast `503` instead of hanging the request
- Health check endpoint reports pool utilization so operators can see saturation before it causes errors

## Configuration

```yaml
database:
  pool:
    min: 5
    max: 20
    idle_timeout_ms: 30000
    acquire_timeout_ms: 5000
  queue:
    max_depth: 50
  circuit_breaker:
    failure_threshold: 10
    reset_timeout_ms: 15000
```

## Testing Approach

Run standard test suite from test-cases.md:
- TC-001: Baseline load test at 100 concurrent users
- TC-002: Concurrent load scaling (10/50/100/200 users)
- TC-003: Memory leak detection under 4-hour sustained load
- TC-004: Connection handling (reuse rate, active connections)
- TC-005: Query performance (confirm Attempt 002 gains are preserved)

Compare against Attempt 002 results and the original baseline.

## Risk Assessment

- **Low risk:** Pool sizing (min 5, max 20) is conservative and can be tuned without code changes
- **Medium risk:** Converting 12 functions to async touches core request-handling code paths
- **Medium risk:** Circuit breaker could reject legitimate traffic if thresholds are miscalibrated
- **Mitigation:** Staged rollout with pool/queue metrics monitored before full traffic cutover; circuit breaker thresholds validated against Attempt 002's load-test data before deploying
