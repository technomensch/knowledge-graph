---
title: "ADR-038: Model Selection Rule for Knowledge Graph Tasks"
number: 038
created: 2026-04-21T15:30:00Z
status: Accepted
author: technomensch
email: 917847+technomensch@users.noreply.github.com
git:
  branch: main
  commit: 2fae5c6
  pr: null
  issue: null
implements: null
related:
  adrs:
    - "[[ADR-037-default-rules-for-graph-deployment]]"
  lessons: []
  kg_entries: []
tags: [process, model-selection, task-routing, optimization]
category: process
---

# ADR-038: Model Selection Rule for Knowledge Graph Tasks

**Date:** 2026-04-21  
**Status:** Accepted  
**Related:** ADR-037 (default graph rules)

---

## Context

Knowledge graph operations span a wide range of complexity:
- **Write/capture operations** — Adding lessons, ADRs, session summaries, comments. Structured data entry with clear templates.
- **Search/recall operations** — Querying existing entries, generating pointers, retrieving context.
- **Analysis/review operations** — Evaluating ADRs for quality, recommending improvements, resolving conflicts.
- **Complex judgment tasks** — Designing new patterns, resolving architectural trade-offs, scope analysis.

Currently, all operations default to the primary model (Sonnet/Opus). This creates unnecessary latency and cost overhead for tasks that don't require high-end reasoning capability.

**Observation from practice (career-prism, 2026-04-21):**

The kmgraph session capture workflow involves structured data entry (ADR creation, lesson capture, comment analysis). These tasks are straightforward template-filling operations where Haiku is fully capable and significantly faster. Haiku can:
- Parse user intent for ADRs (title, status, category, context, decision, rationale, consequences)
- Structure YAML frontmatter correctly
- Generate filenames and cross-references
- Update index files with correct formatting
- Commit with proper messages

Conversely, tasks requiring significant judgment (architecture review, conflict resolution, design of new patterns) benefit from the reasoning depth of Sonnet or Opus.

---

## Decision

**Route knowledge graph tasks by type:**

| Task Category | Recommended Model | Rationale |
|---------------|------------------|-----------|
| **Write/Capture** | Haiku | Structured data entry, templates, no complex reasoning |
| — ADR creation | Haiku | Parse form input, populate template, update index |
| — Lesson capture | Haiku | Structure YAML frontmatter, update memory index |
| — Session summary | Haiku | Summarize conversation, extract facts, format markdown |
| — Comments/notes | Haiku | Add to existing entries, preserve structure |
| **Search/Recall** | Haiku | Index lookup, pointer generation, no synthesis |
| — Query existing entries | Haiku | Grep/FTS, retrieve, format results |
| — Generate cross-references | Haiku | Link related entries, update backlinks |
| **Review/Validation** | Sonnet | Pattern matching, quality assessment |
| — ADR quality review | Sonnet | Evaluate decision logic, identify gaps, suggest improvements |
| — Lesson learned review | Sonnet | Assess completeness, check for duplicates, improve framing |
| **Complex Judgment** | Sonnet/Opus | High-level reasoning, trade-offs, novel patterns |
| — Architecture design | Sonnet/Opus | Evaluate alternatives, document trade-offs, recommend approach |
| — Conflict resolution | Sonnet/Opus | Analyze competing ADRs, suggest resolution, document reasoning |
| — Pattern design | Sonnet/Opus | Novel process patterns, cross-project rules, governance |

**Implementation:**

Add to `knowledge/rules.md` (Runtime Behavior section):

```markdown
## Model Selection for Knowledge Graph Tasks

**Default:** Use Haiku for write/capture operations (ADR creation, lesson capture, session summaries, comments). 
These are structured data entry tasks with clear templates — Haiku is fully capable and significantly faster.

**Route to Sonnet:** Task requires evaluation of existing entries (ADR review, lesson quality assessment, duplicate detection).

**Route to Sonnet/Opus:** Task involves architectural judgment, conflict resolution, or novel pattern design.

**Gate:** Before routing to Opus, confirm the task truly requires Opus-level reasoning. Most KG tasks fit into Haiku or Sonnet category.
```

---

## Rationale

**Primary reasons for this choice:**

1. **Performance:** Haiku is 3–5x faster than Sonnet for structured data tasks. Write/capture workflows benefit from speed.
2. **Cost:** Haiku token cost is ~10% of Sonnet. Write-heavy workflows (multiple ADRs, lesson captures per session) accumulate significant savings.
3. **Capability matching:** Haiku is fully capable for template-based operations. Using Sonnet for form-filling is over-provisioning.
4. **Consistency:** Establishing a routing rule reduces ambiguity. Every task has a clear default route.

**Alternatives considered:**

- **Always use Sonnet (current practice):** Simplest to implement (no routing logic), but wastes resources on routine tasks.
- **Always use Haiku:** Reduces cost and latency, but fails on judgment-heavy tasks (e.g., ADR review, architectural decisions).
- **User selects model per task:** Requires user awareness of model capabilities and overhead. Creates inconsistent patterns.

**Trade-offs accepted:**

- Requires implementing routing logic in skills and agents.
- Developers must classify tasks correctly (judgment call for edge cases).
- No single "default works for everything" — must make routing decisions.

---

## Consequences

**Positive:**

✅ **Latency improvement:** Write/capture workflows complete 3–5x faster (Haiku response time ~500ms vs. Sonnet ~2–3s).

✅ **Cost reduction:** Haiku token cost is ~10% of Sonnet. A session with 5 ADR creations + 3 lesson captures saves ~60% vs. Sonnet-all-the-way.

✅ **Clearer mental model:** Developers understand the routing rule and can explain why a task uses a given model.

✅ **Scalability:** As KG usage grows (more sessions, more entries), savings compound.

**Negative:**

❌ **Implementation overhead:** Skills and agents must implement routing logic. Initial setup cost ~2–4 hours per skill.

❌ **Edge-case ambiguity:** Some tasks are borderline (e.g., "improve a lesson's framing" — is that capture or review?). Requires judgment.

❌ **Potential for misrouting:** If a task is incorrectly classified as "Haiku-suitable" when it actually needs judgment, quality suffers. Mitigation: start conservative, route borderline tasks to Sonnet, observe patterns.

**How costs are mitigated:**

- **Clear routing table (above)** — reduces ambiguity and misrouting.
- **Sonnet as safe default for borderline tasks** — if unsure, route up rather than down.
- **Observation and iteration** — if a Haiku-routed task fails, escalate and document as "actually requires Sonnet."

---

## Related Decisions

- **ADR-037:** Default rules seeded at graph deployment. This ADR is a concrete instantiation of that principle.
- **ADR-034:** Capture-level routing dispatcher. Complements this decision by automating level detection.

---

## Implementation Notes

- Add routing rule to `knowledge/rules.md` Runtime Behavior section.
- Update all kmgraph skills (`create-adr`, `capture-lesson`, `session-summary`) to route based on this table.
- Document in `CLAUDE.md` under "Knowledge Graph Usage" section.
- Review after 3 sessions of observation; update if patterns suggest different routing.

---

**Accepted:** 2026-04-21  
**Author:** technomensch  
**Implements:** Cost and latency optimization for KG workflows
