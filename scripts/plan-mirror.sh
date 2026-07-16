#!/bin/bash
# plan-mirror.sh - PostToolUse hook: auto-mirror plans from ~/.claude/plans/ to active KG docs/plans/
# Security: no eval, no network, all variables quoted, subshells quoted

CONFIG_PATH="${KG_CONFIG_PATH:-$HOME/.kmgraph/kg-config.json}"
mkdir -p "$(dirname "$CONFIG_PATH")" 2>/dev/null
# one-time migration: seed from the legacy ~/.claude location if the new path is absent (atomic, race-safe)
if [ ! -f "$CONFIG_PATH" ] && [ -f "$HOME/.claude/kg-config.json" ]; then
  cp "$HOME/.claude/kg-config.json" "$CONFIG_PATH.tmp.$$" 2>/dev/null && mv -f "$CONFIG_PATH.tmp.$$" "$CONFIG_PATH" 2>/dev/null
fi
CLAUDE_PLANS_DIR="$HOME/.claude/plans"

# Color codes
BLUE='\033[0;34m'
NC='\033[0m'

# Read stdin (Claude Code passes tool input as JSON)
INPUT="$(cat)"

# Extract file path from tool input
FILE_PATH=""
FILE_PATH="$(echo "$INPUT" | grep -o '"file_path"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*"\([^"]*\)".*/\1/')"
if [ -z "$FILE_PATH" ]; then
    FILE_PATH="$(echo "$INPUT" | grep -o '"path"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*"\([^"]*\)".*/\1/')"
fi

if [ -z "$FILE_PATH" ]; then
    exit 0
fi

# Expand ~ in FILE_PATH if present
FILE_PATH="${FILE_PATH/#\~/$HOME}"

# Check if the file is under ~/.claude/plans/
case "$FILE_PATH" in
    "$CLAUDE_PLANS_DIR"/*)
        : # proceed
        ;;
    *)
        exit 0
        ;;
esac

# Verify the source file exists
if [ ! -f "$FILE_PATH" ]; then
    exit 0
fi

# Load active KG config
if [ ! -f "$CONFIG_PATH" ]; then
    exit 0
fi

ACTIVE_KG="$(grep -o '"active"[[:space:]]*:[[:space:]]*"[^"]*"' "$CONFIG_PATH" | sed 's/.*"\([^"]*\)".*/\1/')"

if [ -z "$ACTIVE_KG" ]; then
    exit 0
fi

KG_PATH="$(grep -A 10 "\"$ACTIVE_KG\"" "$CONFIG_PATH" | grep '"path"' | head -1 | sed 's/.*"path"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/')"

if [ -z "$KG_PATH" ]; then
    exit 0
fi

KG_PATH="${KG_PATH/#\~/$HOME}"

# Derive project root from KG path (parent of docs/)
KG_PROJECT_ROOT="$(dirname "$KG_PATH")"
TARGET_DIR="$KG_PROJECT_ROOT/docs/plans"

# Graceful degradation: if target doesn't exist, skip silently
if [ ! -d "$TARGET_DIR" ]; then
    exit 0
fi

FILE_BASE="$(basename "$FILE_PATH")"
cp "$FILE_PATH" "$TARGET_DIR/$FILE_BASE"

echo -e "${BLUE}📋 Plan mirrored to docs/plans/$FILE_BASE${NC}"

exit 0
