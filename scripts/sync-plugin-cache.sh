#!/bin/bash
# sync-plugin-cache.sh - issue-28
#
# Copies mcp-server/dist/ + hook-wired scripts/ (+ hooks/hooks.json) from this
# working tree into the installed plugin cache, so live hook calls
# (${CLAUDE_PLUGIN_ROOT} resolves to the cache, not this repo) actually reflect
# current working-tree code instead of a stale cached copy.
#
# See: knowledge/issues/issue-28/issue-28-description.md
#
# Disable/bypass: touch ~/.kmgraph/.sync-disabled to skip this script (e.g.
# mid-branch, before trusting a not-yet-fully-tested gate change to
# auto-propagate into the real push hook via the cache).
#
# Verify a sync actually moved bytes (don't trust a simulated re-run --
# see issue-28's "Verification method flaw" note): grep the cache copy
# directly for a string that only exists in the working tree, e.g.:
#   grep -c "Gate 7" <cache-dir>/scripts/pre-push-gate.sh

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

DISABLE_FLAG="$HOME/.kmgraph/.sync-disabled"
if [ -f "$DISABLE_FLAG" ]; then
    echo "sync-plugin-cache: skipped (disabled via $DISABLE_FLAG)"
    exit 0
fi

# Cache path is version-pinned per install and moves independently of this
# working tree's own version (e.g. cache at 0.7.5 while working tree is on
# 0.7.7) -- resolve the latest installed version dir dynamically, never
# hardcode a version.
CACHE_PARENT=$(ls -d "$HOME/.claude/plugins/cache"/*/kmgraph 2>/dev/null | head -1)
if [ -z "$CACHE_PARENT" ]; then
    echo "sync-plugin-cache: no installed kmgraph plugin cache found under ~/.claude/plugins/cache/ -- nothing to sync"
    exit 0
fi

CACHE_DIR=$(ls -d "$CACHE_PARENT"/*/ 2>/dev/null | sort -V | tail -1)
if [ -z "$CACHE_DIR" ]; then
    echo "sync-plugin-cache: found $CACHE_PARENT but no version subdirectory -- nothing to sync"
    exit 0
fi
CACHE_DIR="${CACHE_DIR%/}"

echo "sync-plugin-cache: syncing $REPO_ROOT -> $CACHE_DIR"

if [ -d "$REPO_ROOT/mcp-server/dist" ]; then
    mkdir -p "$CACHE_DIR/mcp-server"
    rm -rf "$CACHE_DIR/mcp-server/dist"
    cp -r "$REPO_ROOT/mcp-server/dist" "$CACHE_DIR/mcp-server/dist"
    echo "  synced mcp-server/dist/"
fi

if [ -d "$REPO_ROOT/scripts" ]; then
    rm -rf "$CACHE_DIR/scripts"
    cp -r "$REPO_ROOT/scripts" "$CACHE_DIR/scripts"
    echo "  synced scripts/"
fi

if [ -f "$REPO_ROOT/hooks/hooks.json" ]; then
    mkdir -p "$CACHE_DIR/hooks"
    cp "$REPO_ROOT/hooks/hooks.json" "$CACHE_DIR/hooks/hooks.json"
    echo "  synced hooks/hooks.json"
fi

echo "sync-plugin-cache: done"
