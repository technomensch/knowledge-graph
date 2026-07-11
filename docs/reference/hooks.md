---
title: Hooks Reference
---

# Hooks Reference

KMGraph registers shell scripts with Claude Code's hook system to automate knowledge capture across the session lifecycle. Hooks are configured in `hooks/hooks.json` and executed by the Claude Code harness — not by the agent.

## Lifecycle Events

| Event | When it fires | Matcher support |
|---|---|---|
| `SessionStart` | Once, when a Claude Code session begins | No |
| `PreToolUse` | Before each tool call | Yes — regex on tool name + input |
| `PostToolUse` | After each tool call completes | Yes — regex on tool name |
| `Stop` | When the agent stops or the session ends | No |
| `Notification` | On any Claude Code notification event | No |

Hooks with a `matcher` field fire only when the tool name (and optionally the tool input JSON) matches the provided regex. An empty matcher string (`""`) matches every invocation of that event.

## hooks.json Structure

```json
{
  "hooks": {
    "<EventName>": [
      {
        "matcher": "<regex or empty string>",
        "hooks": [
          {
            "type": "command",
            "comment": "<human-readable description>",
            "command": "${CLAUDE_PLUGIN_ROOT}/scripts/<script>.sh",
            "timeout": <seconds>
          }
        ]
      }
    ]
  }
}
```

`${CLAUDE_PLUGIN_ROOT}` is resolved by the Claude Code harness to the absolute path of the KMGraph plugin directory. All scripts receive tool input JSON on stdin for `PreToolUse` and `PostToolUse` events.

## Scripts Invoked by Hooks

| Script | Event | Matcher | Enabled by default | What it does |
|---|---|---|---|---|
| `hooks-master.sh` | `SessionStart` | (all) | Yes | Validates KG config and MCP server build; displays recent lessons (last 7 days) from active and personal KGs; checks MEMORY.md staleness and diffs since last session; auto-switches active KG if `autoSwitch: true` and CWD matches a different project |
| `post-tool-lesson-check.sh` | `PostToolUse` | `Write\|Edit` | Yes | Scans tool input for lesson-worthy keywords (`fix`, `solved`, `debug`, `pattern`, etc.); suppresses on `docs/`, `.git/`, and `.md`-only writes; surfaces a prompt to run `/kmgraph:kmg-capture-lesson` |
| `platform-file-change-check.sh` | `PostToolUse` | `Write\|Edit` | Yes | Detects writes to platform config files (`CLAUDE.md`, `GEMINI.md`, `.cursorrules`, `copilot-instructions.md`, etc.); prompts the user to consider syncing other platform files via `/kmgraph:kmg-setup-platform` |
| `plan-mirror.sh` | `PostToolUse` | `Write` | Yes | Detects writes to `~/.claude/plans/`; copies the file to `docs/plans/` in the active KG project root; exits silently if the target directory does not exist |
| `pre-commit-knowledge-gate.sh` | `PreToolUse` | `Bash.*git commit` | Yes | Intercepts plain `git commit` calls (skips `--amend` and `--no-verify`); checks staged files for lesson-worthy source types (`src/`, `*.ts`, `*.py`, `*.sh`, etc.); advisory prompt only — does not block the commit |
| `pre-skill-rules-inject.sh` | `PreToolUse` | `Skill` | Yes | Fires before any superpowers skill invocation; injects `~/.kmgraph/rules.md` overrides into skill context; hard-blocks brainstorming and planning without a prior recall query; enforces PR gate for execution and finishing skills |
| `session-end-prompt.sh` | `Stop` | (all) | Yes | Checks for open plan tasks, draft/proposed ADRs, and recent lesson-worthy commits without a captured lesson; displays a summary prompt to stderr; emits `{"decision": "continue"}` JSON to stdout via `trap EXIT` for Codex CLI compatibility; uses a `/tmp` flag to suppress duplicate output within the same session |
| `stop-plan-gate.sh` | `Stop` | (all) | Yes | Re-injects the plan approval gate reminder at session end when a plan was written this session; uses a daily flag file to suppress duplicates |
| `post-plan-validate-checklist.sh` | `PostToolUse` | `Write` | Yes | After writing any `plans/*.md` file, outputs an advisory post-plan validation checklist; exits silently for non-plan writes |
| `notification-dispatch.sh` | `Notification` | (all) | No (opt-in) | Forwards the notification text to a configured `webhookUrl` in `kg-config.json`; exits silently if `webhookUrl` is absent; network failures never block the hook |

## Enabled vs Disabled by Default

All scripts are registered in `hooks.json` and active by default, with one exception:

| Script | Default state | How to activate |
|---|---|---|
| `notification-dispatch.sh` | Disabled (no-op) | Add `"webhookUrl": "https://..."` to `~/.claude/kg-config.json` |

The other eight scripts are always active once KMGraph is installed. Individual hooks can be removed from `hooks.json` to disable them permanently, or their timeout values can be adjusted to control how long each script may run before the harness terminates it.

## Script Locations

All hook scripts reside in `scripts/` relative to the plugin root. Additional scripts in that directory (`fuzzy-search-archive.sh`, `install-vscode.sh`, `prepare-mcp.sh`, `validate-plugin.sh`) are invoked by installer and CLI commands, not by the hook system.

## Config Path Resolution

Every hook script that reads `kg-config.json` resolves its path via
`${KG_CONFIG_PATH:-$HOME/.claude/kg-config.json}` — an exported `KG_CONFIG_PATH`
environment variable is honored if set, otherwise the script falls back to the default
`~/.claude/kg-config.json`. This mirrors the override the MCP server (`mcp-server/src/utils.ts`)
already uses. It applies to `hooks-master.sh`, `session-end-prompt.sh`,
`post-tool-lesson-check.sh`, `plan-mirror.sh`, and `notification-dispatch.sh`.

For ordinary use, `hooks.json` invokes every script with no environment overrides, so hooks
resolve the real config path exactly as before — this override exists for test sandboxing
(see `tests/README.md`) and for any workflow that intentionally points KMGraph at an
alternate config file.

## Exit Code Conventions

| Exit code | Meaning |
|---|---|
| `0` | Success or non-blocking warning (session continues normally) |
| `1` | Blocking error — used only by `hooks-master.sh` for unrecoverable config failures |

`PreToolUse` hooks that exit `0` allow the tool call to proceed. A non-zero exit from a `PreToolUse` hook blocks the tool call; KMGraph's `pre-commit-knowledge-gate.sh` always exits `0` because it is advisory only.

## Codex CLI Compatibility

The Codex CLI Stop hook parser requires a JSON object on stdout to determine session continuation. KMGraph's `Stop` hook scripts route all human-readable output to stderr and use a `trap EXIT` to guarantee the JSON decision token reaches stdout on every exit path — including early exits and errors:

```bash
# Emit JSON on every exit — required by Codex CLI Stop hook parser on all exit paths
trap 'echo "{\"decision\": \"continue\"}"' EXIT
```

This pattern ensures the hook never silently swallows the required JSON, regardless of how the script exits. Claude Code ignores stdout from `Stop` hooks, so this change is backward-compatible.
