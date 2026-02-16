#!/bin/bash
# recent-lessons.sh - Knowledge Graph plugin SessionStart hook
# Displays recently modified lessons from active KG (last 7 days)

# Exit codes:
# 0 = Success (lessons displayed or none found)
# 1 = Error (config issues)

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PLUGIN_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
CONFIG_PATH="$HOME/.claude/kg-config.json"

# Color codes for output
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if config exists
if [ ! -f "$CONFIG_PATH" ]; then
    # No config, no recent lessons to show
    exit 0
fi

# Read active KG from config
ACTIVE_KG=$(grep -o '"active"[[:space:]]*:[[:space:]]*"[^"]*"' "$CONFIG_PATH" | sed 's/.*"\([^"]*\)".*/\1/')

if [ -z "$ACTIVE_KG" ]; then
    # No active KG, nothing to show
    exit 0
fi

# Extract KG path for active graph
KG_PATH=$(grep -A 10 "\"$ACTIVE_KG\"" "$CONFIG_PATH" | grep '"path"' | head -1 | sed 's/.*"path"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/')

if [ -z "$KG_PATH" ]; then
    exit 0
fi

# Expand tilde in path
KG_PATH="${KG_PATH/#\~/$HOME}"

# Validate KG path exists
if [ ! -d "$KG_PATH" ]; then
    exit 0
fi

# Check if lessons-learned directory exists
LESSONS_DIR="$KG_PATH/lessons-learned"
if [ ! -d "$LESSONS_DIR" ]; then
    exit 0
fi

# Find lessons modified in last 7 days
# Use find with -mtime -7 (less than 7 days old)
RECENT_LESSONS=$(find "$LESSONS_DIR" -name "*.md" -type f -mtime -7 2>/dev/null)

if [ -z "$RECENT_LESSONS" ]; then
    # No recent lessons, exit silently
    exit 0
fi

# Count lessons
LESSON_COUNT=$(echo "$RECENT_LESSONS" | wc -l | tr -d ' ')

if [ "$LESSON_COUNT" -eq 0 ]; then
    exit 0
fi

# Display header
echo -e "${BLUE}📚 Recent Lessons (last 7 days):${NC}"

# Display each lesson with title extracted from filename
echo "$RECENT_LESSONS" | while read -r lesson_path; do
    # Extract just the filename without path and extension
    filename=$(basename "$lesson_path" .md)

    # Try to extract title from YAML frontmatter first
    if [ -f "$lesson_path" ]; then
        title=$(grep -m 1 '^title:' "$lesson_path" 2>/dev/null | sed 's/^title:[[:space:]]*"\?\([^"]*\)"\?/\1/')
        if [ -z "$title" ]; then
            # Fallback: extract from first # header
            title=$(grep -m 1 '^# ' "$lesson_path" 2>/dev/null | sed 's/^# //')
        fi
        if [ -z "$title" ]; then
            # Fallback: use filename with underscores replaced by spaces
            title=$(echo "$filename" | sed 's/_/ /g' | sed 's/Lessons Learned //')
        fi
    else
        # Use filename as fallback
        title=$(echo "$filename" | sed 's/_/ /g')
    fi

    # Get relative path from KG root for display
    rel_path="${lesson_path#$KG_PATH/}"

    echo "   • $title"
    echo "     $rel_path"
done

echo ""
echo -e "${GREEN}Tip:${NC} Use ${BLUE}/knowledge:recall \"query\"${NC} to search lessons"
echo ""

exit 0
