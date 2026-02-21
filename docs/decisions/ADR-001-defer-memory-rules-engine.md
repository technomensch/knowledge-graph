---
title: "ADR-001: Defer MEMORY.md Auto-Sync Rules Engine to v0.0.5"
status: Accepted
date: 2026-02-16
deciders: technomensch, Claude Sonnet 4.5
---

# ADR-001: Defer MEMORY.md Auto-Sync Rules Engine to v0.0.5

## Status

**Accepted** - 2026-02-16

## Context

v0.0.3-alpha introduced MEMORY.md token-based limits (1,500/2,000 tokens) and `/kg-sis:archive-memory` command for managing bloat. When planning v0.0.4-alpha, we considered three features from the v0.0.3 deferred list:

1. **MEMORY.md auto-sync rules engine** - YAML-based pattern matching to automate sync decisions
2. **Smart summarization** - LLM-powered entry consolidation
3. **`/kg-sis:restore-memory` command** - Restore archived entries

The question: Which features should be included in v0.0.4-alpha?

### v0.0.3-alpha State

**What exists:**
- Token-based MEMORY.md limits (1,500 soft / 2,000 hard)
- Archive command to move stale entries to MEMORY-archive.md
- Size checking in sync-all and update-graph
- SessionStart notifications for MEMORY.md changes

**What's missing:**
- No way to restore archived entries (archive is one-way)
- Manual decisions on what to sync to MEMORY.md (no automation)
- No consolidation of similar entries (manual editing required)

### Options Considered

#### Option 1: Rules Engine + Restore (Medium Scope)

**Scope:**
- Implement `/kg-sis:restore-memory` command
- Implement basic rules engine (YAML-based pattern matching)
- Skip smart summarization

**Example rules structure:**
```yaml
# {active_kg_path}/config/memory-sync-rules.yaml
memory_sync:
  enabled: true
  rules:
    - pattern: "gotcha|pitfall|anti-pattern"
      section: "Common Failure Patterns & Fixes"
      confidence: high
    - pattern: "best practice|workflow improvement"
      section: "Best Practices"
      confidence: medium
```

**Pros:**
- Completes archive feature (archive + restore)
- Adds semi-intelligent automation
- Keyword-based matching is deterministic and debuggable
- YAML per-KG aligns with existing architecture

**Cons:**
- Rules engine needs real-world MEMORY.md patterns from v0.0.3 usage
- No feedback yet on archive/restore workflow
- Adds 3-5 days to timeline (vs 2-3 days for restore only)
- Pattern matching may be too simple (needs iteration)

**Timeline:** 4-6 days

#### Option 2: Full Automation (All Deferred Features)

**Scope:**
- Implement all three deferred features:
  - Rules engine (YAML-based)
  - Smart summarization (LLM-powered)
  - Restore command

**Pros:**
- Complete MEMORY.md intelligence vision
- Maximum automation value
- Addresses all deferred items at once

**Cons:**
- Smart summarization requires LLM integration (complex)
- Long timeline (1-2 weeks) disrupts release velocity
- High risk (too many moving parts)
- No incremental feedback loop
- Needs usage patterns from v0.0.3 that don't exist yet

**Timeline:** 10-14 days

#### Option 3: Restore Only (Minimal Scope) ← **SELECTED**

**Scope:**
- Implement `/kg-sis:restore-memory` command only
- Defer rules engine to v0.0.5-alpha
- Defer smart summarization to v0.0.5-alpha

**Pros:**
- Completes archive feature (users need both archive + restore)
- Well-defined, low-risk implementation
- Quick release (2-3 days) maintains velocity
- Allows gathering feedback on archive/restore workflow before automation
- Simple, predictable behavior

**Cons:**
- No automation yet (manual MEMORY.md sync decisions)
- Deferred value (automation pushed to v0.0.5)

**Timeline:** 2-3 days

## Decision

**Selected: Option 3 (Restore Only)**

Implement `/kg-sis:restore-memory` command in v0.0.4-alpha. Defer rules engine and smart summarization to v0.0.5-alpha.

### Rationale

1. **Archive without restore is incomplete UX**
   - Users who archive entries cannot recover them without manual editing
   - Restore capability is essential for archive feature to be useful
   - This is the highest-priority missing piece

2. **Rules engine needs real-world patterns**
   - v0.0.3-alpha just shipped with archive capability
   - Need user feedback on what gets archived and why
   - Real-world MEMORY.md patterns will inform better rules
   - Premature to automate without usage data

3. **Smart summarization requires LLM integration**
   - Adds significant complexity (API calls, error handling, rate limits)
   - Should gather feedback on simpler features first
   - Better to invest in this after seeing usage patterns

4. **Focused scope maintains velocity**
   - Restore command: 2-3 days
   - Rules engine: +3-5 days
   - Smart summarization: +5-7 days
   - Minimal scope allows quick iteration and feedback

5. **Incremental feedback loop**
   - v0.0.3: Archive capability → gather usage data
   - v0.0.4: Restore capability → complete the feature, observe patterns
   - v0.0.5: Rules engine → automate based on observed patterns
   - v0.0.6: Smart summarization → intelligent consolidation

## Consequences

### Positive

- ✅ Complete archive/restore feature set for users
- ✅ Quick release cycle (2-3 days)
- ✅ Low risk, well-defined scope
- ✅ Allows gathering feedback before investing in automation
- ✅ Real-world patterns from v0.0.3/v0.0.4 will inform better v0.0.5 rules

### Negative

- ❌ Manual MEMORY.md sync decisions (no automation in v0.0.4)
- ❌ Deferred automation value (pushed to v0.0.5)
- ❌ Users must manually choose what to sync

### Neutral

- Users have complete manual control (may be preferred by some)
- Simple, predictable behavior (no "magic" automation)

## Implementation Notes

### v0.0.4-alpha Scope

**New command: `/kg-sis:restore-memory`**
- Restore by entry title (fuzzy search)
- Restore by entry ID from archive
- List all archived entries
- Preview before restoring
- Check token limits before restoring

**Integration:**
- Update archive-memory.md to track restorations
- Document restore workflow in knowledge-graph-usage skill
- Add ADR documenting deferral decision

### v0.0.5-alpha Scope (Deferred)

**Rules engine:**
- YAML-based pattern matching
- Global defaults + per-KG overrides
- Confidence scoring system
- Integration with update-graph Step 7

**Smart summarization:**
- LLM-powered entry consolidation
- Batch processing or on-demand
- Merge similar entries strategy
- Quality checks and user review

## References

- [v0.0.3-alpha Plan](../plans/v0.0.3-alpha-plan.md) - Deferred features list
- [v0.0.4-alpha Plan](../plans/v0.0.4-alpha-plan.md) - Restore command implementation
- [archive-memory.md](../../commands/archive-memory.md) - Archive command documentation
- ROADMAP.md - v0.0.5-alpha planning for rules engine

## Review History

- **2026-02-16**: Initial decision (technomensch + Claude Sonnet 4.5)
- **Status**: Accepted
- **Next Review**: After v0.0.4-alpha ships and usage feedback collected
