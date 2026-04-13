---
title: "Parallel Opus Review Before Release"
created: 2026-04-12T00:07:58.415Z
updated: 2026-04-12T00:07:58.415Z
author: technomensch
git:
  branch: v0.3.6
  commit: 636ca49171f1be908f076f9eb09784a294ad316c
tags: [release, code-review, parallel-agents, multi-workstream, pre-release, subagents, opus, quality-gate]
category: process
---
## Problem

Before cutting a release, there is no structured process for reviewing completed implementation work across multiple independent workstreams. Ad-hoc review misses cross-cutting issues — shell portability problems, test coverage gaps, routing bugs — that reviewers in the implementation session do not catch because they are too close to the work.

## Solution

Dispatch parallel Opus review agents, one per independent implementation area. Brief each agent with:

- The full spec text for their domain
- Acceptance criteria
- Specific file paths to review
- What categories of issues to look for (e.g., shell portability, error handling, test coverage, routing correctness)

Each agent returns a structured report with:

- **correctly_implemented** — what is working as specified
- **gaps** — missing behavior relative to the spec
- **bugs** — defects with specific file + line references
- **fix_recommendation** — concrete suggestion per issue

Compile all reports into a plan section. Index findings by ID (e.g., F-01, F-02). For each finding, assign:

- A fix model (Haiku for mechanical shell/TS fixes, Sonnet for logic or routing bugs, Sonnet for test expansion)
- The files to touch
- The parallelization group (which fixes have no file conflicts and can run simultaneously)

Execute fix groups via parallel subagents, grouped by file-conflict boundaries. Gate Task 5 (version bump, PR creation) until all fix groups pass the test suite.

## When to Apply

Use this pattern when:

- A release branch has 3 or more independent implementation workstreams
- Implementation was done by parallel subagents (increasing risk of cross-cutting blind spots)
- You are about to do a version bump or open a PR and want structured confidence
- A previous release had post-merge regressions that inline review missed

Do not use for single-workstream changes or trivial patches — the overhead is not justified.

## Briefing Template for Each Review Agent

```
You are a code reviewer. Review only the files listed below.

Spec excerpt: [paste relevant spec section]

Acceptance criteria:
- [criterion 1]
- [criterion 2]

Files to review:
- [path/to/file1]
- [path/to/file2]

Return a structured report with four sections:
1. correctly_implemented
2. gaps (spec requirements not met)
3. bugs (defects with file:line references)
4. fix_recommendation (one recommendation per gap/bug)
```

## Fix Assignment and Parallelization

After compiling findings:

1. Group fixes by file ownership (fixes touching the same file must be sequential within that file)
2. Assign model based on fix complexity:
   - Haiku: mechanical changes (rename, shell quoting, constant swap)
   - Sonnet: logic changes, routing bugs, test expansion
3. Identify independent groups (no shared files) — these run in parallel
4. Identify dependent groups (share files or one fix sets up another) — these run sequentially

## Gate Condition

No version bump or PR until all fix groups pass the full test suite. Run tests after each fix group completes before starting the next dependent group.

## Context

- Branch: v0.3.6
- Commit: 636ca491
- Category: process
