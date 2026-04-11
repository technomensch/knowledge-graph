# ADR-021: Single Source of Truth for Documentation — DRY Principle

**Date:** 2026-03-28
**Status:** Accepted
**Implements:** v0.2.1-beta — Documentation standards and update-doc command
**Related:** [ADR-013](ADR-013-documentation-update-protocol.md), [Lesson: Single Source of Truth DRY Documentation](../lessons-learned/patterns/Lessons_Learned_Single_Source_Of_Truth_DRY_Documentation.md)

---

## Context

KMGraph ships with five user-facing documentation files: `CONCEPTS.md`, `COMMAND-GUIDE.md`, `CHEAT-SHEET.md`, `GETTING-STARTED.md`, and `README.md`. During v0.2.1-beta Phase 7c documentation updates, the four-layer architecture explanation was duplicated across `CONCEPTS.md` and `COMMAND-GUIDE.md`. When a subagent updated only one file, the other became stale.

This version skew problem scales with the number of docs and the frequency of architectural changes. The more docs that duplicate the same explanation, the higher the maintenance burden and the greater the risk of inconsistent information reaching users.

**Problem:** No rule existed defining which document owned which concept. Each doc update could independently describe architectural patterns, creating implicit duplication with no enforcement mechanism.

**Scope:**
- In scope: architectural concepts, pattern explanations, command rationale — anything that could be "explained" in prose
- Out of scope: command syntax tables, quick-reference examples, code snippets (these may appear in multiple docs for usability)

---

## Decision

Each architectural concept has **one authoritative source document**. Other documents reference it rather than duplicating the explanation.

### Authority Map

| Content Type | Authoritative Source |
|---|---|
| Architecture patterns, layer explanations, rationale | `docs/CONCEPTS.md` |
| Command usage, syntax, flags, examples | `docs/COMMAND-GUIDE.md` |
| Quick-reference syntax lookup | `docs/CHEAT-SHEET.md` |
| Getting-started workflows, tutorials | `docs/GETTING-STARTED.md` |

### Cross-Reference Pattern

When another doc needs to mention a concept owned by the authority doc, it uses a cross-reference:

```markdown
See [CONCEPTS.md § Four-Layer Architecture](CONCEPTS.md#four-layer-architecture) for architectural overview.
```

### Permitted Duplication

Quick-reference sections may repeat **syntax/code snippets** from the authority doc where it aids usability (e.g., a command example in CHEAT-SHEET that also appears in COMMAND-GUIDE). Conceptual explanations and rationale are never duplicated.

---

## Enforcement

This rule is documented in `commands/update-doc.md` under "Single Source of Truth (DRY for Documentation)". Every doc update through that command surfaces the authority map and asks the writer to identify the authoritative source before making changes.

---

## Consequences

**Benefits:**
- Single point of update: changing an architectural explanation updates it everywhere (via the cross-references)
- Readers always see the current explanation from the authority doc
- Subagents writing docs have a clear rule: write the explanation once in the authority doc, reference elsewhere
- Reduced review burden: only one doc needs detailed review for accuracy on each concept

**Trade-offs:**
- Cross-references require section headings to be stable; renaming a heading breaks links
- Readers navigating from a non-authority doc must follow a link, adding one navigation step
- Authority map must be maintained as new doc types are added

---

**Supersedes:** No prior ADR (new principle)
**Reviewed by:** Claude Sonnet 4.6
