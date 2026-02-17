#!/bin/bash
# validate-plugin.sh
# Sanitization validator for knowledge-graph
# Scans all plugin files for project-specific references

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "${GREEN}Running plugin sanitization validator...${NC}"
echo ""

VIOLATIONS=0

# ============================================================================
# PROJECT-SPECIFIC TERMS
# ============================================================================

PROJECT_TERMS=(
  "resume optimization"
  "enforcement saga"
  "optimize-my-resume"
  "Shadow Sync[^:]" # Exclude "Shadow Sync:" in examples
)

VERSION_PATTERNS=(
  "\bv9\.3"
  "\bv9\.4"
  "\bv9\.3\.x"
  "\bv9\.4\.0"
)

# ============================================================================
# PERSONAL/SENSITIVE INFORMATION
# ============================================================================

HARDCODED_PATHS=(
  "/Users/mkaplan"
  "Documents/GitHub/optimize-my-resume"
)

# GitHub issue numbers from original project (#1-#103)
# Exclude common patterns like "#1" in markdown headers
ISSUE_PATTERN="#[1-9][0-9]?[0-9]?[^0-9]"

# ============================================================================
# SCANNING
# ============================================================================

scan_for_pattern() {
  local pattern="$1"
  local description="$2"
  local exclude_pattern="$3"

  # Scan all files except:
  # - .git/, node_modules/, dist/, chat-history/
  # - This validator script itself
  # - Template files (core/examples/ are OK - they're sanitized examples)

  local results
  if [ -n "$exclude_pattern" ]; then
    results=$(grep -rniE "$pattern" . \
      --exclude-dir=".git" \
      --exclude-dir="node_modules" \
      --exclude-dir="dist" \
      --exclude-dir="chat-history" \
      --exclude-dir="plans" \
      --exclude="validate-plugin.sh" \
      --exclude="*.backup" \
      | grep -vE "$exclude_pattern" \
      || true)
  else
    results=$(grep -rniE "$pattern" . \
      --exclude-dir=".git" \
      --exclude-dir="node_modules" \
      --exclude-dir="dist" \
      --exclude-dir="chat-history" \
      --exclude-dir="plans" \
      --exclude="validate-plugin.sh" \
      --exclude="*.backup" \
      || true)
  fi

  if [ -n "$results" ]; then
    echo "${RED}✗ Found $description:${NC}"
    echo "$results"
    echo ""
    VIOLATIONS=$((VIOLATIONS + 1))
  fi
}

# Scan for project-specific terms
for term in "${PROJECT_TERMS[@]}"; do
  scan_for_pattern "$term" "project-specific term: $term"
done

# Scan for version patterns
for version in "${VERSION_PATTERNS[@]}"; do
  # Exclude version numbers in CHANGELOG.md and plan file names
  scan_for_pattern "$version" "version pattern: $version" "CHANGELOG\.md|v9\.5\.0-|phase-"
done

# Scan for hardcoded paths
for path in "${HARDCODED_PATHS[@]}"; do
  scan_for_pattern "$path" "hardcoded path: $path"
done

# Scan for GitHub issue numbers (exclude markdown headers and intentional attribution)
scan_for_pattern "$ISSUE_PATTERN" "GitHub issue number from original project" "^#+ |<!-- |issue-number or null|\[optimize-my-resume\]"

# ============================================================================
# EMAIL ADDRESSES
# ============================================================================

EMAIL_PATTERN="[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}"
# Exclude example.com, noreply@anthropic.com, and template placeholders
scan_for_pattern "$EMAIL_PATTERN" "email address" "example\.com|noreply@anthropic\.com|\[Your Email\]|\[Email\]|plugin\.json"

# ============================================================================
# SUMMARY
# ============================================================================

echo "────────────────────────────────────────────────────"
echo ""

if [ $VIOLATIONS -eq 0 ]; then
  echo "${GREEN}✓ Plugin sanitization passed!${NC}"
  echo ""
  echo "No project-specific references found."
  echo "Plugin is ready for publishing."
  echo ""
  exit 0
else
  echo "${RED}✗ Plugin sanitization FAILED${NC}"
  echo ""
  echo "Found $VIOLATIONS violation(s)."
  echo ""
  echo "Fix all violations before publishing."
  echo ""
  exit 1
fi
