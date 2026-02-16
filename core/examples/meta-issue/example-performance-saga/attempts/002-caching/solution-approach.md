<!-- THIS IS AN EXAMPLE — Replace with your project's meta-issues -->

# Attempt 002: Database Query Optimization

## Hypothesis

Attempt 001 (caching) revealed that processing wasn't the primary bottleneck. Profiling data from Attempt 001 showed 39% of total time spent in database operations. Optimizing queries should reduce response time significantly.

**Based on Attempt 001 learnings:**
- Processing: 14% of total time (caching targeted this — wrong focus)
- Database operations: 39% of total time ← **New target**
- Connection overhead: 47% of total time (not yet identified as separate issue)

## Expected Outcome

- Response time: 50-70% reduction (from 5,100ms to ~1,500-2,500ms)
- Memory: 20-30% reduction (less data loaded per query)
- CPU: Moderate reduction (less data processing)

## Implementation Plan

### 1. Query Analysis

```sql
-- Identify slow queries
EXPLAIN ANALYZE SELECT * FROM main_table
WHERE status = 'active'
ORDER BY updated_at DESC;

-- Result: Full table scan, no index on status + updated_at
```

### 2. Index Optimization

```sql
-- Add composite index for common query pattern
CREATE INDEX idx_status_updated ON main_table(status, updated_at DESC);

-- Add covering index for frequent lookup
CREATE INDEX idx_lookup_covering ON main_table(id, status)
INCLUDE (name, updated_at);
```

### 3. Query Rewriting

```sql
-- Before: N+1 query pattern
-- App loaded parent, then loop-loaded children individually

-- After: Single JOIN query with pagination
SELECT p.*, c.data
FROM parents p
LEFT JOIN children c ON c.parent_id = p.id
WHERE p.status = 'active'
ORDER BY p.updated_at DESC
LIMIT 50 OFFSET 0;
```

### 4. Result Set Optimization

- Added pagination (50 results per page vs. loading all)
- Implemented cursor-based pagination for large datasets
- Added field selection (only return needed columns)

## Configuration

```yaml
database:
  query_timeout: 5000ms
  max_result_set: 50
  pagination: cursor
  indexes:
    - table: main_table
      columns: [status, updated_at]
      type: btree
```

## Testing Approach

Run standard test suite from test-cases.md:
- TC-001: Load test at 100 concurrent users
- TC-002: Memory profile during sustained load
- TC-003: CPU utilization under load
- TC-004: Error rate monitoring

Compare against Attempt 001 baseline and original baseline.

## Risk Assessment

- **Low risk:** Index changes are additive (don't break existing queries)
- **Medium risk:** Query rewrites could change result ordering
- **Mitigation:** Run both old and new queries in parallel, compare results
