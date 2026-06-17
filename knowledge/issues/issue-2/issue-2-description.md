---
type: Hardening
---

# issue-2: start-issue-tracking — Git steps must be conditional on repo presence

## Problem

The `start-issue-tracking` command (`commands/start-issue-tracking.md`) unconditionally assumes the user's project is a Git repository. All Git-related steps run regardless of whether Git is present.

## Affected Steps

- **Step 1.0** — runs `git branch -a` and `git log` without first checking if a Git repo exists
- **Step 1.3** — asks "Branch strategy?" even when there is no repo (question is meaningless)
- **Step 5 (Git Integration)** — unconditionally runs `git checkout` and branch creation commands
- **Step 7 (Summary)** — always shows Branch and GitHub Issue rows; always checks "Git Authority Validated"
- **Smart Defaults section** — auto-detection logic references `git branch --show-current` and `git describe` unconditionally
- **Best Practice #3** — states "Always create feature branch for issue work" with no caveat

## Expected Behavior

When the user's project has no Git repository:
- Step 1.0 detects absence of Git and sets `{git_available} = false`
- Step 1.3 (branch strategy) is skipped or auto-answered "N/A"
- Step 5 is skipped entirely
- Step 7 summary omits Branch and GitHub Issue rows; Git Authority row shows "N/A — no Git repo"

## Context

Identified during a validation pass on the `start-issue-tracking` skill (2026-04-07 session). KMGraph is designed to be usable without a Git-connected project, so any command that silently requires Git is a hardening gap.

## Session Snapshot

See: `docs/sessions/2026-04/2026-04-07-session-snapshot-2026-04-06.md`
