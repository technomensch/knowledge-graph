---
title: "Lesson: Inline KG Updates Violate Multi-KG Architecture"
created: 2026-02-16T00:00:00Z
author: technomensch
email: 917847+technomensch@users.noreply.github.com
git:
  branch: main
  commit: 37f7e544e5b3b2f1c9a7d5e3f1b9a7c5e3f1b9a7
  pr: null
  issue: null
sources: []
tags: [architecture, multi-kg, routing, design-patterns]
category: architecture
---

# Lesson Learned: Inline KG Updates Violate Multi-KG Architecture

**Date:** 2026-02-16
**Category:** architecture
**Version:** 1.0

---

## Problem

The plugin was initially designed to manage a single knowledge graph. When multi-KG support was added (v0.0.1), existing code that updated the knowledge graph "inline" (embedded within capture-lesson command) created a critical architectural violation.

**Context:**
- Single-KG design: capture-lesson calls update logic directly
- Multi-KG requirement: must route updates to active KG, not hardcoded path
- Problem: Inline updates have hardcoded paths, can't route to different KGs

---

## Root Cause

Inline updates assume:
1. There is one knowledge graph
2. Its path is fixed/known at runtime
3. Updates can happen directly within command context

Multi-KG architecture requires:
1. **Routing:** Determine active KG from centralized config
2. **Delegation:** Pass update work to dedicated update-graph command
3. **Flexibility:** Different KGs may have different paths/structure

These constraints conflict fundamentally when updates are embedded inline.

---

## Solution Implemented

Separate concerns via **delegated architecture** (ADR-006):

**Before (Single-KG, Inline):**
```
capture-lesson.md
├── Extract patterns from lesson
├── Write directly to active_kg/knowledge/patterns.md
├── Write directly to active_kg/knowledge/gotchas.md
└── Commit changes
```

**After (Multi-KG, Delegated):**
```
capture-lesson.md
├── Extract patterns from lesson
├── Call /kg-sis:update-graph with extracted data
│   └── update-graph.md handles routing to active KG
│       ├── Read active KG path from config
│       ├── Write to active_kg/knowledge/patterns.md
│       ├── Write to active_kg/knowledge/gotchas.md
│       └── Commit changes
└── Return to user
```

**Key Change:** Capture-lesson delegates routing to update-graph; never writes directly to KG files.

---

## Evidence

**Key Finding:** When building multi-tenant or multi-context systems, separation of concerns becomes mandatory, not optional. Inline updates work for single-instance systems but break at scale.

**Citation:** This pattern appears in multi-database ORMs, multi-workspace IDEs, and multi-project build systems.

---

## Replication Pattern

**For Multi-KG/Multi-Context Systems:**

1. **Never embed context-specific logic:** Don't hardcode "which KG" in feature commands
2. **Use delegated routing:** Route context selection to dedicated command/module
3. **Single source of truth:** Config file determines what's active
4. **Test both single and multi:** Ensure code works with 1 KG and 3 KGs equally

**Benefits:**
- Scales to many KGs without code changes
- Clear separation: capture logic vs routing logic
- Easier to test routing independently
- Supports future multi-KG operations

---

## Lessons & Takeaways

**Key Insights:**
1. Inline logic is convenient but doesn't scale
2. Delegation pattern (command → routing → execution) required for multi-context
3. Architectural constraints emerge before feature completeness

**What Didn't Work:**
- Attempting to support both single-KG (inline) and multi-KG (delegated) simultaneously
- Assumption that "I'll refactor later"
- Ad-hoc routing logic scattered across commands

**If We Had to Do It Again:**
- Design for multi-KG from day one (even if single-KG is MVP)
- Use dedicated routing command from start
- Avoid inline updates to context-dependent files

---

## Related ADRs

- [ADR-001: Centralized Multi-KG Configuration](../../decisions/ADR-001-centralized-multi-kg-configuration.md) — KG routing foundation
- [ADR-006: Delegated vs Inline KG Updates](../../decisions/ADR-006-delegated-vs-inline-kg-updates.md) — Formal decision record

---

**Version:** 1.0
**Created:** 2026-02-16
**Last Updated:** 2026-02-22
