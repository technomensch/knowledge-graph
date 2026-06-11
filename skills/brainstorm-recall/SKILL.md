---
name: brainstorm-recall
description: Consult the knowledge graph before any recommendation is made during brainstorming.
---

# Skill: brainstorm-recall

**Purpose:** Ensure the knowledge graph is consulted before any recommendation is made. Fires before `adr-guide` on the same trigger surface.

**Trigger Keywords:**
- "should we"
- "I'm thinking of"
- "best way to"
- "which approach"
- "let's consider"
- "what do you recommend"
- "how should we"
- When `superpowers:brainstorming` is invoked via Skill tool

**Precedence:** This skill fires BEFORE `adr-guide`. If both trigger, run recall first, then allow adr-guide to proceed.

> **Enforcement note (ENH-015):** "Fires before" is not just a prose claim — it is enforced by the `pre-skill-rules-inject.sh` HARD BLOCK added in Task 6b. The hook injects the Brainstorm Recall block into context before the skill executes, making the recall step mandatory regardless of which skills auto-trigger. See `knowledge/enhancements/ENH-015/ENH-015-specification.md` §"Existing Skill Conflicts Resolved" for the full precedence rationale. The skill trigger overlap with `adr-guide` is intentional — ENH-015 documents why separate skills are correct (different lifecycle phases) and why merging produces unreliable auto-invocation.

**Behavior:**

1. **Extract the topic** from the user's question or the brainstorming context (1–5 words).

2. **Run recall** before answering:
   Invoke the kmgraph:recall skill (via Skill tool) with the extracted topic as input.

3. **Present prior art** under a "Prior Art" heading before your recommendation:
   - Relevant ADRs found
   - Relevant lessons-learned found
   - Known failed approaches
   - If nothing found: state "No prior art found for [topic]"

4. **Then proceed** with the recommendation or brainstorming, informed by the recall results.

**Do not skip recall** if the topic seems simple — recall takes seconds and prevents proposing already-rejected solutions.

**ADR/ENH number pre-allocation (I-E):** Before dispatching background fast-agents, brainstorm-recall must pre-allocate ADR and ENH numbers by reading current highest numbers from `knowledge/decisions/` and `knowledge/enhancements/`. Pass resolved numbers in agent payload to prevent concurrent agents from claiming the same number.

**Integration:**
- Works alongside `superpowers:brainstorming` — does not replace it
- Recall results feed into `adr-guide` if a decision crystallizes from the brainstorm

**Background agent dispatch (non-blocking):**

After presenting recall results and proceeding with the brainstorm:

4. If the brainstorm surfaces a new architectural decision: dispatch a background fast-agent to draft an ADR:
   ```
   Agent({subagent_type: "kmgraph:create-adr-agent", run_in_background: true, prompt: "Draft ADR for: [decision]"})
   ```

5. If the brainstorm surfaces a new enhancement or feature idea: dispatch a background fast-agent:
   ```
   Agent({subagent_type: "kmgraph:knowledge-extractor", run_in_background: true, prompt: "Capture ENH for: [idea]"})
   ```

6. When background agents complete, present a review-or-save prompt:
   > "ADR/ENH draft complete. Files at `knowledge/decisions/ADR-NNN.md` / `knowledge/enhancements/ENH-NNN/`. Review before saving, or save now?"
   - "Save now" → files already written, user reviews outside session
   - "Review first" → surface content inline for approve/edit/skip per item

7. Any Opus feedback or unresolved action items → write to the **Open Questions** section of the relevant ADR/ENH (never directly to session summary).
