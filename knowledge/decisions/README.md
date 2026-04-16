# Architecture Decision Records (ADRs)

**Navigation**: [Home](../../../README.md) > [Getting Started](../../../docs/GETTING-STARTED.md) > [Manual Workflows](../../docs/WORKFLOWS.md) > Templates

Formal documentation of significant architecture decisions.

**Total ADRs:** 34
**Last Updated:** 2026-04-15

---

## Active ADRs

[ADRs with Status: Accepted]

---

## All ADRs (Chronological)

- [ADR-034: Capture Level Routing — Dispatcher/Agent Split with Shared gov-capture-routing Skill](ADR-034-capture-level-routing-dispatcher-agent-split.md) — **Status:** Accepted — Dispatchers resolve NL to explicit flags; agents handle flags only; gov-capture-routing skill is the single source of truth for all routing logic.
- [ADR-031: Use Plural `Lessons_Learned_` Prefix for Lesson Filenames](ADR-031-lessons-learned-plural-prefix-naming.md) — **Status:** Accepted — Retroactively documents the `Lessons_Learned_` naming convention established in v0.2.1-beta; plural form is semantically correct and enforced by `capture.ts`.
- [ADR-030: Migration Moves KMGraph-Named Subdirectories Only — Never the Entire docs/ Directory](ADR-030-migration-moves-named-subdirs-only-never-entire-docs.md) — **Status:** Accepted — Migration moves only KMGraph-named subdirs (`lessons-learned/`, `decisions/`, etc.) plus scaffold files; never the entire `docs/` directory.
- [ADR-029: Plan File Location in Knowledge Graph](ADR-029-plan-file-location-in-knowledge-graph.md) — **Status:** Accepted — Plans linked to an ENH go in `knowledge/ENH-NNN/vX-plan.md`; issue plans in `knowledge/issue-NNN/vX-plan.md`; misc bundled plans in `knowledge/plans/vX-plan.md`.
- [ADR-025: Do not commit `enabledPlugins` blocks in `.claude/settings.json`](ADR-025-do-not-commit-enabledplugins-blocks.md) — **Status:** Accepted — Committed `enabledPlugins` blocks create orphaned scope references for cloners; rely on `.claude-plugin/plugin.json` auto-detection instead.

---

## By Category

### Architecture
- [ADR-034: Capture Level Routing — Dispatcher/Agent Split](ADR-034-capture-level-routing-dispatcher-agent-split.md) — Dispatchers resolve NL → flags; agents handle flags only; gov-capture-routing is single source of truth; user-level bypasses kg_capture
- [ADR-031: Use Plural `Lessons_Learned_` Prefix for Lesson Filenames](ADR-031-lessons-learned-plural-prefix-naming.md) — Plural form is semantically correct; hardcoded in `capture.ts`; changing it would require migration of 33 files
- [ADR-030: Migration Moves KMGraph-Named Subdirectories Only](ADR-030-migration-moves-named-subdirs-only-never-entire-docs.md) — Named subdir list prevents collision with docs sites; explicit scope over blanket directory moves

### Process
- [ADR-029: Plan File Location in Knowledge Graph](ADR-029-plan-file-location-in-knowledge-graph.md) — Three-location plan structure: ENH folder, issue folder, or knowledge/plans/ fallback
- [ADR-025: Do not commit `enabledPlugins` blocks](ADR-025-do-not-commit-enabledplugins-blocks.md) — Plugin settings scope hygiene for committed repos

### Technology Choices
- [ADR-XXX](ADR-XXX-title.md) — [Topic]

---

## ADR Statuses

- **Proposed:** Decision under consideration
- **Accepted:** Decision approved and implemented
- **Deprecated:** No longer relevant or superseded
- **Superseded:** Replaced by a newer ADR

---

## Field Guide

The ADR template uses manual markdown fields (no auto-fill commands yet):

**Header Fields (all manual):**
- `ADR-XXX` - Sequential number (e.g., ADR-001, ADR-002)
- `Title` - Concise decision description
- `Date` - Date decision was made (format: 2024-01-15)
- `Status` - Current status (Proposed | Accepted | Deprecated | Superseded)
- `Implements` - Optional: Version or feature this applies to
- `Related` - Optional: Links to related ADRs, lessons, KG entries

**Content Sections:**
All sections are manually filled:
- **Context** - Why this decision is needed
- **Decision** - What was decided (clear, concise statement)
- **Rationale** - Why this choice over alternatives
- **Consequences** - Positive and negative impacts
- **Related** - Links to implementation, lessons, KG entries

**Troubleshooting:**
- ADRs are created manually — no auto-fill commands yet
- Replace all `[bracketed placeholders]` with your content
- For sequential numbering, check the highest existing ADR number and add 1

**Examples:**
See [core/examples/decisions/](../../examples/decisions/) for filled-out ADR examples.

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

---

## Learn More

**Concepts & Guides**:
- [Concepts Guide](../../../docs/CONCEPTS.md#adr-architecture-decision-record) - Term explanations
- [ADR template](ADR-template.md) - Starting scaffold

**Resources**:
- [Real Examples](../../examples/decisions/) - Filled-out ADRs
- [Pattern Guide](../../docs/PATTERNS-GUIDE.md) - Writing quality tips
- [triggers.md — Platform-Agnostic Rule Timing Companion File](ADR-033-triggersmd-platform-agnostic-rule-timing-companion-file.md)
