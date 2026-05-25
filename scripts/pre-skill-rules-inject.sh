#!/usr/bin/env bash
# pre-skill-rules-inject.sh — PreToolUse hook for the Skill tool
#
# Injects ~/.kmgraph/rules.md + ~/.kmgraph/triggers.md + active project's
# knowledge/rules.md into context before superpowers planning or execution
# skills run, ensuring user rules override skill defaults.
#
# Skill-type-specific hard blocks:
#   - Planning skills (writing-plans, brainstorming):
#       * Blocks the "Which approach?" prompt (Execution Handoff Override)
#       * Promotes the mirror-copy + naming-convention rules to a hard block
#         (Plan File Routing & Mirror Copy)
#   - Execution skills (executing-plans, finishing-a-development-branch):
#       * Blocks auto push/PR (PR Gate Override)
#
# Marketplace-safe:
#   - Gracefully no-ops if ~/.kmgraph/rules.md does not exist
#   - Gracefully degrades if $CLAUDE_PROJECT_DIR is unset or has no rules.md
#   - Only fires for matched skill names
#   - Always exits 0 — never blocks or denies the Skill call

set -euo pipefail

KMGRAPH_RULES="${HOME}/.kmgraph/rules.md"
KMGRAPH_TRIGGERS="${HOME}/.kmgraph/triggers.md"
PROJECT_RULES="${CLAUDE_PROJECT_DIR:-}/knowledge/rules.md"

INPUT=$(cat)
SKILL_NAME=$(printf '%s' "$INPUT" | jq -r '.tool_input.skill // .tool_input.name // ""' 2>/dev/null || true)

SKILL_TYPE=""
case "$SKILL_NAME" in
  superpowers:writing-plans|superpowers:write-plan|\
  superpowers:brainstorming|superpowers:brainstorm|\
  writing-plans|write-plan|brainstorming|brainstorm)
    SKILL_TYPE="planning"
    ;;
  superpowers:executing-plans|superpowers:execute-plan|\
  superpowers:finishing-a-development-branch|superpowers:finish-branch|\
  executing-plans|execute-plan|finishing-a-development-branch|finish-branch)
    SKILL_TYPE="execution"
    ;;
  *)
    exit 0
    ;;
esac

FLAG_FILE="/tmp/kmgraph-plan-gate-$(date +%Y-%m-%d).flag"
touch "$FLAG_FILE"

[[ ! -f "$KMGRAPH_RULES" ]] && exit 0

_extract_section() {
  local file="$1" header="$2"
  awk -v hdr="$header" '
    $0 ~ hdr { in_section=1 }
    in_section && /^### / && $0 !~ hdr { in_section=0 }
    in_section { print }
  ' "$file" 2>/dev/null || true
}

PARALLELISM_SECTION=$(_extract_section "$KMGRAPH_RULES" "^### Parallelism Analysis")
FILE_LOCATION_SECTION=$(_extract_section "$KMGRAPH_RULES" "^### File Location")
APPROVAL_GATE_SECTION=$(_extract_section "$KMGRAPH_RULES" "^### Approval Gates")

PROJECT_PLAN_LOCATION=""
PROJECT_PLAN_ROUTING=""
if [[ -n "${CLAUDE_PROJECT_DIR:-}" ]] && [[ -f "$PROJECT_RULES" ]]; then
  PROJECT_PLAN_LOCATION=$(_extract_section "$PROJECT_RULES" "^### Plan File Location")
  PROJECT_PLAN_ROUTING=$(_extract_section "$PROJECT_RULES" "^### Plan File Routing")
fi

