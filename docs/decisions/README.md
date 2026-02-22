# Architecture Decision Records (ADRs)

Formal documentation of significant architecture decisions.

**Total ADRs:** 11
**Last Updated:** 2026-02-22

---

## Active ADRs

- [ADR-001: Centralized Multi-KG Configuration](ADR-001-centralized-multi-kg-configuration.md) — **Status:** Proposed
- [ADR-002: Commands vs Skills Architecture](ADR-002-commands-vs-skills-architecture.md) — **Status:** Proposed
- [ADR-003: Abandon Shadow Commands; Use File Prefix](ADR-003-abandon-shadow-commands-for-file-prefix.md) — **Status:** Proposed
- [ADR-004: Token-Based MEMORY.md Size Limits](ADR-004-token-based-memory-size-limits.md) — **Status:** Proposed
- [ADR-005: Defer MEMORY.md Auto-Sync Rules Engine to v0.0.5](ADR-005-defer-memory-rules-engine.md) — **Status:** Accepted
- [ADR-006: Delegated vs Inline KG Update Architecture](ADR-006-delegated-vs-inline-kg-updates.md) — **Status:** Proposed
- [ADR-007: Distribution Hygiene via package.json Allowlist](ADR-007-distribution-hygiene-files-allowlist.md) — **Status:** Proposed
- [ADR-008: Third-Person Language Standard for User-Facing Docs](ADR-008-third-person-language-standard.md) — **Status:** Proposed
- [ADR-009: Three-Tier Installation Architecture](ADR-009-three-tier-installation-architecture.md) — **Status:** Proposed
- [ADR-010: Plugin Namespace Rename: knowledge → kg-sis](ADR-010-namespace-rename-knowledge-to-kg-sis.md) — **Status:** Proposed
- [ADR-011: Defer Update Notifications and Version Sync to v0.0.9](ADR-011-defer-update-notifications.md) — **Status:** Accepted

---

## All ADRs (Chronological)

| # | Date | Title | Version | Status |
|---|------|-------|---------|--------|
| **ADR-001** | Feb 15 | Centralized Multi-KG Configuration | v0.0.1 | Proposed |
| **ADR-002** | Feb 16 | Commands vs Skills Architecture | v0.0.1 | Proposed |
| **ADR-003** | Feb 16 | Abandon Shadow Commands; Use File Prefix | v0.0.1-v0.0.2 | Proposed |
| **ADR-004** | Feb 16 | Token-Based MEMORY.md Size Limits | v0.0.3 | Proposed |
| **ADR-005** | Feb 16 | Defer MEMORY.md Auto-Sync Rules Engine to v0.0.5 | v0.0.3→v0.0.4 | Accepted |
| **ADR-006** | Feb 16 | Delegated vs Inline KG Update Architecture | v0.0.3 | Proposed |
| **ADR-007** | Feb 17 | Distribution Hygiene via package.json Allowlist | v0.0.6 | Proposed |
| **ADR-008** | Feb 20 | Third-Person Language Standard for User-Facing Docs | v0.0.7 | Proposed |
| **ADR-009** | Feb 20 | Three-Tier Installation Architecture | v0.0.8 | Proposed |
| **ADR-010** | Feb 21 | Plugin Namespace Rename: knowledge → kg-sis | v0.0.8.3 | Proposed |
| **ADR-011** | Feb 21 | Defer Update Notifications and Version Sync to v0.0.9 | v0.0.9 | Accepted |

---

## By Category

### Architecture & System Design
- [ADR-001](ADR-001-centralized-multi-kg-configuration.md) — Centralized multi-KG configuration pattern
- [ADR-002](ADR-002-commands-vs-skills-architecture.md) — Commands (flat) vs Skills (hierarchical) pattern
- [ADR-006](ADR-006-delegated-vs-inline-kg-updates.md) — Delegated vs inline KG update architecture
- [ADR-009](ADR-009-three-tier-installation-architecture.md) — Three-tier installation (Tier 1/2/3)
- [ADR-010](ADR-010-namespace-rename-knowledge-to-kg-sis.md) — Plugin namespace: `knowledge` → `kg-sis`

### Implementation & Patterns
- [ADR-003](ADR-003-abandon-shadow-commands-for-file-prefix.md) — Shadow commands → file prefix workaround
- [ADR-004](ADR-004-token-based-memory-size-limits.md) — Token-based (not line-based) MEMORY.md limits
- [ADR-007](ADR-007-distribution-hygiene-files-allowlist.md) — Plugin distribution via allowlist

### Standards & Documentation
- [ADR-008](ADR-008-third-person-language-standard.md) — Third-person only in user-facing docs

### Deferral & Roadmap
- [ADR-005](ADR-005-defer-memory-rules-engine.md) — Defer rules engine to v0.0.5 (restore-only in v0.0.4)
- [ADR-011](ADR-011-defer-update-notifications.md) — Defer update notifications to v0.0.9 (local version reporting in v0.0.9)

---

## ADR Statuses

- **Proposed:** Decision identified and documented (awaiting formal acceptance)
- **Accepted:** Decision approved and implemented
- **Deprecated:** No longer relevant or superseded
- **Superseded:** Replaced by a newer ADR

---

## Creating a New ADR

1. **Determine next number:** Currently at ADR-011; next would be ADR-012
2. **Copy template:** Use [ADR-template.md](ADR-template.md)
3. **Fill all sections:** Context, Decision, Rationale, Consequences
4. **Link to evidence:** Reference lessons learned, KG entries, implementation
5. **Update this index:** Add entry above in chronological position

---

## Integration

- **Knowledge Graph:** Architecture ADRs link to architecture.md entries
- **Lessons Learned:** Decisions often emerge from lessons; bidirectional linking recommended
- **ROADMAP.md:** Future releases reference ADRs for context
- **Meta-Issues:** Complex decisions may reference investigation issues

---

## Format

ADRs follow a lightweight format:
- Sequential numbering (001, 002, ...)
- Chronological ordering by decision date (not creation date)
- Descriptive filename with slug
- Standard sections: Context, Decision, Rationale, Consequences, Related
- Status tracking (Proposed → Accepted → Deprecated/Superseded)
- YAML frontmatter with metadata (date, deciders, status)

---

## Notes on Renumbering

**v0.0.22 Backfill (2026-02-22):** Original ADRs were renumbered to match chronological order:
- Former ADR-001 (defer rules engine, Feb 16 v0.0.3→v0.0.4) → **ADR-005**
- Former ADR-002 (defer update notifications, Feb 21 v0.0.9) → **ADR-011**
- Nine new ADRs created (ADR-001 through ADR-004, ADR-006 through ADR-010) to capture decisions made during v0.0.1 through v0.0.8 development

All cross-references updated in: ROADMAP.md, FAQ.md, CHANGELOG.md, lessons-learned files.
