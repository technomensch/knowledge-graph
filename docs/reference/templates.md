---
id: templates
title: Templates Reference
sidebar_label: Templates
description: All bundled knowledge entry templates in KMGraph — lesson, ADR, session, MEMORY, and more
---

# Templates Reference

KMGraph ships a set of bundled templates in `core/templates/`. Every template is protected — do not modify files under `core/` without explicit permission. To customize templates for a project, copy the relevant file into the project's knowledge graph directory.

For customization guidance, see [guides/customize-templates.md](../guides/customize-templates.md).

---

## Lessons Learned

| File | Purpose | Key Fields | Created by |
|---|---|---|---|
| `lessons-learned/lesson-template.md` | Documents a single lesson: what happened, root cause, and fix | `title`, `created` [AUTO], `author` [AUTO], `git.*` [AUTO], `tags`, `severity`, `category` | `/kmgraph:capture-lesson` |

---

## Architecture Decisions (ADRs)

| File | Purpose | Key Fields | Created by |
|---|---|---|---|
| `decisions/ADR-template.md` | Records an architectural decision with status, context, and consequences | `title`, `number`, `created`, `status`, `author`, `email` | `/kmgraph:create-adr` |

---

## Sessions

| File | Purpose | Key Fields | Created by |
|---|---|---|---|
| `sessions/session-template.md` | Summarizes a work session: what was done, decisions made, next steps | `Date` [AUTO], `Type` [MANUAL], `Duration` [MANUAL], `Status` [MANUAL] | `/kmgraph:session-summary` |

---

## Knowledge Graph Entries

These templates live under `core/templates/knowledge/` and provide per-category structures for the knowledge graph. Most entries are auto-generated from lessons via `/kmgraph:update-graph`; use these templates when creating entries directly.

| File | Category | Purpose | Created by |
|---|---|---|---|
| `knowledge/entry-template.md` | General | Base template for any standalone KG entry | Manual / `/kmgraph:update-graph` |
| `knowledge/architecture.md` | Architecture | Architectural components, design decisions, trade-offs | `/kmgraph:update-graph` |
| `knowledge/concepts.md` | Concepts | Domain terminology and core abstractions | `/kmgraph:update-graph` |
| `knowledge/gotchas.md` | Gotchas | Pitfalls and anti-patterns; symptom → root cause → fix | `/kmgraph:update-graph` |
| `knowledge/patterns.md` | Patterns | Reusable solutions discovered from lessons | `/kmgraph:update-graph` |
| `knowledge/workflows.md` | Workflows | Standard operating procedures and repeatable processes | `/kmgraph:update-graph` |

---

## Meta (Project-Level)

| File | Purpose | Created by |
|---|---|---|
| `MEMORY-template.md` | Persistent project memory loaded into every session; governance patterns and critical context | `/kmgraph:init` |
| `AGENTS-template.md` | Scaffold for new KMGraph subagent definitions; metadata block, structure, and prompt sections | Manual |
| `documentation/doc-template.md` | General documentation file; enforces heading hierarchy, breadcrumb nav, and third-person voice | `/kmgraph:create-doc` |

---

## Meta-Issue Tracking

Meta-issue templates live under `core/templates/meta-issue/`. They are scaffolded together by `/kmgraph:start-issue-tracking` to track complex, multi-attempt problems.

### Core Documents

| File | Purpose |
|---|---|
| `meta-issue/description.md` | Living problem description; evolves as understanding changes |
| `meta-issue/implementation-log.md` | Chronological log of every attempt |
| `meta-issue/test-cases.md` | Success criteria and test cases that define "solved" |

### Per-Attempt Documents (`attempt-template/`)

| File | Purpose |
|---|---|
| `attempt-template/solution-approach.md` | Hypothesis and approach for one attempt |
| `attempt-template/plan-reference.md` | Link to implementation plan and objective summary |
| `attempt-template/attempt-results.md` | Outcomes, test results, and what actually happened |

### Analysis Documents (`analysis/`)

| File | Purpose |
|---|---|
| `analysis/lessons-learned.md` | Reusable insights extracted from the investigation |
| `analysis/root-cause-evolution.md` | How root-cause understanding shifted across attempts |
| `analysis/timeline.md` | Chronological history of the full investigation |

### Related Issues

| File | Purpose |
|---|---|
| `related-issues/github-links.md` | Maps GitHub issues and PRs to meta-issue attempts |

---

## Customization

To override a template for a specific project, copy the file from `core/templates/` into the project knowledge graph directory and edit it there. The `core/` tree is not modified during normal use. See [guides/customize-templates.md](../guides/customize-templates.md) for step-by-step instructions.
