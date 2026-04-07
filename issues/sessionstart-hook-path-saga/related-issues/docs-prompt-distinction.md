# Documentation Issue: Claude Prompts vs Shell Commands Not Distinguished

**Discovered:** 2026-03-28 (during Attempt 005 review of GETTING-STARTED.md)
**Status:** Deferred (fix after hook issue resolved)
**Affected Files:** `docs/GETTING-STARTED.md`, possibly `docs/INSTALL.md`

## Problem

Installation and troubleshooting docs do not visually distinguish between:

- **Shell commands** (run in terminal): `rm -rf ~/.claude/plugins/cache/...`
- **Claude Code prompts** (typed into Claude): `/plugin uninstall kmgraph`, `/reload-plugins`

Both are shown in generic code blocks, making it unclear to users where each command should be entered.

## Example (from GETTING-STARTED.md troubleshooting)

The update workaround mixes shell and Claude prompts in the same instruction flow without distinguishing them.

## Fix Needed

Use distinct formatting for each context:
- Shell commands: labeled `bash` code blocks or prefixed with `$`
- Claude prompts: labeled differently (e.g., `claude` or a callout box), or explicitly prefixed with a prompt indicator like `>`

## Priority

Low — cosmetic/UX issue, not blocking. Fix after the hook path saga is resolved.
