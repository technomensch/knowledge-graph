# Skill: lesson-capture

**Purpose:** Auto-surface lesson capture when user solves complex bugs, makes breakthroughs, or completes debugging sessions.

**Trigger Keywords:**
- "figured it out"
- "the fix was"
- "the issue was"
- "learned that"
- "pattern here is"
- Completion of debugging/troubleshooting context

**Behavior:**
When triggered, proactively suggest running `/kmgraph:capture-lesson` and offer to:
- Pre-populate the problem statement from conversation context
- Pre-populate the solution/fix from discussion
- Pre-populate the pattern or insight discovered
- Guide user to save the lesson to active knowledge graph

**Example Trigger:**
```
User: "Figured it out! The issue was the config being cached in memory.
We needed to invalidate on every write."