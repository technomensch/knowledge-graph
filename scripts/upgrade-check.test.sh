#!/usr/bin/env bash
# scripts/upgrade-check.test.sh — plain assertion script, no framework dependency.
# Run: bash scripts/upgrade-check.test.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/upgrade-check.sh"

fail=0

assert_eq() {
  local desc="$1" expected="$2" actual="$3"
  if [ "$expected" != "$actual" ]; then
    echo "FAIL: $desc — expected '$expected', got '$actual'"
    fail=1
  else
    echo "PASS: $desc"
  fi
}

assert_eq "0.7.9 > 0.7.7" "1" "$(semver_compare "0.7.9" "0.7.7")"
assert_eq "0.7.7 < 0.7.9" "-1" "$(semver_compare "0.7.7" "0.7.9")"
assert_eq "0.7.7 == 0.7.7" "0" "$(semver_compare "0.7.7" "0.7.7")"
assert_eq "0.6.20 > 0.6.9 (lexical trap)" "1" "$(semver_compare "0.6.20" "0.6.9")"
assert_eq "0.6.9 < 0.6.20 (lexical trap)" "-1" "$(semver_compare "0.6.9" "0.6.20")"
assert_eq "0.10.0 > 0.9.0 (lexical trap)" "1" "$(semver_compare "0.10.0" "0.9.0")"
assert_eq "1.0.0 > 0.99.99" "1" "$(semver_compare "1.0.0" "0.99.99")"

if [ "$fail" -eq 1 ]; then
  echo "One or more assertions failed."
  exit 1
fi
echo "All assertions passed."
