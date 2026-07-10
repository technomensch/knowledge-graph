---
title: "Lesson: Fix Ownership Follows the Root-Cause KG, Not the Code's Location"

created: 2026-07-10T00:00:00Z

author: technomensch

email: mkitact@gmail.com

git:
  branch: v0.6.17-fix-extract-chat-rebuild
  commit: 24e1c77243bdb5bb9259a840e7703997f40971a2
  pr: null
  issue: null

tags: [personal-kg, project-kg, two-level-hierarchy, enh-ownership, fix-routing, shared-plugin-code, root-cause, backfill]

category: patterns
---

# Lesson Learned: Fix Ownership Follows the Root-Cause KG, Not the Code's Location

**Date:** 2026-07-04 (discovered) / 2026-07-10 (backfilled)
**Category:** patterns
**Version:** 1.0

---

## Problem

A bug surfaced in scripts that are shared plugin code (code that ships with the project and is used across every KG instance). The instinctive move was to track and fix it in this repo's `knowledge/enhancements/`, since that's where the affected code physically lives.

**Context:**
- KMGraph v0.6.16 branch work, 2026-07-04
- Bug traced to personal-rule-file split naming — a concern that only exists in the personal KG's data (`~/.kmgraph/rules.md` split behavior), not in this project's data
- The executing code is shared, but the *defect* only manifests because of personal-KG-scoped naming conventions

**Impact:**
- Filing this under the project's `knowledge/enhancements/` would have tracked a personal-KG-specific concern inside project-shared tracking, muddying which KG "owns" the fix and where future contributors should look for related history

---

## Root Cause

"Where does the code live" and "where does the root cause live" are two different questions, and only the second one should decide where a fix is tracked.

**Analysis:**
1. Plugin scripts are shared infrastructure — every KG instance (project or personal) executes the same code
2. A bug in shared code can still have a root cause that is scoped to exactly one KG's data/conventions (here: personal-KG rule-file split naming)
3. Defaulting to "fix lives where the code lives" ignores the existing two-level KG hierarchy (see Related Documentation) and re-scatters personal-KG-specific concerns into project-shared tracking
4. The correct question is: "if this bug never existed, would a *different* KG's conventions still be unaffected?" — if yes, the root cause (and the fix's tracking) belongs to the KG whose conventions are actually implicated

**Evidence:**
- 2026-07-04 session: root cause was explicitly identified as "personal rule-file split naming," and the fix's home was moved to `~/.kmgraph` on that basis rather than being added to this repo's `knowledge/enhancements/`

---

## Solution

When a bug is found in shared plugin code, route tracking/fix ownership to whichever KG's data or conventions the root cause is actually scoped to — not to wherever the executing code physically resides.

### Implementation

**Approach:**
Before filing an ENH/issue for a shared-code bug, ask: "does the root cause only make sense in the context of one specific KG's conventions (personal vs. project)?" If yes, track and fix it there.

**Key Components:**
1. Shared plugin code can be the *site* of a bug without being its *cause*
2. The two-level KG hierarchy (project KG vs. personal KG, per the existing identity/rules pattern) extends naturally to bug/fix ownership, not just to identity and rules files
3. Routing decision happens once, explicitly, before filing — not left to whichever KG happens to be open

---

## Verification

- Fix ownership moved to `~/.kmgraph` for the personal-rule-file-split bug during the 2026-07-04 session, keeping this repo's `knowledge/enhancements/` scoped to project-shared concerns only

---

## Prevention System

**Immediate Prevention:**
- When triaging a shared-code bug, explicitly ask "which KG's conventions does the root cause implicate?" before choosing where to file it

**Systematic Prevention:**
- Extend the existing Bug/Enhancement Triage check (`knowledge/rules.md`, "same-feature-area check") to also ask the personal-vs-project question for shared plugin code, not just "does an open ENH already cover this"

---

## Replication Pattern

### For Other Projects

**When to Apply:**
- A project uses a personal + project two-level KG/config hierarchy (see the existing Two-Level Identity lesson)
- Shared plugin/tooling code is used across both scopes
- A bug in that shared code has a root cause scoped to only one side of the hierarchy

**Universal Pattern:**
1. Identify whether the code that broke is shared across scopes
2. Identify whether the root cause is scoped to one side of the hierarchy (e.g., a personal convention) or is genuinely scope-agnostic
3. If root-cause-scoped, file and fix the issue in that scope's tracking, even though the code lives elsewhere
4. If scope-agnostic, file it in the project's shared tracking as usual

**Customization Points:**
- What counts as "shared code" vs. "scope-specific data/config" will vary by project
- The routing question ("where does the root cause live") generalizes; the specific KG paths do not

---

## Related Documentation

**Other Lessons:**
- [Two-Level Identity and Rules Hierarchy for AI Agents](./Lessons_Learned_Two_Level_Identity_Rules_Hierarchy.md) — the underlying personal/project hierarchy this lesson extends from identity+rules files to bug/fix ownership

---

## Lessons & Takeaways

**Key Insights:**
1. "Where the code lives" and "where the root cause lives" are separate questions — routing decisions should follow the second one
2. The two-level KG hierarchy pattern (project vs. personal) is broader than identity/rules files; it applies to any artifact whose root cause can be scope-specific, including bug tracking
3. This is a distinct point from the original Two-Level Identity lesson (which is scoped to identity/rules file separation), not a duplicate of it — kept as its own entry rather than appended, to avoid diluting that lesson's focused scope

**What Worked:**
- Explicitly naming the root cause's scope before filing prevented a personal-KG concern from being tracked in project-shared `knowledge/enhancements/`

**If We Had to Do It Again:**
- Add this question explicitly to the Bug/Enhancement Triage flow in `knowledge/rules.md` so it's asked consistently, not just recognized ad hoc

---

**Version:** 1.0
**Created:** 2026-07-10
**Last Updated:** 2026-07-10
