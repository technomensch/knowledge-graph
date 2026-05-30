#!/usr/bin/env bash
# post-plan-validate-checklist.sh — PostToolUse:Write|Edit hook
#
# Fires after writing or editing a plan file; outputs Post-Plan Validation Checklist
# as an advisory reminder. Does not block — PostToolUse is advisory only.
# Blocking enforcement deferred to v0.6.0 — see ENH-015 Gap 2.
# Do not attempt to enforce blocking behavior here.
# Idempotency: suppresses repeat triggers on the same plan file within a session.

set -euo pipefail

INPUT=$(cat)
FILE_PATH=$(printf '%s' "$INPUT" | jq -r '.tool_input.file_path // ""' 2>/dev/null || true)

[[ "$FILE_PATH" == *"plans/"*.md ]] || exit 0

# Idempotency gate: suppress repeat triggers on the same plan file
# Uses a session-scoped flag file based on file path hash to avoid checklist spam on iterative edits
if command -v md5 &>/dev/null; then
    PLAN_HASH=$(printf '%s' "$FILE_PATH" | md5)
elif command -v md5sum &>/dev/null; then
    PLAN_HASH=$(printf '%s' "$FILE_PATH" | md5sum | cut -d' ' -f1)
else
    PLAN_HASH=$(printf '%s' "$FILE_PATH" | cksum | cut -d' ' -f1)
fi
FLAG_FILE="/tmp/kmgraph-plan-check-${PLAN_HASH}-$(date +%Y%m%d)"
if [ -f "$FLAG_FILE" ]; then
    exit 0
fi
touch "$FLAG_FILE"

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
