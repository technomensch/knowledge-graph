# Knowledge Graph - Patterns

Quick-reference patterns discovered from lessons learned.

---

## Pattern Template

Copy this template for each new pattern:

```markdown
## Pattern Name

**Quick Reference:**
- **Problem:** [What problem this solves]
- **Solution:** [How to solve it]
- **When to Use:** [Trigger conditions]

**Evidence:**
[Link to lesson learned](../../lessons-learned/category/lesson-file.md) — [Context]
- [Key finding from lesson]
- [Measurement or result]

**See Lesson:** [Link to full lesson with details]
```

---

## Instructions

1. **Keep it scannable:** Quick reference should be readable in 5-10 seconds
2. **Link to lessons:** Every pattern must reference at least one lesson-learned
3. **Bidirectional:** Update lesson files to cross-reference KG entries
4. **When to use:** Include trigger conditions (when to apply this pattern)
5. **Evidence-based:** All patterns must have concrete evidence from actual work

---

## Add Your Patterns Below

## Skill as Single Source of Truth (DRY Escalation Pattern)

**Quick Reference:**
- **Problem:** Escalation thresholds split across `rules.md`, `triggers.md`, and a skill file causes drift — values get updated in one place but not the others.
- **Solution:** When a skill owns a specific behavior end-to-end (attempt counting, exit-path menu), make the skill the only authoritative location. Do not duplicate threshold values or trigger phrases in rules or triggers files. Reference the skill by name in rules if needed.
- **When to Use:** Designing a new skill with its own threshold logic; noticing the same threshold appears in both a rules file and a skill file; any behavior a skill enforces independently.

**Evidence:**
[ADR-035-stuck-work-escalation](../decisions/ADR-035-stuck-work-escalation.md) — Key decision: skill is single source of truth — no rules.md or triggers.md entries (DRY principle applied).

**See Lesson:** No dedicated lesson file — derived from ADR-035 session (2026-04-16).

**Related:** [[ADR-035-stuck-work-escalation]], [[Lessons_Learned_Patterns_Single_Source_Of_Truth_DRY_Documentation]]

---

## Plugin-Owned Skill Shadow Pattern

**Quick Reference:**
- **Problem:** A plugin ships a skill you want to extend, but modifying it directly loses your changes on every plugin update.
- **Solution:** Create a personal shadow skill in `~/.claude/skills/` with the same or broader trigger vocabulary. The personal skill owns the extended behavior and invokes the plugin command at the appropriate gate. Plugin updates no longer overwrite your extensions.
- **When to Use:** You want to extend a plugin skill without forking the plugin; the plugin skill triggers too broadly or narrowly; you need to insert a gate (e.g., Opus escalation) before or after plugin behavior.

**Evidence:**
[ADR-035-stuck-work-escalation](../decisions/ADR-035-stuck-work-escalation.md) — Skill is plugin-owned so a personal shadow skill in `~/.claude/skills/` owns the attempt logging and exit-path decision menu.

**See Lesson:** No dedicated lesson file — derived from chat session 2026-04-16 (L1492–1495).

**Related:** [[ADR-035-stuck-work-escalation]]

---

## Attempt Definition Precision (Stuck-Work Threshold Hygiene)

**Quick Reference:**
- **Problem:** "3 attempts" is ambiguous — retrying the same failing command counts as 1 attempt, not 3. Without a precise definition, escalation thresholds are gamed by retries.
- **Solution:** Define an "attempt" as a distinct hypothesis tested, not a retry of the same fix. Re-running the same failing command = 0 new attempts. Document this definition wherever the threshold is stated.
- **When to Use:** Writing rules or skills that count "attempts" before escalating; reviewing whether escalation has been triggered correctly.

**Evidence:**
[ADR-035-stuck-work-escalation](../decisions/ADR-035-stuck-work-escalation.md) — Attempt definition is explicit in the ADR and skill spec.

**See Lesson:** No dedicated lesson file — derived from chat session 2026-04-16 (L1469).

**Related:** [[ADR-035-stuck-work-escalation]]

---

## Per-Task Execution Mode Table in Plans

**Quick Reference:**
- **Problem:** A single blanket "use subagents" recommendation doesn't distinguish which tasks benefit from parallelism vs. inline execution, causing over- or under-parallelization.
- **Solution:** Include a per-task execution mode table in every plan. Columns: Task | Mode (Inline/Subagent/Team) | Model (Sonnet/Opus) | Notes. Single-phase plans get one table; multi-phase plans get one per phase. Execution confirmation at plan start replaces the redundant "subagent or inline?" prompt.
- **When to Use:** Writing any implementation plan; reviewing a plan before saying "Proceed"; deciding model allocation across tasks.

**Evidence:**
[ADR-004-superpowers-plan-approval-gate](~/.kmgraph/decisions/ADR-004-superpowers-plan-approval-gate.md) — Extended parallelism rule to output per-task execution mode table (2026-04-16).

**See Lesson:** No dedicated lesson file — derived from ADR-004 update, chat session 2026-04-16 (L3330).

**Related:** [[ADR-004-superpowers-plan-approval-gate]]

---

## Docs-Impact Scan as Discovery Layer (Not Bypass)

**Quick Reference:**
- **Problem:** At release time, AI agents miss obvious docs (README, INSTALL, CHANGELOG) that need updating because they only update files they touched during implementation.
- **Solution:** A `docs-impact-scan` skill runs before PR/push, scans project root `.md` files and `docs/` (excluding plans/superpowers/design dirs), always surfaces obvious files regardless of grep hits, and feeds each hit into the existing `update-doc` wizard. Embed the invocation as a mandatory step in every plan's final task.
- **When to Use:** Finishing any feature branch before pushing; any plan's final task; post-implementation review when docs may have been missed.

**Evidence:**
[ADR-036-docs-impact-scan](../decisions/ADR-036-docs-impact-scan.md) — Full design: scan is the discovery layer, `update-doc` wizard handles the update. Mandatory plan step.

**See Lesson:** No dedicated lesson file — derived from ADR-036 brainstorming session (2026-04-16).

**Related:** [[ADR-036-docs-impact-scan]]

---

## Search-Before-Creating Scope (DRY for All KG Artifacts)

**Quick Reference:**
- **Problem:** The "search before creating" rule was scoped only to lessons, allowing duplicate ADRs, issues, enhancements, and session summaries to be created without checking for existing entries.
- **Solution:** Expand search-before-creating to cover all KG artifacts: lessons, ADRs, issues, enhancements, session summaries, and KG entries. Before creating any artifact, search the knowledge graph for an existing one covering the same topic.
- **When to Use:** Before running any `/kmgraph:create-*` or `/kmgraph:capture-*` command; before writing a new ADR or session summary.

**Evidence:**
Identified in chat session 2026-04-16 (L3340–3342) — rule extended from lessons-only to all KG artifact types.

**See Lesson:** No dedicated lesson file — derived from session 2026-04-16.

**Related:** [[Lessons_Learned_Patterns_Single_Source_Of_Truth_DRY_Documentation]]

