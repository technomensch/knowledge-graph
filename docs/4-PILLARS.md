---
id: pillars-four
title: Four Pillars
sidebar_label: Four Pillars
description: "Four distinct knowledge types: Lessons, Patterns, Decisions, and Gotchas"
---

The knowledge graph system organizes information into four distinct types, each optimized for a different purpose. Together, these pillars form a comprehensive institutional memory.

#### The Four Pillars Relationships

Different knowledge types need different structures:

- Quick reference ≠ detailed narrative
- Formal decision ≠ informal learning
- Snapshot ≠ timeless knowledge

All four pillars work together to create a comprehensive institutional memory system:

```mermaid
%%{init: { 'flowchart': { 'useMaxWidth': true }, 'theme': 'neutral' }}%%
graph TD
    A["📚 Lessons Learned<br/>What was the problem &amp; solution?"]
    B["🏛️ Architecture Decisions<br/>Why was this choice made?"]
    C["🗺️ Knowledge Entries<br/>What patterns emerged?"]
    D["📸 Session Summaries<br/>What happened this session?"]

    A -->|evidence for| B
    A -->|extracts to| C
    A -->|documents| D
    B -->|referenced by| C
    C -->|links back to| A

    accTitle: Knowledge Graph Four Pillars
    accDescr: Relationship diagram showing how Lessons Learned provide evidence for Architecture Decisions and extract to Knowledge Entries. Decisions are referenced by Entries, which link back to Lessons. Session Summaries document what was accomplished.
```

---

#### Pillar 1: Lessons Learned

**What it is**: Detailed documentation of problems solved and how the solutions were reached.

```mermaid
%%{init: { 'flowchart': { 'useMaxWidth': true }, 'theme': 'neutral' }}%%
flowchart LR
    %% 1. Main Flow
    Problem[Identified Problem] --> Fixed[Fixed]

    %% 2. Branching: Fixed points to 4 stacked boxes
    Fixed --> Issue[What was the issue?]
    Fixed --> Analysis[What worked? What did not?]
    Fixed --> Resolution[What was the resolution?]
    Fixed --> Prevention[What prevents the recurrence?]

    %% 3. Final Step Container (Forces Vertical Stacking)
    subgraph FinalGroup [ ]
        direction TB
        Takeaway[Lesson Learned]
        %% Invisible link (~~~) pushes Caption below Takeaway
        Takeaway ~~~ Caption["<i>Prevents re-solving<br/>the same problem.</i>"]
    end

    %% 4. Converging: Middle boxes point to the Takeaway inside the subgraph
    Issue --> Takeaway
    Analysis --> Takeaway
    Resolution --> Takeaway
    Prevention --> Takeaway

```

**Location**: `/lessons-learned/` directory, organized by category.

**When to create**: After solving a non-trivial problem, discovering a useful technique, or fixing a tricky bug.

**Plain English**: A detective's case file for every problem solved.

:::note

"Lesson: Fixing PostgreSQL Connection Timeouts" — documents the problem, root cause, solution steps, and prevention strategies.

:::
---

#### Pillar 2: Architecture Decision Records (ADRs)

**What it is**: Formal documentation of important technical choices and the reasoning behind each decision.

**Location**: `/decisions/` directory, numbered sequentially (ADR-001, ADR-002, etc.).

**When to create**: When making a significant choice

 — selecting a database, choosing a framework, defining an API structure
 — where future team members might ask "why did the team do it this way?"

**Plain English**: A written record of "why this choice was made" so the reasoning is never lost.

:::note

"ADR-003: Choosing PostgreSQL Over MongoDB" — records the context, options considered, decision made, and expected consequences.

:::
---

#### Pillar 3: Knowledge Entries

**What it is**: Quick-reference entries that distill patterns, concepts, and common pitfalls into scannable summaries.

**Location**: `/knowledge/` directory, organized into categories:

- **patterns.md** — Reusable design patterns and best practices
- **concepts.md** — Core technical concepts and definitions
- **gotchas.md** — Common pitfalls and how to avoid each one

**When to create**: When a pattern emerges across multiple lessons, or when a concept needs a quick-reference summary.

**Relationship to lessons**: Knowledge entries are extracted from lessons. A lesson provides the full narrative; the corresponding knowledge entry provides the quick-reference summary with a link back to the lesson.

**Plain English**: Cheat sheets distilled from real experience.

---

#### Pillar 4: Session Summaries

**What it is**: Snapshot documentation of what happened during an important work session.

**Location**: `/sessions/` directory, organized by date.

**When to create**: After a significant work session — a major debugging effort, an architecture discussion, a sprint planning session.

**Plain English**: Meeting minutes for work sessions.

:::note

"2024-01-15 Database Migration Session" — records what was built, what was decided, what was learned, and what comes next.

:::
