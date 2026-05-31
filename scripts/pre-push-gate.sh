#!/usr/bin/env bash
# pre-push-gate.sh — PreToolUse:Bash hook
#
# Fires before any Bash tool call. Acts only when the command contains
# the 'git push' token — non-interference with pre-commit-knowledge-gate.sh
# (which matches 'git commit'). Handles chained commands (git commit && git push).
#
# Gate 2 — Version sync:
#   Compares version in package.json vs .claude-plugin/plugin.json via jq.
#   Emits drift message on mismatch. Advisory CHANGELOG version-presence check.
#   README/INSTALL checks are advisory with ENH-016 silent skip when absent.
#
# Gate 3 — docs-impact-scan completion flag:
#   Checks for /tmp/kmgraph-docs-scan-<branch>-<sha>.flag written by the
#   kmgraph:docs-impact-scan skill (Step 8). Injects reminder when absent.
#   Detached-HEAD fallback: SHA-only flag name.
#
# Output channel: hookSpecificOutput.additionalContext (PreToolUse event).
# Advisory injection only — always exits 0, never blocks the push.

set -euo pipefail

INPUT=$(cat)

# ── Parse command ─────────────────────────────────────────────────────────────

if command -v jq &>/dev/null; then
  BASH_CMD=$(printf '%s' "$INPUT" | jq -r '.tool_input.command // ""' 2>/dev/null || true)
else
  # Graceful fallback when jq absent
  BASH_CMD=$(printf '%s' "$INPUT" \
    | grep -o '"command"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 \
    | sed 's/.*"\([^"]*\)".*/\1/' || true)
fi

# Act only when command contains 'git push' token
case "$BASH_CMD" in
  *"git push"*)
    : # proceed
    ;;
  *)
    exit 0
    ;;
esac

# Exclude --dry-run (advisory gate — not needed for dry runs)
case "$BASH_CMD" in
  *"--dry-run"*)
    exit 0
    ;;
esac

FINDINGS=""

# ── Gate 2: Version sync ──────────────────────────────────────────────────────

REPO_ROOT="${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null || true)}"
PKG_JSON="${REPO_ROOT}/package.json"
PLUGIN_JSON="${REPO_ROOT}/.claude-plugin/plugin.json"

if [ -f "$PKG_JSON" ] && [ -f "$PLUGIN_JSON" ] && command -v jq &>/dev/null; then
  PKG_VER=$(jq -r '.version // ""' "$PKG_JSON" 2>/dev/null || true)
  PLUGIN_VER=$(jq -r '.version // ""' "$PLUGIN_JSON" 2>/dev/null || true)

  if [ -n "$PKG_VER" ] && [ -n "$PLUGIN_VER" ] && [ "$PKG_VER" != "$PLUGIN_VER" ]; then
    FINDINGS="${FINDINGS}VERSION DRIFT: package.json (${PKG_VER}) and .claude-plugin/plugin.json (${PLUGIN_VER}) disagree. Sync both before pushing. (mcp-server/package.json is independent — ignore unless mcp-server changed.)
"
  fi

  # Advisory: CHANGELOG should reference the version being pushed
  CHANGELOG="${REPO_ROOT}/CHANGELOG.md"
  if [ -n "$PKG_VER" ] && [ -f "$CHANGELOG" ]; then
    if ! grep -qF "$PKG_VER" "$CHANGELOG" 2>/dev/null; then
      FINDINGS="${FINDINGS}CHANGELOG ADVISORY: version ${PKG_VER} not found in CHANGELOG.md. Add a release entry before pushing.
"
    fi
  fi
fi

# ── Gate 3: docs-impact-scan completion flag ──────────────────────────────────

BRANCH=$(git branch --show-current 2>/dev/null | tr '/' '-' || true)
SHA=$(git rev-parse --short HEAD 2>/dev/null || true)

if [ -n "$BRANCH" ] && [ -n "$SHA" ]; then
  SCAN_FLAG="/tmp/kmgraph-docs-scan-${BRANCH}-${SHA}.flag"
elif [ -n "$SHA" ]; then
  # Detached-HEAD fallback
  SCAN_FLAG="/tmp/kmgraph-docs-scan-${SHA}.flag"
else
  SCAN_FLAG=""
fi

if [ -n "$SCAN_FLAG" ] && [ ! -f "$SCAN_FLAG" ]; then
  FINDINGS="${FINDINGS}STOP: docs-impact-scan has not run on this branch at this commit. Invoke the kmgraph:docs-impact-scan skill before pushing, or confirm no user-facing docs are affected.
"
fi

# ── Emit ──────────────────────────────────────────────────────────────────────

[ -z "$FINDINGS" ] && exit 0

# Trim trailing newline
FINDINGS=$(printf '%s' "$FINDINGS" | sed 's/[[:space:]]*$//')

if command -v jq &>/dev/null; then
  jq -n \
    --arg ctx "$FINDINGS" \
    '{
      "hookSpecificOutput": {
        "hookEventName": "PreToolUse",
        "additionalContext": $ctx
      }
    }'
else
  printf '%s\n' "$FINDINGS"
fi

exit 0
