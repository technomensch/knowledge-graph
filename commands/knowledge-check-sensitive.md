---
description: Scan active knowledge graph for potentially sensitive information before public sharing
---

# /knowledge:check-sensitive — Scan for Sensitive Data

Scan the active knowledge graph for potentially sensitive information using regex patterns from config or defaults.

## What This Does

Scans all markdown files in active KG for:
- Email addresses
- API keys/tokens (common patterns)
- URLs (http://, https://)
- Custom patterns from `.claude/sanitization-config.json`

## Syntax

```bash
/knowledge:check-sensitive
/knowledge:check-sensitive --fix-suggestions
```

## Implementation

### Step 1: Get Active KG Path

```bash
kg_path=$(jq -r '.graphs[.active].path' ~/.claude/kg-config.json)
```

### Step 2: Load Patterns

```bash
# Load from config or use defaults
if [ -f .claude/sanitization-config.json ]; then
  patterns=$(jq -r '.patterns[]' .claude/sanitization-config.json)
else
  # Default patterns
  patterns=(
    "email:\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b"
    "api-key:\b(api[_-]?key|token|secret)[[:space:]]*[:=][[:space:]]*['\"]?[A-Za-z0-9_-]{16,}['\"]?"
    "url:https?://[^\s]+"
  )
fi
```

### Step 3: Scan Files

```bash
# Find all markdown files
find "$kg_path" -name "*.md" | while read file; do
  # Scan each pattern
  for pattern in "${patterns[@]}"; do
    type=$(echo "$pattern" | cut -d: -f1)
    regex=$(echo "$pattern" | cut -d: -f2-)

    # Grep for pattern
    matches=$(grep -n -E "$regex" "$file" 2>/dev/null || true)

    if [ -n "$matches" ]; then
      echo "$file:$matches" >> /tmp/sensitive-findings.txt
    fi
  done
done
```

### Step 4: Report Findings

```bash
if [ ! -s /tmp/sensitive-findings.txt ]; then
  echo "✅ No sensitive data found in $kg_path"
  exit 0
fi

echo "⚠️  Potential sensitive data found:"
echo ""

cat /tmp/sensitive-findings.txt | while read finding; do
  file=$(echo "$finding" | cut -d: -f1)
  line=$(echo "$finding" | cut -d: -f2)
  match=$(echo "$finding" | cut -d: -f3-)

  echo "- $(basename $file):$line — $match"
done

echo ""
echo "Review these entries before pushing to public repository."
echo ""
echo "Run with --fix-suggestions to see recommended fixes."
```

## Output Example

```
⚠️  Potential sensitive data found:

- patterns.md:42 — email: user@example.com
- debugging-auth.md:15 — URL: https://api.internal.company.com
- lesson-template.md:8 — api-key: API_KEY=abc123def456

Review these entries before pushing to public repository.

Run with --fix-suggestions to see recommended fixes.
```

## See Also

- `/knowledge:configure-sanitization` — Set up automated pre-commit scanning
