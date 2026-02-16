#!/bin/bash
# check-memory.sh - Knowledge Graph plugin SessionStart hook
# Validates KG configuration and MEMORY.md status at session start

# Exit codes:
# 0 = All checks passed
# 1 = Warnings (non-blocking)

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PLUGIN_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
CONFIG_PATH="$HOME/.claude/kg-config.json"

# Auto-build MCP server if dist/ is missing
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

# Color codes for output
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# First-run detection
if [ ! -f "$CONFIG_PATH" ]; then
    echo -e "${BLUE}ℹ️  No knowledge graph configured.${NC}"
    echo "   Run /knowledge:init to get started."
    exit 0
fi

# Read active KG from config
ACTIVE_KG=$(grep -o '"active"[[:space:]]*:[[:space:]]*"[^"]*"' "$CONFIG_PATH" | sed 's/.*"\([^"]*\)".*/\1/')

if [ -z "$ACTIVE_KG" ]; then
    echo -e "${YELLOW}⚠️  No active knowledge graph set in config.${NC}"
    echo "   Run /knowledge:list and /knowledge:switch to activate a KG."
    exit 1
fi

# Extract KG path for active graph
# This is a simplified extraction - real implementation would parse JSON properly
KG_PATH=$(grep -A 10 "\"$ACTIVE_KG\"" "$CONFIG_PATH" | grep '"path"' | head -1 | sed 's/.*"path"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/')

if [ -z "$KG_PATH" ]; then
    echo -e "${YELLOW}⚠️  Could not read path for active KG: $ACTIVE_KG${NC}"
    exit 1
fi

# Expand tilde in path
KG_PATH="${KG_PATH/#\~/$HOME}"

# Validate KG path exists
if [ ! -d "$KG_PATH" ]; then
    echo -e "${RED}⚠️  Active KG path does not exist: $KG_PATH${NC}"
    echo "   KG: $ACTIVE_KG"
    echo "   Run /knowledge:init or /knowledge:switch to fix configuration."
    exit 1
fi

# Check for MEMORY.md (try multiple possible locations)
MEMORY_FOUND=false
MEMORY_PATH=""

# Strategy 1: Check if project hash directory exists in ~/.claude/projects/
PROJECT_HASH_DIR=$(find "$HOME/.claude/projects" -type d -name "memory" 2>/dev/null | head -1)
if [ -n "$PROJECT_HASH_DIR" ]; then
    POTENTIAL_MEMORY="$PROJECT_HASH_DIR/MEMORY.md"
    if [ -f "$POTENTIAL_MEMORY" ]; then
        # Verify this MEMORY.md references the active KG
        if grep -q "$ACTIVE_KG" "$POTENTIAL_MEMORY" 2>/dev/null || grep -q "$(basename "$KG_PATH")" "$POTENTIAL_MEMORY" 2>/dev/null; then
            MEMORY_FOUND=true
            MEMORY_PATH="$POTENTIAL_MEMORY"
        fi
    fi
fi

# Strategy 2: Check KG directory for MEMORY.md reference
if [ "$MEMORY_FOUND" = false ] && [ -f "$KG_PATH/MEMORY.md" ]; then
    MEMORY_FOUND=true
    MEMORY_PATH="$KG_PATH/MEMORY.md"
fi

if [ "$MEMORY_FOUND" = false ]; then
    echo -e "${YELLOW}ℹ️  No MEMORY.md found for active KG: $ACTIVE_KG${NC}"
    echo "   Consider creating one with /knowledge:capture-lesson --auto-sync"
    exit 0
fi

# Check MEMORY.md staleness (last modified > 7 days ago)
if [ -f "$MEMORY_PATH" ]; then
    # Get current time and file modification time (portable: macOS and Linux)
    CURRENT_TIME=$(date +%s)

    # macOS and Linux compatible file modification time
    if [[ "$OSTYPE" == "darwin"* ]]; then
        FILE_TIME=$(stat -f %m "$MEMORY_PATH")
    else
        FILE_TIME=$(stat -c %Y "$MEMORY_PATH")
    fi

    DAYS_OLD=$(( (CURRENT_TIME - FILE_TIME) / 86400 ))

    if [ $DAYS_OLD -gt 7 ]; then
        echo -e "${YELLOW}⚠️  MEMORY.md is stale (last updated $DAYS_OLD days ago)${NC}"
        echo "   Consider running /knowledge:sync-all to update cross-session memory."
        exit 1
    else
        echo -e "${GREEN}✅ Knowledge Graph: $ACTIVE_KG (memory synced $DAYS_OLD days ago)${NC}"
    fi
fi

exit 0
