#!/usr/bin/env bash
# scripts/lib/upgrade-check.sh — shared version-compare logic for session-start
# hooks (Claude Code's hooks-master.sh, Gemini CLI's session-start-check.sh).
# Sourced, not executed directly.

# semver_compare A B
# Echoes 1 if A>B, 0 if A==B, -1 if A<B.
# Numeric, component-by-component -- never lexical string comparison
# (this project ships 0.6.9 alongside 0.6.20; a naive string/sort -V-only
# compare on single-digit-vs-double-digit components gets that wrong).
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
    local av="${a_parts[i]:-0}"
    local bv="${b_parts[i]:-0}"
    # Strip any non-numeric suffix (e.g. "1-beta" -> "1") defensively --
    # this project's versions are plain semver but a hook must not crash
    # on an unexpected format from a future release.
    av="${av//[^0-9]/}"
    bv="${bv//[^0-9]/}"
    av="${av:-0}"
    bv="${bv:-0}"
    if [ "$av" -gt "$bv" ]; then
      echo "1"
      return
    elif [ "$av" -lt "$bv" ]; then
      echo "-1"
      return
    fi
  done
  echo "0"
}
