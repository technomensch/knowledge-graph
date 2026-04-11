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

1. **Extract context** from the conversation before asking anything:
   - **Title** — the decision topic (e.g., "Use PostgreSQL for Primary Database")
   - **Context** — the situation or problem that forced this decision (2-5 sentences from conversation)
   - **Decision** — what was decided or is being proposed (1-3 sentences)
   - **Rationale** — reasons and alternatives mentioned in conversation (bullets if multiple)
   - **Consequences** — impacts mentioned (positive and negative; leave blank if not discussed)
   - **Status** — default "Proposed" unless user said "we decided" / "we're going with" (use "Accepted")
   - **Category** — infer from topic (Architecture / Process / Technology)

2. **Show the user a summary** of what was extracted:
   > "This looks like an architecture decision worth capturing. Here's what I'd pre-fill:
   >
   > **Title:** [title]
   > **Status:** [status]
   > **Context:** [context]
   > **Decision:** [decision]
   > **Rationale:** [rationale]
   >
   > Want me to create the ADR from this?"

3. **Dispatch to `create-adr-agent`** with the full context payload if user agrees:

   ```
   context_provided: true
   title: "[title]"
   status: "[Proposed|Accepted]"
   category: "[Architecture|Process|Technology]"
   context: "[context text]"
   decision: "[decision text]"
   rationale: "[rationale text]"
   consequences: "[consequences text or blank]"
   related_lessons: []
   ```

   The agent uses `context_provided: true` to skip its interactive wizard and go directly to draft generation.

**Dispatch:**
When the user agrees to create an ADR, spawn the `create-adr-agent` subagent with the full context payload defined in Behavior step 3 above.

**Example Trigger:**
```
User: "We need to decide: should we use PostgreSQL for the main database
or stick with the current approach?"
```

**Assistant Response:**
"This looks like an architecture decision worth capturing. Here's what I'd pre-fill:

**Title:** Use PostgreSQL for Primary Database
**Status:** Proposed
**Context:** The team is evaluating whether to adopt PostgreSQL for the main database or continue with the current approach.
**Decision:** Switch to PostgreSQL as the primary database.
**Rationale:** PostgreSQL offers better support for complex queries and has strong community support.

Want me to create the ADR from this?"

If the user agrees, dispatch to `create-adr-agent` with the full context payload.

**v0.2.1 Decision Note:** Agent dispatch was chosen over the previous `/kmgraph:create-adr` command suggestion because the ADR creation workflow (7 phases, 8 user prompts, git metadata, template population, index management) benefits from dedicated agent handling. The `create-adr` command's thin refactor to dispatch to this agent is deferred to v0.2.2.
