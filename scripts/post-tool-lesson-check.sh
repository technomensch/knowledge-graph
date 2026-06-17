#!/bin/bash
# post-tool-lesson-check.sh - PostToolUse hook: detect lesson-worthy signals after Write/Edit/Bash
# Security: no eval, no network, all variables quoted, subshells quoted

CONFIG_PATH="$HOME/.claude/kg-config.json"

# Color codes
YELLOW='\033[1;33m'
NC='\033[0m'

# Read stdin (Claude Code passes hook context as JSON)
INPUT="$(cat)"

# Detect tool name
TOOL_NAME="$(printf '%s' "$INPUT" | jq -r '.tool_name // ""' 2>/dev/null || true)"

# --- Bash-specific path ---
# Require 2+ of: bug/resolved/workaround in output; exclude error (too noisy alone)
if [ "$TOOL_NAME" = "Bash" ]; then
    COMMAND="$(printf '%s' "$INPUT" | jq -r '.tool_input.command // ""' 2>/dev/null || true)"

    # Suppress on git commit (has its own pre-commit knowledge gate)
    if echo "$COMMAND" | grep -qE '(^|;|&&|\|\|)[[:space:]]*git commit([[:space:]]|$)'; then
        exit 0
    fi

    OUTPUT="$(printf '%s' "$INPUT" | jq -r '.tool_response // .tool_output // ""' 2>/dev/null || true)"
    SIGNAL_COUNT=0
    for keyword in bug resolved workaround; do
        if echo "$OUTPUT" | grep -qi "$keyword"; then
            SIGNAL_COUNT=$((SIGNAL_COUNT + 1))
        fi
    done

    if [ "$SIGNAL_COUNT" -lt 2 ]; then
        exit 0
    fi

    echo -e "${YELLOW}📝 That looks like it might be worth keeping.${NC}"
    echo "   /kmgraph:kmg-capture-lesson — capture what you just solved (includes optional session snapshot)"
    exit 0
fi

# --- Write/Edit path ---
SIGNAL_FOUND=false

# Keyword checks against full input
for keyword in fix solved workaround debug error issue pattern architecture decision refactor; do
    if echo "$INPUT" | grep -qi "$keyword"; then
        SIGNAL_FOUND=true
        break
    fi
done

# If no keyword match, exit silently
if [ "$SIGNAL_FOUND" = false ]; then
    exit 0
fi

# Extract file path from tool input (look for "path" or "file_path" fields)
FILE_PATH=""
FILE_PATH="$(echo "$INPUT" | grep -o '"file_path"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*"\([^"]*\)".*/\1/')"
if [ -z "$FILE_PATH" ]; then
    FILE_PATH="$(echo "$INPUT" | grep -o '"path"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*"\([^"]*\)".*/\1/')"
fi

# Suppress on docs/, .git/, and .md-only writes
case "$FILE_PATH" in
    */docs/*|*/.git/*|*.md)
        exit 0
        ;;
esac

# Surface prompt
echo -e "${YELLOW}📝 That looks like it might be worth keeping.${NC}"
echo "   /kmgraph:kmg-capture-lesson — capture what you just solved (includes optional session snapshot)"

exit 0
