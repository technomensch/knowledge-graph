#!/usr/bin/env bash
# gemini-upgrade-check.sh — Gemini CLI SessionStart hook (KMGraph).
# Deployed into a project's .gemini/ directory by /kmgraph:kmg-init.
# Contract: stdin gets Gemini's base hook input JSON (unused here);
# stdout MUST be valid JSON only (Gemini CLI's hook spec: "Silence is
# Mandatory -- script must not print plain text other than final JSON");
# exit code 0 always (SessionStart's continue/decision fields are
# advisory-only per Gemini CLI's own docs -- startup is never blocked).
set -euo pipefail

# Embedded copy of semver_compare -- see scripts/lib/upgrade-check.sh in
# the kmgraph plugin repo for the canonical version. Keep in sync manually.
semver_compare() {
  local a="$1" b="$2"
  local -a a_parts b_parts
  IFS='.' read -r -a a_parts <<< "$a"
  IFS='.' read -r -a b_parts <<< "$b"
  local i max_len=${#a_parts[@]}
  if [ "${#b_parts[@]}" -gt "$max_len" ]; then
    max_len=${#b_parts[@]}
  fi
  for ((i = 0; i < max_len; i++)); do
    local av="${a_parts[i]:-0}" bv="${b_parts[i]:-0}"
    av="${av//[^0-9]/}"; bv="${bv//[^0-9]/}"
    av="${av:-0}"; bv="${bv:-0}"
    if [ "$av" -gt "$bv" ]; then echo "1"; return
    elif [ "$av" -lt "$bv" ]; then echo "-1"; return
    fi
  done
  echo "0"
}

KG_CONFIG_PATH="${KG_CONFIG_PATH:-$HOME/.kmgraph/kg-config.json}"
# __DEPLOY_TIME_PLUGIN_CACHE_ROOT__ is replaced by Task 4's deployment step
# (running inside Claude Code, where ${CLAUDE_PLUGIN_ROOT} is genuinely set)
# with the real absolute plugin CACHE ROOT (one level up from any one
# version -- e.g. ".../kmgraph", not ".../kmgraph/0.7.7") at the moment this
# file is copied into a user's .gemini/ directory. Gemini CLI never sets
# CLAUDE_PLUGIN_ROOT itself -- baking the value in at deploy time is
# required, not an optimization. Baking in the CACHE ROOT rather than one
# version directory is equally required: plugin upgrades add a new sibling
# directory rather than replacing one in place, so a script pinned to the
# version present at deploy time could never detect any later upgrade. The
# env var stays as an override for anyone who relocates the plugin cache.
PLUGIN_CACHE_ROOT="${KMGRAPH_PLUGIN_CACHE_ROOT:-__DEPLOY_TIME_PLUGIN_CACHE_ROOT__}"

# Consume (and discard) stdin -- Gemini CLI always sends base input JSON,
# and a hook that never reads stdin can leave the pipe blocking in some
# shells. Discard is intentional; this hook needs none of those fields.
cat >/dev/null || true

# Resolve the freshest actually-installed version by scanning sibling
# version-pinned directories under the cache root and taking the numeric
# max -- same rule as mcp-server's resolveFreshestInstalledVersion() (c3),
# ported to bash since this script has no Node process to borrow it from.
# Never pin to one specific version directory (see the note above this
# script for why that's the exact bug this replaces).
resolve_freshest_installed() {
  local root="$1" freshest="" d base
  [ -d "$root" ] || return 1
  for d in "$root"/*/; do
    base="$(basename "$d")"
    [[ "$base" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] || continue
    if [ -z "$freshest" ] || [ "$(semver_compare "$base" "$freshest")" = "1" ]; then
      freshest="$base"
    fi
  done
  [ -n "$freshest" ] && echo "$freshest"
}

# If we can't find any version-pinned sibling, its plugin manifest, or the
# KG config, emit an empty JSON object and exit 0 -- never error, never
# block startup.
FRESHEST_VERSION="$(resolve_freshest_installed "$PLUGIN_CACHE_ROOT" || true)"
PLUGIN_ROOT="${PLUGIN_CACHE_ROOT}/${FRESHEST_VERSION}"
if [ -z "$FRESHEST_VERSION" ] || [ ! -f "$PLUGIN_ROOT/.claude-plugin/plugin.json" ] || [ ! -f "$KG_CONFIG_PATH" ]; then
  echo "{}"
  exit 0
fi

installed_version=$(jq -r '.version // empty' "$PLUGIN_ROOT/.claude-plugin/plugin.json" 2>/dev/null || echo "")
kg_name="${KMGRAPH_GRAPH_NAME:-}"
if [ -z "$kg_name" ]; then
  # No graph-name env var provided -- resolve by matching cwd against
  # registered project-local paths (best-effort; falls back to {} on no match).
  #
  # graphs[].path is the KG's *content* directory (e.g.
  # ".../knowledge-graph/knowledge"), not the project root Gemini CLI's cwd
  # actually is (".../knowledge-graph"). Matching must therefore compare cwd
  # against the PARENT of graphs[].path, with a trailing-slash boundary guard
  # so "/repo-2" cannot match a registered "/repo" (append "/" to both sides
  # before the prefix check).
  #
  # Two more corrections needed beyond that, both confirmed against this
  # machine's own kg-config.json:
  #  1. A "personal" graph (type == "personal") is typically registered one
  #     path segment under $HOME (e.g. "~/.kmgraph") -- its derived parent is
  #     "$HOME/" itself, which every cwd under the home directory
  #     `startswith`. Personal graphs are never cwd-derived (the real
  #     resolveGraph() CLI treats them as scope:"user", not path-matched) --
  #     excluding type=="personal" removes this false-positive-for-everyone
  #     match entirely.
  #  2. A nested registration (e.g. a worktree's own KG, whose path sits
  #     underneath its parent repo's) has two valid parent-prefix matches --
  #     its own, and its ancestor's. Taking whichever `to_entries` happens to
  #     emit first (config insertion order) picks the ancestor whenever it
  #     comes first in the file, which is wrong for the actually-cwd'd-into
  #     worktree. Sorting by parent-string length descending and taking the
  #     longest match picks the more specific (nested) registration instead,
  #     independent of config order.
  kg_name=$(jq -r --arg cwd "$PWD/" '
    [ .graphs | to_entries[]
      | select(.value.type != "personal")
      | . as $e
      | ((.value.path | split("/")[:-1] | join("/")) + "/") as $parent
      | select($cwd | startswith($parent))
      | {k: $e.key, n: ($parent | length)} ]
    | sort_by(-.n) | .[0].k // empty' \
    "$KG_CONFIG_PATH" 2>/dev/null) || kg_name=""
fi

if [ -z "$installed_version" ] || [ -z "$kg_name" ]; then
  echo "{}"
  exit 0
fi

last_applied=$(jq -r --arg kg "$kg_name" '.graphs[$kg].lastAppliedVersion // empty' "$KG_CONFIG_PATH" 2>/dev/null || echo "")

if [ -z "$last_applied" ]; then
  echo "{}"
  exit 0
fi

cmp=$(semver_compare "$installed_version" "$last_applied")
if [ "$cmp" = "1" ]; then
  msg="KMGraph updated: v${last_applied} -> v${installed_version} installed but not yet applied to this graph. Run /kmgraph:kmg-upgrade to review and apply."
  # jq -n --arg builds valid JSON with the message properly escaped --
  # avoids hand-rolled string escaping bugs in the JSON output.
  jq -c -n --arg msg "$msg" '{"systemMessage": $msg}'  # -c: compact single-line output, matching the documented Expected: below
else
  echo "{}"
fi
exit 0