SKILL_TRIGGER=""
if [[ -f "$KMGRAPH_TRIGGERS" ]]; then
  SKILL_TRIGGER=$(awk '
    /superpowers:writing-plans or superpowers:brainstorming/ { in_section=1 }
    in_section && /^## / && !/superpowers:writing-plans or superpowers:brainstorming/ { in_section=0 }
    in_section { print }
  ' "$KMGRAPH_TRIGGERS" 2>/dev/null || true)
fi

if [[ "$SKILL_TYPE" == "planning" ]]; then
  OVERRIDE_BLOCK='--- Execution Handoff Override (HARD BLOCK — supersedes skill) ---
The skill will instruct you to output "Two execution options... Which approach?" — YOU MUST NOT DO THIS.
This is a hard override. The "## Execution Handoff" section of the skill is BLOCKED.

After saving the plan file, output ONLY this and nothing else:
  "Plan saved at `<path>`. Review it, then say **Proceed** or **Start** to continue."

Rules:
- Do NOT ask "Which approach?"
- Do NOT offer Subagent-Driven or Inline Execution options
- Do NOT start implementing
- STOP after the plan-ready message and wait for the user'

  ROUTING_HARD_BLOCK="--- Plan File Routing & Mirror Copy (HARD BLOCK — supersedes skill) ---
These two steps are HARD requirements, not suggestions. Skipping either is a process violation.

1. NAMING CONVENTION — use the active project's '### Plan File Location' rule (shown above under
   '--- Project Plan File Location Override ---'). If a project naming convention is defined
   (e.g. \`v{ver}-{description}.md\`), you MUST use it. Do NOT default to a date-prefix filename
   like \`YYYY-MM-DD-description.md\` unless the project rule explicitly says so.

2. MIRROR COPY — after writing the plan to \`~/.claude/plans/<name>.md\`, you MUST run a copy
   step that mirrors the plan into the active project's \`docs/plans/<name>.md\` (or the path
   defined in the project's '### Plan File Routing' rule). This is not optional and must appear
   as an explicit step in the plan execution, not a passing mention.

Rules:
- Do NOT pick a filename that contradicts the project naming convention
- Do NOT skip the mirror-copy step
- Do NOT commit the mirrored plan file
- If the project naming convention is unclear or absent, STOP and ask the user before writing the plan"

else
  OVERRIDE_BLOCK='--- PR Gate Override (HARD BLOCK — supersedes skill) ---
The skill will instruct you to push the branch and create a PR — YOU MUST NOT DO THIS automatically.
This is a hard override.

Before pushing or opening a PR, output ONLY this and nothing else:
  "Ready to push `<branch>` and open PR. Say **Proceed** to continue."

Rules:
- Do NOT run git push
- Do NOT run gh pr create
- Do NOT merge or close anything
- STOP after the ready message and wait for the user'
  ROUTING_HARD_BLOCK=""
fi

INJECTION="====== KMGRAPH RULE OVERRIDE — supersedes skill defaults ======

These rules from ~/.kmgraph/rules.md (and the active project's knowledge/rules.md)
OVERRIDE the skill's built-in defaults. Apply them before executing any step in
the skill checklist.

--- File Location Override (global) ---
${FILE_LOCATION_SECTION:-[No File Location section in ~/.kmgraph/rules.md]}

--- Project Plan File Location Override ---
${PROJECT_PLAN_LOCATION:-[No ### Plan File Location section in \$CLAUDE_PROJECT_DIR/knowledge/rules.md — using global default]}

--- Project Plan File Routing Override ---
${PROJECT_PLAN_ROUTING:-[No ### Plan File Routing section in \$CLAUDE_PROJECT_DIR/knowledge/rules.md — using global default]}

--- Execution Mode Override ---
Do NOT present 'Subagent-Driven or Inline?' interactively.
Apply Parallelism Analysis below and pre-decide before presenting the plan.

${PARALLELISM_SECTION:-[No Parallelism Analysis section in ~/.kmgraph/rules.md]}

--- Approval Gates (from ~/.kmgraph/rules.md) ---
${APPROVAL_GATE_SECTION:-[No Approval Gates section found in ~/.kmgraph/rules.md]}

--- Trigger Gate (triggers.md) ---
${SKILL_TRIGGER:-[No skill trigger in ~/.kmgraph/triggers.md]}

${OVERRIDE_BLOCK}

${ROUTING_HARD_BLOCK}

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
