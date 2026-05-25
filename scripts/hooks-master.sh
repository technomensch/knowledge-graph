#!/bin/bash
# hooks-master.sh - Knowledge Management Graph SessionStart master hook
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
MCP_NODE_MODULES="$PLUGIN_ROOT/mcp-server/node_modules/@modelcontextprotocol"
MCP_PKG_JSON="$PLUGIN_ROOT/mcp-server/package.json"
MCP_PKG_HASH_FILE="$PLUGIN_ROOT/mcp-server/node_modules/.pkg-installed-hash"

# Check if dependencies or build are missing
NEEDS_INSTALL=false
NEEDS_BUILD=false

if [ ! -d "$MCP_NODE_MODULES" ]; then
    NEEDS_INSTALL=true
elif [ -f "$MCP_PKG_JSON" ]; then
    # Re-run install if package.json has changed since last install
    # Handles new dependencies added in upgrades (e.g. node-sqlite3-wasm in v0.1.2)
    if command -v md5sum &> /dev/null; then
        CURRENT_HASH=$(md5sum "$MCP_PKG_JSON" | cut -d' ' -f1)
    elif command -v md5 &> /dev/null; then
        CURRENT_HASH=$(md5 -q "$MCP_PKG_JSON")
    else
        CURRENT_HASH=""
    fi
    STORED_HASH=$(cat "$MCP_PKG_HASH_FILE" 2>/dev/null || echo "")
    if [ -n "$CURRENT_HASH" ] && [ "$CURRENT_HASH" != "$STORED_HASH" ]; then
        NEEDS_INSTALL=true
    fi
fi

if [ ! -f "$MCP_DIST" ]; then
    NEEDS_BUILD=true
fi

# Only proceed if something is needed
if [ "$NEEDS_INSTALL" = true ] || [ "$NEEDS_BUILD" = true ]; then
    if command -v node &> /dev/null && command -v npm &> /dev/null; then
        cd "$PLUGIN_ROOT/mcp-server"

        # Install dependencies if missing or package.json changed
        if [ "$NEEDS_INSTALL" = true ]; then
            echo "Installing MCP server dependencies..."
            npm install --omit=dev --silent 2>/dev/null
            if [ ! -d "$MCP_NODE_MODULES" ]; then
                echo ""
                echo "Failed to install MCP server dependencies. Search and configuration tools will be unavailable."
                echo ""
                echo "To fix this manually, run:"
                echo "  cd $PLUGIN_ROOT/mcp-server"
                echo "  npm install"
                echo ""
                echo "Then restart Claude Code."
                echo ""
            elif [ -n "$CURRENT_HASH" ]; then
                # Record hash so we don't re-install unless package.json changes again
                echo "$CURRENT_HASH" > "$MCP_PKG_HASH_FILE"
            fi
        fi

        # Build if source is missing (only after dependencies are installed)
        if [ "$NEEDS_BUILD" = true ] && [ -d "$MCP_NODE_MODULES" ]; then
            echo "Building MCP server (first run)..."
            npm run build --silent 2>/dev/null
            if [ -f "$MCP_DIST" ]; then
                echo "MCP server built successfully."
            else
                echo ""
                echo "MCP server build failed. Search and configuration tools will be unavailable."
                echo ""
                echo "To fix this manually, run:"
                echo "  cd $PLUGIN_ROOT/mcp-server"
                echo "  npm run build"
                echo ""
                echo "Then restart Claude Code."
                echo ""
            fi
        elif [ "$NEEDS_BUILD" = false ] && [ "$NEEDS_INSTALL" = true ] && [ -d "$MCP_NODE_MODULES" ]; then
            echo "MCP server dependencies installed successfully."
        fi

        cd - > /dev/null 2>&1
    else
        echo ""
        echo "Knowledge Management Graph requires Node.js to enable search and configuration tools."
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
# SECTION 1.5: Personal Routing Layer Injection
# Injects ~/.kmgraph/{me,triggers}.md into session context
# BEFORE any early exit, so personal routing survives even when no
# project KG is configured. Defines _inject_profile helper used
# again in Section 3.75 for project-scope files.
# ─────────────────────────────────────────────────────────────

PERSONAL_KG_DIR="$HOME/.kmgraph"

_inject_profile() {
    local filepath="$1"
    local label="$2"
    [ -f "$filepath" ] || return 0
    echo -e "${BLUE}── $label ──${NC}"
    echo "===== BEGIN $label ====="
    cat "$filepath"
    echo "===== END $label ====="
    echo ""
}

