---
title: "ADR-012: Hook Security Model"
status: accepted
created: 2026-02-27
category: architecture
tags: [security, hooks, shell-scripts, session-start]
---

# ADR-012: Hook Security Model

## Context

Knowledge Graph plugin executes shell scripts on every Claude Code SessionStart via `hooks/hooks.json`. Three scripts run automatically:

1. `scripts/check-memory.sh` — Validates KG configuration and MEMORY.md status
2. `scripts/recent-lessons.sh` — Displays recently modified lessons
3. `scripts/memory-diff-check.sh` — Shows MEMORY.md changes since last session

These scripts could be attack vectors if they read user-controlled file content and pass it through shell interpolation. An attacker who can write to project files (malicious dependency, git submodule) could execute arbitrary commands.

## Decision

Adopt the following security model for all hook scripts:

### Allowed Operations
- Read file **metadata** only: size (`wc -l`, `wc -w`), modification time (`stat`), existence (`[ -f ]`)
- Read file content through **safe pipelines**: `grep | sed`, `grep | wc` (no eval, no unquoted expansion)
- Execute `git` commands for diff and log queries
- Output text to stdout via `echo`

### Forbidden Operations
- `eval` or any form of dynamic code execution
- Unquoted variable expansion in command arguments
- Network requests (`curl`, `wget`, etc.)
- Writing to files outside of stdout
- Sourcing or executing user-controlled file content

### Variable Quoting Rules
- All variables MUST be double-quoted: `"$VAR"` not `$VAR`
- Subshells MUST be quoted: `"$(command)"` not `$(command)`
- Grep patterns using variables MUST use fixed-string mode (`-F`) where possible

## Audit Results (v0.0.9.2)

| Script | Reads Content? | eval/Unquoted? | Output Executed? | Network? | Status |
|--------|---------------|----------------|-----------------|----------|--------|
| `check-memory.sh` | grep on config JSON | Properly quoted | No | No | ✅ Pass |
| `recent-lessons.sh` | grep on YAML frontmatter | Properly quoted | No | No | ✅ Pass |
| `memory-diff-check.sh` | git diff output | Fixed: quoted `$(pwd)` | No | No | ✅ Pass (after fix) |

### Mitigations Applied
1. `memory-diff-check.sh`: Quoted `$(pwd)` subshell → `"$(pwd)"` to prevent word splitting on directory names with spaces
2. All `/knowledge:` and `/kg-sis:` namespace references updated to `/kmgraph:`

## Consequences

- Hook scripts remain safe for auto-execution on SessionStart
- Future hook scripts MUST follow this security model
- Content parsing requiring complex logic should use Python, not shell
- This ADR should be referenced in code review for any hook script changes
