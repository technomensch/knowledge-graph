# Skill: gov-plan-gate

**Purpose:** Enforce the Approval Gate after any planning skill completes — require explicit "Proceed" or "Start" before implementation begins.

**Trigger Keywords:**
- Plan file just saved / written
- "superpowers:writing-plans" or "superpowers:brainstorming" completed
- "plan complete" / "plan saved" / "plan ready" in conversation
- Any mention of execution options after planning

**Behavior:**

After a plan file is written, output ONLY this message:

> "Plan saved at `<path>`. Review it, then say **Proceed** or **Start** to continue."

Then STOP. Do not:
- Ask "Which approach?"
- Offer "Subagent-Driven" or "Inline Execution" options
- Begin any implementation steps
- Ask clarifying questions about execution

**Gate Rule (from ~/.kmgraph/rules.md):**
> "Wait for explicit 'Proceed' or 'Start' before beginning a new branch or implementation task."
> "Wait for user confirmation after any 'Next Steps' summary."

This gate applies to ALL planning outputs regardless of which skill wrote the plan.
