# Skill: lesson-capture

**Purpose:** Auto-capture lessons when user solves complex bugs, makes breakthroughs, identifies patterns, or completes debugging sessions.

**Trigger Keywords (detect any of these):**
- "figured it out"
- "the fix was"
- "turns out"
- "solved it"
- "the problem was"
- "I found out why"
- "learned that"
- "pattern here is"
- Bug resolved, workaround found, first-time setup complete, pattern identified
- Completion of debugging/troubleshooting context

**Behavior:**
When triggered:

1. **Pre-structure context** from the conversation:
   - Extract the **problem** — what was wrong or what was being figured out
   - Extract the **solution** — what actually fixed it
   - Extract the **pattern** — any generalizable lesson or warning worth noting
   - Identify relevant **tags** from conversation (technology names, domain, etc.)

2. **Note:** When dispatching to `/kmgraph:capture-lesson`, the command includes a snapshot gate that offers to preserve session context first. This is presented to the user inside the command flow — do not add a separate snapshot prompt here.

3. **Dispatch to lesson-capture-agent** with that pre-structured context

3. **Use friendly, user-addressed language** — never mention agent mechanics:
   - ✅ "Looks like you just solved something worth keeping — here's what I'd save:"
   - ✅ "I noticed you figured something out — want me to document that?"
   - ❌ "Dispatching to lesson-capture-agent..."
   - ❌ "Triggering agent with context..."

**Example Trigger:**
```
User: "Figured it out! The issue was the config being cached in memory.
We needed to invalidate on every write."

Skill response:
"Looks like you just solved something worth keeping. Here's what I'd capture:

- Problem: Config being cached in memory between writes
- Solution: Invalidate cache on every write operation
- Pattern: Cache invalidation timing matters in multi-state systems

Want me to document this as a lesson?"