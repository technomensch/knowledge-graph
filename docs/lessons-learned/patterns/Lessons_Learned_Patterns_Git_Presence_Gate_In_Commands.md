---
title: "Git Presence Gate in Commands"
created: 2026-04-07T12:20:10.610Z
updated: 2026-04-07T12:20:10.610Z
author: Marc K
git:
  branch: v0.2.3.4-issue-2-start-issue-tracking-no-git
  commit: bd4b3b34e610b7c69f49bdee8093783798792fd2
tags: [git, guard, defensive-programming, commands, non-git]
category: patterns
---
# Git Presence Gate in Commands

## Problem

The `start-issue-tracking` command unconditionally ran Git commands (`git branch -a`, `git log`, `git checkout -b`) without first checking whether the working directory was a Git repository. This caused errors when the command was used in non-Git projects, because Git operations fail with unhelpful error messages when no `.git` directory is present.

## Solution

Add `git rev-parse --is-inside-work-tree 2>/dev/null` as the first command in any step that assumes Git presence. Store the result as a boolean flag (e.g., `{git_available}`). Gate all subsequent Git-dependent steps on that flag — skip them entirely when false.

Applied to `commands/start-issue-tracking.md`:
- Step 1.0 now runs the gate and stores `{git_available}`
- Step 1.3 (branch strategy) is skipped when `{git_available}` is false
- Step 5 (Git Integration) is skipped entirely when `{git_available}` is false
- Step 7 summary omits Git rows when `{git_available}` is false

## When to Apply

Apply this pattern whenever a command or skill:
- Runs `git branch`, `git log`, `git checkout`, `git status`, or any other Git subcommand
- Assumes a branch exists or can be created
- Reads commit history or author metadata

The gate should be the very first action, before any user-facing output that references Git state.

## Context

- Branch: v0.2.3.4-issue-2-start-issue-tracking-no-git
- Related: GitHub issue #56