---
id: issue-7
type: Bug
status: tracked
github-issue: "TBD"
branch: v0.5.9.1-review-audit-protocol
created: 2026-05-28
related-adrs: [ADR-049]
related-enhs: [ENH-020]
target-release: v0.7.0
---

# Issue-7: Bash Permission Prompt Provides No Context — Indistinguishable from Review Audit HALT

## Problem

When a subagent dispatched as a code reviewer executes a Bash command (e.g., `git diff` to read the branch diff), Claude Code's Bash permission prompt shows:

```
Bash command
  [raw command text]
  Contains shell syntax (string) that cannot be statically analyzed
  Do you want to proceed?
  > 1. Yes
    2. No
```

The prompt provides:
- No description of WHY the command is being run
- No agent context (which agent, what task, what it needs this for)
- No indication that this is a permission gate vs. a protocol HALT

This is **visually identical** to the review audit protocol's HALT behavior, which also presents options requiring "proceed" approval. Users cannot distinguish:

1. "The reviewing agent needs Bash permission to read the diff" (infrastructure)
2. "The review found something and is asking for a decision" (protocol)

Both present as bare "Do you want to proceed?" without explanatory context.

## Impact

- Breaks review flow — user must guess what's being asked before answering
- Defeats the review audit protocol's HALT fix (same visual language reintroduced via permission system)
- Reviewer agents that execute Bash are interrupted mid-task by permission gates

## Discovered

During v0.5.9.1 implementation — first Opus review attempt was rejected because the permission prompt was indistinguishable from the HALT problem being tested. See `docs/plans/v0.5.9.1-review-audit-protocol.md § Post-Implementation Fixes`.

## Current Workaround

Pre-embed `git diff` output directly in the reviewer agent's prompt before dispatching. The reviewer reads the diff as conversation context and does not need to execute Bash at all.

This eliminates permission prompts for diff-reading, but does not address:
- Agents that need Bash for other read operations (file listing, grep, etc.)
- The general UX problem of opaque permission prompts

## Root Cause

Claude Code's Bash permission system surfaces the raw command string but not the agent's stated purpose. The `description` parameter on Bash tool calls (when provided) may improve display, but this is not consistently used in agent dispatch patterns.

Additionally: no project-level allow-list exists for read-only git commands that reviewers routinely need (git diff, git log, git show, git status). Every invocation requires manual approval.
