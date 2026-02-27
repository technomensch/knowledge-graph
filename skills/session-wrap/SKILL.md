# Skill: session-wrap

**Purpose:** Prompt for session summary when user indicates they're stopping work, approaching context limits, or reaching milestones.

**Trigger Indicators:**
- User says "stopping", "done", "wrapping up", "I'm out"
- Context approaching 180K tokens (~90% of limit)
- Pushing a PR or closing an issue
- Reaching a feature milestone or version bump
- End-of-day or natural stopping point in conversation

**Behavior:**
When triggered, remind and guide user to:
- Run `/kmgraph:session-summary` to document current work state
- Capture what was built, decided, and learned
- Record commits and file changes for future reference
- Optionally sync findings to knowledge graph

**Example Trigger:**
```
User: "Alright, I've pushed this to the branch. Wrapping up for today."
```

**Assistant Response:**
"Before I lose context, let me document this session so we don't lose the work summary..."
Then prompt: "Ready to run `/kmgraph:session-summary` to capture what we built today?"
