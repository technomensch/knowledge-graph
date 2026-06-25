---
title: "ENH-011: Duplicate Check in capture-lesson Before Creating New Entry"
number: 011
status: implemented
version_target: "v0.3.0-beta"
github_issue: null
created: 2026-04-09
related_adrs: []
related_enhs: ["ENH-010"]
---
# ENH-011: Duplicate Check in capture-lesson Before Creating New Entry

## Problem

The `kmgraph:capture-lesson` skill has no step that searches the active knowledge graph for similar existing lessons before proceeding to create a new one. This leads to:

- Duplicate lessons covering the same problem from different angles
- Related lessons that should be updates getting created as new entries instead
- Users unaware that institutional knowledge already exists for their problem

The gap was observed directly on 2026-04-09: a lesson about "rule violations as ADR evidence" was nearly created as a new entry before a manual search revealed `Lessons_Learned_Plan_File_Dual_Location_Protocol.md` already covered the underlying violation. The result was correctly an update, not a new file — but only because the check was done manually.

---

## Expected Behavior

### New Step 0.5 in capture-lesson skill: Duplicate Check

After the Snapshot Gate (Step 0) and before Step 1 (Gather Context), insert:

**Step 0.5 — Duplicate Check**

```
Before capturing a new lesson, search the active KG for existing lessons on the same topic.

Run kg_search (or /kmgraph:recall) with 2-3 query variations derived from the proposed title/topic.

If matches found:
  - Show the user: "Found N potentially related lesson(s):"
    [list file paths + one-line titles]
  - Ask:
    "1. Update one of these (which one?)
     2. None of these match — create new lesson
     3. Let me look at [filename] before deciding"

If no matches found:
  - Proceed directly to Step 1
```

**Queries to run (auto-generated from user's topic):**
- Core noun phrase from title
- Problem domain keywords
- Any referenced artifact names (ADR-NNN, ENH-NNN, command names)

---

## First Test: rules.md Integration

This ENH is specifically called out in the v0.3.0-beta verification plan as the first practical test of `rules.md` surfacing.

**Test procedure:**
1. After Phase 3 scaffolds `knowledge/rules.md`, add this rule as the first entry:
   ```markdown
   ## Knowledge Capture Rules

   - Before creating a new lesson via `/kmgraph:capture-lesson`, search the graph
     for similar existing lessons. If found, update rather than create new.
     See ENH-011.
   ```
2. In a fresh session, invoke `/kmgraph:capture-lesson` on a topic that has an existing lesson.
3. Verify: does `rules.md` surface the duplicate-check rule before the skill runs?
4. Compare: would this have been caught if the rule were only in memory or CLAUDE.md?

**Success signal:** The rule in `rules.md` is read at session start (via the platform shim) and the assistant performs the duplicate check without being prompted.

---

## Affected Files

- `skills/capture-lesson.md` (or the installed plugin path) — add Step 0.5
- `core/templates/knowledge/rules.md` — include duplicate-check rule in the "Knowledge Capture" section of the template

---

## Acceptance Criteria

- [ ] `capture-lesson` skill runs `kg_search` before Step 1 on every new-lesson invocation
- [ ] If matches found, user is shown options (update / create new / inspect)
- [ ] If no matches found, skill proceeds without interruption
- [ ] `core/templates/knowledge/rules.md` template includes the duplicate-check rule
- [ ] v0.3.0-beta first-rule test passes: rule in `rules.md` surfaces without explicit prompt

---

## Out of Scope

- Fuzzy semantic similarity (embeddings) — KG search is keyword/FTS5 only for now
- Auto-merging duplicate lessons
- Cross-KG duplicate detection (personal + project) in the same check

---

## Plan Reference

v0.3.0-beta Verification item 10: "ENH-011 first-rule test — add duplicate-check rule to knowledge/rules.md, verify surfacing"

**Session Reference:** 2026-04-09 planning session (same session that produced ENH-010)
