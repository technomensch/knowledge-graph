#!/bin/bash
# validate-plugin.sh
# Manual pre-publish check: no private project names or maintainer home path
# in tracked files that ship to users (knowledge/ is out of scope).
# Run by hand: bash scripts/validate-plugin.sh

top=$(git rev-parse --show-toplevel) || { echo "validate-plugin: not inside a git repository" >&2; exit 2; }
cd "$top"

RED=$'\033[0;31m'; GREEN=$'\033[0;32m'; NC=$'\033[0m'
SCOPE=(-- . ':!knowledge' ':!scripts/validate-plugin.sh')
violations=0

# scan <description> <git grep args...>   (git grep: 0 = match, 1 = none, >1 = error)
scan() {
  local desc="$1"; shift
  local out rc
  out=$(git grep -nIi "$@" "${SCOPE[@]}"); rc=$?
  if [ "$rc" -gt 1 ]; then echo "validate-plugin: git grep failed (exit $rc)" >&2; exit 2; fi
  if [ "$rc" -eq 0 ]; then
    printf '%s✗ %s%s\n%s\n\n' "$RED" "$desc" "$NC" "$out"
    violations=$((violations + 1))
  fi
}

scan "project-specific name" -E 'resume optimization|enforcement saga|optimize-my-resume|Shadow Sync([^:]|$)'
# The home path checked is the one of whoever runs this (the maintainer, before publishing).
scan "maintainer home path" -F "/Users/${USER:-$(id -un)}"

if [ "$violations" -eq 0 ]; then
  printf '%s✓ No private project names or maintainer paths in shipped files.%s\n' "$GREEN" "$NC"
  exit 0
fi
printf '%s✗ Plugin sanitization FAILED: %d check(s) found matches.%s\n' "$RED" "$violations" "$NC"
exit 1
