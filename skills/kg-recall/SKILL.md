# Skill: kg-recall

**Purpose:** Auto-surface knowledge graph recall when user asks about project history, past decisions, or previously solved problems.

**Trigger Keywords:**
- "have we done this before"
- "what did we decide about"
- "past sessions"
- "do we have notes on"
- "remember when"
- "familiar problem"
- References to past work or previous decisions

**Behavior:**
When triggered, guide user to search knowledge graph via `/kmgraph:recall` before answering:
- Extract search terms from user's question
- Suggest recall command with relevant search filters
- Show previous lessons/decisions that apply
- Link to related documentation or ADRs

**Example Trigger:**
```
User: "Have we solved database migration issues before?
I'm seeing timeout errors on large tables."
```

**Assistant Response:**
Proactively suggest: "Let me check our knowledge graph for migration patterns we've documented..."
Then invoke `/kmgraph:recall` to find related lessons/decisions.
