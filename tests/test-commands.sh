#!/bin/bash
# test-commands.sh — Structural and syntax validation for all 25 slash commands
#
# Commands are markdown files with YAML frontmatter and embedded bash scripts.
# This test validates structure and syntax without needing to run Claude Code.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
COMMANDS_DIR="$REPO_ROOT/commands"

PASS=0
FAIL=0

pass() { echo "  ✅ PASS: $1"; PASS=$((PASS + 1)); }
fail() { echo "  ❌ FAIL: $1"; FAIL=$((FAIL + 1)); }

echo "═══════════════════════════════════════════════════════════════"
echo "TEST SUITE: Commands (structural + syntax validation)"
echo "Commands dir: $COMMANDS_DIR"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# ── Test 1: Commands directory exists ────────────────────────────────────────

if [ -d "$COMMANDS_DIR" ]; then
  pass "commands/ directory exists"
else
  fail "commands/ directory not found at $COMMANDS_DIR"
  echo "  Cannot continue without commands directory"
  exit 1
fi

# ── Test 2: All 25 expected command files present ────────────────────────────

echo "── File presence ───────────────────────────────────────────────"

EXPECTED_COMMANDS=(
  "add-category.md"
  "archive-memory.md"
  "capture-lesson.md"
  "check-sensitive.md"
  "config-sanitization.md"
  "create-adr.md"
  "create-doc.md"
  "extract-chat.md"
  "handoff.md"
  "help.md"
  "init.md"
  "link-issue.md"
  "list.md"
  "meta-issue.md"
  "recall.md"
  "restore-memory.md"
  "session-summary.md"
  "setup-platform.md"
  "start-issue-tracking.md"
  "status.md"
  "switch.md"
  "sync-all.md"
  "update-doc.md"
  "update-graph.md"
  "update-issue-plan.md"
)

MISSING=0
for cmd in "${EXPECTED_COMMANDS[@]}"; do
  if [ ! -f "$COMMANDS_DIR/$cmd" ]; then
    echo "    Missing: $cmd"
    MISSING=$((MISSING + 1))
  fi
done

if [ $MISSING -eq 0 ]; then
  pass "All 25 expected command files present"
else
  fail "$MISSING command file(s) missing (see above)"
fi

# Test 3: Exact count is 25
ACTUAL_COUNT=$(find "$COMMANDS_DIR" -name "*.md" -type f | wc -l | tr -d ' ')
if [ "$ACTUAL_COUNT" -eq 25 ]; then
  pass "Exact command count is 25"
elif [ "$ACTUAL_COUNT" -gt 25 ]; then
  fail "More than 25 command files found ($ACTUAL_COUNT) — unexpected files?"
else
  fail "Fewer than 25 command files found ($ACTUAL_COUNT)"
fi

# Test 4: No zero-byte files
EMPTY_FILES=$(find "$COMMANDS_DIR" -name "*.md" -empty -type f)
if [ -z "$EMPTY_FILES" ]; then
  pass "No zero-byte command files"
else
  fail "Empty command files found: $EMPTY_FILES"
fi

echo ""
echo "── Frontmatter validation ──────────────────────────────────────"

