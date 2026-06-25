---
title: "ADR-035: Stuck-Work Escalation — Auto-Trigger Meta-Issue with Opus Gate and Exit-Path Decision"
number: 035
created: 2026-04-16T00:00:00Z
status: Proposed
author: mkaplan
email: mkitact@gmail.com
git:
  branch: v0.4.0-stuck-work-escalation
  commit: TBD
  pr: null
  issue: null
implements: null
related:
  adrs: [8]
  lessons: []
  kg_entries: []
tags: [meta-issue, escalation, debugging, stuck-work, opus, process]
category: process
---

# ADR-035: Stuck-Work Escalation — Auto-Trigger Meta-Issue with Opus Gate and Exit-Path Decision

**Date:** 2026-04-16
**Status:** Proposed
**Related:** ADR-008 (Meta-Issue Tracking Pattern)

---

## Context

When an AI coding assistant gets stuck on a problem, the default behavior is to retry variations of the same approach silently — burning tokens, wasting time, and providing no visibility to the user. There is no automatic mechanism that:

- Detects repeated failure against the same target
- Escalates to a more capable model for fresh diagnosis
- Forces hypothesis logging so each attempt is distinct
- Drives to a structured decision when the problem resists resolution

The existing `meta-issue` command handles *documentation* of complex problems but requires manual invocation and has no escalation logic. There is no definition of "stuck" and no enforcement that attempts are distinct hypotheses rather than retries of the same fix.

**Problem:**
- Silent thrashing: AI retries the same approach without escalation
- No visibility: user has no insight into how many attempts have been made
- No forcing function: nothing prevents indefinite retry loops
- Hypothesis drift: attempts are not required to be distinct, so the same fix gets retried with minor variations

**Scope:**
- In scope: bugs, failing tests, blocked plan tasks, integration failures, performance targets, reproducibility failures
- Out of scope: exploratory work, iterative work without a definable success criterion, automated hook-based counting (future)

---

## Decision

Introduce a **stuck-work escalation** pattern with two thresholds and a mandatory exit-path decision:

### Threshold 1 — Opus Gate (3 attempts or 30 min)

At 3 distinct failed attempts (where "attempt" = a distinct hypothesis tested, not a retry of the same fix) or 30 minutes of effort, whichever comes first:

1. Auto-create a meta-issue via `kmgraph:meta-issue`
2. Compile all prior attempts and hypotheses
3. Invoke Opus to review and provide fresh diagnosis
4. Log all subsequent attempts via `--log-attempt` with required hypothesis field
5. Opus reviews each subsequent result before the next attempt begins
6. Opus involvement is capped at 3 rounds; after 3 Opus rounds, exit-path analysis is forced regardless of attempt count

### Threshold 2 — Exit-Path Analysis (5 attempts)

At 5 attempts, a mandatory structured decision is required before any further work:

| Question | Purpose |
|----------|---------|
| Would brainstorming reframe this? | Detect scope/framing problem |
| Is there a known workaround? | Unblock immediately |
| Required or nice-to-have? | Prioritization signal |
| Will the system break without it? | Severity assessment |
| Will users be impacted? | Impact assessment |
| Can it be deferred? | Release planning signal |

**Mandatory exit paths** (one must be selected):
- **Continue** — only if Opus identifies a genuinely untried hypothesis
- **Defer** — file KG issue, move on
- **Workaround** — ship degraded with limitation documented
- **Descope** — remove requirement (user confirmation required)
- **Rescope** — reframe with new success criterion
- **User decision required** — stop, present full context, wait

### Hypothesis Logging Requirement

Every attempt must document a distinct hypothesis before execution. The attempt template is extended with:
- `Hypothesis` — the specific theory being tested
- `Distinct from prior attempts` — how this differs
- `Success criterion` — exact condition that confirms success
- `Exit path` — completed if the attempt fails

### Counter Reset Rule

If root cause genuinely shifts (new diagnosis invalidates prior attempts), the attempt counter resets. The reset is logged in `root-cause-evolution.md` with reasoning.

### Implementation

- New `skills/stuck-work-escalation/SKILL.md` — owns the escalation workflow and is the single source of truth; no rules.md/triggers.md entries added (skill description IS the trigger, skill body IS the rule)
- Extended `commands/meta-issue.md` — escalation thresholds, `--log-attempt` command variant
- Extended attempt template — hypothesis and exit-path fields

---

## Rationale

### Why this approach

