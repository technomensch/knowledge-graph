# Skill: adr-guide

**Purpose:** Auto-surface ADR creation when user makes architectural decisions or chooses between technical approaches.

**Trigger Keywords:**
- "I'm thinking of using"
- "we should switch to"
- "decision between"
- "which approach"
- "best way to"
- "should we use"
- Architecture/design discussions with choices

**Behavior:**
When triggered, guide user toward documenting the decision as an Architecture Decision Record:
- Load ADR template context and constraints
- Suggest `/kmgraph:create-adr` with detected decision context
- Pre-fill title from decision topic
- Guide through status, category, rationale, consequences
- Link to related decisions

**Example Trigger:**
```
User: "We need to decide: should we use PostgreSQL for the main database
or stick with the current approach?"
```

**Assistant Response:**
Proactively suggest: "This is a good decision to document as an ADR.
Let me help you create one..."
Then guide through `/kmgraph:create-adr` wizard.
