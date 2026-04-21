#!/usr/bin/env bash
# pre-skill-rules-inject.sh — PreToolUse hook for the Skill tool
#
# Injects ~/.kmgraph/rules.md + ~/.kmgraph/triggers.md into context before
# superpowers:brainstorming or superpowers:writing-plans executes, ensuring
# user file-location and execution-mode rules override skill defaults.
#
# Marketplace-safe:
#   - Gracefully no-ops if ~/.kmgraph/rules.md does not exist
#   - Only fires for brainstorming / writing-plans skills (and aliases)
#   - Reads user's own ~/.kmgraph/rules.md dynamically
#   - Always exits 0 — never blocks or denies the Skill call

set -euo pipefail

KMGRAPH_RULES="${HOME}/.kmgraph/rules.md"
KMGRAPH_TRIGGERS="${HOME}/.kmgraph/triggers.md"

INPUT=$(cat)
SKILL_NAME=$(printf '%s' "$INPUT" | jq -r '.tool_input.skill // .tool_input.name // ""' 2>/dev/null || true)

case "$SKILL_NAME" in
  superpowers:writing-plans|superpowers:write-plan|\
  superpowers:brainstorming|superpowers:brainstorm|\
  writing-plans|write-plan|brainstorming|brainstorm)
    ;;
  *)
    exit 0
    ;;
esac

[[ ! -f "$KMGRAPH_RULES" ]] && exit 0

PARALLELISM_SECTION=$(awk '
  /^### Parallelism Analysis/ { in_section=1 }
  in_section && /^### / && !/^### Parallelism Analysis/ { in_section=0 }
  in_section { print }
' "$KMGRAPH_RULES" 2>/dev/null || true)

FILE_LOCATION_SECTION=$(awk '
  /^### File Location/ { in_section=1 }
  in_section && /^### / && !/^### File Location/ { in_section=0 }
  in_section { print }
' "$KMGRAPH_RULES" 2>/dev/null || true)

SKILL_TRIGGER=""
if [[ -f "$KMGRAPH_TRIGGERS" ]]; then
  SKILL_TRIGGER=$(awk '
    /superpowers:writing-plans or superpowers:brainstorming/ { in_section=1 }
    in_section && /^## / && !/superpowers:writing-plans or superpowers:brainstorming/ { in_section=0 }
    in_section { print }
  ' "$KMGRAPH_TRIGGERS" 2>/dev/null || true)
fi

INJECTION="====== KMGRAPH RULE OVERRIDE — supersedes skill defaults ======

These rules from ~/.kmgraph/rules.md OVERRIDE the skill's built-in defaults.
Apply them before executing any step in the skill checklist.

--- File Location Override ---
${FILE_LOCATION_SECTION:-[No File Location section in ~/.kmgraph/rules.md]}

--- Execution Mode Override ---
Do NOT present 'Subagent-Driven or Inline?' interactively.
Apply Parallelism Analysis below and pre-decide before presenting the plan.

${PARALLELISM_SECTION:-[No Parallelism Analysis section in ~/.kmgraph/rules.md]}

--- Trigger Gate (triggers.md) ---
${SKILL_TRIGGER:-[No skill trigger in ~/.kmgraph/triggers.md]}

====== END KMGRAPH RULE OVERRIDE ======"

INJECTION_TRUNCATED=$(printf '%s' "$INJECTION" | head -c 8000)

if command -v jq &>/dev/null; then
  jq -n \
    --arg ctx "$INJECTION_TRUNCATED" \
    '{
      "hookSpecificOutput": {
        "hookEventName": "PreToolUse",
        "additionalContext": $ctx
      }
    }'
else
  printf '%s\n' "$INJECTION_TRUNCATED"
fi

exit 0
