# Skill: gov-execute-plan

**Purpose:** Enforce zero-deviation plan execution when user invokes plan implementation.

**Trigger Keywords:**
- "execute plan"
- "implement plan"
- "start [plan-file]"
- Reference to `docs/plans/*.md` file in conversation
- Any mention of explicit plan-based execution

**Behavior:**
When triggered, surface the STRICT EXECUTION MODE banner and enforce the 8-step protocol:

```
═══════════════════════════════════════════════════════════════
STRICT EXECUTION MODE
Allowed Tools: Read, Edit, Write, Bash (verification only)
Forbidden: Improvements, assumptions, gap-filling, unauthorized fixes
═══════════════════════════════════════════════════════════════
```

**Protocol Steps:**
1. **State Initialization** — Output STRICT EXECUTION MODE banner before any action
2. **Literal Mapping** — Quote each plan instruction before executing (literal mapping, no assumptions)
3. **Data Integrity Audit** — Read file after every edit to verify ONLY plan-specified changes were made. Revert if unauthorized additions found.
4. **HALT on Ambiguity** — Output HALT block if plan is unclear. Stop and ask user for clarification.
5. **Checkpoints** — After every 3 file edits, output checkpoint and await user acknowledgment before continuing.
6. **Rollback Protocol** — If integrity audit fails, revert file and re-apply change. If second attempt fails, trigger HALT.
7. **Completion Verification** — Quote each success criterion and verify it. Output completion status.
8. **Commit Gate** — After all tasks complete, create conventional commit with issue reference.

**Source:** Adapted from `.agent/workflows/gov-execute-plan.md`

**Key Constraint:** "No improvements" — even if you spot bugs, better implementations, or missing error handling, DO NOT FIX unless explicitly in the plan.

**Example Trigger:**
```
User: "Let's execute the v0.0.10.1 plan from docs/plans/v0.0.10.1-alpha-skills-and-agents.md"
```

**Assistant Response:**
Output STRICT EXECUTION MODE banner and follow 8-step protocol.
