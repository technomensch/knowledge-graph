#!/bin/bash
# notification-dispatch.sh - Notification hook: forward KG events to configured webhook
# Security: no eval, all variables quoted, subshells quoted; network failures never block

CONFIG_PATH="$HOME/.claude/kg-config.json"

# If config does not exist, exit silently
if [ ! -f "$CONFIG_PATH" ]; then
    exit 0
fi

# Extract webhookUrl from config using grep/sed (no jq dependency)
WEBHOOK_URL="$(grep -o '"webhookUrl"[[:space:]]*:[[:space:]]*"[^"]*"' "$CONFIG_PATH" | sed 's/.*"\([^"]*\)".*/\1/')"

# If not configured, this feature is opt-in — exit silently
if [ -z "$WEBHOOK_URL" ]; then
    exit 0
fi

# Read notification content from stdin
NOTIFICATION_TEXT="$(cat)"

if [ -z "$NOTIFICATION_TEXT" ]; then
    exit 0
fi

# Sanitize: escape double quotes in notification text to produce valid JSON
NOTIFICATION_TEXT_ESCAPED="$(echo "$NOTIFICATION_TEXT" | sed 's/"/\\"/g' | tr -d '\n')"

# Send via curl if available — never fail the hook on network errors
if command -v curl &>/dev/null; then
    curl -s -X POST "$WEBHOOK_URL" \
        -H "Content-Type: application/json" \
        -d "{\"text\": \"$NOTIFICATION_TEXT_ESCAPED\"}" \
        >/dev/null 2>&1 || true
fi

exit 0
