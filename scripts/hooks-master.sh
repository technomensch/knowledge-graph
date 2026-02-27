#!/bin/bash
# hooks-master.sh - Knowledge Graph plugin SessionStart master hook
# Consolidates check-memory.sh, recent-lessons.sh, and memory-diff-check.sh
# Security: no eval, no network requests, all variables quoted, subshells quoted

# Exit codes:
# 0 = All checks passed or non-blocking warnings issued
# 1 = Blocking error

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PLUGIN_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
CONFIG_PATH="$HOME/.claude/kg-config.json"

# Color codes for output
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ─────────────────────────────────────────────────────────────
# SECTION 1: MCP Server Auto-Build (from check-memory.sh)
# ─────────────────────────────────────────────────────────────

MCP_DIST="$PLUGIN_ROOT/mcp-server/dist/index.js"
if [ ! -f "$MCP_DIST" ]; then
    if command -v node &> /dev/null && command -v npm &> /dev/null; then
        echo "Building MCP server (first run)..."
        cd "$PLUGIN_ROOT/mcp-server" && npm install --silent 2>/dev/null && npm run build --silent 2>/dev/null
        if [ -f "$MCP_DIST" ]; then
            echo "MCP server built successfully."
        else
            echo ""
            echo "MCP server build failed. Search and configuration tools will be unavailable."
            echo ""
            echo "To fix this manually, run:"
            echo "  cd $PLUGIN_ROOT/mcp-server"
            echo "  npm install"
            echo "  npm run build"
            echo ""
            echo "Then restart Claude Code."
            echo ""
        fi
        cd - > /dev/null 2>&1
    else
        echo ""
        echo "Knowledge Graph plugin requires Node.js to enable search and configuration tools."
        echo ""
        echo "To install Node.js:"
        echo "  macOS:   brew install node"
        echo "  Ubuntu:  sudo apt install nodejs npm"
        echo "  Other:   https://nodejs.org (download the LTS version)"
        echo ""
        echo "After installing, restart Claude Code and the plugin will finish setup automatically."
        echo ""
    fi
fi

# ─────────────────────────────────────────────────────────────
# SECTION 2: KG Configuration Validation (from check-memory.sh)
# ─────────────────────────────────────────────────────────────

if [ ! -f "$CONFIG_PATH" ]; then
    echo -e "${BLUE}ℹ️  No knowledge graph configured.${NC}"
    echo "   Run /kmgraph:init to get started."
    exit 0
fi

ACTIVE_KG=$(grep -o '"active"[[:space:]]*:[[:space:]]*"[^"]*"' "$CONFIG_PATH" | sed 's/.*"\([^"]*\)".*/\1/')

if [ -z "$ACTIVE_KG" ]; then
    echo -e "${YELLOW}⚠️  No active knowledge graph set in config.${NC}"
    echo "   Run /kmgraph:list and /kmgraph:switch to activate a KG."
    exit 1
fi

KG_PATH=$(grep -A 10 "\"$ACTIVE_KG\"" "$CONFIG_PATH" | grep '"path"' | head -1 | sed 's/.*"path"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/')

if [ -z "$KG_PATH" ]; then
    echo -e "${YELLOW}⚠️  Could not read path for active KG: $ACTIVE_KG${NC}"
    exit 1
fi

KG_PATH="${KG_PATH/#\~/$HOME}"

if [ ! -d "$KG_PATH" ]; then
    echo -e "${RED}⚠️  Active KG path does not exist: $KG_PATH${NC}"
    echo "   KG: $ACTIVE_KG"
    echo "   Run /kmgraph:init or /kmgraph:switch to fix configuration."
    exit 1
fi

# ─────────────────────────────────────────────────────────────
# SECTION 3: Recent Lessons (from recent-lessons.sh)
# ─────────────────────────────────────────────────────────────

