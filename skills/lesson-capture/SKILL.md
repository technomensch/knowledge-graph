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
- "this is a gap"
- "the issue is" (when describing a process or UX failure, not a git issue)
- "noticed that"
- "this doesn't work because"
- Bug resolved, workaround found, first-time setup complete, pattern identified
- Completion of debugging/troubleshooting context
- UX or process failure observed and named during active use

**Behavior:**
When triggered:

1. **Pre-structure context** from the conversation:
   - Extract the **problem** — what was wrong or what was being figured out
   - Extract the **solution** — what actually fixed it
   - Extract the **pattern** — any generalizable lesson or warning worth noting
   - Identify relevant **tags** from conversation (technology names, domain, etc.)

2. **Note:** When dispatching to lesson capture, the lesson-capture-agent includes a snapshot gate that offers to preserve session context first. This is presented to the user inside the agent flow — do not add a separate snapshot prompt here.

   **ECC Compatibility:** The slash command syntax (`/kmgraph:capture-lesson`) is Claude Code–specific. On other ECC platforms, the lesson-capture-agent is dispatched directly via agent invocation without a command namespace.

3. **Dispatch to lesson-capture-agent** with the pre-structured context as a named payload:

   ```
   context_provided: true
   problem: "[extracted problem]"
   solution: "[extracted solution]"
   pattern: "[extracted generalizable lesson]"
   tags: ["[tag1]", "[tag2]"]
   suggested_category: "[architecture|debugging|patterns|process]"
   ```

   The agent uses `context_provided: true` to skip its interactive wizard and go directly to draft generation.

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
- Tags: [caching, memory, invalidation]

Want me to document this as a lesson?"