---
id: architecture-decisions
title: Architecture Decisions
sidebar_label: Architecture Decisions
description: How to document an architecture decision with context, rationale, and consequences
---

# Architecture Decisions

> "We made a design choice. How do we record it so it's not relitigated six months later?"

An ADR (Architecture Decision Record) captures a tech choice or design tradeoff with enough context to understand it months later without asking the person who made it. You'll create one when you've made (or are actively considering) an architecture decision.

## The command

```bash
/kmgraph:create-adr
```

The wizard prompts for a title, status, decision summary, context, rationale, consequences, and implementation commit reference.

Verify with `/kmgraph:recall "ADR keywords"` — the ADR should appear and the file should exist in `docs/decisions/`.

## What to fill in

| Field | What to write |
|---|---|
| **Title** | "ADR-NNN: [Decision made]" — use the auto-numbered format |
| **Status** | `Proposed`, `Accepted`, `Deprecated`, or `Superseded` |
| **Context** | The situation that forced a decision — what was the problem? |
| **Decision** | The choice made, stated clearly |
| **Rationale** | Why this option over the alternatives |
| **Consequences** | Positive outcomes, negative tradeoffs, and mitigations |
| **Implementation Commit** | N/A — wizard automatically populates the commit and subject line of the commit |

**Design-first ADRs:** If the decision has not yet been implemented, the wizard accepts `null` for `implements` and adds a back-fill reminder to the ADR. Back-fill the field with the implementation commit hash once the work is merged:

```bash
/kmgraph:create-adr --amend ADR-NNN --implements <commit-hash>
```

## Link and index

After creation, link the ADR to related lessons:

```bash
/kmgraph:link-issue --adr ADR-NNN --lesson path/to/lesson.md
```

ADRs are auto-indexed in `docs/decisions/`. No manual step needed if using the command.

## Updating an ADR

To supersede an existing decision:

1. Create a new ADR with status `Accepted`
2. Update the old ADR's status to `Superseded by ADR-NNN`
3. Add a link in both documents

## Related

- [Capture Patterns](./capture-patterns.md) — for patterns uncovered during the decision process
- [Document Meta-Issues](./document-meta-issues.md) — if the decision spawned a multi-session investigation
- [What to Capture](./what-to-capture.md) — choosing between ADRs, lessons, and patterns

---

## Template

Full ADR template for manual use or reference:

```markdown
# ADR-NNN: [Decision Title]

**Status:** Accepted/Rejected/Deprecated/Superseded
**Date:** YYYY-MM-DD
**Authors:** [Names/roles]

## Context
[Forces at play, why decision needed. Include constraints: technical, organizational, time.]

## Options Considered

### Option 1: [Name]
**Pros:** ...
**Cons:** ...
**Verdict:** ✅ Chosen / ❌ Rejected / ⚠️ Works but...

### Option 2: [Name]
**Pros:** ...
**Cons:** ...
**Verdict:** ...

## Decision

[Which option was chosen and why — what values or priorities drove the choice.]

## Consequences

**Positive:**
- ...

**Negative:**
- ...

**Mitigations:**
- ...

## Review

Revisit if:
- [Condition that would invalidate this decision]

## Related
- **Lesson:** [[path/to/lesson.md]]
- **Pattern:** [[path/to/pattern.md]]
- **ADR:** [[path/to/related-adr.md]]
```