LESSONS_DIR="$KG_PATH/lessons-learned"
if [ -d "$LESSONS_DIR" ]; then
    RECENT_LESSONS=$(find "$LESSONS_DIR" -name "*.md" -type f -mtime -7 2>/dev/null)

    if [ -n "$RECENT_LESSONS" ]; then
        LESSON_COUNT=$(echo "$RECENT_LESSONS" | wc -l | tr -d ' ')
        if [ "$LESSON_COUNT" -gt 0 ]; then
            echo -e "${BLUE}📚 Recent Lessons (last 7 days):${NC}"
            echo "$RECENT_LESSONS" | while read -r lesson_path; do
                filename=$(basename "$lesson_path" .md)
                title=""
                if [ -f "$lesson_path" ]; then
                    title=$(grep -m 1 '^title:' "$lesson_path" 2>/dev/null | sed 's/^title:[[:space:]]*"\?\([^"]*\)"\?/\1/')
                    if [ -z "$title" ]; then
                        title=$(grep -m 1 '^# ' "$lesson_path" 2>/dev/null | sed 's/^# //')
                    fi
                    if [ -z "$title" ]; then
                        title=$(echo "$filename" | sed 's/_/ /g' | sed 's/Lessons Learned //')
                    fi
                else
                    title=$(echo "$filename" | sed 's/_/ /g')
                fi
                rel_path="${lesson_path#$KG_PATH/}"
                echo "   • $title"
                echo "     $rel_path"
            done
            echo ""
            echo -e "${GREEN}Tip:${NC} Use ${BLUE}/kmgraph:recall \"query\"${NC} to search lessons"
            echo ""
        fi
    fi
fi

# ─────────────────────────────────────────────────────────────
# SECTION 4: MEMORY.md Status (from check-memory.sh)
# ─────────────────────────────────────────────────────────────

MEMORY_FOUND=false
MEMORY_PATH=""

PROJECT_HASH_DIR=$(find "$HOME/.claude/projects" -type d -name "memory" 2>/dev/null | head -1)
if [ -n "$PROJECT_HASH_DIR" ]; then
    POTENTIAL_MEMORY="$PROJECT_HASH_DIR/MEMORY.md"
    if [ -f "$POTENTIAL_MEMORY" ]; then
        if grep -q "$ACTIVE_KG" "$POTENTIAL_MEMORY" 2>/dev/null || grep -q "$(basename "$KG_PATH")" "$POTENTIAL_MEMORY" 2>/dev/null; then
            MEMORY_FOUND=true
            MEMORY_PATH="$POTENTIAL_MEMORY"
        fi
    fi
fi

if [ "$MEMORY_FOUND" = false ] && [ -f "$KG_PATH/MEMORY.md" ]; then
    MEMORY_FOUND=true
    MEMORY_PATH="$KG_PATH/MEMORY.md"
fi

if [ "$MEMORY_FOUND" = false ]; then
    echo -e "${YELLOW}ℹ️  No MEMORY.md found for active KG: $ACTIVE_KG${NC}"
    echo "   Consider creating one with /kmgraph:capture-lesson --auto-sync"
    exit 0
fi

# Check MEMORY.md staleness (last modified > 7 days ago)
if [ -f "$MEMORY_PATH" ]; then
    CURRENT_TIME=$(date +%s)
    if [[ "$OSTYPE" == "darwin"* ]]; then
        FILE_TIME=$(stat -f %m "$MEMORY_PATH")
    else
        FILE_TIME=$(stat -c %Y "$MEMORY_PATH")
    fi
    DAYS_OLD=$(( (CURRENT_TIME - FILE_TIME) / 86400 ))

    if [ $DAYS_OLD -gt 7 ]; then
        echo -e "${YELLOW}⚠️  MEMORY.md is stale (last updated $DAYS_OLD days ago)${NC}"
        echo "   Consider running /kmgraph:sync-all to update cross-session memory."
    else
        echo -e "${GREEN}✅ Knowledge Graph: $ACTIVE_KG (memory synced $DAYS_OLD days ago)${NC}"
    fi
fi

# ─────────────────────────────────────────────────────────────
# SECTION 5: MEMORY.md Diff (from memory-diff-check.sh)
# ─────────────────────────────────────────────────────────────

DIFF_MEMORY_PATH="$HOME/.claude/projects/$(basename "$(pwd)")/memory/MEMORY.md"

