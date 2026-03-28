# Skill: kg-recall

**Purpose:** Auto-invoke knowledge graph search when user asks about project history, past decisions, or previously solved problems.

**Trigger Keywords:**
- "have we done this before"
- "what did we decide about"
- "did we figure out"
- "is there a lesson on"
- "what do we know about"
- "have I seen this before"

**Behavior:**
When triggered:
1. Extract the user's search query/keywords from their question
2. Dispatch directly to `recall-agent` with the extracted query
3. Do NOT expose internal mechanics — present as natural knowledge retrieval

The recall agent will search the knowledge graph and surface relevant lessons, decisions, and patterns. It may also suggest related topics the user didn't explicitly ask about.

**Example Trigger:**
```
User: "Have we solved database migration issues before?
I'm seeing timeout errors on large tables."
```

**Assistant Response:**
"Let me check what we've documented about this before answering..."
→ [Dispatch to recall-agent with query: "database migration timeout errors"]
→ [Agent returns relevant lessons/decisions, including related patterns]
