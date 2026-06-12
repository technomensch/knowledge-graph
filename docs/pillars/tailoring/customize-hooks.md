---
id: customize-hooks
title: Customize Hooks
sidebar_label: Customize Hooks
description: How to configure, extend, or disable the KMGraph lifecycle hooks
---

# Customize Hooks

> "I want KMGraph to automatically do X. How do I wire that up?"

KMGraph registers shell scripts with Claude Code's lifecycle events — you can add, disable, or replace any of them. You need KMGraph installed with `hooks/hooks.json` present (Claude Code only).

## How hooks work

KMGraph registers shell scripts with Claude Code's lifecycle events via `hooks/hooks.json`. The events are:

| Event | When it fires |
|---|---|
| `SessionStart` | When Claude Code opens a session |
| `PreToolUse` | Before a tool is called |
| `PostToolUse` | After a tool returns |
| `Stop` | When Claude Code ends a response |
| `Notification` | When a notification is sent |

The master script `scripts/hooks-master.sh` routes each event to sub-scripts in `scripts/`.

## View the configuration

```bash
cat hooks/hooks.json
```

## Disable a specific hook

To disable the post-tool lesson check (which prompts to capture lessons after certain tool uses), comment it out in `scripts/hooks-master.sh`:

```bash
# Disable lesson check
# source "${SCRIPT_DIR}/post-tool-lesson-check.sh"
```

## Add custom behavior

Create a new script in `scripts/` and add a `source` call in `hooks-master.sh` at the appropriate event branch:

```bash
# In hooks-master.sh, under the PostToolUse branch:
source "${SCRIPT_DIR}/my-custom-hook.sh"
```

After changes, start a new Claude Code session — the `SessionStart` hook output confirms the configuration took effect.

## Disable all hooks

Remove or rename `hooks/hooks.json`:

```bash
mv hooks/hooks.json hooks/hooks.json.disabled
```

Reload Claude Code for the change to take effect.

## Re-enable hooks

```bash
mv hooks/hooks.json.disabled hooks/hooks.json
```

## Individual hook scripts

| Script | What it does | Safe to disable? |
|---|---|---|
| `post-tool-lesson-check.sh` | Prompts for lesson capture after solving | Yes |
| `platform-file-change-check.sh` | Detects changes to CLAUDE.md / AGENTS.md | Yes |
| `pre-commit-knowledge-gate.sh` | Blocks commits that skip knowledge capture | Yes (reduces automation) |
| `session-end-prompt.sh` | Prompts for session summary on Stop; Codex CLI-compatible | Yes |
| `plan-mirror.sh` | Mirrors plan files from `~/.claude/plans/` to `docs/plans/` | Yes |
| `notification-dispatch.sh` | Sends webhook notifications | Yes (if webhook not configured) |

## Related

- [Customize templates](./customize-templates.md) — modify the knowledge entry templates
- [Custom rules](./custom-rules.md) — define enforcement rules at the shell level
