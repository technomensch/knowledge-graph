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
KMGRAPH_PLAN_RULES="${HOME}/.kmgraph/plan-rules.md"
KMGRAPH_GOVERNANCE_RULES="${HOME}/.kmgraph/governance-rules.md"
# Fallback to rules.md if split files absent (non-split users)
[ -f "$KMGRAPH_PLAN_RULES" ] || KMGRAPH_PLAN_RULES="$KMGRAPH_RULES"
[ -f "$KMGRAPH_GOVERNANCE_RULES" ] || KMGRAPH_GOVERNANCE_RULES="$KMGRAPH_RULES"
KMGRAPH_TRIGGERS="${HOME}/.kmgraph/triggers.md"
PROJECT_RULES="${CLAUDE_PROJECT_DIR:-}/knowledge/rules.md"

INPUT=$(cat)
SKILL_NAME=$(printf '%s' "$INPUT" | jq -r '.tool_input.skill // .tool_input.name // ""' 2>/dev/null || true)

SKILL_TYPE=""
case "$SKILL_NAME" in
  superpowers:brainstorming|superpowers:brainstorm|\
  brainstorming|brainstorm)
    SKILL_TYPE="brainstorming"
    ;;
  superpowers:writing-plans|superpowers:write-plan|\
  writing-plans|write-plan)
    SKILL_TYPE="planning"
    ;;
  superpowers:executing-plans|superpowers:execute-plan|\
  executing-plans|execute-plan|\
  superpowers:subagent-driven-development|subagent-driven-development)
    SKILL_TYPE="execution"
    ;;
  superpowers:systematic-debugging|systematic-debugging)
    SKILL_TYPE="debugging"
    ;;
  superpowers:requesting-code-review|requesting-code-review|\
  caveman:caveman-review|\
  pr-review-toolkit:*|\
  code-review)
    SKILL_TYPE="review-request"
    ;;
  superpowers:finishing-a-development-branch|superpowers:finish-branch|\
  finishing-a-development-branch|finish-branch)
    SKILL_TYPE="finishing"
    ;;
  *)
    exit 0
    ;;
esac

FLAG_FILE="/tmp/kmgraph-plan-gate-$(date +%Y-%m-%d).flag"
touch "$FLAG_FILE" 2>/dev/null || true

[[ ! -f "$KMGRAPH_RULES" ]] && exit 0

_extract_section() {
  local file="$1" header="$2"
  awk -v hdr="$header" '
    $0 ~ hdr { in_section=1 }
    in_section && /^### / && $0 !~ hdr { in_section=0 }
    in_section { print }
  ' "$file" 2>/dev/null || true
}

PARALLELISM_SECTION=$(_extract_section "$KMGRAPH_PLAN_RULES" "^### Parallelism Analysis")
FILE_LOCATION_SECTION=$(_extract_section "$KMGRAPH_PLAN_RULES" "^### File Location")
APPROVAL_GATE_SECTION=$(_extract_section "$KMGRAPH_GOVERNANCE_RULES" "^### Approval Gates")

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

