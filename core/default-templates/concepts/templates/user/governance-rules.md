# Rules — Governance

> Quick navigation: [Review Audit Protocol](#review-audit-protocol) · [Plan Execution Strict Mode](#plan-execution--strict-mode) · [Review Protocol](#review-protocol)

---

## Review Audit Protocol

> **Source:** `core/rules-registry/review-audit-protocol.md`

### Trigger

Fires for: post-plan audit (before pushing), pre-push review, PR audit, explicit "full review" or "audit" request.
Does NOT fire for casual inspection ("does this look right?", "review this file").

### Protocol

1. **Complete review pass without interruption.** For each finding needing investigation, dispatch a background agent as you go. Do NOT stop to discuss, implement, or wait for results mid-pass. Do NOT ask "proceed?" mid-review.
2. **Batched recall gate** (after pass): present findings list, ask: *"Run recall to check for prior context? [all / select / skip]"* — batch all selected findings into one recall call.
3. **Display results inline** — agent reports and recall results shown inline, not collapsed.
4. **Present COMPLETE audit trail — HALT ONCE.** After displaying all results, present the full audit trail table covering ALL findings at once. For each finding, include a structured decision block: finding description, severity, recommended action, and decision options. HALT after the full table — do NOT stop mid-review per finding. Do NOT ask bare "proceed?" questions.

### Decision Options (per finding)

| Option | Action |
|--------|--------|
| `fix now` | Run cascade check stub first; implement; resume |
| `ignore` | Dismiss and record in audit trail with reason |
| `track` | Route to issue tracking; resume |
| `dig deeper` | Agent investigates; return after report |
| `discuss` | Session snapshot first; discuss; resume |

### Cascade Check Stub (fires before `fix now`)

Before implementing any fix, ask:
1. Does this change affect initialization scripts, user profile files, or existing graphs?
2. Is this user-local or project-wide?
3. Which tiers / platforms does this affect?

Defer to your active governance framework for full cascade protocol.

### Final Report Format

| Finding | Severity | Recall match | Decision | Status |
|---------|----------|--------------|----------|--------|

All findings included regardless of resolution. Audit trail is permanent.

---

## Plan Execution — Strict Mode

> **Trigger:** "execute plan", "implement plan", "start [plan-file]", or any reference to a plan file

When triggered, enter strict execution mode and enforce this protocol:

```
═══════════════════════════════════════════════════════════════
STRICT EXECUTION MODE
Allowed: File read, file edit, file write, shell (verification only)
Forbidden: Improvements, assumptions, gap-filling, unauthorized fixes
═══════════════════════════════════════════════════════════════
```

**8-step protocol:**

1. **State Initialization** — Output STRICT EXECUTION MODE banner before any action. If the plan file defines a Safety Header `**STATUS:**` field, then the first time the user gives explicit "YES" to approve any of the plan's own numbered implementation steps, rewrite that field so it reads an in-progress value (e.g. `🟡 IN PROGRESS`) — keep the `**STATUS:**` label, replace only the value, and do not assume the prior value; match on the label, not on the value. This is a real write to the plan file, not a chat-only status report.
2. **Literal Mapping** — Quote each plan instruction before executing (no assumptions)
3. **Data Integrity Audit** — Read file after every edit; verify ONLY plan-specified changes were made. Revert if unauthorized additions found. Exception: the plan file's own Safety Header STATUS field, when rewritten by this protocol itself (Step 1 or Step 7), is protocol-owned metadata rather than a plan-specified content change — never flag or revert it.
4. **HALT on Ambiguity** — Output HALT block if plan is unclear. Stop and ask user for clarification.
5. **Checkpoints** — After every 3 file edits, output checkpoint and await user acknowledgment before continuing.
6. **Rollback Protocol** — If integrity audit fails, revert file and re-apply. If second attempt fails, trigger HALT. A protocol-owned Safety Header STATUS rewrite (Step 1 or Step 7) is never an integrity-audit failure and never enters this rollback loop.
7. **Completion Verification** — Quote each success criterion and verify it. Only if every criterion verifies and the plan file defines a Safety Header `**STATUS:**` field, rewrite that field so it reads a complete value (e.g. `✅ COMPLETE`) — keep the label, replace only the value (protocol-owned metadata, exempt from the Data Integrity Audit). If any criterion fails to verify, leave the STATUS field unchanged and trigger HALT (Step 4) instead. Output completion status.
8. **Commit Gate** — After all tasks complete, create conventional commit with issue reference.

**Mid-execution discovery protocol:** Do NOT silently fix OR silently skip discoveries outside the plan. Every discovery requires a decision.

---

## Review Protocol

### ADR Pre-Check Before Surfacing a Finding

> **When:** Before reporting any finding during a plan review, code review, remediation, or post-mortem

Before surfacing a finding, search the project's `knowledge/decisions/` for ADRs that cover the same topic:

1. **Match found — finding fully addressed:** suppress the finding; note the ADR
2. **Match found — finding presents new evidence:** surface the finding and explicitly reference the ADR
3. **No match:** surface the finding normally

A finding that duplicates a closed decision without new evidence is noise, not a valid finding.