if [ -f "$DIFF_MEMORY_PATH" ] && command -v git &> /dev/null; then
    DIFF_MEMORY_DIR=$(dirname "$DIFF_MEMORY_PATH")
    if git -C "$DIFF_MEMORY_DIR" rev-parse --git-dir > /dev/null 2>&1; then
        LAST_COMMIT_DATE=$(git -C "$DIFF_MEMORY_DIR" log -1 --format=%ct -- MEMORY.md 2>/dev/null)
        if [ -n "$LAST_COMMIT_DATE" ]; then
            CURRENT_TIME=$(date +%s)
            HOURS_SINCE=$(( (CURRENT_TIME - LAST_COMMIT_DATE) / 3600 ))
            if [ "$HOURS_SINCE" -le 168 ]; then
                DIFF_OUTPUT=$(git -C "$DIFF_MEMORY_DIR" diff HEAD -- MEMORY.md 2>/dev/null)
                if [ -n "$DIFF_OUTPUT" ]; then
                    ADDED_LINES=$(echo "$DIFF_OUTPUT" | grep '^+' | grep -v '^+++' | wc -l | tr -d ' ')
                    REMOVED_LINES=$(echo "$DIFF_OUTPUT" | grep '^-' | grep -v '^---' | wc -l | tr -d ' ')
                    if [ "$ADDED_LINES" -gt 0 ] || [ "$REMOVED_LINES" -gt 0 ]; then
                        ADDED_ENTRIES=$(echo "$DIFF_OUTPUT" | grep '^+### ' | sed 's/^+### //' | head -5)
                        REMOVED_ENTRIES=$(echo "$DIFF_OUTPUT" | grep '^-### ' | sed 's/^-### //' | head -5)
                        ADDED_COUNT=$(echo "$ADDED_ENTRIES" | grep -c '^' 2>/dev/null || echo 0)
                        REMOVED_COUNT=$(echo "$REMOVED_ENTRIES" | grep -c '^' 2>/dev/null || echo 0)
                        echo -e "${BLUE}📝 MEMORY.md changes (since last session):${NC}"
                        if [ "$ADDED_COUNT" -gt 0 ]; then
                            echo -e "   ${GREEN}+ $ADDED_COUNT new entries:${NC}"
                            echo "$ADDED_ENTRIES" | while read -r entry; do
                                [ -n "$entry" ] && echo "     • $entry"
                            done
                        fi
                        if [ "$REMOVED_COUNT" -gt 0 ]; then
                            echo -e "   ${RED}- $REMOVED_COUNT removed/archived:${NC}"
                            echo "$REMOVED_ENTRIES" | while read -r entry; do
                                [ -n "$entry" ] && echo "     • $entry"
                            done
                        fi
                        OLD_SIZE=$(git -C "$DIFF_MEMORY_DIR" show HEAD:MEMORY.md 2>/dev/null | wc -w | tr -d ' ')
                        NEW_SIZE=$(wc -w < "$DIFF_MEMORY_PATH" | tr -d ' ')
                        if [ -n "$OLD_SIZE" ] && [ -n "$NEW_SIZE" ]; then
                            OLD_TOKENS=$((OLD_SIZE * 13 / 10))
                            NEW_TOKENS=$((NEW_SIZE * 13 / 10))
                            TOKEN_DIFF=$((NEW_TOKENS - OLD_TOKENS))
                            if [ "$TOKEN_DIFF" -gt 50 ] || [ "$TOKEN_DIFF" -lt -50 ]; then
                                echo ""
                                if [ "$TOKEN_DIFF" -gt 0 ]; then
                                    echo -e "   Size: ~${NEW_TOKENS}/2,000 tokens ${YELLOW}(+${TOKEN_DIFF})${NC}"
                                else
                                    echo -e "   Size: ~${NEW_TOKENS}/2,000 tokens ${GREEN}(${TOKEN_DIFF})${NC}"
                                fi
                            fi
                        fi
                        echo ""
                    fi
                fi
            fi
        fi
    fi
fi

exit 0
