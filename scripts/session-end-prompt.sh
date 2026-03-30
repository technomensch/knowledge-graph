#!/bin/bash
# session-end-prompt.sh - Stop hook: remind user to wrap up before ending session
# Security: no eval, no network, all variables quoted, subshells quoted

CONFIG_PATH="$HOME/.claude/kg-config.json"

# Color codes
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

# ─────────────────────────────────────────────────────────────
# Session flag: avoid double-prompting within same session
# ─────────────────────────────────────────────────────────────

FLAG_PATH="/tmp/.kg-session-summarized-${PPID}-$(date +%Y%m%d)"

if [ -f "$FLAG_PATH" ]; then
    exit 0
fi

# Clean up stale flag files older than 1 day
find /tmp -name ".kg-session-summarized-*" -mtime +1 -delete 2>/dev/null
find /tmp -name ".kg-snapshot-*" -mtime +1 -delete 2>/dev/null

# Check if a snapshot was taken today (set by session-summary-agent --snapshot)
SNAPSHOT_FLAG="/tmp/.kg-snapshot-$(date +%Y-%m-%d)"
SNAPSHOT_TODAY=false
if [ -f "$SNAPSHOT_FLAG" ]; then
    SNAPSHOT_TODAY=true
fi

# ─────────────────────────────────────────────────────────────
# Config check — require active KG
# ─────────────────────────────────────────────────────────────

if [ ! -f "$CONFIG_PATH" ]; then
    exit 0
fi

ACTIVE_KG="$(grep -o '"active"[[:space:]]*:[[:space:]]*"[^"]*"' "$CONFIG_PATH" | sed 's/.*"\([^"]*\)".*/\1/')"

if [ -z "$ACTIVE_KG" ]; then
    exit 0
fi

KG_PATH="$(grep -A 10 "\"$ACTIVE_KG\"" "$CONFIG_PATH" | grep '"path"' | head -1 | sed 's/.*"path"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/')"

if [ -z "$KG_PATH" ]; then
    exit 0
fi

KG_PATH="${KG_PATH/#\~/$HOME}"

if [ ! -d "$KG_PATH" ]; then
    exit 0
fi

# Derive project root: KG path is the docs/ dir, parent is the project root
KG_PROJECT_ROOT="$(dirname "$KG_PATH")"

# ─────────────────────────────────────────────────────────────
# Check 1: Open plans with unchecked items
# ─────────────────────────────────────────────────────────────

PLANS_DIR="$KG_PROJECT_ROOT/docs/plans"
OPEN_PLAN_MSG=""

if [ -d "$PLANS_DIR" ]; then
    for plan_file in "$PLANS_DIR"/*.md; do
        [ -f "$plan_file" ] || continue
        if grep -q "^\- \[ \]" "$plan_file" 2>/dev/null; then
            UNCHECKED_COUNT="$(grep -c "^\- \[ \]" "$plan_file" 2>/dev/null || echo 0)"
            PLAN_NAME="$(basename "$plan_file" .md)"
            OPEN_PLAN_MSG="  📋 You're mid-plan: $PLAN_NAME ($UNCHECKED_COUNT steps unchecked)"
            break
        fi
    done
fi

# ─────────────────────────────────────────────────────────────
# Check 2: Draft or Proposed ADRs
# ─────────────────────────────────────────────────────────────

DECISIONS_DIR="$KG_PROJECT_ROOT/docs/decisions"
DRAFT_ADR_MSG=""

if [ -d "$DECISIONS_DIR" ]; then
    DRAFT_COUNT=0
    DRAFT_NAME=""
    for adr_file in "$DECISIONS_DIR"/*.md; do
        [ -f "$adr_file" ] || continue
        if grep -qi "Status:[[:space:]]*\(Proposed\|Draft\)" "$adr_file" 2>/dev/null; then
            DRAFT_COUNT=$((DRAFT_COUNT + 1))
            if [ -z "$DRAFT_NAME" ]; then
                DRAFT_NAME="$(basename "$adr_file")"
            fi
        fi
    done
    if [ "$DRAFT_COUNT" -gt 0 ]; then
        DRAFT_ADR_MSG="  📄 $DRAFT_COUNT ADR in draft: $DRAFT_NAME"
    fi
fi

# ─────────────────────────────────────────────────────────────
# Check 3: Recent commits vs lesson files
# ─────────────────────────────────────────────────────────────

LESSON_MSG=""
LESSONS_DIR="$KG_PROJECT_ROOT/docs/lessons-learned"

if command -v git &>/dev/null && [ -d "$KG_PROJECT_ROOT/.git" ]; then
    RECENT_COMMITS="$(git -C "$KG_PROJECT_ROOT" log -5 --format="%s" 2>/dev/null)"
    LESSON_KEYWORD_FOUND=false

    for kw in fix solved implement pattern debug; do
        if echo "$RECENT_COMMITS" | grep -qi "$kw"; then
            LESSON_KEYWORD_FOUND=true
            break
        fi
    done

    if [ "$LESSON_KEYWORD_FOUND" = true ] && [ -d "$LESSONS_DIR" ]; then
        # Check if any lesson file was modified in the last hour
        RECENT_LESSON="$(find "$LESSONS_DIR" -name "*.md" -mmin -60 2>/dev/null | head -1)"
        if [ -z "$RECENT_LESSON" ]; then
            LESSON_MSG="  💡 Looks like lesson-worthy work wasn't captured yet"
        fi
    fi
fi

# ─────────────────────────────────────────────────────────────
# Output
# ─────────────────────────────────────────────────────────────

HAS_ITEMS=false
[ -n "$OPEN_PLAN_MSG" ] && HAS_ITEMS=true
[ -n "$DRAFT_ADR_MSG" ] && HAS_ITEMS=true
[ -n "$LESSON_MSG" ] && HAS_ITEMS=true

if [ "$HAS_ITEMS" = true ]; then
    echo ""
    echo -e "${BLUE}Before you go —${NC}"
    echo ""
    [ -n "$OPEN_PLAN_MSG" ] && echo -e "${YELLOW}$OPEN_PLAN_MSG${NC}"
    [ -n "$DRAFT_ADR_MSG" ] && echo -e "${YELLOW}$DRAFT_ADR_MSG${NC}"
    [ -n "$LESSON_MSG" ] && echo -e "${YELLOW}$LESSON_MSG${NC}"
    echo ""
    if [ "$SNAPSHOT_TODAY" = true ]; then
        echo "You have a session snapshot from today — run /kmgraph:session-summary to complete the wrap-up."
    else
        echo "Run /kmgraph:session-summary to document this session."
    fi
    echo ""
else
    if [ "$SNAPSHOT_TODAY" = true ]; then
        echo -e "${GREEN}✅ Session snapshot taken. Run /kmgraph:session-summary to finalize the wrap-up.${NC}"
    else
        echo -e "${GREEN}✅ Good stopping point. /kmgraph:session-summary if you'd like a summary.${NC}"
    fi
fi

# Create session flag to avoid double-prompting
touch "$FLAG_PATH"

exit 0
