#!/bin/bash
# memory-diff-check.sh - Knowledge Management Graph SessionStart hook
# Notifies user of MEMORY.md changes since last session

# Exit codes:
# 0 = Success (changes displayed or none found)
# 1 = Error (silent failure)

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PLUGIN_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Color codes for output
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Find project memory directory
MEMORY_PATH="$HOME/.claude/projects/$(basename "$(pwd)")/memory/MEMORY.md"

if [ ! -f "$MEMORY_PATH" ]; then
    # No MEMORY.md, nothing to check
    exit 0
fi

# Check if git is available
if ! command -v git &> /dev/null; then
    exit 0
fi

# Check if MEMORY.md is in a git repo
MEMORY_DIR=$(dirname "$MEMORY_PATH")
if ! git -C "$MEMORY_DIR" rev-parse --git-dir > /dev/null 2>&1; then
    exit 0
fi

# Get last session timestamp (use git log as proxy for "last session")
# Strategy: Check when MEMORY.md was last modified in git
LAST_COMMIT_DATE=$(git -C "$MEMORY_DIR" log -1 --format=%ct -- MEMORY.md 2>/dev/null)

if [ -z "$LAST_COMMIT_DATE" ]; then
    # No commits yet, nothing to compare
    exit 0
fi

# Get current timestamp
CURRENT_TIME=$(date +%s)

# Calculate time since last commit (in hours)
HOURS_SINCE=$((  (CURRENT_TIME - LAST_COMMIT_DATE) / 3600 ))

# Only show diff if last commit was within last 7 days (168 hours)
if [ "$HOURS_SINCE" -gt 168 ]; then
    # Too old, don't show diff
    exit 0
fi

# Get diff between last commit and current state
DIFF_OUTPUT=$(git -C "$MEMORY_DIR" diff HEAD -- MEMORY.md 2>/dev/null)

if [ -z "$DIFF_OUTPUT" ]; then
    # No changes since last commit
    exit 0
fi

# Parse diff to identify added/removed entries
# Look for lines starting with + or - (excluding +++ and ---)
ADDED_LINES=$(echo "$DIFF_OUTPUT" | grep '^+' | grep -v '^+++' | wc -l | tr -d ' ')
REMOVED_LINES=$(echo "$DIFF_OUTPUT" | grep '^-' | grep -v '^---' | wc -l | tr -d ' ')

if [ "$ADDED_LINES" -eq 0 ] && [ "$REMOVED_LINES" -eq 0 ]; then
    # No substantive changes
    exit 0
fi

# Extract entry titles from added lines (look for ### headings)
ADDED_ENTRIES=$(echo "$DIFF_OUTPUT" | grep '^+### ' | sed 's/^+### //' | head -5)
REMOVED_ENTRIES=$(echo "$DIFF_OUTPUT" | grep '^-### ' | sed 's/^-### //' | head -5)

# Count entries (not lines)
ADDED_COUNT=$(echo "$ADDED_ENTRIES" | grep -c '^' 2>/dev/null || echo 0)
REMOVED_COUNT=$(echo "$REMOVED_ENTRIES" | grep -c '^' 2>/dev/null || echo 0)

# Display notification
echo -e "${BLUE}📝 MEMORY.md changes (since last session):${NC}"

if [ "$ADDED_COUNT" -gt 0 ]; then
    echo -e "   ${GREEN}+ $ADDED_COUNT new entries:${NC}"
    echo "$ADDED_ENTRIES" | while read -r entry; do
        if [ -n "$entry" ]; then
            echo "     • $entry"
        fi
    done
fi

if [ "$REMOVED_COUNT" -gt 0 ]; then
    echo -e "   ${RED}- $REMOVED_COUNT removed/archived:${NC}"
    echo "$REMOVED_ENTRIES" | while read -r entry; do
        if [ -n "$entry" ]; then
            echo "     • $entry"
        fi
    done
fi

# Show token size if changed significantly
OLD_SIZE=$(git -C "$MEMORY_DIR" show HEAD:MEMORY.md 2>/dev/null | wc -w | tr -d ' ')
NEW_SIZE=$(wc -w < "$MEMORY_PATH" | tr -d ' ')

if [ -n "$OLD_SIZE" ] && [ -n "$NEW_SIZE" ]; then
    OLD_TOKENS=$((OLD_SIZE * 13 / 10))
    NEW_TOKENS=$((NEW_SIZE * 13 / 10))
    TOKEN_DIFF=$((NEW_TOKENS - OLD_TOKENS))

    if [ "$TOKEN_DIFF" -gt 50 ] || [ "$TOKEN_DIFF" -lt -50 ]; then
        # Significant change
        echo ""
        if [ "$TOKEN_DIFF" -gt 0 ]; then
            echo -e "   Size: ~${NEW_TOKENS}/2,000 tokens ${YELLOW}(+${TOKEN_DIFF})${NC}"
        else
            echo -e "   Size: ~${NEW_TOKENS}/2,000 tokens ${GREEN}(${TOKEN_DIFF})${NC}"
        fi
    fi
fi

echo ""

exit 0
