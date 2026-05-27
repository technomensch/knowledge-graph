---
id: ENH-017
type: Enhancement
status: tracked
github-issue: null
branch: none
created: 2026-05-27
---

# ENH-017: Improve start-issue-tracking Step 1.2 Version Impact UX

## Problem

Step 1.2 of `/kmgraph:start-issue-tracking` asks:

> "Version impact? New minor / Patch to merged / WIP update / Hotfix"

A new user has no context for what each option means or how it affects version numbering. No examples, no semver implications, no distinction between fix vs enhancement in "Patch".

## Proposed Fix

Replace Step 1.2 question with:

> "Version impact — what version increment does this require?
> - **New minor** (e.g., v0.5.x → v0.6.0) — new feature or significant behavior change
> - **Patch** (e.g., v0.5.8 → v0.5.9) — small fix or enhancement on a released version
> - **WIP append** — added to a version branch already in progress
> - **Hotfix** (e.g., v0.5.8 → v0.5.8.1) — urgent fix to a released version"

## Changes

- `commands/start-issue-tracking.md` § Step 1.2 — update question text (PROTECTED file, requires explicit user permission)

## Notes

- "WIP update" renamed to "WIP append" for clarity
- "Patch" now explicitly covers fix or enhancement (not just fix)
- Identified during v0.5.9 ENH tracking session 2026-05-27
