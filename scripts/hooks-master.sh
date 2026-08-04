#!/bin/bash
# hooks-master.sh - Knowledge Management Graph SessionStart master hook
# Consolidates check-memory.sh, recent-lessons.sh, and memory-diff-check.sh
# Security: no eval, no network requests, all variables quoted, subshells quoted

# Exit codes:
# 0 = All checks passed or non-blocking warnings issued
# 1 = Blocking error

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PLUGIN_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
CONFIG_PATH="${KG_CONFIG_PATH:-$HOME/.kmgraph/kg-config.json}"
mkdir -p "$(dirname "$CONFIG_PATH")" 2>/dev/null
# one-time migration: seed from the legacy ~/.claude location if the new path is absent (atomic, race-safe)
if [ ! -f "$CONFIG_PATH" ] && [ -f "$HOME/.claude/kg-config.json" ]; then
  cp "$HOME/.claude/kg-config.json" "$CONFIG_PATH.tmp.$$" 2>/dev/null && mv -f "$CONFIG_PATH.tmp.$$" "$CONFIG_PATH" 2>/dev/null
fi

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
# SECTION 2: KG Resolution (cwd-derived, issue-41 / ADR-067 Phase 9)
#
# issue-41 (ADR-067 Phase 9): resolution is cwd-derived, not a mutable
# `.active` pointer. The scripts/ hooks were the one place the retired
# `.active`/autoSwitch model survived (grep'd straight out of kg-config.json,
# with a silent `cfg.active = ...` rewrite when CWD didn't match) -- fixed
# here by shelling out to the same resolveGraph() logic the kg_resolve MCP
# tool exposes to markdown callers (mcp-server/src/tools/resolve.ts), via a
# thin `resolve` CLI subcommand (mcp-server/src/cli.ts) built into the
# already-built dist/cli.js this script's own auto-build step (Section 1)
# guarantees is present. There is no "active KG" or "switch" concept left:
# resolution is automatic from CWD, so a CWD that doesn't resolve just gets
# an informational message, not a blocking error or a silent config rewrite.
#
# Post-review fix: this section only sets PROJECT_RESOLVED/KG_PATH and
# (on the one genuine misconfiguration case -- a registered KG whose path no
# longer exists on disk) FINAL_EXIT=1. It never `exit`s directly. Sections
# 3.5 (personal/global KG lessons), 4 (profile staleness), and the ENH-016
# rules-split check are about the user's personal KG and global config
# health, not "which project KG resolved from this cwd" -- under the old
# `.active` model a missing/unset active KG was near-never true on a real
# install, so those sections' reachability never depended on it in practice.
# Under cwd-derived resolution, "no project resolves from this cwd" is a
# routine state (any session started from $HOME or outside a registered
# project), so an early `exit` here would routinely and silently skip
# sections that have nothing to do with project resolution. Only Section 3
# (recent lessons) and Section 3.75 (project routing injection) actually
# need KG_PATH, so only those are gated on PROJECT_RESOLVED below.
# ─────────────────────────────────────────────────────────────

FINAL_EXIT=0
PROJECT_RESOLVED=false
KG_PATH=""
RESOLVED_KG=""

if [ ! -f "$CONFIG_PATH" ]; then
    echo -e "${BLUE}ℹ️  No knowledge graph configured.${NC}"
    echo "   Run /kmgraph:kmg-init to get started."
