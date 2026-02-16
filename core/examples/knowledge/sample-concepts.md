# Core Concepts

<!-- THIS IS AN EXAMPLE — Replace with your project's concepts -->

**Last Updated:** 2026-02-13
**Entries:** 6

This file contains example concepts from a real project, generalized for demonstration purposes. Use these as templates for documenting your own project's core concepts.

---

## Quick Navigation

- [Memory Systems](#memory-systems) - Four-pillar knowledge capture architecture
- [Cross-Referencing](#cross-referencing) - Bidirectional linking system
- [Template-Driven Consistency](#template-driven-consistency) - Standardization approach
- [Categorization](#categorization) - Knowledge organization strategy
- [Automation Strategy](#automation-strategy) - Manual triggers vs. automatic execution
- [Passive vs Active Enforcement](#passive-vs-active-enforcement) - Why documentation alone cannot force compliance

---

## Architecture Concepts

### Memory Systems

**Category:** Concept
**Tags:** #architecture #memory #knowledge-management

#### Quick Summary

A four-pillar memory system captures and retrieves knowledge across sessions, ensuring persistent context and preventing knowledge loss.

#### Details

**Four Pillars:**
1. **Lessons Learned** - Detailed problem-solving journeys categorized by type
2. **Architecture Decision Records (ADRs)** - Formal decision documentation
3. **Knowledge Graph** - Quick-reference concepts, patterns, and gotchas
4. **Session Summaries** - Auto-documented work context

**The LEVERAGE Principle:**
- **KG (Knowledge Graph)** = Quick reference (5-10 seconds to scan and understand "what")
- **Lessons** = Deep dive (5-10 minutes to understand "how" and "why")
- KG entries link to detailed lessons for full context
- Lessons extract key insights to KG for future quick access
- Bidirectional relationship ensures both stay synchronized

**Why Four Pillars:**
- Different types of knowledge need different structures
- Quick reference vs. deep narrative serve different use cases
- Formal decisions vs. informal learnings require different templates
- Historical snapshots vs. timeless knowledge have different longevity

#### Common Use Cases

- Finding solutions to previously-solved problems
- Understanding why decisions were made
- Quick reference during active development
- Onboarding new contributors
- Preventing repeated mistakes
- Building institutional knowledge

#### Cross-References

- **Pattern:** [[patterns.md#four-pillar-memory]]
- **Pattern:** [[patterns.md#bidirectional-memory-sync]]
- **Related:** [[Automation Strategy](#automation-strategy)]

---

### Cross-Referencing

**Category:** Concept
**Tags:** #linking #navigation #relationships #knowledge-graph

#### Quick Summary

Bidirectional links between related documents (lessons ↔ ADRs ↔ sessions ↔ knowledge) create an interconnected knowledge graph, not just isolated files.

#### Details

**Link Types:**
- Lessons reference ADRs that formalize their decisions
- ADRs reference lessons that motivated them
- Sessions link to artifacts created during that session
- Knowledge entries point to detailed lessons
- Gotchas link to lessons describing workarounds

**Notation Conventions:**
- `ADR-NNN`: Architecture Decision Record
- `L-YYYY-MM-DD`: Lesson Learned  
- `S-YYYY-MM-DD`: Session Summary
- `[[concept]]`: Knowledge Graph entry
- `#issue-NNN`: Local issue identifier

**Benefits:**
- Multiple discovery paths (not just hierarchical)
- Context emerges from connections
- Reduces duplication (link instead of copying)
- Validates completeness (orphaned documents are easily spotted)

**Implementation:**
- Add "Cross-References" section to all templates
- Link when creating (not as afterthought)
- Bidirectional (if A links to B, B should link to A)
- Automated tools can validate links

#### Key Insight

Cross-references transform isolated documents into an interconnected knowledge system. The value isn't in individual documents, but in the *network* of relationships between them.

#### Cross-References

- **Pattern:** [[patterns.md#bidirectional-memory-sync]]
- **Related:** [[Memory Systems](#memory-systems)]
- **Related:** [[Categorization](#categorization)]

---

## Organization Concepts

### Template-Driven Consistency

**Category:** Concept
**Tags:** #templates #standardization #quality #documentation

#### Quick Summary

Use standardized templates for recurring document types to ensure uniform structure, completeness, and quality across all documentation.

#### Details

**Template Types:**
- Lessons learned template (Problem → Root Cause → Solution → Replication → Lessons)
- ADR template (Context → Options → Decision → Consequences)
- Session summary template (Overview → Built → Decided → Learned → Next)
- Knowledge entry template (Quick Summary → Details → Use Cases → Cross-Refs)
- Issue template (Description → Acceptance Criteria → Plan → Status)

**Benefits:**
- **Enforces completeness:** No missing sections (template has all required parts)
- **Reduces cognitive load:** Familiar structure means less "what should I write?" paralysis
- **Improves searchability:** Consistent formatting makes grep/search more effective
- **Accelerates creation:** Fill-in-the-blank is faster than blank page
- **Quality baseline:** Even rushed documentation hits minimum bar

**Anti-Pattern:**
Using templates rigidly without customization. Templates are *starting points*, not straitjackets. Adapt sections as needed, but maintain core structure.

#### Key Insight

Templates don't constrain creativity — they ensure a minimum quality bar while allowing customization. They free mental energy from "what structure?" to focus on "what content?"

#### Cross-References

- **Pattern:** [[patterns.md#template-driven-docs]]
- **Related:** [[Memory Systems](#memory-systems)]
- **Related:** [[Categorization](#categorization)]

---

### Categorization

**Category:** Concept
**Tags:** #organization #taxonomy #discoverability #navigation

#### Quick Summary

Organize content into functional categories (architecture, debugging, process, patterns) for better navigation and discovery. Multiple paths to the same content improve findability.

#### Details

**Category Strategy:**
- **Architecture:** Design decisions, patterns, structural choices, system design
- **Debugging:** Troubleshooting, bug investigations, error resolution, diagnostics
- **Process:** Workflows, SOPs, development practices, team coordination
- **Patterns:** Reusable solutions, templates, repeatable approaches, best practices
- **Governance:** Project management, compliance, standards, auditing (if applicable)

**Auto-Detection:**
Keywords in topic/description map to categories automatically:
```
"architecture", "design", "system" → architecture/
"bug", "debug", "error", "crash" → debugging/
"workflow", "process", "procedure" → process/
"pattern", "template", "reusable" → patterns/
```

**Why Categories Matter:**
- **Browsing:** Users can explore related content without knowing exact search terms
- **Context:** Category implies purpose (debugging lesson vs. architectural decision)
- **Scalability:** Flat structure doesn't scale beyond ~20 files
- **Discovery:** Multiple paths (category, tag, chronological, cross-ref) beat single hierarchy

**Custom Categories:**
Projects can define their own. Examples:
- `security/` for security-focused projects
- `performance/` for optimization-heavy work
- `ml-ops/` for machine learning operations
- `compliance/` for regulatory environments

#### Key Insight

Multiple discovery paths (category, tag, chronological, search, cross-ref) beat single rigid hierarchy. Categories are one lens, not the only lens.

#### Cross-References

- **Pattern:** [[patterns.md#category-auto-detection]]
- **Related:** [[Template-Driven Consistency](#template-driven-consistency)]
- **Related:** [[Cross-Referencing](#cross-referencing)]

---

## Workflow Concepts

### Automation Strategy

**Category:** Concept
**Tags:** #automation #workflow #triggers #manual-vs-automatic

#### Quick Summary

The knowledge system automates capture *execution* when skills/commands are invoked, but requires manual *triggering*. Automation removes tedium while preserving judgment.

#### Details

**What's Automatic (Execution):**

When you invoke a command/skill, it automates:
- **`/knowledge:capture-lesson`:** Auto-categorizes, updates indexes, creates cross-refs, commits
- **`/knowledge:session-summary`:** Auto-detects session type, extracts key artifacts, organizes by date
- **`/knowledge:recall`:** Auto-searches across all memory systems, ranks results, formats output
- **`/knowledge:sync-all`:** Runs entire 4-step pipeline with single confirmation

**What's Manual (Triggers):**

You must decide WHEN to invoke commands:
- Recognizing a problem is worth documenting (not every bug needs a lesson)
- Knowing when to create an ADR vs. lesson (architectural significance)
- Triggering session summary before context limits (~180K tokens)
- Deciding which knowledge to extract to graph (signal vs. noise)

**Current State:**
```
┌─────────────────┐
│ User recognizes │ ← MANUAL DECISION
│ capture moment  │   (Requires judgment)
└────────┬────────┘
         │
         ▼
    ┌────────┐
    │ Invoke │
    │ command│ ← MANUAL TRIGGER
    └───┬────┘   (Simple action)
        │
        ▼
┌───────────────┐
│ Command handles│ ← AUTOMATIC EXECUTION
│ everything else│   (No tedium)
└───────────────┘
```

**Why Manual Triggers:**

1. **Context awareness:** Only humans know if a solution is novel or routine
2. **Quality control:** Not every commit deserves a lesson learned
3. **Judgment calls:** Deciding between ADR, lesson, or knowledge entry requires understanding
4. **Cognitive load:** Auto-triggering could create documentation fatigue (noise)

**Future Automation Possibilities:**

*Not currently implemented, but could be added:*
- Smart triggers: Detect patterns suggesting documentation (long debugging session, significant refactor)
- Context-based suggestions: "You're at 180K tokens — run `/knowledge:session-summary`?"
- Commit hooks: After significant commits, suggest `/knowledge:capture-lesson`
- Cross-reference detection: Auto-link related ADRs/lessons based on content analysis

#### Key Insight

The system is **semi-automatic**: it removes the *tedium* of documentation (formatting, filing, indexing, committing) but preserves the *judgment* of what to document. This balance prevents both under-documentation (manual tedium causes avoidance) and over-documentation (noisy auto-capture creates fatigue).

#### Cross-References

- **Pattern:** [[patterns.md#automated-orchestrator]]
- **Pattern:** [[patterns.md#smart-defaults]]
- **Related:** [[Memory Systems](#memory-systems)]

---

## Process Concepts

### Passive vs Active Enforcement

**Category:** Concept
**Tags:** #enforcement #llm-engineering #compliance #critical

#### Quick Summary

The critical distinction between passive enforcement (documentation that CAN be ignored) and active enforcement (mechanisms that CANNOT be bypassed) when working with AI systems.

#### Details

**Passive Enforcement (Insufficient Alone):**
- Documentation, guidelines, system prompts
- Templates, instruction files, best practices
- Project context files with attached rules
- Any instruction the AI can read and potentially ignore

**Active Enforcement (Required for Reliability):**
- Human-in-the-loop gates (user must approve before proceeding)
- External validation scripts (run outside AI, non-bypassable)
- UI-level gates (button disabled until validation passes)
- Forced multi-turn conversation structure
- Structural constraints (type systems, schemas, APIs)

**Real-World Implications:**

| Enforcement Type | Compliance Rate | Notes |
|-----------------|-----------------|-------|
| Documentation only | ~30-50% | AI can ignore despite "reading" |
| Documentation + Templates | ~50-70% | Better, but still probabilistic |
| Documentation + Human gates | ~85-95% | Human catches what AI misses |
| External validation | ~95-99% | Non-bypassable verification |

**When to Use Each:**

**Passive enforcement is necessary:**
- Provides clear specification (AI needs to know *what* to do)
- Enables AI to succeed when it *wants* to comply
- Documents intent for humans and future AI

**Active enforcement is required when:**
- Compliance is business-critical
- Cost of failure is high
- Pattern shows probabilistic nature of passive methods
- Production reliability matters

#### Key Insight

**Documentation cannot force compliance.** AI can read, understand, and completely ignore any instruction when other pressures (context saturation, training bias, probabilistic sampling) override them. Enforcement requires mechanisms the AI cannot bypass.

This doesn't mean documentation is worthless — it's *necessary* but not *sufficient*. Combine passive (clear specification) with active (reliable enforcement).

#### Cross-References

- **Pattern:** [[patterns.md#positive-constraint-framing]]
- **Related:** [[Automation Strategy](#automation-strategy)]
- **Related:** [[Template-Driven Consistency](#template-driven-consistency)]

---

## Usage Guidelines

### Choosing Between Concept, Pattern, and Gotcha

**Create a Concept when:**
- Defining a foundational idea or philosophy
- Explaining "what is X?" or "why does X exist?"
- Establishing shared vocabulary
- Describing a principle that doesn't have specific steps

**Create a Pattern when:**
- Showing a reusable solution to a recurring problem
- Providing specific "how to" guidance
- Demonstrating implementation approach
- Problem → Solution → When to use format works well

**Create a Gotcha when:**
- Warning about a common mistake
- Explaining counterintuitive behavior
- Documenting a pitfall discovered the hard way
- Symptom → Gotcha → Fix format works well

**Cross-References:**
- **Pattern:** [[patterns.md#template-driven-docs]]
- **Related:** [[Memory Systems](#memory-systems)]
