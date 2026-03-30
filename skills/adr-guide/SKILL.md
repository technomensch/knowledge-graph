# Skill: adr-guide

**Purpose:** Auto-surface ADR creation when user makes architectural decisions or chooses between technical approaches. Dispatches to the `create-adr-agent` for the full creation workflow.

**Trigger Keywords:**
- "I'm thinking of using"
- "we should switch to"
- "decision between"
- "which approach"
- "best way to"
- "should we use"
- "the problem is that"
- "here's what it should look like" / "here's what it should do instead"
- "needs to be redesigned" / "should be redesigned"
- "this should be" (when followed by an architectural description)
- Architecture/design discussions with choices
- Pattern identified during active use of a command or workflow

**Behavior:**
When triggered, guide the user toward documenting the decision as an Architecture Decision Record:
- Detect the decision topic from conversation context
- Suggest creating an ADR and pre-fill the title from the decision topic
- Dispatch to `create-adr-agent` with the detected context (title, category if inferrable)
- The agent handles the full interactive wizard: numbering, git metadata, prompts, template, index update

**Dispatch:**
When the user agrees to create an ADR, spawn the `create-adr-agent` subagent with:
- `title`: the detected decision topic (if available)
- Let the agent handle all subsequent interaction

**Example Trigger:**
```
User: "We need to decide: should we use PostgreSQL for the main database
or stick with the current approach?"
```

**Assistant Response:**
"This sounds like an architecture decision worth documenting. Want me to create an ADR for it? I can pre-fill the title as 'Use PostgreSQL for Primary Database'."

If the user agrees, dispatch to `create-adr-agent` with the pre-filled title.

**v0.2.1 Decision Note:** Agent dispatch was chosen over the previous `/kmgraph:create-adr` command suggestion because the ADR creation workflow (7 phases, 8 user prompts, git metadata, template population, index management) benefits from dedicated agent handling. The `create-adr` command's thin refactor to dispatch to this agent is deferred to v0.2.2.
