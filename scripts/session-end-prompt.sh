#!/bin/bash
# session-end-prompt.sh - Stop hook: remind user to wrap up before ending session
# Security: no eval, no network, all variables quoted, subshells quoted

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PLUGIN_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
CONFIG_PATH="${KG_CONFIG_PATH:-$HOME/.kmgraph/kg-config.json}"
mkdir -p "$(dirname "$CONFIG_PATH")" 2>/dev/null
# one-time migration: seed from the legacy ~/.claude location if the new path is absent (atomic, race-safe)
if [ ! -f "$CONFIG_PATH" ] && [ -f "$HOME/.claude/kg-config.json" ]; then
  cp "$HOME/.claude/kg-config.json" "$CONFIG_PATH.tmp.$$" 2>/dev/null && mv -f "$CONFIG_PATH.tmp.$$" "$CONFIG_PATH" 2>/dev/null
fi

# Claude Code Stop hooks require hookSpecificOutput format; Codex requires {"decision":"continue"}.
# Gemini has no Stop hook. Select output by CLAUDECODE env var (set only by Claude Code).
trap 'if [ -n "${CLAUDECODE:-}" ]; then echo "{\"hookSpecificOutput\": {\"hookEventName\": \"Stop\"}}"; else echo "{\"decision\": \"continue\"}"; fi' EXIT

# Color codes
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

# ─────────────────────────────────────────────────────────────
# Config check — require a KG that resolves from the current directory
# ─────────────────────────────────────────────────────────────

if [ ! -f "$CONFIG_PATH" ]; then
    exit 0
fi

# issue-41 (ADR-067 Phase 9): resolution is cwd-derived via the same
# resolveGraph() logic the kg_resolve MCP tool exposes, not a mutable
# `.active` pointer grep'd out of kg-config.json. See hooks-master.sh for
# the fuller rationale comment (this script mirrors the same approach).
RESOLVED_KG=""
KG_PATH=""
RESOLVE_CLI="$PLUGIN_ROOT/mcp-server/dist/cli.js"
if command -v node &> /dev/null && [ -f "$RESOLVE_CLI" ]; then
    RESOLVE_JSON="$(node "$RESOLVE_CLI" resolve --cwd "$(pwd)" 2>/dev/null)"
    if [ $? -eq 0 ]; then
        RESOLVED_KG="$(node -e "
          try {
            const r = JSON.parse(process.argv[1]);
            process.stdout.write(r.name || '');
          } catch(e) {}
        " "$RESOLVE_JSON" 2>/dev/null)"
        KG_PATH="$(node -e "
          try {
            const r = JSON.parse(process.argv[1]);
            process.stdout.write(r.path || '');
          } catch(e) {}
        " "$RESOLVE_JSON" 2>/dev/null)"
    fi
fi

if [ -z "$KG_PATH" ] || [ ! -d "$KG_PATH" ]; then
    exit 0
fi

# ─────────────────────────────────────────────────────────────
# Session flag: avoid double-prompting within same session
# Keyed on resolved KG name + date for per-project isolation.
# ─────────────────────────────────────────────────────────────

FLAG_PATH="/tmp/.kg-session-summarized-${RESOLVED_KG:-default}-$(date +%Y%m%d)"

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

# Derive project root: KG path is the docs/ dir, parent is the project root
KG_PROJECT_ROOT="$(dirname "$KG_PATH")"

# ─────────────────────────────────────────────────────────────
# Check 1: Open plans with unchecked items
# ─────────────────────────────────────────────────────────────

# Plans dir: knowledge/plans/ when the project has a knowledge/ dir (per
# ADR-029), else the docs/plans/ template default — same resolution order as
# plan-mirror.sh and pre-skill-rules-inject.sh.
if [ -d "$KG_PROJECT_ROOT/knowledge" ]; then
    PLANS_DIR="$KG_PROJECT_ROOT/knowledge/plans"
else
    PLANS_DIR="$KG_PROJECT_ROOT/docs/plans"
fi
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

DECISIONS_DIR="$KG_PROJECT_ROOT/knowledge/decisions"
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
LESSONS_DIR="$KG_PROJECT_ROOT/knowledge/lessons-learned"

if command -v git >/dev/null 2>&1 && [ -d "$KG_PROJECT_ROOT/.git" ]; then
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
    echo "" >&2
    printf '%b\n' "${BLUE}Before you go —${NC}" >&2
    echo "" >&2
    [ -n "$OPEN_PLAN_MSG" ] && printf '%b\n' "${YELLOW}$OPEN_PLAN_MSG${NC}" >&2
    [ -n "$DRAFT_ADR_MSG" ] && printf '%b\n' "${YELLOW}$DRAFT_ADR_MSG${NC}" >&2
    [ -n "$LESSON_MSG" ] && printf '%b\n' "${YELLOW}$LESSON_MSG${NC}" >&2
    echo "" >&2
    if [ "$SNAPSHOT_TODAY" = true ]; then
        echo "You have a session snapshot from today — run /kmgraph:kmg-session-summary to complete the wrap-up." >&2
    else
        echo "Run /kmgraph:kmg-session-summary to document this session." >&2
    fi
    echo "" >&2
else
    if [ "$SNAPSHOT_TODAY" = true ]; then
        printf '%b\n' "${GREEN}✅ Session snapshot taken. Run /kmgraph:kmg-session-summary to finalize the wrap-up.${NC}" >&2
    else
        printf '%b\n' "${GREEN}✅ Good stopping point. /kmgraph:kmg-session-summary if you'd like a summary.${NC}" >&2
    fi
fi

# Create session flag to avoid double-prompting
touch "$FLAG_PATH"

exit 0