_inject_profile "$PERSONAL_KG_DIR/me.md"       "~/.kmgraph/me.md (personal identity + rule index)"
_inject_profile "$PERSONAL_KG_DIR/triggers.md" "~/.kmgraph/triggers.md (personal workflow phase router)"

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
# SECTION 2.5: CWD / Active KG Alignment
# Option 1: warn if CWD is outside active KG project root
# Option 3: auto-switch silently if autoSwitch: true in config
# ─────────────────────────────────────────────────────────────

KG_TYPE=$(grep -A 10 "\"$ACTIVE_KG\"" "$CONFIG_PATH" | grep '"type"' | head -1 | sed 's/.*"type"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/')

if [ "$KG_TYPE" = "project-local" ]; then
    # Derive project root (handle /docs subdirectory pattern)
    KG_PATH_BASENAME=$(basename "$KG_PATH")
    if [ "$KG_PATH_BASENAME" = "docs" ]; then
        EXPECTED_PROJECT_ROOT=$(dirname "$KG_PATH")
    else
        EXPECTED_PROJECT_ROOT="$KG_PATH"
    fi

    CWD=$(pwd)
    case "$CWD" in
        "$EXPECTED_PROJECT_ROOT"|"$EXPECTED_PROJECT_ROOT"/*)
            # CWD is within the active KG project — no action needed
            ;;
        *)
            # CWD is outside the active KG project root
            AUTO_SWITCH=$(grep -A 20 "\"$ACTIVE_KG\"" "$CONFIG_PATH" | grep '"autoSwitch"' | head -1 | sed 's/.*"autoSwitch"[[:space:]]*:[[:space:]]*\([^,}]*\).*/\1/' | tr -d '[:space:]')

            if [ "$AUTO_SWITCH" = "true" ] && command -v node &> /dev/null; then
                # Option 3: find the KG whose project root matches CWD and switch silently
                MATCHED_KG=$(node -e "
                  const path = require('path');
                  try {
                    const cfg = JSON.parse(require('fs').readFileSync('$CONFIG_PATH', 'utf8'));
                    const cwd = process.env.CWD_CHECK;
                    for (const [name, g] of Object.entries(cfg.graphs || {})) {
                      if (name === cfg.active) continue;
                      let root = (g.path || '').replace(/^~/, process.env.HOME);
                      if (path.basename(root) === 'docs') root = path.dirname(root);
                      if (cwd === root || cwd.startsWith(root + '/')) {
                        process.stdout.write(name);
                        break;
                      }
                    }
                  } catch(e) {}
                " 2>/dev/null CWD_CHECK="$CWD")

                if [ -n "$MATCHED_KG" ]; then
                    # Silently update active KG in config
                    node -e "
                      try {
                        const fs = require('fs');
                        const cfg = JSON.parse(fs.readFileSync('$CONFIG_PATH', 'utf8'));
                        cfg.active = '$MATCHED_KG';
                        fs.writeFileSync('$CONFIG_PATH', JSON.stringify(cfg, null, 2));
                      } catch(e) {}
                    " 2>/dev/null
                    # Reload active KG name for subsequent sections
                    ACTIVE_KG="$MATCHED_KG"
                    KG_PATH=$(grep -A 10 "\"$ACTIVE_KG\"" "$CONFIG_PATH" | grep '"path"' | head -1 | sed 's/.*"path"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/')
                    KG_PATH="${KG_PATH/#\~/$HOME}"
                fi
                # If no match found, fall through silently (autoSwitch can't find a target)
            else
                # Option 1: warn the user
                echo -e "${YELLOW}⚠️  Active KG '${ACTIVE_KG}' is set for a different project.${NC}"
                echo "   Active KG project: $EXPECTED_PROJECT_ROOT"
                echo "   Current directory: $CWD"
                echo "   Run /kmgraph:switch to change the active KG for this project."
                echo ""
            fi
            ;;
    esac
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
# SECTION 3.5: Global KG Lessons (cross-project personal KG)
# ─────────────────────────────────────────────────────────────

if command -v node &> /dev/null && [ -f "$CONFIG_PATH" ]; then
    GLOBAL_KG_INFO=$(node -e "
      try {
        const cfg = JSON.parse(require('fs').readFileSync('$CONFIG_PATH', 'utf8'));
        const globals = Object.entries(cfg.graphs || {})
          .filter(([, g]) => g.type === 'personal')
          .map(([name, g]) => ({ name, path: (g.path || '').replace(/^~/, process.env.HOME) }));
        if (globals.length > 0) process.stdout.write(JSON.stringify(globals));
      } catch(e) {}
    " 2>/dev/null)

    if [ -n "$GLOBAL_KG_INFO" ]; then
        # Find recent lessons in global KG (last 7 days)
        GLOBAL_KG_PATH=$(node -e "
          try {
            const g = JSON.parse('$GLOBAL_KG_INFO');
            process.stdout.write(g[0].path || '');
          } catch(e) {}
        " 2>/dev/null)
        GLOBAL_KG_NAME=$(node -e "
          try {
            const g = JSON.parse('$GLOBAL_KG_INFO');
            process.stdout.write(g[0].name || 'personal');
          } catch(e) {}
        " 2>/dev/null)

        if [ -n "$GLOBAL_KG_PATH" ] && [ -d "$GLOBAL_KG_PATH/lessons-learned" ]; then
            GLOBAL_LESSONS=$(find "$GLOBAL_KG_PATH/lessons-learned" -name "*.md" -type f -mtime -7 2>/dev/null)
            GLOBAL_COUNT=$(echo "$GLOBAL_LESSONS" | grep -c . 2>/dev/null || echo 0)
            # Suppress count if find returned empty string
            [ -z "$GLOBAL_LESSONS" ] && GLOBAL_COUNT=0

            if [ "$GLOBAL_COUNT" -gt 0 ]; then
                echo -e "${BLUE}🌐 Personal KG — Recent Lessons (last 7 days):${NC}"
                echo "$GLOBAL_LESSONS" | head -3 | while read -r lesson_path; do
                    [ -z "$lesson_path" ] && continue
                    title=$(grep -m 1 '^title:' "$lesson_path" 2>/dev/null | sed 's/^title:[[:space:]]*"\?\([^"]*\)"\?/\1/')
                    [ -z "$title" ] && title=$(basename "$lesson_path" .md | sed 's/_/ /g')
                    echo "   • $title"
                done
                if [ "$GLOBAL_COUNT" -gt 3 ]; then
                    echo "   … and $((GLOBAL_COUNT - 3)) more"
                fi
                echo -e "   Use ${BLUE}/kmgraph:recall \"query\" --scope=personal-only${NC} to search personal KG"
                echo ""
            fi
        fi
    fi
fi

# ─────────────────────────────────────────────────────────────
# SECTION 3.75: Project Routing Layer Injection
# Injects $KG_PATH/{me,triggers}.md into session context. Reuses
# _inject_profile helper defined in Section 1.5. Project routing
# loads AFTER personal routing so it overrides on conflict.
# ─────────────────────────────────────────────────────────────

_inject_profile "$KG_PATH/me.md"       "knowledge/me.md (project identity)"
_inject_profile "$KG_PATH/triggers.md" "knowledge/triggers.md (project triggers)"

# ─────────────────────────────────────────────────────────────
# SECTION 4: Profile File Staleness (post-MEMORY.md cascade)
# Authoritative behavioral stores are now profile files. MEMORY.md
# is an index/pointer file only and is not surfaced here.
# Warn if either personal profile file hasn't been touched in >30 days.
# ─────────────────────────────────────────────────────────────

_check_profile_staleness() {
    local filepath="$1"
    local label="$2"
    [ -f "$filepath" ] || return 0

    local current_time file_time days_old
    current_time=$(date +%s)
    if [[ "$OSTYPE" == "darwin"* ]]; then
        file_time=$(stat -f %m "$filepath")
    else
        file_time=$(stat -c %Y "$filepath")
    fi
    days_old=$(( (current_time - file_time) / 86400 ))

    if [ "$days_old" -gt 30 ]; then
        echo -e "${YELLOW}⚠️  $label is stale (last updated $days_old days ago)${NC}"
        echo "   Path: $filepath"
        echo "   Profile files are the authoritative behavioral store — consider reviewing."
        echo ""
    fi
}

_check_profile_staleness "$HOME/.kmgraph/rules.md" "~/.kmgraph/rules.md"
_check_profile_staleness "$HOME/.kmgraph/me.md"    "~/.kmgraph/me.md"

# ─────────────────────────────────────────────────────────────
# SECTION 5: Profile file diffs are not surfaced in SessionStart.
# Profile files (`~/.kmgraph/{rules,me}.md`, `{project}/knowledge/{rules,me}.md`)
# are the authoritative behavioral stores. They are read directly by the
# rules-capture pipeline and platform shims; surfacing diffs here adds noise
# without changing routing behavior. MEMORY.md diff surfacing has been removed
# as part of the post-migration cascade fix (ENH-014).
# ─────────────────────────────────────────────────────────────

exit 0
