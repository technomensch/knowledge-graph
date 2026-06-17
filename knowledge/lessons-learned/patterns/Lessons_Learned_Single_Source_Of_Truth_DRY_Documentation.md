---
title: >-
  Lesson: Single Source of Truth (DRY) for Documentation — Avoid Concept
  Duplication
category:
  uri: uri-that-does-not-map-to-patterns
---

# Lesson: Single Source of Truth (DRY) for Documentation — Avoid Concept Duplication

**Date:** 2026-03-28
**Category:** Patterns (Documentation Architecture)
**Discovered during:** v0.2.1-beta Phase 7c documentation updates

---

## Problem

During v0.2.1-beta, the four-layer architecture was explained in both `docs/CONCEPTS.md` and `docs/COMMAND-GUIDE.md`. When a subagent updated CONCEPTS.md with the authoritative explanation, COMMAND-GUIDE.md still had the old version. A reviewer caught the inconsistency — but the root cause was duplication, not the agents.

**The version skew risk:** Any time the same concept appears in two docs, an update to one leaves the other stale. The longer the gap between updates, the more divergent the explanations become. Users reading the "wrong" doc see outdated information.

---

## Solution: Single Authoritative Source

Each architectural concept has **one authoritative source**. Other docs reference it rather than duplicating it.

### Authority Map for KMGraph

| Concept Type | Authoritative Source |
|---|---|
| Architecture patterns, layer explanations | `docs/CONCEPTS.md` |
| Command usage, syntax, flags | `docs/COMMAND-GUIDE.md` |
| Quick-reference syntax snippets | `docs/CHEAT-SHEET.md` |
| Getting-started workflows | `docs/GETTING-STARTED.md` |

### Correct Pattern

```
docs/CONCEPTS.md:
  "The four-layer architecture separates concerns across Context, Logic,
   Lifecycle, and Data layers. [full explanation with diagrams and rationale]"

docs/COMMAND-GUIDE.md:
  "See CONCEPTS.md § Four-Layer Architecture for architectural overview."
```

### Incorrect Pattern (avoid)

```
docs/CONCEPTS.md:
  "The four-layer architecture separates concerns across..."
docs/COMMAND-GUIDE.md:
  "The four-layer architecture separates concerns across..."
← DUPLICATION: version skew risk if one is updated but not the other
```

---

## Permitted Exceptions

Quick-reference sections (CHEAT-SHEET.md) may repeat **syntax/code snippets** from the authority doc for readability. They must NOT repeat conceptual explanations or rationale — only the minimal syntax needed for quick lookup.

---

## When to Apply

- When writing documentation that explains a concept or architectural pattern
- When updating an authority doc: audit all cross-references to verify they still point to current section headings
- When a subagent writes documentation: check for duplicated explanations before accepting the output
- NOT needed for: syntax tables, command examples, quick-reference boxes (these can duplicate syntax, not concepts)

---

## Implementation Location

The full DRY documentation pattern, authority map, and enforcement guidance are in:
- `commands/update-doc.md` → Section: "Single Source of Truth (DRY for Documentation)"

---

## Related

- **ADR-021:** Single Source of Truth for Documentation — DRY Principle (architectural decision)
- **Lesson:** Documentation Deprecation Lifecycle

---

## See Also

- [Knowledge Graph: Patterns — Single Source of Truth (DRY) for Documentation](../../knowledge/patterns.md#single-source-of-truth-dry-for-documentation)

---

**Category:** patterns
**Status:** Implemented in update-doc command (v0.2.1-beta)
**Last Updated:** 2026-03-28
