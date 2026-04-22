# Architecture Decision Records (ADRs)

**Navigation**: [Home](../../../README.md) > [Getting Started](../../../docs/GETTING-STARTED.md) > [Manual Workflows](../../docs/WORKFLOWS.md) > Templates

Formal documentation of significant architecture decisions.

**Total ADRs:** 43
**Last Updated:** 2026-04-21

---

## Active ADRs

[ADRs with Status: Accepted]

---

## All ADRs (Chronological)

- [ADR-043: PreToolUse Hook Injection to Enforce User Rules During Superpowers Skill Execution](ADR-043-pretooluse-hook-injection-superpowers-rule-enforcement.md) — **Status:** Accepted — PreToolUse hook injects ~/.kmgraph/rules.md before brainstorming/writing-plans skills execute, ensuring file-location and execution-mode rules override skill defaults. (Renumbered from ADR-041 — cross-branch collision.)
- [ADR-042: ADR `implements` Field — Mandatory Implementation Commit Reference](ADR-042-adr-implements-commit-reference-mandatory.md) — **Status:** Accepted — Every ADR must include the implementation commit hash in the `implements` YAML field; rule lives at user level in `~/.kmgraph/rules.md`; enforcement wired into create-adr-agent wizard (Phase 3).
- [ADR-041: Tier Abstraction Label System for Model Selection](ADR-041-tier-abstraction-label-system.md) — **Status:** Accepted — Three tier labels (fast-tier, standard-tier, powerful-tier) abstract platform-specific model names; alias map and validation gate implemented in v0.5.2-beta Phase 3.
- [ADR-038: Model Selection Rule for Knowledge Graph Tasks](ADR-038-model-selection-rule-for-kg-tasks.md) — **Status:** Accepted — Route Haiku for write/capture operations (ADRs, lessons, sessions); Sonnet for review; Opus for complex judgment.
- [ADR-037: Default Graph-Usage Rules Seeded at Deployment](ADR-037-default-rules-for-graph-deployment.md) — **Status:** Proposed — Seed default meta-rules (ADR vs. memory, rules.md references) at graph init time.
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
- [ADR-043: PreToolUse Hook Injection for Superpowers Rule Enforcement](ADR-043-pretooluse-hook-injection-superpowers-rule-enforcement.md) — PreToolUse hook injects rules.md before brainstorming/writing-plans; two-scope (plugin + user-wide). Renumbered from ADR-041.
- [ADR-042: ADR `implements` Field — Mandatory Implementation Commit Reference](ADR-042-adr-implements-commit-reference-mandatory.md) — Mandatory `implements` YAML field for all ADRs; design-first and ad hoc workflows defined; rule at user level
- [ADR-041: Tier Abstraction Label System for Model Selection](ADR-041-tier-abstraction-label-system.md) — Three tier labels abstract model names; alias map (S4) and validation gate (S5) implemented in v0.5.2-beta
- [ADR-038: Model Selection Rule for Knowledge Graph Tasks](ADR-038-model-selection-rule-for-kg-tasks.md) — Route Haiku for write/capture; Sonnet for review; Opus for judgment
- [ADR-037: Default Graph-Usage Rules Seeded at Deployment](ADR-037-default-rules-for-graph-deployment.md) — Seed meta-rules at init time
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
