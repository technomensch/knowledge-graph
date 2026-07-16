#!/bin/bash
# notification-dispatch.sh - Notification hook: forward KG events to configured webhook
# Security: no eval, all variables quoted, subshells quoted; network failures never block

CONFIG_PATH="${KG_CONFIG_PATH:-$HOME/.kmgraph/kg-config.json}"
mkdir -p "$(dirname "$CONFIG_PATH")" 2>/dev/null
# one-time migration: seed from the legacy ~/.claude location if the new path is absent (atomic, race-safe)
if [ ! -f "$CONFIG_PATH" ] && [ -f "$HOME/.claude/kg-config.json" ]; then
  cp "$HOME/.claude/kg-config.json" "$CONFIG_PATH.tmp.$$" 2>/dev/null && mv -f "$CONFIG_PATH.tmp.$$" "$CONFIG_PATH" 2>/dev/null
fi

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
