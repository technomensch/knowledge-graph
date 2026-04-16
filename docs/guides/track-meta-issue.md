---
id: track-meta-issue
title: Track a Multi-Attempt Issue
sidebar_label: Track a meta-issue
description: Use meta-issue tracking for complex problems that span multiple sessions or branches
---

A **meta-issue** is structured documentation for a problem that requires three or more solution attempts, has an evolving root-cause understanding, and needs a record of what was tried and what was learned across sessions or branches.

---

## Prerequisites

- KMGraph installed and active KG configured (`/kmgraph:status`)
- Git repository present (optional — git-dependent steps are skipped automatically when no repo is detected)
- At least one prior attempt at the problem already made, or a problem clearly requiring multiple attempts

---

## Steps

### 1. Start tracking

Run the command from the project root:

```bash
/kmgraph:start-issue-tracking
```

The command prompts for a short issue name (kebab-case), then scaffolds the meta-issue directory:

```
docs/meta-issues/<issue-name>/
├── README.md               # Navigation hub
├── description.md          # Living document — update after each attempt
├── implementation-log.md   # Chronological attempt timeline
├── test-cases.md           # Validation criteria (consistent across attempts)
└── attempts/
    └── 001-<label>/
        ├── solution-approach.md   # Written BEFORE the attempt
        └── attempt-results.md     # Written AFTER the attempt
```

:::note
If no git repository is detected, branch strategy prompts and the Git Integration section are omitted automatically (v0.2.3.4-beta+).
:::

---

### 2. Document the first (or retroactive) attempt

For each prior attempt, create a numbered subdirectory and fill in both files:

```bash
mkdir docs/meta-issues/<issue-name>/attempts/001-<label>
```

**`solution-approach.md`** — written before the attempt:

```markdown
# Attempt 001: <Label>

**Attempt #:** 001
**Hypothesis:** <The specific theory being tested — what is wrong and why>
**Distinct from prior attempts:** First attempt
**Success criterion:** <Exact condition that confirms this attempt worked>

## Hypothesis
<What you believed was the root cause>

## Expected Outcome
<Measurable target, e.g. "70% reduction in response time">

## Implementation Plan
1. Step one
2. Step two
```

:::tip
Use `/kmgraph:meta-issue --log-attempt 001 "<hypothesis>"` to pre-populate the hypothesis field and ensure it is distinct from prior attempts. At attempt 3+, the command reminds the user to invoke the `stuck-work-escalation` skill.
:::

**`attempt-results.md`** — written after the attempt:

```markdown
# Attempt 001 Results

## Actual Results
- Metric A: <value> (PASS / FAIL)
- Metric B: <value>

## Why It Failed / Succeeded
<Root cause analysis>

## Learning
<What this attempt revealed>

## Next Steps
<What to try next>
```

---

### 3. Update across sessions

At the start of each new session working on this issue:

1. Open `description.md` and add a new version block reflecting the latest hypothesis:

```markdown
### Version 2 (YYYY-MM-DD) — Refined Hypothesis
**Theory:** <updated understanding>
**Evidence:** <what changed>
**Test:** <what will be tried>
```

2. Append a date entry to `implementation-log.md`:

```markdown
## Attempt 002: <Label>
**Date:** YYYY-MM-DD to YYYY-MM-DD
**Hypothesis:** <theory>
**Result:** ⚠️ Partial (30% improvement)
**Learning:** <what was revealed>
```

3. Create the next attempt with hypothesis enforcement:

```bash
/kmgraph:meta-issue --log-attempt 002 "<distinct hypothesis>"
```

This creates the attempt directory, pre-populates the hypothesis field, and checks that the hypothesis differs from prior attempts. At attempt 3 or later, it also surfaces the `stuck-work-escalation` skill reminder.

:::tip
Write `solution-approach.md` before starting each attempt, and `attempt-results.md` immediately after. Delaying either reduces the quality of the retrospective.
:::

:::note
**Escalation thresholds:** At 3 attempts (or 30 min), Opus diagnosis activates automatically. At 5 attempts, a mandatory exit-path decision is required before any further work proceeds. See the `stuck-work-escalation` skill for full details.
:::

---

### 4. Link lessons and ADRs

After a significant attempt (whether it succeeds or fails), capture the learning:

```bash
/kmgraph:capture-lesson
```

Reference the meta-issue from the lesson file:

```markdown
**Meta-Issue:** [[../../meta-issues/<issue-name>/]]
```

For architecture decisions that emerged from the investigation:

```bash
/kmgraph:create-adr
```

Link back from the ADR body to the meta-issue README for traceability.

To link an existing lesson or ADR to a GitHub issue:

```bash
/kmgraph:link-issue
```

---

### 5. Close the meta-issue

A meta-issue is closed when one of three conditions is met:

| State | Condition |
|---|---|
| **Resolved** | Solution meets all success criteria in `test-cases.md` |
| **Abandoned** | Problem no longer relevant (requirements changed) |
| **Superseded** | Investigation revealed a different underlying problem |

In all cases, update `README.md` with final status and resolution summary:

```markdown
## Resolution
**Status:** Resolved (Attempt 003)
**Result:** 93% improvement, all targets met
**Deployed:** YYYY-MM-DD
```

Then extract final lessons:

```bash
/kmgraph:capture-lesson
```

---

## Verify

After setup, confirm the scaffold exists:

```bash
ls docs/meta-issues/<issue-name>/
# README.md  description.md  implementation-log.md  test-cases.md  attempts/
```

After closing, confirm `README.md` status field reads `Resolved`, `Abandoned`, or `Superseded`, and that at least one lesson is linked.

---

## Next steps

- Review the worked example at `core/examples/meta-issue/example-performance-saga/`
- Use `/kmgraph:recall` to search across meta-issues and lessons when starting a related problem
- Consider creating an ADR if the resolution produced a reusable architecture decision
