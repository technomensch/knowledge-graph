<!-- THIS IS AN EXAMPLE — Replace with your project's meta-issues -->

# Test Cases: Performance Optimization

**Created:** 2024-09-01  
**Last Updated:** 2024-10-01

---

## Purpose

Define consistent validation criteria used across all solution attempts. These test cases ensure objective measurement of success/failure.

---

## Success Criteria

An attempt is considered **successful** if ALL criteria met:

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| **Response Time (avg)** | < 1,000ms | Load test (100 concurrent users, 1000 requests) |
| **Response Time (P95)** | < 1,500ms | Load test percentile analysis |
| **Memory Usage** | < 512MB peak | System monitoring during load test |
| **CPU Usage** | < 40% avg | System monitoring during load test |
| **Error Rate** | < 1% | Failed requests / total requests |

---

## Test Cases

### TC-001: Baseline Performance Test

**Purpose:** Establish performance baseline before any optimization

**Setup:**
```bash
# Start clean system
docker-compose down
docker-compose up -d
sleep 30  # Wait for services

# Load test configuration
CONCURRENT_USERS=100
TOTAL_REQUESTS=1000
RAMP_UP_TIME=10s
```

**Execution:**
```bash
# Using Apache Bench
ab -n 1000 -c 100 -g results.tsv \
  http://localhost:3000/api/endpoint

# Using custom load tester
node scripts/load-test.js \
  --users 100 \
  --requests 1000 \
  --ramp-up 10
```

**Validation:**
```bash
# Parse results
cat results.tsv | awk '{sum+=$NF; count++} END {print "Avg:", sum/count "ms"}'

# Check memory
docker stats --no-stream api-container

# Check CPU
docker stats --no-stream api-container | awk '{print $3}'
```

**Baseline Results (2024-09-01):**
```
✅ Test completed
❌ Avg response: 5,200ms (target: <1,000ms)
❌ P95 response: 8,500ms (target: <1,500ms)
❌ Memory: 4.2GB peak (target: <512MB)
❌ CPU: 100% avg (target: <40%)
❌ Error rate: 32% (target: <1%)

Verdict: FAILING all targets
```

---

### TC-002: Concurrent Load Scaling

**Purpose:** Validate performance under varying load

**Test Matrix:**

| Users | Requests | Expected Avg Response | Expected Memory |
|-------|----------|----------------------|-----------------|
| 10 | 100 | <200ms | <128MB |
| 50 | 500 | <500ms | <256MB |
| 100 | 1000 | <1,000ms | <512MB |
| 200 | 2000 | <2,000ms | <1GB |

**Execution:**
```bash
for users in 10 50 100 200; do
  node scripts/load-test.js \
    --users $users \
    --requests $((users * 10)) \
    --output results-$users.json
done
```

**Baseline Results (2024-09-01):**
```
10 users:  ✅ 180ms avg, ✅ 95MB memory
50 users:  ⚠️ 1,200ms avg (target: <500ms), ⚠️ 680MB
100 users: ❌ 5,200ms avg (target: <1,000ms), ❌ 4.2GB
200 users: ❌ FAILED (connection refused)

Verdict: Degradation begins at ~50 users
```

---

### TC-003: Memory Leak Detection

**Purpose:** Ensure no memory leaks under sustained load

**Setup:**
```bash
# Long-running test (1 hour)
DURATION=3600  # 1 hour
RATE=10        # 10 requests/sec
```

**Execution:**
```bash
# Continuous load
node scripts/sustained-load.js \
  --duration 3600 \
  --rate 10 \
  --monitor-memory

# Monitor memory every 60s
while true; do
  docker stats --no-stream api-container >> memory-log.txt
  sleep 60
done
```

**Validation:**
```bash
# Check for memory growth
cat memory-log.txt | awk '{print $2}' | \
  gnuplot -e "plot '-' with lines"

# Memory should stabilize, not continuously grow
```

**Baseline Results (2024-09-01):**
```
T+0min:  95MB
T+15min: 1.2GB
T+30min: 2.8GB
T+45min: 4.5GB
T+60min: CRASHED (OOM)

Verdict: ❌ MEMORY LEAK detected (linear growth)
```

---

### TC-004: Connection Handling

**Purpose:** Validate database connection management

