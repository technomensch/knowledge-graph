#!/usr/bin/env bash
# stop-plan-gate.sh — Stop hook: re-inject approval/PR gate reminder if a gated skill just ran

set -euo pipefail

FLAG_FILE="/tmp/kmgraph-plan-gate-$(date +%Y-%m-%d).flag"

[[ ! -f "$FLAG_FILE" ]] && exit 0

rm -f "$FLAG_FILE"

MSG="GATE ACTIVE: A planning or execution skill just ran. The user MUST say Proceed or Start before implementation begins, and must explicitly approve any push or PR creation. Do NOT offer execution options. Do NOT push. Do NOT create PRs. STOP and wait for the user."

if command -v jq &>/dev/null; then
  jq -n --arg ctx "$MSG" '{
    "hookSpecificOutput": {
      "hookEventName": "Stop",
      "additionalContext": $ctx
    }
  }'
else
  printf '%s\n' "$MSG"
fi

exit 0