else
    RESOLVE_CLI="$PLUGIN_ROOT/mcp-server/dist/cli.js"

    if ! command -v node &> /dev/null || [ ! -f "$RESOLVE_CLI" ]; then
        echo -e "${YELLOW}⚠️  Cannot resolve knowledge graph: Node.js or the MCP server build is unavailable.${NC}"
    else
        RESOLVE_JSON=$(node "$RESOLVE_CLI" resolve --cwd "$(pwd)" 2>/dev/null)
        RESOLVE_STATUS=$?

        if [ "$RESOLVE_STATUS" -ne 0 ]; then
            RESOLVE_ERR=$(node -e "
              try {
                const r = JSON.parse(process.argv[1]);
                process.stdout.write(r.error || '');
              } catch(e) {}
            " "$RESOLVE_JSON" 2>/dev/null)
            echo -e "${BLUE}ℹ️  ${RESOLVE_ERR:-No knowledge graph resolves for this directory.}${NC}"
            echo "   Run /kmgraph:kmg-init to set one up here, or cd into a registered project."
        else
            RESOLVED_KG=$(node -e "
              try {
                const r = JSON.parse(process.argv[1]);
                process.stdout.write(r.name || '');
              } catch(e) {}
            " "$RESOLVE_JSON" 2>/dev/null)

            KG_PATH=$(node -e "
              try {
                const r = JSON.parse(process.argv[1]);
                process.stdout.write(r.path || '');
              } catch(e) {}
            " "$RESOLVE_JSON" 2>/dev/null)

            if [ -z "$KG_PATH" ] || [ ! -d "$KG_PATH" ]; then
                echo -e "${RED}⚠️  Resolved KG path does not exist: $KG_PATH${NC}"
                echo "   KG: $RESOLVED_KG"
                echo "   Run /kmgraph:kmg-init to fix configuration."
                FINAL_EXIT=1
                KG_PATH=""
            else
                PROJECT_RESOLVED=true
            fi
        fi
    fi
fi

# ─────────────────────────────────────────────────────────────
# SECTION 3: Recent Lessons (from recent-lessons.sh)
# Project-scoped -- only runs when a project KG resolved from CWD.
# ─────────────────────────────────────────────────────────────

if [ "$PROJECT_RESOLVED" = true ]; then
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
                echo -e "${GREEN}Tip:${NC} Use ${BLUE}/kmgraph:kmg-recall \"query\"${NC} to search lessons"
                echo ""
            fi
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
                echo -e "   Use ${BLUE}/kmgraph:kmg-recall \"query\" --scope=personal-only${NC} to search personal KG"
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
# Project-scoped -- only runs when a project KG resolved from CWD.
# ─────────────────────────────────────────────────────────────

if [ "$PROJECT_RESOLVED" = true ]; then
    _inject_profile "$KG_PATH/me.md"       "knowledge/me.md (project identity)"
    _inject_profile "$KG_PATH/triggers.md" "knowledge/triggers.md (project triggers)"
fi

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

_kmgraph_profile_files=("$HOME/.kmgraph/rules.md")
for f in "$HOME"/.kmgraph/*.md; do
  [ -f "$f" ] || continue
  grep -qE '^> Sourced from ~/\.kmgraph/.*\.md split' "$f" 2>/dev/null && _kmgraph_profile_files+=("$f")
done
for profile_file in "${_kmgraph_profile_files[@]}"; do
  [ -f "$profile_file" ] && _check_profile_staleness "$profile_file" "~/.kmgraph/$(basename "$profile_file")"
done
_check_profile_staleness "$HOME/.kmgraph/me.md" "~/.kmgraph/me.md"

# ─────────────────────────────────────────────────────────────
# ENH-016: Rules file auto-split recommendation
# If rules.md exceeds 120 lines AND has 2+ separable ## domains,
# recommend splitting. Weekly suppression via flag file.
# ─────────────────────────────────────────────────────────────
_check_rules_split_threshold() {
    local filepath="$HOME/.kmgraph/rules.md"
    [ -f "$filepath" ] || return 0

    local line_count
    line_count=$(wc -l < "$filepath")
    [ "$line_count" -gt 120 ] || return 0

    local domain_count
    domain_count=$(grep -c '^## ' "$filepath" 2>/dev/null || true)
    domain_count=${domain_count:-0}
    [ "$domain_count" -ge 2 ] || return 0

    local week_tag dismiss_flag
    week_tag=$(date +%Y-%V)
    dismiss_flag="$HOME/.kmgraph/.split-dismissed-${week_tag}"
    [ -f "$dismiss_flag" ] && return 0

    echo -e "${YELLOW}⚠️  rules.md has grown to ${line_count} lines across ${domain_count} domains.${NC}"
    echo "   Consider splitting into separate files (see § Rules File Management for the splitting convention)."
    echo "   To suppress for this week: touch ~/.kmgraph/.split-dismissed-${week_tag}"
    echo ""
}

_check_rules_split_threshold

# ─────────────────────────────────────────────────────────────
# SECTION 5: Profile file diffs are not surfaced in SessionStart.
# Profile files (`~/.kmgraph/{rules,me}.md`, `{project}/knowledge/{rules,me}.md`)
# are the authoritative behavioral stores. They are read directly by the
# rules-capture pipeline and platform shims; surfacing diffs here adds noise
# without changing routing behavior. MEMORY.md diff surfacing has been removed
# as part of the post-migration cascade fix (ENH-014).
# ─────────────────────────────────────────────────────────────

exit "$FINAL_EXIT"