1. **Two-threshold design:** The 3-attempt Opus gate catches most stuck situations early without over-escalating. The 5-attempt exit-path forces a decision before thrashing becomes entrenched.
2. **Hypothesis logging as enforcement:** Requiring a distinct hypothesis before each attempt prevents the most common failure mode — retrying the same fix with minor variations.
3. **Opus cap:** Without a cap on Opus involvement, the escalation becomes its own loop. Three rounds is enough to exhaust most diagnostic approaches; after that, the problem is likely structural, not diagnostic.
4. **Mandatory exit paths:** Suggestions without enforcement don't change behavior. Making exit-path selection mandatory before any further work is the only way to prevent indefinite loops.
5. **Scope guard:** Applying this to exploratory work would be disruptive. The definable-success-criterion guard keeps it targeted.
6. **Skill as single source of truth:** Adding the same logic to rules.md/triggers.md would duplicate content the skill already owns — a DRY violation. The skill description is the trigger; the skill body is the rule.

### Alternatives Considered

**Option A: Hook-based automatic counting**
- Pros: No manual invocation; fully automated
- Cons: Requires hook infrastructure; defining "attempt" reliably from shell events is fragile
- Rejected because: fragile automation is worse than manual with clear instructions; can be added in a future version

**Option B: User-only rule (no plugin changes)**
- Pros: Simpler; no plugin changes needed
- Cons: Attempt template doesn't enforce hypothesis logging; meta-issue command lacks `--log-attempt` variant; no structural enforcement
- Rejected because: rules without structural support drift; the template and command changes are lightweight and high-value

**Option C: Single threshold at 5 attempts**
- Pros: Less interruption
- Cons: By attempt 4, thrashing is usually entrenched; Opus diagnosis is most valuable early, not late
- Rejected because: Opus at attempt 3 catches the problem while it's still tractable

### Trade-offs

**Benefits:**
- ✅ Ends silent thrashing with a visible gate
- ✅ Hypothesis logging creates an audit trail of what was tried
- ✅ Exit-path decision forces a conversation that should have happened earlier
- ✅ Integrates with existing meta-issue infrastructure

**Costs:**
- ❌ Manual invocation required (no hooks yet)
- ❌ Adds friction at 3 and 5 attempts for problems that would have resolved on attempt 4
- ❌ Opus involvement costs tokens

**Mitigation:**
- The 30-min time cap and scope guard reduce false positives
- Token cost of Opus review is small relative to cost of continued thrashing

---

## Consequences

### Positive

1. **Visibility:** User sees explicit attempt counts and hypotheses rather than silent retries
2. **Faster resolution:** Opus diagnosis at attempt 3 often unblocks problems that Sonnet would have continued retrying
3. **Structured deferral:** Problems that can't be fixed are explicitly deferred, descoped, or escalated — not abandoned silently

### Negative

1. **Manual trigger required:** Until hook-based counting exists, the user or assistant must invoke the skill manually at the threshold
2. **Friction on near-misses:** A problem that resolves on attempt 4 will have triggered the Opus gate unnecessarily

### Neutral

1. **Extends meta-issue:** The meta-issue command gains new variants (`--log-attempt`) and escalation documentation; existing usage is unchanged

---

## Implementation

**Branch:** `v0.4.0-stuck-work-escalation` from `main`

**Affected Components:**
- `commands/meta-issue.md`
- `core/templates/meta-issue/attempt-template/solution-approach.md`
- `skills/stuck-work-escalation/SKILL.md` (new)

**Migration Path:** No migration required. Existing meta-issues are unaffected. New template fields are additive.

---

## Validation

**Success Criteria:**
- Skill description triggers at the correct workflow moment
- Attempt template enforces hypothesis before execution
- Exit-path menu is presented at 5 attempts and requires selection before proceeding
- meta-issue `--log-attempt` correctly creates attempt folder with pre-populated hypothesis

**Review Date:** After first real usage in a multi-attempt debugging session

---

## Related Decisions

- **[ADR-008](ADR-008-meta-issue-tracking-pattern.md):** Meta-issue tracking pattern this extends

---

## Related Documentation

**Implementation Plan:**
- `docs/plans/stuck-work-escalation.md` (local only — gitignored)

---

**Decision Made:** 2026-04-16
**Last Updated:** 2026-04-21
**Status:** Proposed

---

## Amendments

### 2026-04-21 — Persistent Attempt Counter (v0.5.0-beta)

Stuck-Work attempt count is persisted in `~/.kmgraph/.stuck-work-state.json` keyed by session UUID. This survives context compaction. Counter resets on task completion or explicit session end.

Schema:
```json
{
  "session-uuid": {
    "task": "short description",
    "attempts": 3,
    "last_tier": "powerful-tier",
    "started_at": "2026-04-21T00:00:00Z"
  }
}
```

The `stuck-work-escalation` skill reads and writes this file. It declares `required_tier: powerful-tier` — this tier does not collapse; if powerful-tier is unavailable, the skill halts with an explicit error.
