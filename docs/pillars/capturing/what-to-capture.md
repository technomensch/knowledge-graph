---
id: what-to-capture
title: What to Capture
sidebar_label: What to Capture
description: How to choose between lessons, ADRs, patterns, and meta-issues.
---

# What to Capture

KMGraph has four entry types. Each answers a different question.

## Decision guide

| If you're thinking... | Use |
|---|---|
| "I just figured out why this was broken" | Lesson Learned |
| "We chose X over Y and here's why" | Architecture Decision (ADR) |
| "This approach works well across projects" | Pattern |
| "There's a recurring theme across multiple bugs/decisions" | Meta-Issue |

## Lessons Learned

**Use for:** bug fixes, breakthroughs, things you didn't know before.
**Command:** `/kmgraph:capture-lesson`
**Shelf life:** High — these stay relevant as long as the codebase or tool does.

Example: "The SessionStart hook fails if hooks.json uses `${CLAUDE_PROJECT_DIR}` instead of `${CLAUDE_PLUGIN_ROOT}`."

## Architecture Decisions (ADRs)

**Use for:** decisions between two or more approaches, with rationale.
**Command:** `/kmgraph:create-adr`
**Shelf life:** Medium — superseded ADRs should be marked as such, not deleted.

Example: "Chose SQLite over PostgreSQL for local-first storage — no server dependency, portable."

## Patterns

**Use for:** repeatable approaches worth applying in future projects.
**Command:** `/kmgraph:capture-lesson` with pattern framing
**Shelf life:** High — abstract enough to survive tool changes.

Example: "Always write the failing test before investigating the root cause — the test output guides the investigation."

## Meta-Issues

**Use for:** recurring themes that span multiple incidents, not a single fix.
**Command:** `/kmgraph:capture-lesson` with meta-issue framing
**Shelf life:** High — meta-issues accumulate evidence over time.

Example: "Repeated context loss between sessions — multiple bugs stem from assuming prior session knowledge."

## When in doubt

Start with a Lesson. You can always promote it to a pattern or meta-issue later.
