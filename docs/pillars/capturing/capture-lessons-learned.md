---
title: Capture Lessons Learned
---

# Capture Lessons Learned

> "I solved something. How do I save it?"

This is the most common KMGraph action. When you fix a bug, reach a breakthrough, or learn something that will save you time later, you capture it — so your future self (and your AI assistant) can find it.

## The command

```
/kmgraph:kmg-capture-lesson
```

Run this at the end of any session where something clicked. Claude will ask you a few questions and write a structured entry to your knowledge graph. If git is enabled, branch, commit hash, and any linked issue number attach automatically. Confirm with `/kmgraph:kmg-recall "keywords"` — the entry should appear.

## What to fill in

| Field | What to write |
|---|---|
| **Title** | Short phrase naming the root cause: "Redis connection timeout on cold start" |
| **Problem** | What the bug looked like from the outside |
| **Root cause** | The actual cause — be specific |
| **Solution** | Exactly what fixed it |
| **Prevention** | How to avoid it next time |
| **Tags** | Technology names, error codes, affected modules |

## When to capture

Capture when:
- You fixed a bug that took more than 30 minutes
- You made a decision you might revisit
- You found a pattern worth reusing
- You hit a gotcha that future-you will hit again

Don't wait until the end of the week — capture while the context is fresh.

## Attach context

If the debugging session involved many steps, add a session snapshot first:

```bash
/kmgraph:kmg-capture-lesson --snapshot
```

This preserves the full session context alongside the lesson.

## Related

- [What to Capture](./what-to-capture.md) — choose between lessons, ADRs, patterns, and meta-issues
- [Architecture Decisions](./architecture-decisions.md) — when the fix changes a design choice
- [Capture Patterns](./capture-patterns.md) — if the bug reveals a reusable pattern

---

## Template

Full lesson template for manual use or reference:

```markdown
# [Short descriptive title — names the root cause]

**Tags:** [technology, error-code, module]
**Date:** YYYY-MM-DD

## Problem

[What the bug or situation looked like from the outside.]

## Root Cause

[The actual cause — be specific.]

## Solution

[Exactly what fixed it.]

## Prevention

[How to avoid this next time.]

## Related
- **ADR:** [[path/to/related-adr.md]]
- **Pattern:** [[path/to/related-pattern.md]]
```
