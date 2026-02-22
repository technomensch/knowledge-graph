---
title: "Lesson: Commands vs Skills Architecture Research"
created: 2026-02-16T00:00:00Z
author: technomensch
email: 917847+technomensch@users.noreply.github.com
git:
  branch: main
  commit: 37f7e544e5b3b2f1c9a7d5e3f1b9a7c5e3f1b9a7
  pr: null
  issue: null
sources: []
tags: [architecture, plugin-design, commands, skills, automation]
category: architecture
---

# Lesson Learned: Commands vs Skills Architecture Research

**Date:** 2026-02-16
**Category:** architecture
**Version:** 1.0

---

## Problem

Claude Code plugins support two orthogonal patterns for autonomous execution: **commands** (flat, direct, produce artifacts) and **skills** (hierarchical, guidance-focused). The knowledge graph plugin needed both immediate task automation and contextual guidance, requiring careful architectural research to avoid duplication and confusion.

**Context:**
- Plugin needed to support `/kg-sis:capture-lesson` (direct automation)
- Plugin also needed `/kg-sis:knowledge-graph-usage` skill (guidance)
- Question: How to structure commands vs skills to maximize reusability?

---

## Root Cause

Initial assumption was that all plugin entry points could use a unified structure. However, Claude Code makes a fundamental distinction:
- **Commands:** Execute directly, produce concrete results, flat namespace
- **Skills:** Provide guidance, reference other skills/commands, hierarchical

Attempting to force skills to do command work (or vice versa) creates awkward abstractions and duplicated logic.

---

## Solution Implemented

Dual architecture with clear separation:

### Commands (Task Automation)

- `capture-lesson.md`, `create-adr.md`, `update-graph.md` → direct artifact creation
- Flat files in `commands/` directory
- Invoked as `/kg-sis:command-name`
- Output: Creates/modifies files in knowledge graph

### Skills (Guidance & Patterns)

- `knowledge-graph-usage` skill with progressive disclosure
- Reference files: `capture-patterns.md`, `command-workflows.md`
- Invoked contextually or via `/kg-sis:[skill-name]`
- Output: Decision trees, pattern references, suggestions

### Integration

- Capture-lesson calls update-graph command; update-graph doesn't embed guidance
- Knowledge-graph-usage skill references specific commands for execution
- No duplication: each structure handles what it's designed for

---

## Evidence

**Key Finding:** The initial research found that mixing command and skill patterns creates maintenance burden. When leadership asked "where should X go?", the answer became ambiguous.

**Design Decision:** Formalized as ADR-002: Commands vs Skills Architecture.

---

## Replication Pattern

**For Other Plugins:**

When designing plugin components, evaluate each piece against these criteria:

1. **Does this produce artifacts (files, modifications)?** → Command
2. **Is this guidance, patterns, or decision support?** → Skill
3. **Can users invoke it directly and expect immediate results?** → Command
4. **Is this meant to help users think through options?** → Skill

**Benefits of Separation:**
- Each structure handles its design purpose
- Easy to extend (add commands or skills independently)
- Clear mental model for users
- Testable in isolation

---

## Lessons & Takeaways

**Key Insights:**
1. Claude Code's command/skill distinction is fundamental, not just organizational
2. Attempting to unify them creates awkward abstractions
3. Each structure has strengths; use the right tool for the job

**What Didn't Work:**
- Treating skills as "fancy commands with more context"
- Using commands for guidance-only work
- Hybrid structures that tried to be both

**If We Had to Do It Again:**
- Understand Claude Code's architectural constraints before designing
- Design separate structures from day one rather than refactoring later
- Use ADRs to document the distinction early

---

## Related ADRs

- [ADR-002: Commands vs Skills Architecture](../../decisions/ADR-002-commands-vs-skills-architecture.md) — Formal decision record

---

**Version:** 1.0
**Created:** 2026-02-16
**Last Updated:** 2026-02-22
