# CHANGELOG Version Sync Gate Missing in Governance Skills

## Problem

The `update-issue-plan` skill adds CHANGELOG entries as part of governance sync but has no post-CHANGELOG gate. After writing a new version entry (e.g., `[0.2.3.4-beta]`), execution continues directly to commit without prompting for or enforcing version sync. Version files (`package.json`, `mcp-server/package.json`, `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`) and doc footers (`CHEAT-SHEET.md`, `COMMAND-GUIDE.md`, `GETTING-STARTED.md`, `CONCEPTS.md`) are silently skipped.

Encountered during issue-2 governance sync (2026-04-07). A `[0.2.3.4-beta]` entry was added to `CHANGELOG.md` but version files and doc footers were not bumped. Tracked as issue-3, GitHub #57.

## Solution

Add a version sync gate to `update-issue-plan` after CHANGELOG is updated. Detect new version headers using:

```bash
git diff --cached CHANGELOG.md | grep "^+## \[" | grep -v "^\+\+\+"
```

If a new version header is found: pause, list all files requiring bumps, and require explicit user confirmation before committing. Files to bump:

- `package.json`
- `mcp-server/package.json`
- `.claude-plugin/plugin.json`
- `.claude-plugin/marketplace.json` (plugins[0].version only — NOT top-level "version")
- `docs/CHEAT-SHEET.md` footer
- `docs/COMMAND-GUIDE.md` footer
- `docs/GETTING-STARTED.md` footer
- `docs/CONCEPTS.md` (if version reference present)

## When to Apply

Apply this gate whenever a skill or agent writes a new `## [version]` header to `CHANGELOG.md` as part of an automated or semi-automated workflow. The signal is any staged diff on `CHANGELOG.md` containing a new version header line. Without the gate, version drift accumulates silently and is only discovered at release time.

## Context

- Branch: v0.2.3.4-issue-2-start-issue-tracking-no-git
- Commit: bf2b5235
- Category: process
- Related: issue-3, GitHub #57

---

*Category: process | Tags: changelog, version-sync, governance, gate, update-issue-plan*
