---
title: "Hardcoded main...HEAD Branch-Comparison Base Silently Returns Empty Pre-Divergence"
created: 2026-08-16T20:54:48.113Z
updated: 2026-08-16T20:54:48.113Z
author: Marc K
git:
  branch: v0.7.1.5-capture-filename-diffbase-fix
  commit: af4474529b33ba3f7561b12fe7e14dcef0421d0e
tags: [branch-comparison, git-diff, merge-base, issue-47, adr-036, silent-bug]
category: patterns
---
## Problem

Four call sites — `agents/session-summary-agent.md:444,474`,
`kmg-docs-impact-scan/SKILL.md:24`, `kmg-update-issue-plan.md:87` — hardcode
`git diff main...HEAD` to compute "what changed." This silently returns empty
when `HEAD` already equals `main` (e.g. mid spec-drafting, before any feature
branch exists) — the actual condition present during this session.

A correct pattern already existed in the same codebase
(`skills/kmg-paperwork-audit/SKILL.md:30-44`: dynamic default-branch detection
+ `git merge-base`) but was never reused by the other three sites — each
re-implemented or hardcoded instead of reusing the one correct implementation.

One of the four sites' behavior is codified in
`knowledge/decisions/ADR-036-docs-impact-scan.md`, so its fix also requires an
ADR amendment, not just a script patch.

## Solution

Replace all four hardcoded `main...HEAD` comparisons with the existing
dynamic default-branch-detection + `git merge-base` pattern from
`skills/kmg-paperwork-audit/SKILL.md:30-44`. For the `kmg-docs-impact-scan`
site, pair the code fix with an ADR-036 amendment since its current hardcoded
behavior is the documented decision.

Full detail: `knowledge/issues/issue-47/issue-47-description.md` and
`solution-approach.md`.

## When to apply

Before hardcoding a branch-comparison base ("what changed on this branch"),
grep the codebase for an existing correct implementation and reuse it rather
than re-deriving branch-diff logic ad hoc. Specifically test any such logic
in the state where `HEAD` already equals the default branch (pre-divergence) —
that's the silent-failure case a green run under normal conditions won't
surface.

## Context

- Branch: v0.7.1.5-capture-filename-diffbase-fix
- Commit: af447452 (investigation session; fix not yet committed on this branch)
- Category: patterns
- Linked issues: issue-47 (GitHub #227)
