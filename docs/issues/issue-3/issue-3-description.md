---
id: issue-3
type: Hardening
status: OPEN
github-issue: "#57"
branch: v0.2.3.4-issue-2-start-issue-tracking-no-git
created: 2026-04-07
---

# issue-3: update-issue-plan — enforce version sync after CHANGELOG entry

## Problem

The `update-issue-plan` skill adds a CHANGELOG entry as part of the governance sync (Step 5) but does not check whether a new version entry was introduced. When a new version is added to CHANGELOG.md, the project's Version Sync Rule requires bumping all version files and doc footers in the same atomic commit:

- `package.json`
- `mcp-server/package.json`
- `.claude-plugin/plugin.json`
- `.claude-plugin/marketplace.json` (plugins[0].version only)
- `docs/CHEAT-SHEET.md` footer
- `docs/COMMAND-GUIDE.md` footer
- `docs/GETTING-STARTED.md` footer

This step was silently skipped during the issue-2 governance sync, resulting in an incomplete release commit.

## Root Cause

The `update-issue-plan` skill has no post-CHANGELOG gate. After writing a new version entry, execution continues to commit without prompting for or enforcing version sync.

## Expected Behavior

After adding a CHANGELOG entry, `update-issue-plan` should:
1. Detect whether a new version header (e.g., `## [0.2.3.4-beta]`) was added
2. If yes: pause and require version sync before committing
3. Display the list of files that need bumping
4. Only proceed to commit after sync is confirmed complete

## Context

Identified during issue-2 governance sync (2026-04-07). A `[0.2.3.4-beta]` entry was added to CHANGELOG.md but version files and doc footers were not bumped. The CHANGELOG itself contains the Version Sync Rule, making this a self-documenting gap.

## Session Snapshot

See: `docs/sessions/2026-04/2026-04-07-session-snapshot-2026-04-06.md`
