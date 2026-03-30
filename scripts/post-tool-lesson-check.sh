#!/bin/bash
# post-tool-lesson-check.sh - PostToolUse hook: detect lesson-worthy signals after Write/Edit
# Security: no eval, no network, all variables quoted, subshells quoted

CONFIG_PATH="$HOME/.claude/kg-config.json"

# Color codes
YELLOW='\033[1;33m'
NC='\033[0m'

# Read stdin (Claude Code passes hook context as JSON)
INPUT="$(cat)"

# Check for lesson-worthy keywords in file path or content
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
echo "   /kmgraph:capture-lesson — capture what you just solved (includes optional session snapshot)"

exit 0
