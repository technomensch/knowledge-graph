#!/usr/bin/env bash
# post-plan-validate-checklist.sh — PostToolUse:Write hook
#
# Fires after writing to a plan file; outputs Post-Plan Validation Checklist
# as an advisory reminder. Does not block — PostToolUse is advisory only.

set -euo pipefail

INPUT=$(cat)
FILE_PATH=$(printf '%s' "$INPUT" | jq -r '.tool_input.file_path // ""' 2>/dev/null || true)

[[ "$FILE_PATH" == *"plans/"*.md ]] || exit 0

MSG='--- Post-Plan Validation Checklist (advisory) ---
Plan file written. Verify against ~/.kmgraph/plan-rules.md:
  [ ] Branch placement stated explicitly
  [ ] Required steps present (branch, copy, impl, commit/push/PR)
  [ ] Parallelism table row count matches task count
  [ ] Ad-hoc update rules applied (parallelism re-checked after any task addition)
  [ ] Plugin cache sync step present if skills/templates changed
  [ ] Capture Checkpoints present after Opus review step
  [ ] Acceptance Criteria covers all gap fixes
Full rule list: ~/.kmgraph/plan-rules.md
--- End Checklist ---'

if command -v jq &>/dev/null; then
  jq -n --arg msg "$MSG" '{"systemMessage": $msg}'
else
  printf '%s\n' "$MSG"
fi

exit 0
