#!/bin/bash
# plan-mirror.sh - PostToolUse hook: auto-mirror plans from ~/.claude/plans/ to the
# cwd-resolved KG's docs/plans/
# Security: no eval, no network, all variables quoted, subshells quoted

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PLUGIN_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
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

# Resolve the KG for the current directory. issue-41 (ADR-067 Phase 9):
# resolution is cwd-derived via the same resolveGraph() logic the kg_resolve
# MCP tool exposes, not a mutable `.active` pointer grep'd out of
# kg-config.json — see hooks-master.sh for the fuller rationale comment.
if [ ! -f "$CONFIG_PATH" ]; then
    exit 0
fi

RESOLVE_CLI="$PLUGIN_ROOT/mcp-server/dist/cli.js"
if ! command -v node &> /dev/null || [ ! -f "$RESOLVE_CLI" ]; then
    exit 0
fi

RESOLVE_JSON="$(node "$RESOLVE_CLI" resolve --cwd "$(pwd)" 2>/dev/null)"
if [ $? -ne 0 ]; then
    exit 0
fi

KG_PATH="$(node -e "
  try {
    const r = JSON.parse(process.argv[1]);
    process.stdout.write(r.path || '');
  } catch(e) {}
" "$RESOLVE_JSON" 2>/dev/null)"

if [ -z "$KG_PATH" ]; then
    exit 0
fi

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
