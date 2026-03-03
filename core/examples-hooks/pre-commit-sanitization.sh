#!/bin/bash
# pre-commit-sanitization.sh
# THIS IS AN EXAMPLE — Customize for your project's sensitive data patterns

# Description: Pre-commit hook to detect potentially sensitive information
# in documentation files before they're committed to git.
#
# Installation:
#   cp core/examples-hooks/pre-commit-sanitization.sh .git/hooks/pre-commit
#   chmod +x .git/hooks/pre-commit
#
# Configuration:
#   Edit PATTERNS array below to add project-specific sensitive data patterns
#
# Note: Portable across macOS and Linux

set -e  # Exit on error

# Color codes for output
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

# Configuration
SCAN_EXTENSIONS=("md" "txt" "yml" "yaml" "json")
MODE="warn"  # Options: "warn" (allow with warning) or "block" (prevent commit)

echo "${GREEN}Running sanitization check...${NC}"

# Get list of staged files
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM)

# Filter for documentation files
DOC_FILES=""
for ext in "${SCAN_EXTENSIONS[@]}"; do
  DOC_FILES="$DOC_FILES $(echo "$STAGED_FILES" | grep "\.$ext$" || true)"
done

if [ -z "$DOC_FILES" ]; then
  echo "${GREEN}✓${NC} No documentation files to scan"
  exit 0
fi

echo "Scanning $(echo "$DOC_FILES" | wc -w | tr -d ' ') documentation files..."

# ============================================================================
# SENSITIVE DATA PATTERNS
# ============================================================================
# Customize these patterns for your project

declare -A PATTERNS

# Personal Information
PATTERNS["email"]='[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'
PATTERNS["phone"]='\b[0-9]{3}[-.]?[0-9]{3}[-.]?[0-9]{4}\b'
PATTERNS["ssn"]='\b[0-9]{3}-[0-9]{2}-[0-9]{4}\b'

# Authentication & Credentials  
PATTERNS["api_key"]='(api[_-]?key|apikey)[[:space:]]*[:=][[:space:]]*['\''"]?[a-zA-Z0-9_-]{20,}['\''"]?'
PATTERNS["password"]='(password|passwd|pwd)[[:space:]]*[:=][[:space:]]*['\''"][^'\''"]{3,}['\''"]'
PATTERNS["bearer_token"]='Bearer[[:space:]]+[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+'
PATTERNS["aws_key"]='AKIA[0-9A-Z]{16}'
PATTERNS["private_key"]='-----BEGIN (RSA |EC )?PRIVATE KEY-----'

# Infrastructure
PATTERNS["internal_ip"]='\b(10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.)[0-9]{1,3}\.[0-9]{1,3}\b'
PATTERNS["internal_url"]='https?://(localhost|127\.0\.0\.1|internal\.|staging\.|dev\.)[a-zA-Z0-9.-]+'
PATTERNS["database_url"]='(postgres|mysql|mongodb)://[a-zA-Z0-9:@.-]+/[a-zA-Z0-9_-]+'

# Company/Project-Specific
PATTERNS["company_name"]='(Acme Corp|Example Industries|CHANGEME Company)'  # ← Customize
PATTERNS["project_code"]='PROJ-[0-9]{4,}'  # ← Customize
PATTERNS["customer_name"]='(Customer A|Client XYZ|CHANGEME Client)'  # ← Customize

# Version Numbers (project-specific versioning)
PATTERNS["version_number"]='v[0-9]+(\.[0-9]+)?(\.[0-9]+)?(\.[xX])?'

# File Paths (absolute paths expose user info)
PATTERNS["absolute_path"]='/Users/[^/]+/|/home/[^/]+/|C:\\Users\\'

# ============================================================================
# SCANNING LOGIC
# ============================================================================

ISSUES_FOUND=0
WARNINGS_FOUND=0

for file in $DOC_FILES; do
  # Skip if file doesn't exist (deleted in staging)
  [ ! -f "$file" ] && continue
  
  # Check each pattern
  for pattern_name in "${!PATTERNS[@]}"; do
    pattern="${PATTERNS[$pattern_name]}"
    
    # Use grep with -n for line numbers, -i for case-insensitive
    matches=$(grep -niE "$pattern" "$file" || true)
    
    if [ -n "$matches" ]; then
      if [ "$MODE" = "block" ]; then
        ISSUES_FOUND=$((ISSUES_FOUND + 1))
        echo ""
        echo "${RED}✗ ERROR${NC}: Potential ${pattern_name} detected in $file"
        echo "$matches" | while IFS= read -r line; do
          echo "  ${line}"
        done
      else
        WARNINGS_FOUND=$((WARNINGS_FOUND + 1))
        echo ""
        echo "${YELLOW}⚠ WARNING${NC}: Potential ${pattern_name} detected in $file"
        echo "$matches" | head -n 3 | while IFS= read -r line; do
          echo "  ${line}"
        done
      fi
    fi
  done
done

# ============================================================================
# CUSTOM PROJECT-SPECIFIC CHECKS
# ============================================================================
# Add custom validation logic here

# Example: Check for placeholder text that should be replaced
for file in $DOC_FILES; do
  [ ! -f "$file" ] && continue
  
  placeholders=$(grep -n "CHANGEME\|TODO:\|FIXME:\|XXX:" "$file" || true)
  if [ -n "$placeholders" ]; then
    WARNINGS_FOUND=$((WARNINGS_FOUND + 1))
    echo ""
    echo "${YELLOW}⚠ WARNING${NC} Found placeholders in $file"
    echo "$placeholders" | head -n 2
  fi
done

# ============================================================================
# SUMMARY & EXIT
# ============================================================================

echo ""
echo "────────────────────────────────────────────────────"

if [ "$MODE" = "block" ] && [ $ISSUES_FOUND -gt 0 ]; then
  echo "${RED}✗ COMMIT BLOCKED${NC}"
  echo ""
  echo "Found $ISSUES_FOUND sensitive data issue(s)"
  echo ""
  echo "To fix:"
  echo "  1. Remove or generalize sensitive information"
  echo "  2. Use placeholders (e.g., 'user@example.com', '192.0.2.1')"
  echo "  3. Use relative paths (./docs/) not absolute (/Users/you/docs/)"
  echo ""
  echo "To bypass this check (NOT recommended):"
  echo "  git commit --no-verify"
  echo ""
  exit 1
elif [ $WARNINGS_FOUND -gt 0 ]; then
  echo "${YELLOW}⚠ $WARNINGS_FOUND warning(s) found${NC}"
  echo ""
  echo "Review the warnings above. Sensitive data detected in documentation."
  echo ""
  echo "Recommendations:"
  echo "  • Remove real email addresses, use examples (user@example.com)"
  echo "  • Generalize company names (e.g., 'Acme Corp' → 'Your Company')"
  echo "  • Replace absolute paths with relative paths"
  echo "  • Use placeholder values for credentials (even in examples)"
  echo ""
  echo "${YELLOW}Proceeding with commit...${NC} (mode: $MODE)"
  echo ""
  exit 0
else
  echo "${GREEN}✓ No sensitive data detected${NC}"
  echo ""
  exit 0
fi
