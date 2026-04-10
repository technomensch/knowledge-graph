---
title: "ADR-004: Token-Based MEMORY.md Size Limits"
status: Accepted
date: 2026-02-16
deciders: technomensch, Claude Sonnet 4.5
---

# ADR-004: Token-Based MEMORY.md Size Limits

## Status

**Accepted** - 2026-02-16

## Context

The MEMORY.md file stores project-persistent context that survives across sessions. Without size limits, MEMORY.md can grow unbounded, consuming valuable token budgets in every session. v0.0.3 needed a systematic way to limit MEMORY.md growth while preserving historical context.

### Problem

1. **Unbounded growth:** MEMORY.md grows with every lesson, pattern, and memory update
2. **Token waste:** Token budgets consumed partially by stale or low-value context
3. **Line-based metrics insufficient:** Line counts don't reflect actual token consumption (short vs long lines)
4. **Soft vs hard limits:** Need both warning threshold and hard stop

### Scope

- Implement size limits that reflect actual token consumption
- Support both soft (warning) and hard (blocking) limits
- Provide clear feedback to users about MEMORY.md size
- Enable automated cleanup via archival

---

## Decision

Implement token-based size limits with soft and hard thresholds:

### Token Calculation

```
tokens = word_count × 1.3
```

### Size Limits

- **Soft limit:** 1,500 tokens — Warning issued, but updates continue
- **Hard limit:** 2,000 tokens — Blocks new updates, suggests archival

### Implementation

1. **Per-command checking:** Every command that writes to MEMORY.md first checks size
2. **Feedback:** Report current size and remaining capacity after updates
3. **Archival:** `/kg-sis:archive-memory` moves stale entries to MEMORY-archive.md
4. **Restoration:** `/kg-sis:restore-memory` restores archived entries when needed

---

## Rationale

### Why This Approach

1. **Tokens are real cost:** Line counts are misleading; tokens are what matters for cost and context
2. **Formula is simple:** 1.3 multiplier is well-established approximation
3. **Dual thresholds:** Soft limit allows workflow; hard limit prevents catastrophic token waste
4. **Measurable:** Users can see exact tokens consumed and available

### Alternatives Considered

**Option A: Line-Based Limits**
- Pros: Simple to calculate
- Cons: Short lines (titles) vs long lines (long entries) consume vastly different tokens
- Rejected: Inaccurate; doesn't reflect actual cost

**Option B: No Limits**
- Pros: No user friction
- Cons: Token budgets grow unbounded; context becomes bloated
- Rejected: Unsustainable for long-term project use

**Option C: Fixed Token Budget per Session**
- Pros: Strict cost control
- Cons: Too rigid; prevents valuable context additions
- Rejected: Dual thresholds provide better UX

---

## Consequences

### Positive

1. ✅ MEMORY.md stays manageable (bounded to ~2,500 tokens max)
2. ✅ Token consumption predictable
3. ✅ Historical context preserved via archival, not deleted
4. ✅ Users understand cost-benefit trade-offs

### Negative

1. ❌ Users must manage archival (not fully automatic)
2. ❌ Long entries may hit limit quickly
3. ❌ Requires education about token counting

### Neutral

1. Hard limit may surprise users trying to add critical context
2. Soft limit warnings could become annoying if limit is exceeded frequently

---

## Implementation

**Timeline:** v0.0.3-alpha (2026-02-16)

**Affected Components:**
- `/kg-sis:update-graph` — Step 7 checks size before writing
- `/kg-sis:sync-all` — Size check integrated into sync pipeline
- `/kg-sis:archive-memory` — New command for managing size
- All MEMORY.md write operations

**Token Calculation Code:**
```
word_count = len(MEMORY_md.split())
tokens = round(word_count * 1.3)
```

**Validation Messages:**
```
MEMORY.md size: 1,243 tokens (1,500 limit)
Remaining capacity: 257 tokens

If soft limit exceeded:
  "⚠️  MEMORY.md approaching soft limit (1,500 tokens). Consider running /kg-sis:archive-memory"

If hard limit exceeded:
  "❌ MEMORY.md exceeds hard limit (2,000 tokens). Run /kg-sis:archive-memory before continuing"
```

---

## Validation

**Success Criteria:**
- Token counts accurately reflect actual content size (within ±10%)
- Soft limit warning appears when 1,500 tokens reached
- Hard limit prevents writes when 2,000 tokens reached
- Archive/restore cycle preserves content

**Metrics:**
- Average MEMORY.md size stays under 1,800 tokens
- Archival process recovers 30-50% of space on demand

**Review Date:** After v0.0.4 when archive/restore usage patterns emerge

---

## Related Decisions

- **[ADR-005: Defer MEMORY.md Auto-Sync Rules Engine to v0.0.5](ADR-005-defer-memory-rules-engine.md)** — Rules engine will automate archival decisions

---

## Related Documentation

**Knowledge Graph:**
- [Token-Based Size Limits Pattern](../knowledge/patterns.md#token-based-size-limits) — Reusable pattern for other file size management

**Lessons Learned:**
- [Line vs Token Metrics Must Be Applied Consistently](../lessons-learned/debugging/Lessons_Learned_Line_vs_Token_Metrics_Confusion.md) — Debugging insights

---

## Future Considerations

1. **Smart archival:** Rules engine (v0.0.5) will automate "what to archive"
2. **Compressed archival:** Optional compression for very old entries
3. **Per-KG customization:** Allow different limits per knowledge graph
4. **Historical metrics:** Track MEMORY.md size trends over time

---

**Decision Made:** 2026-02-16
**Last Updated:** 2026-02-22
**Status:** Accepted
