---
name: kmg-execute-plan
description: Enforce zero-deviation plan execution when user invokes plan implementation
---

# Skill: kmg-execute-plan

**Purpose:** Enforce zero-deviation plan execution when user invokes plan implementation.

**Trigger Keywords:**
- "execute plan"
- "implement plan"
- "start [plan-file]"
- Reference to a `knowledge/plans/*.md` or `~/.claude/plans/*.md` file in conversation
- Any mention of explicit plan-based execution

**Platform Guard (checked before anything else below):**
This skill is scoped to Gemini running in Antigravity — it was written as a drift-guardrail
for that platform specifically (Gemini would go off-rails/tangent without a heavy strict-mode
protocol). It is NOT intended for Claude Code or any other ECC platform.

Before surfacing the STRICT EXECUTION MODE banner, determine whether the current session is
running under Gemini/Antigravity:
- If the runtime does not self-identify as Gemini/Antigravity (e.g., this is a Claude Code
  session): do NOT surface the banner or run the 8-step protocol below. Instead output:

  ```
  kmg-execute-plan is scoped to Gemini/Antigravity sessions only (it was written as a
  drift-guardrail for that platform). This session is running under a different platform —
  use superpowers:executing-plans or superpowers:subagent-driven-development instead, per
  the plan file's own "REQUIRED SUB-SKILL" header.
  ```

  Then stop — do not proceed to any step below.
- If the runtime is Gemini/Antigravity: proceed exactly as documented below, unchanged.

No confirmed platform/runtime marker was found in this repo to detect "is this
Gemini/Antigravity" directly (see issue-12 for the investigation). Fallback heuristic:
Claude Code sessions can self-identify as Claude Code; treat "self-identifies as Claude Code"
(or any other non-Gemini/Antigravity ECC platform) as the exclusion trigger — asymmetric by
design, since a false negative (occasionally not firing for a genuine Gemini/Antigravity
session) is far cheaper than the false positive this guard exists to prevent (firing wrongly
inside Claude Code and driving an entire plan execution under the wrong protocol, as happened
live during this branch's own c0 execution).

**Behavior:**
When triggered, surface the STRICT EXECUTION MODE banner and enforce the 8-step protocol:

```
═══════════════════════════════════════════════════════════════
STRICT EXECUTION MODE
Allowed Tools: File read, file edit, file write, shell (verification only)
Forbidden: Improvements, assumptions, gap-filling, unauthorized fixes
═══════════════════════════════════════════════════════════════
```

**ECC Compatibility Note:** This skill is intentionally scoped to Gemini/Antigravity sessions,
where it originated as a drift guardrail (`.agent/workflows/gov-execute-plan.md`). On Claude
Code and other ECC platforms, this skill should not fire at all — see the Platform Guard
above. If ported to a new platform in the future where an equivalent guardrail is genuinely
needed, treat this file as a template to adapt for that platform, not a skill to broaden in
place to cover multiple platforms at once.

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

**Prerequisite Check — In-Plan Cascade Review:**
Before executing, check for ADR capture flag:

```bash
ADR_FLAG="/tmp/kmgraph-adr-captured-$(date +%Y-%m-%d).flag"
```

If flag EXISTS:
1. Review the plan tasks below.
2. Ask the user: "A new decision was captured this session. Do any plan tasks need revision before executing?"
3. Wait for user response before proceeding.
4. If tasks need revision: update the plan, then continue.
5. If no revision needed: proceed.

If flag ABSENT: skip this check and proceed normally.

> **Detection mechanism:** flag file written by `adr-guide` after successful ADR creation. Day-scoped via `$(date +%Y-%m-%d)` — consistent with existing `kmgraph-plan-gate` pattern. No model self-tracking required.

> **Subagent fallback:** If `kmg-execute-plan` is somehow invoked as a subagent with the flag present (parent failed to gate), output: "Parent must resolve in-plan cascade before dispatching subagents. HALT." Do not attempt to prompt the user — subagents have no interaction channel.

**Protocol Steps:**
1. **State Initialization** — Output STRICT EXECUTION MODE banner before any action. Then, the first time the user gives explicit "YES" to approve any of the plan's own numbered implementation steps, rewrite the plan file's own Safety Header line so it reads exactly `**STATUS:** 🟡 IN PROGRESS` — keep the `**STATUS:**` label, replace only the value, and do not assume the prior value was `🔴 AWAITING APPROVAL` (a plan approved before this instruction landed, a resumed session, or an older Safety Header variant such as the pre-v0.7.2 `🔴 STOPPED (Waiting for Manual Approval of Step 1)` may read something else entirely — match on the `**STATUS:**` label, not on the value). This is a real write to the plan file the skill is executing from, not a chat-only status report.
2. **Literal Mapping** — Quote each plan instruction before executing (literal mapping, no assumptions)
3. **Data Integrity Audit** — Read file after every edit to verify ONLY plan-specified changes were made. Revert if unauthorized additions found. Exception: the plan file's own Safety Header STATUS line, when rewritten by this protocol itself (Step 1 or Step 7), is protocol-owned metadata rather than a plan-specified content change — never flag or revert it.
4. **HALT on Ambiguity** — Output HALT block if plan is unclear. Stop and ask user for clarification.
5. **Checkpoints** — After every 3 file edits, output checkpoint and await user acknowledgment before continuing.
6. **Rollback Protocol** — If integrity audit fails, revert file and re-apply change. If second attempt fails, trigger HALT. A protocol-owned Safety Header STATUS rewrite (Step 1 or Step 7) is never an integrity-audit failure and never enters this rollback loop.
7. **Completion Verification** — Resolve **both** gates below **before** touching the plan file's STATUS line. The STATUS line is only ever rewritten to `✅ COMPLETE` on the path that reaches Step 8; any HALT path leaves it at its current in-progress value.
   1. *Criteria gate:* Quote each success criterion and verify it. If any criterion fails to verify, leave the STATUS line unchanged and trigger HALT (Step 4).
   2. *KG-capture gate:* Explicitly answer: "Does this change alter how KG content is captured, stored, or structured? If yes: does `kg_upgrade` need a new/updated category for it, and is that category reachable through `/kmgraph:kmg-init`'s wizard, not just via a raw `kg_upgrade apply` call?" If the answer is yes and the category is missing or not wizard-reachable, leave the STATUS line unchanged, do not proceed to Step 8 — HALT and surface the gap to the user.
   3. *Only if both gates clear:* rewrite the plan file's own Safety Header line so it reads exactly `**STATUS:** ✅ COMPLETE` — keep the `**STATUS:**` label, replace only the value (a real write to the plan file, not a chat-only status report; this line is protocol-owned metadata and is exempt from the Data Integrity Audit). Then output completion status, including the answer to the KG-capture question above.
8. **Commit Gate** — After all tasks complete, create conventional commit with issue reference.

**Source:** Adapted from `.agent/workflows/gov-execute-plan.md` (now kmg-execute-plan)

**Key Constraint:** "No improvements" — even if you spot bugs, better implementations, or missing error handling, DO NOT FIX unless explicitly in the plan.

**Example Trigger:**
```
User: "Let's execute the v0.0.10.1 plan from knowledge/plans/v0.0.10.1-alpha-skills-and-agents.md"
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
