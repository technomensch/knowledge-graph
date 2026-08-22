---
id: ENH-055
type: Enhancement
status: proposed
github-issue: "#210"
branch: none
created: 2026-07-26
related_enhs: ["ENH-053", "ENH-054"]
related_issues: ["issue-17"]
---

# ENH-055: `kmg-capture-router`'s Trigger Vocabulary Misses "Future Idea" Phrasing

**Local ID:** ENH-055 | **GitHub Issue:** [#210](https://github.com/technomensch/knowledge-graph/issues/210)

**Related:** [issue-17](../../issues/issue-17/issue-17-description.md) (#175) — same underlying failure class applied to a different skill: issue-17 is about `kmg-auto-recall` missing a trigger for "assistant needs clarification mid-task," this ENH is about `kmg-capture-router` missing a trigger for "future idea" phrasing. No doc previously cross-linked these; found during a 2026-08-22 overlap audit. Not a duplicate — different skills, different trigger gaps — but worth fixing together since any router-vocabulary-gap fix pattern developed for one likely generalizes to the other.

## Problem Statement

Surfaced live during the v0.7 (ADR-067) brainstorm session, twice in a row: ideas explicitly
framed as "this is a future enhancement worth capturing" (topic-KGs spanning multiple
projects → ENH-053; full audit-trail history log → ENH-054) did not trigger
`kmg-capture-router`, because that skill only fires on a fixed set of trigger phrases —
"capture that," "remember that," "save that," "note that," "log that," "keep that," "don't
forget that," "add that to memory." None of those phrases were used; "worth capturing" /
"future enhancement" / "future feature" / "future idea" are a distinct vocabulary the skill
doesn't recognize, so both ideas would have been silently lost without a manual capture.

This is the same failure class already documented in
`knowledge/lessons-learned/patterns/Lessons_Learned_Patterns_Skill_Auto_Triggers_Miss_Process_Vocabulary_—_Only_Fire_On_Outcome_Vocabulary.md`
— skills that fire on a fixed outcome-vocabulary list miss adjacent, equally-common phrasing
that expresses the same intent.

## Proposed Behavior

Expand `kmg-capture-router`'s trigger patterns to include a "future idea" vocabulary class —
phrases like "future enhancement," "worth capturing," "future feature," "we should consider,"
"down the road" — routing to an ENH-shaped capture (lightweight spec, `status: proposed`,
matching the ENH-050/053/054 precedent) rather than the memory/lesson/ADR destinations
`kmg-capture-router` already routes to.

**The exact keyword set is not decided here** — captured only as the gap and the general
shape of the fix; the specific trigger vocabulary needs its own brainstorm before
implementation, the same way the original outcome-vocabulary list was presumably tuned.

## Related

- `knowledge/lessons-learned/patterns/Lessons_Learned_Patterns_Skill_Auto_Triggers_Miss_Process_Vocabulary_—_Only_Fire_On_Outcome_Vocabulary.md` — same failure class, prior instance
- ENH-053, ENH-054 — the two ideas that surfaced this gap
- `skills/kmg-capture-router/SKILL.md` — the skill needing the new trigger class
