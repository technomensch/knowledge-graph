---
title: Test Cases — ENH-006
enhancement_id: ENH-006
---

# Test Cases: ENH-006

## TC-001: Prompts are sequential

**Given:** User runs `/kmgraph:start-issue-tracking`
**When:** Step 1 begins
**Then:**
- Step 1.1 (Type) is presented alone
- Model stops and waits
- Step 1.2 is NOT shown until user answers 1.1
- Same pattern for 1.3 and 1.4

## TC-002: All option combinations are reachable

**Given:** User answers Step 1.1 = Enhancement, Step 1.2 = None, Step 1.3 = Stay on current, Step 1.4 = Append
**Then:** Confirmation block reflects all four answers correctly — no error or fallback

## TC-003: Hotfix with document-only plan

**Given:** User answers Step 1.1 = Hotfix, Step 1.4 = Document only
**Then:** No plan file is created; issue docs are created; a note is added: "Plan: not yet created"

## TC-004: Confirmation block is accurate

**Given:** User completes all four steps
**Then:** Confirmation block shows type, version impact + resulting version string, branch name or "no change", plan file name or "append to X" or "none yet"

## TC-005: Step 5.0 no longer appears

**Given:** User is on a non-main branch
**Then:** Active branch warning shows in Step 1.0; Step 5.0 (old Active Work Guard) does NOT appear as a separate prompt

## TC-006: "Append to existing plan" identifies correct plan

**Given:** User selects Step 1.4 = Append
**Then:** Model identifies the active plan by name (e.g., "v0.2.2-beta.md") and shows it in the confirmation block before appending

## TC-007: Implementation prerequisite check fires when Step 6.4 was skipped

**Given:** User runs `/kmgraph:start-issue-tracking` and completes issue tracking without completing Step 6.4
**When:** User later says "execute" or "implement" against the plan
**Then:**
- `gov-execute-plan` surfaces the skipped Step 6.4 before the first implementation step
- User is offered: Complete now / Skip for this session / Cancel
- Implementation does not begin until one of these is answered

## TC-008: Prerequisite check passes when Step 6.4 was completed

**Given:** ENH-NNN appears in both CHANGELOG.md and ROADMAP.md
**When:** User begins execution
**Then:** No prerequisite prompt — execution proceeds directly to Step 1

## TC-009: Step 6.2 cannot be skipped

**Given:** User completes Steps 1–5
**When:** Step 6 begins
**Then:** Step 6.2 lesson capture question is presented before Step 7 summary appears — always, even when the issue was identified in a non-standard context

## TC-010: `adr-guide` triggers on implicit design decision

**Given:** Conversation contains "the problem is that X, here's what it should do instead"
**When:** Model processes the message
**Then:** `adr-guide` skill suggests creating an ADR — without requiring explicit choice-framing phrases

## TC-011: `lesson-capture` triggers on pattern identification during use

**Given:** User identifies a UX or process failure during active use ("this is a gap", "noticed that this doesn't work because")
**When:** Model processes the message
**Then:** `lesson-capture` skill surfaces the lesson — without requiring a resolution-moment phrase

## Acceptance Criteria

- [ ] Four sequential prompts replace the batched Step 1.1/1.2/5.0 block
- [ ] Each prompt stops and waits before the next is shown
- [ ] Type, version, branch, and plan are independently selectable
- [ ] All 7 type options are present
- [ ] All 5 version impact options are present (including "None")
- [ ] All 4 branch options are present
- [ ] All 3 plan options are present
- [ ] Confirmation block shown after all four answers
- [ ] Step 5.0 removed from the command
- [ ] No tables in the prompt output — numbered lists only
- [ ] Step 6.2 is presented before Step 7 in all execution paths
- [ ] `gov-execute-plan` prerequisite check fires when Step 6.4 was skipped
- [ ] Prerequisite check offers Complete now / Skip / Cancel before first implementation step
- [ ] Prerequisite check is skipped when CHANGELOG and ROADMAP already contain the issue entry
- [ ] `adr-guide` triggers on implicit design decisions surfaced through problem analysis
- [ ] `lesson-capture` triggers on pattern identification, not only post-resolution moments
