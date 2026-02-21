# Architecture Decision Records (ADRs)

Formal documentation of significant architecture decisions.

**Total ADRs:** 2
**Last Updated:** 2026-02-21

---

## Active ADRs

- [ADR-001: Defer MEMORY.md Auto-Sync Rules Engine to v0.0.5](ADR-001-defer-memory-rules-engine.md) — **Status:** Accepted
- [ADR-002: Defer Update Notifications and Version Sync to v0.0.9](ADR-002-defer-update-notifications.md) — **Status:** Accepted

---

## All ADRs (Chronological)

- [ADR-001: Defer MEMORY.md Auto-Sync Rules Engine to v0.0.5](ADR-001-defer-memory-rules-engine.md) — **Status:** Accepted — Deferred rules engine and smart summarization; shipped restore-only in v0.0.4
- [ADR-002: Defer Update Notifications and Version Sync to v0.0.9](ADR-002-defer-update-notifications.md) — **Status:** Accepted — Deferred `kg_version` tool and cached GitHub check; version sync + `--version` flag planned for v0.0.9

---

## By Category

### Architecture
- [ADR-002](ADR-002-defer-update-notifications.md) — Update notifications and version sync for Tier 2/3 users

### Process
- [ADR-001](ADR-001-defer-memory-rules-engine.md) — MEMORY.md rules engine deferral

---

## ADR Statuses

- **Proposed:** Decision under consideration
- **Accepted:** Decision approved and implemented
- **Deprecated:** No longer relevant or superseded
- **Superseded:** Replaced by a newer ADR

---

## Creating a New ADR

1. **Determine next number:** Find the highest existing ADR number and increment
2. **Copy template:** Use [ADR-template.md](ADR-template.md)
3. **Fill all sections:** Context, Decision, Rationale, Consequences
4. **Link to evidence:** Reference lessons learned, KG entries, implementation
5. **Update this index:** Add entry above

---

## Integration

- **Knowledge Graph:** Architecture ADRs link to architecture.md entries
- **Lessons Learned:** Decisions often emerge from lessons
- **Meta-Issues:** Complex decisions may reference meta-issue investigations

---

## Format

ADRs follow a lightweight format:
- Sequential numbering (001, 002, ...)
- Descriptive filename with slug
- Standard sections: Context, Decision, Rationale, Consequences, Related
- Status tracking (Proposed → Accepted → Deprecated/Superseded)
