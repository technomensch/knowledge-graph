#!/usr/bin/env bash
# rules-size-check.sh — PostToolUse:Write|Edit hook
#
# After writing a rules file, check if line count exceeds split threshold.
# If >120 lines AND 2+ separable ## domains, recommend splitting.
# Weekly suppression via ~/.kmgraph/.split-dismissed-{YYYY-WW}.

set -euo pipefail

YELLOW='\033[1;33m'
NC='\033[0m'

INPUT=$(cat)
FILE_PATH=$(printf '%s' "$INPUT" | jq -r '.tool_input.file_path // ""' 2>/dev/null || true)

# Only fire on rules files
case "$FILE_PATH" in
    */.kmgraph/rules.md|*/knowledge/rules.md) ;;
    *) exit 0 ;;
esac

[ -f "$FILE_PATH" ] || exit 0

LINE_COUNT=$(wc -l < "$FILE_PATH")
[ "$LINE_COUNT" -gt 120 ] || exit 0

DOMAIN_COUNT=$(grep -c '^## ' "$FILE_PATH" 2>/dev/null || true)
DOMAIN_COUNT=${DOMAIN_COUNT:-0}
[ "$DOMAIN_COUNT" -ge 2 ] || exit 0

# Weekly suppression gate
WEEK_TAG=$(date +%Y-%V)
DISMISS_FLAG="$HOME/.kmgraph/.split-dismissed-${WEEK_TAG}"
[ -f "$DISMISS_FLAG" ] && exit 0

MSG="rules.md has grown to ${LINE_COUNT} lines across ${DOMAIN_COUNT} domains.
Consider splitting into separate files (e.g., rules.md + plan-rules.md).
To suppress for this week: touch ~/.kmgraph/.split-dismissed-${WEEK_TAG}"

jq -n --arg msg "$MSG" '{"systemMessage": $msg}'

exit 0
