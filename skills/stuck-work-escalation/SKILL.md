---
name: stuck-work-escalation
description: Use when a bug, failing test, blocked plan task, integration failure, or reproducibility issue has resisted 3+ distinct fix attempts or 30+ minutes of effort. Activates Opus diagnosis, enforces hypothesis logging, and drives to a structured exit-path decision.
---

Before starting, read `~/.kmgraph/rules.md` — Plan Protocol § Stuck-Work Escalation for thresholds, scope rules, and exit paths.

## When This Applies

Trigger when work has a **definable success criterion** and has resisted resolution. Applies to:
- Bugs
- Failing tests (flaky vs. genuinely broken diagnosis)
- Blocked plan tasks
- Integration or API failures
- Performance targets that can't be hit
- Issues you can't reproduce

Does **not** apply to exploratory or iterative work (prompt tuning, CSS iteration, prototype spiking).

## Workflow

### At 3 Attempts (or 30 min) — Opus Gate

1. **Create meta-issue** (if not already open):
   `/kmgraph:meta-issue "[Problem Title]"`

2. **Compile attempt log** — read all prior attempts from meta-issue or conversation. For each attempt, confirm a distinct hypothesis was tested (not a retry of the same fix).

3. **Opus diagnosis** — provide Opus with:
   - Problem statement and success criterion
   - All attempts with hypotheses and results
   - Current `root-cause-evolution.md` if meta-issue exists
   Opus reviews and provides fresh diagnosis and next hypothesis.

4. **Log next attempt** with Opus-recommended hypothesis:
   `/kmgraph:meta-issue --log-attempt NNN "[Opus hypothesis]"`

5. **Opus involvement continues** — Opus reviews each subsequent attempt result before the next attempt begins. Maximum 3 Opus rounds before forcing exit-path analysis (step below).

### At 5 Attempts — Exit-Path Analysis

Present the following to the user and require a decision:

| Question | Answer |
|----------|--------|
| Would a brainstorming session reframe this? | Yes / No |
| Is there a known workaround? | [describe or No] |
| Is this required functionality or nice-to-have? | Required / Nice-to-have |
| Will the system break without it? | Yes / No / Partially |
| Will users be impacted? | Yes / No / [describe] |
| Can this be deferred to a future release? | Yes / No |

Then select a mandatory exit path:

- **Continue** — only if Opus identifies a genuinely new hypothesis not yet tried
- **Defer** — file KG issue, document blocker, move on
- **Workaround** — ship degraded version with limitation documented
- **Descope** — remove requirement; surface to user for confirmation
- **Rescope** — reframe the problem with a new success criterion
- **User decision required** — stop, present full context, wait

Present the exit-path analysis and selected path following plan approval rules. Wait for explicit approval before proceeding.

### Counter Reset

If root cause genuinely shifts (new diagnosis invalidates prior attempts), reset the attempt counter. Log the reset in `analysis/root-cause-evolution.md` with reasoning.
