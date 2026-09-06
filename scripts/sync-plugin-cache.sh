#!/bin/bash
# sync-plugin-cache.sh - issue-28
#
# Copies mcp-server/dist/, scripts/, skills/, commands/, agents/, and
# hooks/hooks.json from this working tree into the installed plugin cache, so
# live hook/skill/command calls (${CLAUDE_PLUGIN_ROOT} resolves to the cache,
# not this repo) actually reflect current working-tree code instead of a
# stale cached copy.
#
# Widened 2026-09-05 (Opus review): the original version of this script only
# synced mcp-server/dist/ + scripts/ + hooks.json. skills/, commands/, and
# agents/ are equally loaded live from the installed cache -- this branch's
# own Commit 2 (skills/kmg-paperwork-audit) and Commit 4
# (commands/kmg-meta-issue.md) would otherwise never actually reach a live
# session despite this script reporting success.
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

SYNC_FAILED=0

# sync_dir <relative-path>: rm-rf + cp -r the named directory from the
# working tree into the same relative path under the cache. Checks cp's own
# exit status -- rm -rf then cp with no error check would leave the cache
# with that directory deleted-and-not-replaced on a mid-copy failure (disk
# full, permissions, interrupted), silently gutting whatever it governs
# while this script still reports success.
sync_dir() {
    local rel="$1"
    [ -d "$REPO_ROOT/$rel" ] || return 0
    local parent
    parent="$(dirname "$CACHE_DIR/$rel")"
    mkdir -p "$parent"
    rm -rf "${CACHE_DIR:?}/$rel"
    if cp -r "$REPO_ROOT/$rel" "$CACHE_DIR/$rel"; then
        echo "  synced $rel/"
    else
        echo "  FAILED to sync $rel/ -- cache may now be incomplete for this path" >&2
        SYNC_FAILED=1
    fi
}

sync_dir "mcp-server/dist"
sync_dir "scripts"
sync_dir "skills"
sync_dir "commands"
sync_dir "agents"

if [ -f "$REPO_ROOT/hooks/hooks.json" ]; then
    mkdir -p "$CACHE_DIR/hooks"
    if cp "$REPO_ROOT/hooks/hooks.json" "$CACHE_DIR/hooks/hooks.json"; then
        echo "  synced hooks/hooks.json"
    else
        echo "  FAILED to sync hooks/hooks.json" >&2
        SYNC_FAILED=1
    fi
fi

if [ "$SYNC_FAILED" -ne 0 ]; then
    echo "sync-plugin-cache: done with errors -- see FAILED lines above" >&2
    exit 1
fi

echo "sync-plugin-cache: done"
