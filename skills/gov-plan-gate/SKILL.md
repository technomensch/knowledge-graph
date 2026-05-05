# Skill: gov-plan-gate

**Purpose:** Enforce user approval gates after superpowers planning and execution skills complete — require explicit "Proceed" or "Start" before implementation begins, and explicit approval before any push or PR.

**Trigger Keywords:**
- Plan file just saved / written
- "superpowers:writing-plans" or "superpowers:brainstorming" completed
- "plan complete" / "plan saved" / "plan ready" in conversation
- Any mention of execution options after planning
- "superpowers:executing-plans" or "superpowers:finishing-a-development-branch" completed
- About to push, create PR, or merge

**Behavior:**

**After a plan file is written**, output ONLY:

> "Plan saved at `<path>`. Review it, then say **Proceed** or **Start** to continue."

**Before pushing or opening a PR**, output ONLY:

> "Ready to push `<branch>` and open PR. Say **Proceed** to continue."

Then STOP in both cases. Do not:
- Ask "Which approach?"
- Offer "Subagent-Driven" or "Inline Execution" options
- Run `git push` or `gh pr create` without explicit approval
- Begin any implementation steps
- Ask clarifying questions about execution mode

**Gate Rules (from ~/.kmgraph/rules.md):**
> "Wait for explicit 'Proceed' or 'Start' before beginning a new branch or implementation task."
> "Stop and ask before pushing, creating PRs, merging, or any other action visible to others."
> "Wait for user confirmation after any 'Next Steps' summary."

These gates apply to ALL planning and execution outputs regardless of which skill ran.