# For review skills, override SKILL_TRIGGER with review-specific gates from triggers.md
if [[ "$SKILL_TYPE" == "review-request" ]] && [[ -f "$KMGRAPH_TRIGGERS" ]]; then
  REVIEW_AUDIT_TRIGGER=$(awk '
    /When performing a post-plan, pre-push/ { in_section=1 }
    in_section && /^## / && !/When performing a post-plan/ { in_section=0 }
    in_section { print }
  ' "$KMGRAPH_TRIGGERS" 2>/dev/null || true)
  REVIEW_FINDING_TRIGGER=$(awk '
    /Before surfacing a finding during a review/ { in_section=1 }
    in_section && /^## / && !/Before surfacing a finding/ { in_section=0 }
    in_section { print }
  ' "$KMGRAPH_TRIGGERS" 2>/dev/null || true)
  SKILL_TRIGGER="${REVIEW_AUDIT_TRIGGER}

${REVIEW_FINDING_TRIGGER}"
fi

RECALL_HARD_BLOCK=""
ACTIVE_KG_BLOCK=""
PLAN_EMBED_BLOCK=""
ADHOC_BLOCK=""
CAPTURE_BLOCK=""

if [[ "$SKILL_TYPE" == "brainstorming" ]]; then
  OVERRIDE_BLOCK='--- Brainstorm Recall (HARD BLOCK — supersedes skill) ---
Before making any recommendation, invoke the kmgraph:recall skill (via Skill tool) with the topic as input.
Include results under a "Prior Art" heading before answering.
Do not skip recall even if the topic seems simple.
--- End Brainstorm Recall ---'
  ROUTING_HARD_BLOCK=""

elif [[ "$SKILL_TYPE" == "debugging" ]]; then
  OVERRIDE_BLOCK='--- Debug Recall (HARD BLOCK — supersedes skill) ---
Before proposing the first hypothesis, invoke the kmgraph:recall skill (via Skill tool) with the error signature or component name as input.
Surface prior lessons-learned and meta-issues under "Prior Attempts" before debugging.
Do not skip recall even for familiar-looking bugs — prior context prevents re-treading failed paths.
--- End Debug Recall ---'
  ROUTING_HARD_BLOCK=""

elif [[ "$SKILL_TYPE" == "review-request" ]]; then
  OVERRIDE_BLOCK='--- Review Audit Protocol (HARD BLOCK — supersedes skill) ---
Before dispatching any reviewer or surfacing any finding:

1. ADR Pre-Check — search knowledge/decisions/ and ~/.kmgraph/decisions/ for ADRs covering the topic.
   - Match found + fully addressed: suppress finding; cite the ADR
   - Match found + new evidence: surface finding with explicit ADR reference
   - No match: surface normally

2. Review Context — invoke kmgraph:recall with each modified file path or concept as input.
   Pass surfaced ADRs and lessons as REQUIRED context in the reviewer dispatch payload.
   Do not dispatch a cold reviewer — a reviewer unaware of ADR constraints may approve violations.

For post-plan, pre-push, or explicit full review/audit:
3. Complete full review pass without interruption — dispatch background agents for investigation; do NOT wait mid-pass
4. After pass: present findings list; ask "Run recall? [all / select / skip]" — batch into one call
5. Display all results inline (not collapsed)
6. Present audit trail table + decision prompt per finding — HALT until user resolves all findings
--- End Review Audit Protocol ---'
  ROUTING_HARD_BLOCK=""

elif [[ "$SKILL_TYPE" == "finishing" ]]; then
  ADR_FLAG="/tmp/kmgraph-adr-captured-$(date +%Y-%m-%d).flag"
  rm -f "$ADR_FLAG" 2>/dev/null || true
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

elif [[ "$SKILL_TYPE" == "planning" ]]; then
  RECALL_HARD_BLOCK='--- Plan Recall (HARD BLOCK — supersedes skill) ---
Before writing any plan:
1. Invoke the kmgraph:recall skill (via Skill tool) with TWO queries — run both:
   a. The specific plan topic (e.g., "recall enforcement", "hook injection")
   b. The architectural domain of the change (e.g., "rules deployment", "platform-agnostic", "cross-platform rules", "LLM compatibility")
   Running only the topic query misses architectural ADRs and ENHs that constrain the work.
2. WAIT for results before writing any plan content.
3. Recall results take PRIORITY — you must reason about findings before recommending:
   - If recall surfaces a rejected approach, examine WHY it was rejected.
   - Determine whether that reason is still applicable today.
   - If still applicable: do not propose the approach. If it cannot be avoided, explain why no workaround exists.
   - If no longer applicable: you may propose it, but MUST document why the old rejection no longer holds AND lay out the full cascade impact on the rest of the project.
   - If it is the only viable option regardless: propose it, but lay out complete ramifications and cascade effects across all affected systems, skills, decisions, and docs.
4. Include a "## Prior Art" section at the top of the plan with findings.
   - If nothing found: write "No prior art found for [topic]." and continue.
5. If recall returns zero results AND MCP server status is unknown, output: "RECALL MAY HAVE FAILED — cannot confirm MCP is running. Results may be incomplete." Do NOT silently proceed as if no prior art exists.
Do not skip recall — plans built without prior context repeat solved problems or contradict existing decisions.
NOTE: this fires at skill invocation, before the interview. You MUST re-confirm recall was run before writing the FIRST PLAN TASK, not just before the interview begins.
If recall returns zero results: do NOT treat as "no prior art." Output "Recall returned nothing for '"'"'<query>'"'"' — MCP server availability unconfirmed. Expand vocabulary or verify MCP before proceeding."
If you cannot invoke recall at all (Skill tool unavailable, MCP down):
  DO NOT proceed as if the step succeeded.
  DO NOT fabricate a "no results" response.
  Output: "RECALL BLOCKED — [reason]. Proceeding without prior art check. User should verify manually."
If recall returns no results for any query:
  STOP. Do not silently proceed.
  Output: "Recall returned nothing for '"'"'<query>'"'"'. Options: (1) expand vocabulary and retry, (2) proceed with no prior art — state this explicitly in plan."
  Log: echo "$(date +%Y-%m-%d %H:%M) RECALL_MISS query='"'"'<query>'"'"'" >> /tmp/kmgraph-recall-miss-$(date +%Y-%m-%d).log
--- End Plan Recall ---'

  ACTIVE_KG_BLOCK='--- Active KG Context (HARD BLOCK) ---
Before writing any plan, run:
  ls -t knowledge/decisions/ knowledge/enhancements/ | head -10
  git log --oneline --since="14 days ago" -- knowledge/
Surface any ADR/ENH/lesson modified in last 14 days under "## Recent Architectural Activity".
The plan must explicitly acknowledge or supersede each item listed.
--- End Active KG Context ---'

  PLAN_EMBED_BLOCK='<!-- embedded-rules: recall-in-planning v0.5.9 -->
> **Active planning rules (embedded for remote-session compatibility):**
> 1. Run recall (two queries: topic + architectural domain) before any recommendation.
> 2. Recall results take priority — reason about rejections, do not silently override.
> 3. Check platform delivery surface before specifying target file.
<!-- /embedded-rules -->'

  if [[ -f "${KMGRAPH_PLAN_RULES}" ]]; then
    ADHOC_BLOCK=$(awk '/^### Ad-Hoc Plan Updates/,/^### /' "${KMGRAPH_PLAN_RULES}" | sed '$d' | head -c 400)
    CAPTURE_BLOCK=$(awk '/^### Execution, Implementation,  & Gating/,/^### /' "${KMGRAPH_PLAN_RULES}" | sed '$d' | head -c 400)
  fi

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

elif [[ "$SKILL_TYPE" == "execution" ]]; then
  ADR_FLAG="/tmp/kmgraph-adr-captured-$(date +%Y-%m-%d).flag"
  ADR_CASCADE_BLOCK=""
  if [[ -f "$ADR_FLAG" ]]; then
    ADR_CASCADE_BLOCK='--- In-Plan Cascade Gate (HARD BLOCK) ---
A new ADR was captured this session. Before executing any plan task:
1. Review plan tasks for cascade impact from the new decision.
2. Ask user: "Do any plan tasks need revision before executing?"
3. STOP and await response before proceeding.'
  fi
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
  ROUTING_HARD_BLOCK="${ADR_CASCADE_BLOCK}"

else
  OVERRIDE_BLOCK=""
  ROUTING_HARD_BLOCK=""
fi

PREAMBLE=""
[[ -n "$RECALL_HARD_BLOCK" ]] && PREAMBLE="${PREAMBLE}${RECALL_HARD_BLOCK}

"
[[ -n "$ACTIVE_KG_BLOCK" ]] && PREAMBLE="${PREAMBLE}${ACTIVE_KG_BLOCK}

"
[[ -n "$PLAN_EMBED_BLOCK" ]] && PREAMBLE="${PREAMBLE}${PLAN_EMBED_BLOCK}

"
[[ -n "$ADHOC_BLOCK" ]] && PREAMBLE="${PREAMBLE}${ADHOC_BLOCK}

"
[[ -n "$CAPTURE_BLOCK" ]] && PREAMBLE="${PREAMBLE}${CAPTURE_BLOCK}

"
# HARD BLOCKs go into PREAMBLE so they survive the 8000-char truncation
[[ -n "$OVERRIDE_BLOCK" ]] && PREAMBLE="${PREAMBLE}${OVERRIDE_BLOCK}

"
[[ -n "$ROUTING_HARD_BLOCK" ]] && PREAMBLE="${PREAMBLE}${ROUTING_HARD_BLOCK}

"

INJECTION="${PREAMBLE}====== KMGRAPH RULE OVERRIDE — supersedes skill defaults ======

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
