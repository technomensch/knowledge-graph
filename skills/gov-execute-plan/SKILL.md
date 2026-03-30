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
Allowed Tools: File read, file edit, file write, shell (verification only)
Forbidden: Improvements, assumptions, gap-filling, unauthorized fixes
═══════════════════════════════════════════════════════════════
```

**ECC Compatibility Note:** The banner above uses generic tool categories (file read/edit/write, shell) to maintain portability across ECC platforms. On Claude Code, these map to Read, Edit, Write, and Bash tools. On other platforms, the underlying MCP or native tool implementations are used automatically. The constraint semantics remain identical: no authorization changes outside the plan.

**Prerequisite Check — Step 6.4 Sync Verification:**
Before implementing any ENH or issue in scope, verify that Step 6.4 (ROADMAP + CHANGELOG sync) was completed for each item. This check fires at implementation start, not at issue-tracking completion.

For each ENH/issue in the plan:
1. Check whether Step 6.4 was completed (ROADMAP entry added, CHANGELOG entry added).
2. If Step 6.4 was skipped for any item, surface the following prompt and wait for user response before proceeding:

```
⚠️  PREREQUISITE CHECK — Step 6.4 Not Completed
Before implementing [ENH-NNN / issue-N], Step 6.4 (ROADMAP + CHANGELOG sync) was not completed.

Options:
  [C] Complete now — run ROADMAP + CHANGELOG sync inline, then proceed
  [S] Skip — proceed without sync (your choice; noted in commit message)
  [X] Cancel — abort implementation

Enter choice (C / S / X):
```

3. **Complete now (C):** Run the ROADMAP + CHANGELOG sync inline (update the relevant ROADMAP entry and CHANGELOG entry for the item), then continue with implementation.
4. **Skip (S):** Proceed with implementation. Note the skipped sync in the commit message.
5. **Cancel (X):** Abort implementation. Output: `HALT — Implementation cancelled. Complete Step 6.4 before retrying.`

This check runs once per item, before the first edit for that item.

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

**v0.2.1 Decision Note — Agent Dispatch Evaluation:**
Agent dispatch was evaluated and **rejected** for this skill. Rationale:
- This skill is a **behavioral constraint**, not a delegatable task — it modifies how the main assistant operates, not what a subagent does
- The protocol requires **full conversation context** — the assistant must see the plan, user instructions, and ongoing edits in real-time to enforce zero-deviation
- **Checkpoint/HALT gates are conversational** — steps 4-6 require stopping mid-execution and asking the user, which works naturally in the main thread but poorly in a subagent with limited context
- An agent would **lose the context needed for enforcement** — detecting "unauthorized improvements" or ambiguity requires seeing the full edit history
- Pattern kept: **skill-only** (no companion agent)
