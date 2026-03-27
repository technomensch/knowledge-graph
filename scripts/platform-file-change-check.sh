#!/bin/bash
# platform-file-change-check.sh - PostToolUse hook: detect platform config file writes
# Security: no eval, no network, all variables quoted, subshells quoted

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

# Suppress on docs/, node_modules/, .git/ paths
case "$FILE_PATH" in
    */docs/*|*/node_modules/*|*/.git/*)
        exit 0
        ;;
esac

# Get the basename for whitelist matching
FILE_BASE="$(basename "$FILE_PATH")"

# Check against platform config whitelist using case
MATCHED=false
case "$FILE_BASE" in
    "CLAUDE.md"|"GEMINI.md"|"MEMORY.md"|"AGENTS.md"|".cursorrules"|".windsurfrules"|"copilot-instructions.md"|".aider.conf.yml")
        MATCHED=true
        ;;
esac

if [ "$MATCHED" = false ]; then
    exit 0
fi

# Surface prompt
echo ""
echo -e "${BLUE}📋 You updated $FILE_BASE.${NC}"
echo "   Want to check if your other platform files (GEMINI.md, .cursorrules) need updating?"
echo "   Run /kmgraph:setup-platform to sync relevant changes."
echo ""

exit 0
