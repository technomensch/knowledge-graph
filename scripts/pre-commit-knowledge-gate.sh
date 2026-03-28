#!/bin/bash
# pre-commit-knowledge-gate.sh - PreToolUse hook: advisory check before git commit
# Security: no eval, no network, all variables quoted, subshells quoted

# Color codes
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Read stdin (Claude Code passes tool input as JSON)
INPUT="$(cat)"

# Extract the bash command from input
BASH_CMD="$(echo "$INPUT" | grep -o '"command"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*"\([^"]*\)".*/\1/')"

# Confirm it's a plain git commit (not --amend, not --no-verify)
case "$BASH_CMD" in
    *"git commit"*)
        : # proceed
        ;;
    *)
        exit 0
        ;;
esac

case "$BASH_CMD" in
    *"--amend"*|*"--no-verify"*)
        exit 0
        ;;
esac

# Get staged file list
DIFF="$(git diff --cached --name-only 2>/dev/null)"

if [ -z "$DIFF" ]; then
    exit 0
fi

# Check if diff contains only docs/, tests/, or .md files (skip prompt if so)
SOURCE_FILES="$(echo "$DIFF" | grep -v '^docs/' | grep -v '^tests/' | grep -v '\.md$')"

if [ -z "$SOURCE_FILES" ]; then
    exit 0
fi

# Check for lesson-worthy source file types
HAS_SOURCE=false
while IFS= read -r f; do
    case "$f" in
        src/*|lib/*|*.ts|*.js|*.py|*.go|*.sh)
            HAS_SOURCE=true
            break
            ;;
    esac
done <<EOF
$SOURCE_FILES
EOF

if [ "$HAS_SOURCE" = false ]; then
    exit 0
fi

# Check if any lesson files are in this commit
if echo "$DIFF" | grep -q "lessons-learned/"; then
    exit 0
fi

# Surface advisory prompt
echo ""
echo -e "${YELLOW}Quick check before you commit —${NC}"
echo "   These changes look like they might be worth documenting."
echo -e "   ${BLUE}/kmgraph:capture-lesson${NC} to save a note, or just proceed with your commit."
echo ""

exit 0
