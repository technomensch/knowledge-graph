# Knowledge Graph - Gotchas

Quick-reference pitfalls and anti-patterns to avoid.

---

## Gotcha Template

Copy this template for each new gotcha:

```markdown
## Gotcha Name

**Quick Reference:**
- **Symptom:** [What you see when you hit this]
- **Root Cause:** [Why it happens]
- **Fix:** [How to resolve it]
- **Prevention:** [How to avoid it]

**Evidence:**
[Link to lesson learned](../../lessons-learned/category/lesson-file.md) — [Context]
- [What went wrong]
- [How it was discovered]

**See Lesson:** [Link to full lesson with debugging details]
```

---

## Instructions

1. **Symptom-first:** Start with what the user observes
2. **Root cause:** Explain why it happens (not just how to fix)
3. **Prevention:** Include how to avoid hitting this in the future
4. **Link to lessons:** Every gotcha must reference at least one lesson-learned
5. **Concrete examples:** Use real cases, not hypotheticals

---

## Add Your Gotchas Below

## Skills Fire on Outcome Vocabulary, Not Process Vocabulary

**Quick Reference:**
- **Symptom:** A skill that should auto-trigger doesn't fire, even though the user's intent matches the skill's purpose.
- **Root Cause:** Skill triggers are tuned to a single canonical phrase rather than the full vocabulary a user reaches for naturally ("draft a plan" vs. "write a plan" vs. "create a plan").
- **Fix:** Add all natural phrasings as trigger phrases. Test coverage by listing 5 different ways a user would ask for the same thing — all 5 should trigger the skill.
- **Prevention:** When writing a skill, enumerate at least 3–5 trigger variants covering outcome vocabulary ("draft," "write," "create," "build") rather than relying on one phrase.

**Evidence:**
[Lessons_Learned_Patterns_Skill_Auto_Triggers_Miss_Process_Vocabulary](../lessons-learned/patterns/Lessons_Learned_Patterns_Skill_Auto_Triggers_Miss_Process_Vocabulary_—_Only_Fire_On_Outcome_Vocabulary.md) — writing-plans skill failed to fire on "create a plan" and "draft a plan" variants; root cause: single trigger phrase, not a coverage set.

**See Lesson:** [[Lessons_Learned_Patterns_Skill_Auto_Triggers_Miss_Process_Vocabulary_—_Only_Fire_On_Outcome_Vocabulary]]

**Note:** The existing lesson covers the outcome vs. process vocabulary distinction. This gotcha entry adds the concrete test method: enumerate 5 natural phrasings and verify all trigger the skill.

