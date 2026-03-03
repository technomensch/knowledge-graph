#!/bin/bash
# run-all-tests.sh — Master test runner for the pre-beta validation suite
#
# Executes all 9 test suites in sequence and reports per-suite and overall results.
# Prerequisites: MCP server must be built (cd mcp-server && npm install && npm run build)
#
# Usage:
#   ./tests/run-all-tests.sh              # Run all suites
#   ./tests/run-all-tests.sh --quick      # Skip MCP integration tests (structural only)
#   ./tests/run-all-tests.sh --suite mcp  # Run only suites matching pattern

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
MCP_SERVER="$REPO_ROOT/mcp-server/dist/index.js"

# ── Options ──────────────────────────────────────────────────────────────────

QUICK_MODE=false
SUITE_FILTER=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --quick)   QUICK_MODE=true; shift ;;
    --suite)   SUITE_FILTER="$2"; shift 2 ;;
    *)         echo "Unknown option: $1"; exit 1 ;;
  esac
done

# ── Suite definitions (parallel arrays, bash 3.2 compatible) ─────────────────
# Format: "filename|description|requires_mcp"

SUITES=(
  "test-mcp-direct.sh|MCP server smoke test (connectivity)|yes"
  "test-mcp-tools.sh|MCP tools — all 7 tools functional|yes"
  "test-mcp-resources.sh|MCP resources — kg://config + kg://templates|yes"
  "test-mcp-offload.sh|MCP offloading — KG at non-local path|yes"
  "test-mcp-edge-cases.sh|MCP edge cases — error handling|yes"
  "test-commands.sh|Commands — 25 commands structural + syntax|no"
  "test-skills-agents.sh|Skills + Agents — structural validation|no"
  "test-hooks.sh|Hooks — SessionStart hook validation|no"
  "test-extraction.sh|Extraction — Python chat extraction scripts|no"
)

# ── Pre-flight Checks ─────────────────────────────────────────────────────────

echo ""
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║       KMGRAPH PRE-BETA VALIDATION SUITE                       ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""
echo "  Repo:   $REPO_ROOT"
echo "  Mode:   $([ "$QUICK_MODE" = "true" ] && echo 'quick (structural only)' || echo 'full')"
[ -n "$SUITE_FILTER" ] && echo "  Filter: $SUITE_FILTER"
echo ""

MCP_AVAILABLE=false
if [ -f "$MCP_SERVER" ]; then
  MCP_AVAILABLE=true
  echo "  ✅ MCP server: built"
else
  echo "  ⚠️  MCP server: NOT built — MCP integration tests will be skipped"
  echo "     Run: cd mcp-server && npm install && npm run build"
fi
echo ""

# ── Run Suites ────────────────────────────────────────────────────────────────

TOTAL_SUITES=0
PASSED_SUITES=0
FAILED_SUITES=0
SKIPPED_SUITES=0

FAILED_SUITE_NAMES=""

for entry in "${SUITES[@]}"; do
  # Parse entry: "filename|description|requires_mcp"
  suite=$(echo "$entry" | cut -d'|' -f1)
  desc=$(echo "$entry" | cut -d'|' -f2)
  needs_mcp=$(echo "$entry" | cut -d'|' -f3)

  suite_path="$SCRIPT_DIR/$suite"

  # Apply suite filter
  if [ -n "$SUITE_FILTER" ] && ! echo "$suite" | grep -qi "$SUITE_FILTER"; then
    continue
  fi

  # Check MCP prerequisite
  if [ "$needs_mcp" = "yes" ] && [ "$MCP_AVAILABLE" = "false" ]; then
    echo "── SKIP: $suite (MCP server not built)"
    SKIPPED_SUITES=$((SKIPPED_SUITES + 1))
    continue
  fi

  # Check quick mode
  if [ "$QUICK_MODE" = "true" ] && [ "$needs_mcp" = "yes" ]; then
    echo "── SKIP: $suite (--quick mode)"
    SKIPPED_SUITES=$((SKIPPED_SUITES + 1))
    continue
  fi

  # Check file exists
  if [ ! -f "$suite_path" ]; then
    echo "── SKIP: $suite (file not found)"
    SKIPPED_SUITES=$((SKIPPED_SUITES + 1))
    continue
  fi

  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "SUITE: $desc"
  echo "       $suite"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""

  TOTAL_SUITES=$((TOTAL_SUITES + 1))

  set +e
  bash "$suite_path"
  exit_code=$?
  set -e

  if [ $exit_code -eq 0 ]; then
    PASSED_SUITES=$((PASSED_SUITES + 1))
    echo ""
    echo "  → Suite PASSED"
  else
    FAILED_SUITES=$((FAILED_SUITES + 1))
    FAILED_SUITE_NAMES="$FAILED_SUITE_NAMES $suite"
    echo ""
    echo "  → Suite FAILED (exit $exit_code)"
  fi

  echo ""
done

# ── Summary ───────────────────────────────────────────────────────────────────

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║  OVERALL RESULTS                                               ║"
echo "╠═══════════════════════════════════════════════════════════════╣"
printf "║  Suites run:    %-47s ║\n" "$TOTAL_SUITES"
printf "║  Passed:        %-47s ║\n" "$PASSED_SUITES"
printf "║  Failed:        %-47s ║\n" "$FAILED_SUITES"
printf "║  Skipped:       %-47s ║\n" "$SKIPPED_SUITES"
echo "╠═══════════════════════════════════════════════════════════════╣"

if [ $FAILED_SUITES -eq 0 ]; then
  echo "║  STATUS: ✅ ALL SUITES PASSED                                  ║"
else
  echo "║  STATUS: ❌ FAILURES DETECTED                                  ║"
  echo "╠═══════════════════════════════════════════════════════════════╣"
  echo "║  Failed suites:                                                ║"
  for name in $FAILED_SUITE_NAMES; do
    printf "║    ❌ %-57s ║\n" "$name"
  done
fi
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

[ $FAILED_SUITES -eq 0 ] && exit 0 || exit 1