**Metrics to Collect:**
- Active connections (current)
- Connection creation rate
- Connection reuse rate
- Connection errors

**Execution:**
```bash
# Monitor database connections during load test
watch -n 1 'psql -c "SELECT count(*) FROM pg_stat_activity"'

# Custom connection metrics
node scripts/connection-monitor.js &
node scripts/load-test.js --users 100 --requests 1000
```

**Baseline Results (2024-09-01):**
```
Connections created: 1,000 (1 per request)
Connection reuse: 0%
Max concurrent: 100
Connection errors: 0

Verdict: ❌ NO connection reuse (expensive)
```

---

### TC-005: Query Performance

**Purpose:** Identify slow database queries

**Execution:**
```sql
-- Enable slow query logging
SET log_min_duration_statement = 100;  -- 100ms threshold

-- Run load test
-- (queries logged to postgres.log)

-- Analyze slow queries
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements
WHERE mean_time > 100
ORDER BY mean_time DESC;
```

**Baseline Results (2024-09-01):**
```
Slow queries found: 15
Slowest: 2,100ms (avg)
Total query time: ~40% of response time

Verdict: ⚠️ Queries slow, but not sole bottleneck
```

---

## Test Execution Schedule

### After Each Attempt

Run ALL test cases to ensure:
- Improvement is real (not measurement error)
- No regressions in other areas  
- Consistent methodology for comparison

**Required tests:**
- TC-001: Baseline (main validation)
- TC-002: Load scaling
- TC-004: Connection handling

**Optional tests (if relevant):**
- TC-003: Memory leaks (if memory issues suspected)
- TC-005: Query performance (if query changes made)

---

## Results Tracking

### Attempt 001: Caching Layer

| Test | Result | vs Baseline |
|------|--------|-------------|
| TC-001 | 5,100ms avg | +2% worse |
| TC-002-100 | 5,150ms | Similar |
| TC-003 | Still crashes @50min | No change |
| TC-004 | Still 0% reuse | No change |

**Verdict:** ❌ No meaningful improvement

---

### Attempt 002: Query Optimization

| Test | Result | vs Baseline |
|------|--------|-------------|
| TC-001 | 3,800ms avg | ✅ 30% better |
| TC-002-100 | 3,750ms | ✅ 28% better |
| TC-003 | Crashes @90min | ⚠️ Better but still fails |
| TC-004 | Still 0% reuse | No change |
| TC-005 | 2 slow queries | ✅ 87% fewer |

**Verdict:** ⚠️ Partial success (30% improvement)

---

### Attempt 003: Connection Pooling + Async

| Test | Result | vs Baseline | Status |
|------|--------|-------------|--------|
| TC-001 | 380ms avg | ✅ 93% better | ✅ PASS |
| TC-002-100 | 380ms | ✅ 93% better | ✅ PASS |
| TC-002-200 | 650ms | ✅ 87% better | ✅ PASS |
| TC-003 | Stable @4hrs | ✅ No leak | ✅ PASS |
| TC-004 | 95% reuse | ✅ Pooling works | ✅ PASS |
| TC-005 | Query 250ms avg | ✅ Further improved | ✅ PASS |

**Verdict:** ✅ SUCCESS - All tests pass!

---

## Lessons from Testing

### What Worked

- **Consistent criteria:** Same tests across attempts enabled comparison
- **Multiple dimensions:** Response time, memory, CPU, connections all matter
- **Sustained load:** TC-003 caught memory leak baseline tests missed
- **Objective:** Numbers prevent "it feels faster" bias

### What Didn't Work

- **Unit tests alone:** All passed but didn't predict production issues
- **Single-user tests:** Performance acceptable until concurrent load

### Key Insights

1. **Performance testing requires realistic load:** Unit tests insufficient
2. **Multiple metrics matter:** Can improve one (response time) while worsening another (memory)
3. **Sustained tests catch leaks:** Short tests miss gradual degradation
4. **Consistent methodology:** Same test procedure = valid comparison

---

## Related

- **Implementation Log:** [implementation-log.md](./implementation-log.md) - Timeline and results
- **Description:** [description.md](./description.md) - Problem evolution
- **Attempts:** [attempts/](./attempts/) - Detailed solution approaches
