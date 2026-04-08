---
id: capture-from-bugfix
title: Capture a Lesson from a Bug Fix
sidebar_label: Capture from a bug fix
description: How to document a debugging breakthrough as a reusable lesson while context is fresh
---

# Capture a Lesson from a Bug Fix

## Goal

Document a debugging breakthrough immediately after solving it, so the solution is searchable in future sessions instead of being lost in a chat thread.

## Prerequisites

- KMGraph initialized (`/kmgraph:init`)
- A solved bug with the root cause identified

## Steps

**1. Run the capture command immediately after solving**

```bash
/kmgraph:capture-lesson
```

The command prompts for a title, description, and category. Choose `debugging` for bug investigations.

**2. Fill in the lesson fields**

| Field | What to write |
|---|---|
| **Title** | Short phrase naming the root cause: "Redis connection timeout on cold start" |
| **Problem** | What the bug looked like from the outside |
| **Root cause** | The actual cause — be specific |
| **Solution** | Exactly what fixed it |
| **Prevention** | How to avoid it next time |
| **Tags** | Technology names, error codes, affected modules |

**3. Let git metadata attach automatically**

If git is enabled, the lesson captures the current branch, commit hash, and any linked issue number. No action needed.

**4. Use `--snapshot` when context is rich**

If the debugging session involved many steps, add a session snapshot first:

```bash
/kmgraph:capture-lesson --snapshot
```

This preserves the full session context alongside the lesson.

## Verify

```bash
/kmgraph:recall "the bug title or keywords"
```

The lesson should appear in results. If not, run `/kmgraph:update-graph` to extract patterns.

## Next steps

- [Capture the pipeline diagram explained](/quickstart#the-capture-pipeline)
- [Write a pattern entry](/guides/pattern-writing) if the bug reveals a reusable pattern
- [Create an ADR](/guides/create-adr) if the fix changes architecture