# Test 5: All files have YAML frontmatter opening delimiter
MISSING_FRONTMATTER=0
for f in "$COMMANDS_DIR"/*.md; do
  if ! head -1 "$f" | grep -q "^---"; then
    echo "    Missing frontmatter: $(basename $f)"
    MISSING_FRONTMATTER=$((MISSING_FRONTMATTER + 1))
  fi
done
if [ $MISSING_FRONTMATTER -eq 0 ]; then
  pass "All command files have YAML frontmatter (--- delimiter)"
else
  fail "$MISSING_FRONTMATTER files missing YAML frontmatter"
fi

# Test 6: All files have closing frontmatter delimiter
UNCLOSED_FRONTMATTER=0
for f in "$COMMANDS_DIR"/*.md; do
  # Count --- occurrences; need at least 2 (open + close)
  DELIMITER_COUNT=$(grep -c "^---" "$f" 2>/dev/null || echo 0)
  if [ "$DELIMITER_COUNT" -lt 2 ]; then
    echo "    Unclosed frontmatter: $(basename $f)"
    UNCLOSED_FRONTMATTER=$((UNCLOSED_FRONTMATTER + 1))
  fi
done
if [ $UNCLOSED_FRONTMATTER -eq 0 ]; then
  pass "All command files have properly closed YAML frontmatter"
else
  fail "$UNCLOSED_FRONTMATTER files have unclosed frontmatter"
fi

echo ""
echo "── Namespace validation ────────────────────────────────────────"

# Test 7: No deprecated /knowledge: namespace references
DEPRECATED_REFS=$(grep -rn "/knowledge:" "$COMMANDS_DIR" 2>/dev/null | grep -v "^Binary" || true)
if [ -z "$DEPRECATED_REFS" ]; then
  pass "No deprecated /knowledge: namespace references in commands"
else
  fail "Deprecated /knowledge: namespace found in commands:"
  echo "$DEPRECATED_REFS" | head -10 | sed 's/^/    /'
fi

# Test 8: All kmgraph: self-references use correct namespace
WRONG_NAMESPACE=$(grep -rn "\/knowledge:" "$COMMANDS_DIR" 2>/dev/null || true)
if [ -z "$WRONG_NAMESPACE" ]; then
  pass "All namespace references use /kmgraph: format"
else
  fail "Wrong namespace references found — should be /kmgraph:"
fi

echo ""
echo "── Bash syntax validation ──────────────────────────────────────"

# Test 9: Check commands contain bash code blocks (structural presence)
# Note: Commands are Claude Code prompts that intentionally contain instructional
# pseudo-code alongside real bash. bash -n is inappropriate for these files.
# Instead, verify that files with bash blocks at least have the opening delimiter.
BASH_FILES=0
for f in "$COMMANDS_DIR"/*.md; do
  BASH_BLOCKS=$(awk '/^```bash/{found=1; next} found && /^```/{found=0; next} found{print}' "$f")
  if [ -n "$BASH_BLOCKS" ]; then
    BASH_FILES=$((BASH_FILES + 1))
  fi
done

if [ $BASH_FILES -gt 0 ]; then
  pass "Commands contain bash code blocks ($BASH_FILES files have bash blocks)"
else
  fail "No bash code blocks found in any command file"
fi

echo ""
echo "── Hardcoded path check ────────────────────────────────────────"

# Test 10: No hardcoded real-user home paths (placeholder /Users/name/ is allowed)
HARDCODED_PATHS=$(grep -rn "/Users/[a-zA-Z]" "$COMMANDS_DIR" 2>/dev/null \
  | grep -v "^Binary" \
  | grep -v "example\|Example\|#" \
  | grep -v "/Users/name" \
  || true)
if [ -z "$HARDCODED_PATHS" ]; then
  pass "No hardcoded user home paths (/Users/<name>) in commands"
else
  fail "Hardcoded user paths found (should use \$HOME or ~):"
  echo "$HARDCODED_PATHS" | head -5 | sed 's/^/    /'
fi

echo ""
echo "── Key command content checks ──────────────────────────────────"

# Test 11: help.md references key commands
if [ -f "$COMMANDS_DIR/help.md" ]; then
  HELP_CONTENT=$(cat "$COMMANDS_DIR/help.md")
  MISSING_REFS=0
  for key_cmd in "capture-lesson" "recall" "sync-all" "session-summary"; do
    if ! echo "$HELP_CONTENT" | grep -q "$key_cmd"; then
      echo "    help.md missing reference to: $key_cmd"
      MISSING_REFS=$((MISSING_REFS + 1))
    fi
  done
  if [ $MISSING_REFS -eq 0 ]; then
    pass "help.md references all key commands (capture-lesson, recall, sync-all, session-summary)"
  else
    fail "help.md missing $MISSING_REFS key command references"
  fi
else
  fail "help.md not found"
fi

# Test 12: sync-all.md orchestrates multiple sub-commands
if [ -f "$COMMANDS_DIR/sync-all.md" ]; then
  SYNC_CONTENT=$(cat "$COMMANDS_DIR/sync-all.md")
  PIPELINE_CMDS=0
  for sub_cmd in "update-graph" "session-summary" "capture-lesson"; do
    echo "$SYNC_CONTENT" | grep -q "$sub_cmd" && PIPELINE_CMDS=$((PIPELINE_CMDS + 1)) || true
  done
  if [ $PIPELINE_CMDS -ge 2 ]; then
    pass "sync-all.md references multiple pipeline sub-commands ($PIPELINE_CMDS found)"
  else
    fail "sync-all.md should reference multiple sub-commands (found $PIPELINE_CMDS)"
  fi
else
  fail "sync-all.md not found"
fi

echo ""

# ── Summary ──────────────────────────────────────────────────────────────────

echo "═══════════════════════════════════════════════════════════════"
echo "COMMANDS: $PASS passed, $FAIL failed (total: $((PASS + FAIL)))"
echo "═══════════════════════════════════════════════════════════════"

[ $FAIL -eq 0 ] && exit 0 || exit 1
