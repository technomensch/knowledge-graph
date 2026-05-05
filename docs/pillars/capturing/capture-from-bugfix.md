---
id: capture-from-bugfix
title: Capture from a Bugfix
sidebar_label: Capture from a Bugfix
description: How to document a debugging breakthrough as a reusable lesson while context is fresh
---

# Capture from a Bugfix

> "The bug is fixed. How do I save it before I forget?"

You've identified the root cause. Run the capture command now, before the context fades.

## The command

```bash
/kmgraph:capture-lesson
```

The command prompts for a title, description, and category. Choose `debugging` for bug investigations. If git is enabled, the lesson captures the current branch, commit hash, and any linked issue number automatically. Confirm with `/kmgraph:recall "keywords"` — the lesson should appear in results. If not, run `/kmgraph:update-graph` to extract patterns.

## What to fill in

| Field | What to write |
|---|---|
| **Title** | Short phrase naming the root cause: "Redis connection timeout on cold start" |
| **Problem** | What the bug looked like from the outside |
| **Root cause** | The actual cause — be specific |
| **Solution** | Exactly what fixed it |
| **Prevention** | How to avoid it next time |
| **Tags** | Technology names, error codes, affected modules |

## Attach context

If the debugging session involved many steps, add a session snapshot first:

```bash
/kmgraph:capture-lesson --snapshot
```

This preserves the full session context alongside the lesson.

## Related

- [Quickstart](../../quickstart.mdx#the-capture-pipeline)
- [Capture Patterns](./capture-patterns.md) if the bug reveals a reusable pattern
- [Architecture Decisions](./architecture-decisions.md) if the fix changes architecture
